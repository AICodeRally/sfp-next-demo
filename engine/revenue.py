"""
Revenue Calculation Engine

Step 4 of the calculation pipeline:
- Subscription MRR (base + packs + add-ons)
- Usage revenue (overages)
- Services revenue (impl, advisory, onboarding)
- Channel mechanics (resale discount, revshare, referral fee)
"""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional

import pandas as pd

from cohorts import CohortKey, CohortState
from models import (
    BillingPeriod,
    ChannelModel,
    ChannelTerms,
    PriceBook,
    PriceModel,
    ServicesAssumptions,
    SKUType,
    UsageAssumptions,
    UsageMonetization,
)


@dataclass
class RevenueBreakdown:
    """Revenue breakdown for a single cohort/month"""

    # Subscription revenue
    mrr_base: Decimal = Decimal("0")
    mrr_packs: Decimal = Decimal("0")
    mrr_addons: Decimal = Decimal("0")
    mrr_total: Decimal = Decimal("0")
    arr: Decimal = Decimal("0")

    # Usage revenue
    usage_revenue: Decimal = Decimal("0")

    # Services revenue
    services_impl: Decimal = Decimal("0")
    services_advisory: Decimal = Decimal("0")
    services_total: Decimal = Decimal("0")

    # Channel adjustments
    gross_revenue: Decimal = Decimal("0")
    channel_discount: Decimal = Decimal("0")
    channel_payout: Decimal = Decimal("0")  # for revshare model
    net_revenue: Decimal = Decimal("0")


class RevenueEngine:
    """
    Calculates revenue from cohort states.

    Design principle: This is a pure function engine.
    Input tables in, output tables out. No side effects.
    """

    def __init__(
        self,
        price_book: List[PriceBook],
        channel_terms: List[ChannelTerms],
        usage_assumptions: Optional[List[UsageAssumptions]] = None,
        usage_monetization: Optional[List[UsageMonetization]] = None,
        services_assumptions: Optional[List[ServicesAssumptions]] = None,
    ):
        self.price_book_df = self._to_price_book_df(price_book)
        self.channel_terms_df = self._to_channel_terms_df(channel_terms)
        self.usage_df = self._to_usage_df(usage_assumptions or [])
        self.usage_monetization_df = self._to_usage_monetization_df(usage_monetization or [])
        self.services_df = self._to_services_df(services_assumptions or [])

        # Build lookup dicts for faster access
        self.price_book_lookup: Dict[str, PriceBook] = {p.sku_id: p for p in price_book}
        self.channel_terms_lookup: Dict[str, ChannelTerms] = {c.channel_id: c for c in channel_terms}

    def _to_price_book_df(self, price_book: List[PriceBook]) -> pd.DataFrame:
        if not price_book:
            return pd.DataFrame()
        records = [
            {
                "sku_id": p.sku_id,
                "billing_period": p.billing_period.value,
                "price_model": p.price_model.value,
                "list_price": float(p.list_price),
                "annual_prepay_discount_pct": float(p.annual_prepay_discount_pct),
                "default_discount_pct": float(p.default_discount_pct),
            }
            for p in price_book
        ]
        return pd.DataFrame(records)

    def _to_channel_terms_df(self, channel_terms: List[ChannelTerms]) -> pd.DataFrame:
        if not channel_terms:
            return pd.DataFrame()
        records = [
            {
                "channel_id": c.channel_id,
                "model": c.model.value,
                "resale_discount_pct": float(c.resale_discount_pct),
                "revshare_pct": float(c.revshare_pct),
                "referral_fee_pct": float(c.referral_fee_pct),
                "channel_addon_fee_pct": float(c.channel_addon_fee_pct),
                "services_delivery": c.services_delivery.value,
                "services_split_pct_to_partner": float(c.services_split_pct_to_partner),
            }
            for c in channel_terms
        ]
        return pd.DataFrame(records)

    def _to_usage_df(self, usage: List[UsageAssumptions]) -> pd.DataFrame:
        if not usage:
            return pd.DataFrame()
        records = [
            {
                "scenario_id": u.scenario_id,
                "segment_id": u.segment_id,
                "channel_id": u.channel_id,
                "tokens_per_tenant_m": float(u.tokens_per_tenant_m),
                "embed_1k_tokens_per_tenant_m": float(u.embed_1k_tokens_per_tenant_m),
                "compute_hours_per_tenant_m": float(u.compute_hours_per_tenant_m),
                "storage_gb_per_tenant_m": float(u.storage_gb_per_tenant_m),
                "support_tickets_per_tenant_m": float(u.support_tickets_per_tenant_m),
            }
            for u in usage
        ]
        return pd.DataFrame(records)

    def _to_usage_monetization_df(self, usage_mon: List[UsageMonetization]) -> pd.DataFrame:
        if not usage_mon:
            return pd.DataFrame()
        records = [
            {
                "sku_id": u.sku_id,
                "segment_id": u.segment_id,
                "included_units_per_tenant_m": float(u.included_units_per_tenant_m),
                "overage_price_per_unit": float(u.overage_price_per_unit),
                "overage_take_rate": float(u.overage_take_rate),
            }
            for u in usage_mon
        ]
        return pd.DataFrame(records)

    def _to_services_df(self, services: List[ServicesAssumptions]) -> pd.DataFrame:
        if not services:
            return pd.DataFrame()
        records = [
            {
                "scenario_id": s.scenario_id,
                "segment_id": s.segment_id,
                "channel_id": s.channel_id,
                "impl_fee_per_new_logo": float(s.impl_fee_per_new_logo),
                "impl_cogs_pct": float(s.impl_cogs_pct),
                "advisory_fee_m": float(s.advisory_fee_m),
                "advisory_cogs_pct": float(s.advisory_cogs_pct),
            }
            for s in services
        ]
        return pd.DataFrame(records)

    def calculate_subscription_mrr(
        self,
        cohort_state: CohortState,
        segment_id: str,
        channel_id: str,
        sku_breakdown: Dict[str, str],  # sku_id -> sku_type
    ) -> tuple[Decimal, Decimal, Decimal]:
        """
        Calculate subscription MRR from cohort state.

        Returns: (mrr_base, mrr_packs, mrr_addons)
        """
        mrr_base = Decimal("0")
        mrr_packs = Decimal("0")
        mrr_addons = Decimal("0")

        for sku_id, price_info in self.price_book_lookup.items():
            sku_type = sku_breakdown.get(sku_id, "base")

            # Get unit count based on price model
            if price_info.price_model == PriceModel.PER_TENANT:
                # For base SKU, use active_logos
                if sku_type == "base":
                    units = cohort_state.active_logos
                else:
                    # For packs/addons, use attached count
                    units = cohort_state.pack_attachments.get(sku_id, Decimal("0"))
            elif price_info.price_model == PriceModel.PER_SEAT:
                units = cohort_state.total_seats
            elif price_info.price_model == PriceModel.PER_ENV:
                units = cohort_state.total_envs
            else:
                continue  # Skip usage-based pricing here

            # Calculate MRR
            list_price = price_info.list_price
            discount = price_info.default_discount_pct

            # Convert annual to monthly if needed
            if price_info.billing_period == BillingPeriod.ANNUAL:
                monthly_price = list_price / Decimal("12")
            else:
                monthly_price = list_price

            mrr = units * monthly_price * (1 - discount)

            # Assign to correct bucket
            if sku_type == "base":
                mrr_base += mrr
            elif sku_type == "pack":
                mrr_packs += mrr
            elif sku_type == "addon":
                mrr_addons += mrr

        return (
            mrr_base.quantize(Decimal("0.01")),
            mrr_packs.quantize(Decimal("0.01")),
            mrr_addons.quantize(Decimal("0.01")),
        )

    def calculate_usage_revenue(
        self,
        cohort_state: CohortState,
        scenario_id: str,
        segment_id: str,
        channel_id: str,
    ) -> Decimal:
        """
        Calculate usage revenue from overages.

        Revenue = (actual usage - included) × overage_price × take_rate
        """
        if self.usage_df.empty or self.usage_monetization_df.empty:
            return Decimal("0")

        # Get usage for this cohort
        usage_row = self.usage_df[
            (self.usage_df["scenario_id"] == scenario_id)
            & (self.usage_df["segment_id"] == segment_id)
            & (self.usage_df["channel_id"] == channel_id)
        ]

        if usage_row.empty:
            return Decimal("0")

        usage = usage_row.iloc[0]
        total_revenue = Decimal("0")

        # Get monetization rules for LLM tokens as example
        llm_mon = self.usage_monetization_df[
            (self.usage_monetization_df["sku_id"] == "usage_llm")
            & (self.usage_monetization_df["segment_id"] == segment_id)
        ]

        if not llm_mon.empty:
            mon = llm_mon.iloc[0]
            total_tokens = cohort_state.active_logos * Decimal(str(usage["tokens_per_tenant_m"]))
            included = cohort_state.active_logos * Decimal(str(mon["included_units_per_tenant_m"]))
            overage_units = max(total_tokens - included, Decimal("0"))

            # Apply take rate (% of tenants that go over)
            actual_overage = overage_units * Decimal(str(mon["overage_take_rate"]))
            overage_revenue = actual_overage * Decimal(str(mon["overage_price_per_unit"])) / 1000

            total_revenue += overage_revenue

        return total_revenue.quantize(Decimal("0.01"))

    def calculate_services_revenue(
        self,
        cohort_state: CohortState,
        scenario_id: str,
        segment_id: str,
        channel_id: str,
    ) -> tuple[Decimal, Decimal]:
        """
        Calculate services revenue.

        Returns: (impl_revenue, advisory_revenue)
        """
        if self.services_df.empty:
            return Decimal("0"), Decimal("0")

        services_row = self.services_df[
            (self.services_df["scenario_id"] == scenario_id)
            & (self.services_df["segment_id"] == segment_id)
            & (self.services_df["channel_id"] == channel_id)
        ]

        if services_row.empty:
            return Decimal("0"), Decimal("0")

        svc = services_row.iloc[0]

        # Implementation revenue per new logo
        impl_revenue = cohort_state.new_logos * Decimal(str(svc["impl_fee_per_new_logo"]))

        # Advisory revenue per active logo (monthly retainer)
        advisory_revenue = cohort_state.active_logos * Decimal(str(svc["advisory_fee_m"]))

        return impl_revenue.quantize(Decimal("0.01")), advisory_revenue.quantize(Decimal("0.01"))

    def apply_channel_mechanics(
        self,
        gross_revenue: Decimal,
        channel_id: str,
    ) -> tuple[Decimal, Decimal, Decimal]:
        """
        Apply channel economics to gross revenue.

        Returns: (channel_discount, channel_payout, net_revenue)
        """
        terms = self.channel_terms_lookup.get(channel_id)
        if not terms:
            return Decimal("0"), Decimal("0"), gross_revenue

        channel_discount = Decimal("0")
        channel_payout = Decimal("0")

        if terms.model == ChannelModel.RESALE_DISCOUNT:
            # Net revenue = gross × (1 - resale_discount)
            channel_discount = gross_revenue * terms.resale_discount_pct
            net_revenue = gross_revenue - channel_discount

        elif terms.model == ChannelModel.REVSHARE:
            # Gross revenue booked, then channel payout below gross profit
            channel_payout = gross_revenue * terms.revshare_pct
            net_revenue = gross_revenue  # Still book full revenue

        elif terms.model == ChannelModel.REFERRAL_FEE:
            # One-time referral fee (handled differently, usually on new logos)
            channel_payout = gross_revenue * terms.referral_fee_pct
            net_revenue = gross_revenue

        else:
            net_revenue = gross_revenue

        return (
            channel_discount.quantize(Decimal("0.01")),
            channel_payout.quantize(Decimal("0.01")),
            net_revenue.quantize(Decimal("0.01")),
        )

    def calculate_revenue(
        self,
        key: CohortKey,
        cohort_state: CohortState,
        sku_breakdown: Dict[str, str],
    ) -> RevenueBreakdown:
        """
        Calculate full revenue breakdown for a cohort.
        """
        # Subscription MRR
        mrr_base, mrr_packs, mrr_addons = self.calculate_subscription_mrr(
            cohort_state, key.segment_id, key.channel_id, sku_breakdown
        )
        mrr_total = mrr_base + mrr_packs + mrr_addons
        arr = mrr_total * 12

        # Usage revenue
        usage_revenue = self.calculate_usage_revenue(
            cohort_state, key.scenario_id, key.segment_id, key.channel_id
        )

        # Services revenue
        services_impl, services_advisory = self.calculate_services_revenue(
            cohort_state, key.scenario_id, key.segment_id, key.channel_id
        )
        services_total = services_impl + services_advisory

        # Gross revenue
        gross_revenue = mrr_total + usage_revenue + services_total

        # Apply channel mechanics
        channel_discount, channel_payout, net_revenue = self.apply_channel_mechanics(
            gross_revenue, key.channel_id
        )

        return RevenueBreakdown(
            mrr_base=mrr_base,
            mrr_packs=mrr_packs,
            mrr_addons=mrr_addons,
            mrr_total=mrr_total,
            arr=arr,
            usage_revenue=usage_revenue,
            services_impl=services_impl,
            services_advisory=services_advisory,
            services_total=services_total,
            gross_revenue=gross_revenue,
            channel_discount=channel_discount,
            channel_payout=channel_payout,
            net_revenue=net_revenue,
        )

    def run(
        self,
        cohort_results: Dict[CohortKey, CohortState],
        sku_breakdown: Dict[str, str],
    ) -> Dict[CohortKey, RevenueBreakdown]:
        """
        Calculate revenue for all cohorts.

        Returns a dict mapping CohortKey -> RevenueBreakdown
        """
        results: Dict[CohortKey, RevenueBreakdown] = {}

        for key, cohort_state in cohort_results.items():
            results[key] = self.calculate_revenue(key, cohort_state, sku_breakdown)

        return results

    def to_dataframe(self, results: Dict[CohortKey, RevenueBreakdown]) -> pd.DataFrame:
        """Convert revenue results to DataFrame for output"""
        records = []
        for key, breakdown in results.items():
            records.append(
                {
                    "month": key.month,
                    "scenario_id": key.scenario_id,
                    "segment_id": key.segment_id,
                    "channel_id": key.channel_id,
                    "mrr_base": float(breakdown.mrr_base),
                    "mrr_packs": float(breakdown.mrr_packs),
                    "mrr_addons": float(breakdown.mrr_addons),
                    "mrr_total": float(breakdown.mrr_total),
                    "arr": float(breakdown.arr),
                    "usage_revenue": float(breakdown.usage_revenue),
                    "services_impl": float(breakdown.services_impl),
                    "services_advisory": float(breakdown.services_advisory),
                    "services_total": float(breakdown.services_total),
                    "gross_revenue": float(breakdown.gross_revenue),
                    "channel_discount": float(breakdown.channel_discount),
                    "channel_payout": float(breakdown.channel_payout),
                    "net_revenue": float(breakdown.net_revenue),
                }
            )

        return pd.DataFrame(records)
