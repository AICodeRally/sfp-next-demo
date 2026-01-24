"""
COGS Calculation Engine

Step 5 of the calculation pipeline:
- Variable COGS: tokens/compute/storage/support × unit costs
- Fixed COGS: hosting baseline, minimum commits, core ops
- Services COGS: implementation delivery costs
"""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional

import pandas as pd

from cohorts import CohortKey, CohortState
from models import COGSUnitCosts, ServicesAssumptions, UsageAssumptions
from revenue import RevenueBreakdown


@dataclass
class COGSBreakdown:
    """COGS breakdown for a single cohort/month"""

    # Variable COGS (usage-driven)
    cogs_llm_tokens: Decimal = Decimal("0")
    cogs_embeddings: Decimal = Decimal("0")
    cogs_compute: Decimal = Decimal("0")
    cogs_storage: Decimal = Decimal("0")
    cogs_support: Decimal = Decimal("0")
    cogs_variable_total: Decimal = Decimal("0")

    # Fixed COGS
    cogs_platform_fixed: Decimal = Decimal("0")
    cogs_third_party: Decimal = Decimal("0")
    cogs_fixed_total: Decimal = Decimal("0")

    # Services COGS
    cogs_services_impl: Decimal = Decimal("0")
    cogs_services_advisory: Decimal = Decimal("0")
    cogs_services_total: Decimal = Decimal("0")

    # Totals
    cogs_total: Decimal = Decimal("0")

    # Channel payouts (from revshare model, below gross profit)
    channel_payout: Decimal = Decimal("0")


class COGSEngine:
    """
    Calculates COGS from cohort states and revenue.

    Design principle: This is a pure function engine.
    COGS must reconcile: usage drivers × unit costs = totals
    """

    def __init__(
        self,
        cogs_unit_costs: List[COGSUnitCosts],
        usage_assumptions: Optional[List[UsageAssumptions]] = None,
        services_assumptions: Optional[List[ServicesAssumptions]] = None,
    ):
        self.cogs_df = self._to_cogs_df(cogs_unit_costs)
        self.usage_df = self._to_usage_df(usage_assumptions or [])
        self.services_df = self._to_services_df(services_assumptions or [])

        # Build lookup dict
        self.cogs_lookup: Dict[str, COGSUnitCosts] = {c.scenario_id: c for c in cogs_unit_costs}

    def _to_cogs_df(self, cogs: List[COGSUnitCosts]) -> pd.DataFrame:
        if not cogs:
            return pd.DataFrame()
        records = [
            {
                "scenario_id": c.scenario_id,
                "llm_cost_per_1k_tokens": float(c.llm_cost_per_1k_tokens),
                "embed_cost_per_1k_tokens": float(c.embed_cost_per_1k_tokens),
                "compute_cost_per_hour": float(c.compute_cost_per_hour),
                "storage_cost_per_gb_m": float(c.storage_cost_per_gb_m),
                "support_cost_per_ticket": float(c.support_cost_per_ticket),
                "fixed_platform_cogs_m": float(c.fixed_platform_cogs_m),
            }
            for c in cogs
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

    def calculate_variable_cogs(
        self,
        cohort_state: CohortState,
        scenario_id: str,
        segment_id: str,
        channel_id: str,
    ) -> tuple[Decimal, Decimal, Decimal, Decimal, Decimal]:
        """
        Calculate variable COGS based on usage.

        Returns: (llm, embeddings, compute, storage, support)
        """
        cogs_params = self.cogs_lookup.get(scenario_id)
        if not cogs_params:
            return Decimal("0"), Decimal("0"), Decimal("0"), Decimal("0"), Decimal("0")

        if self.usage_df.empty:
            return Decimal("0"), Decimal("0"), Decimal("0"), Decimal("0"), Decimal("0")

        usage_row = self.usage_df[
            (self.usage_df["scenario_id"] == scenario_id)
            & (self.usage_df["segment_id"] == segment_id)
            & (self.usage_df["channel_id"] == channel_id)
        ]

        if usage_row.empty:
            return Decimal("0"), Decimal("0"), Decimal("0"), Decimal("0"), Decimal("0")

        usage = usage_row.iloc[0]
        active = cohort_state.active_logos

        # LLM tokens cost (tokens_per_tenant × cost_per_1k / 1000)
        total_tokens = active * Decimal(str(usage["tokens_per_tenant_m"]))
        cogs_llm = (total_tokens / 1000) * cogs_params.llm_cost_per_1k_tokens

        # Embeddings cost
        total_embed = active * Decimal(str(usage["embed_1k_tokens_per_tenant_m"]))
        cogs_embed = total_embed * cogs_params.embed_cost_per_1k_tokens

        # Compute cost
        total_hours = active * Decimal(str(usage["compute_hours_per_tenant_m"]))
        cogs_compute = total_hours * cogs_params.compute_cost_per_hour

        # Storage cost
        total_storage = active * Decimal(str(usage["storage_gb_per_tenant_m"]))
        cogs_storage = total_storage * cogs_params.storage_cost_per_gb_m

        # Support cost
        total_tickets = active * Decimal(str(usage["support_tickets_per_tenant_m"]))
        cogs_support = total_tickets * cogs_params.support_cost_per_ticket

        return (
            cogs_llm.quantize(Decimal("0.01")),
            cogs_embed.quantize(Decimal("0.01")),
            cogs_compute.quantize(Decimal("0.01")),
            cogs_storage.quantize(Decimal("0.01")),
            cogs_support.quantize(Decimal("0.01")),
        )

    def calculate_fixed_cogs(
        self,
        scenario_id: str,
        num_segments: int = 1,
    ) -> Decimal:
        """
        Calculate fixed COGS (platform baseline).

        Note: Fixed COGS is typically allocated across segments/channels
        for granular P&L. Here we return the full amount and let the
        orchestrator handle allocation.
        """
        cogs_params = self.cogs_lookup.get(scenario_id)
        if not cogs_params:
            return Decimal("0")

        return cogs_params.fixed_platform_cogs_m

    def calculate_services_cogs(
        self,
        revenue_breakdown: RevenueBreakdown,
        scenario_id: str,
        segment_id: str,
        channel_id: str,
    ) -> tuple[Decimal, Decimal]:
        """
        Calculate services COGS as percentage of services revenue.

        Returns: (impl_cogs, advisory_cogs)
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

        # COGS = revenue × cogs_pct
        cogs_impl = revenue_breakdown.services_impl * Decimal(str(svc["impl_cogs_pct"]))
        cogs_advisory = revenue_breakdown.services_advisory * Decimal(str(svc["advisory_cogs_pct"]))

        return cogs_impl.quantize(Decimal("0.01")), cogs_advisory.quantize(Decimal("0.01"))

    def calculate_cogs(
        self,
        key: CohortKey,
        cohort_state: CohortState,
        revenue_breakdown: RevenueBreakdown,
        include_fixed_allocation: bool = True,
        fixed_allocation_pct: Decimal = Decimal("1.0"),
    ) -> COGSBreakdown:
        """
        Calculate full COGS breakdown for a cohort.
        """
        # Variable COGS
        llm, embed, compute, storage, support = self.calculate_variable_cogs(
            cohort_state, key.scenario_id, key.segment_id, key.channel_id
        )
        variable_total = llm + embed + compute + storage + support

        # Fixed COGS (allocated)
        fixed_platform = Decimal("0")
        if include_fixed_allocation:
            full_fixed = self.calculate_fixed_cogs(key.scenario_id)
            fixed_platform = full_fixed * fixed_allocation_pct

        fixed_total = fixed_platform

        # Services COGS
        impl_cogs, advisory_cogs = self.calculate_services_cogs(
            revenue_breakdown, key.scenario_id, key.segment_id, key.channel_id
        )
        services_total = impl_cogs + advisory_cogs

        # Total COGS
        cogs_total = variable_total + fixed_total + services_total

        return COGSBreakdown(
            cogs_llm_tokens=llm,
            cogs_embeddings=embed,
            cogs_compute=compute,
            cogs_storage=storage,
            cogs_support=support,
            cogs_variable_total=variable_total,
            cogs_platform_fixed=fixed_platform,
            cogs_third_party=Decimal("0"),  # Add if needed
            cogs_fixed_total=fixed_total,
            cogs_services_impl=impl_cogs,
            cogs_services_advisory=advisory_cogs,
            cogs_services_total=services_total,
            cogs_total=cogs_total,
            channel_payout=revenue_breakdown.channel_payout,
        )

    def run(
        self,
        cohort_results: Dict[CohortKey, CohortState],
        revenue_results: Dict[CohortKey, RevenueBreakdown],
    ) -> Dict[CohortKey, COGSBreakdown]:
        """
        Calculate COGS for all cohorts.

        Fixed COGS is allocated evenly across all active cohorts.
        """
        # Calculate allocation percentages for fixed COGS
        # (based on active logos or revenue)
        total_active = sum(cs.active_logos for cs in cohort_results.values())

        results: Dict[CohortKey, COGSBreakdown] = {}

        for key, cohort_state in cohort_results.items():
            revenue = revenue_results.get(key)
            if not revenue:
                continue

            # Calculate fixed COGS allocation
            if total_active > 0:
                allocation_pct = cohort_state.active_logos / total_active
            else:
                allocation_pct = Decimal("0")

            results[key] = self.calculate_cogs(
                key,
                cohort_state,
                revenue,
                include_fixed_allocation=True,
                fixed_allocation_pct=allocation_pct,
            )

        return results

    def to_dataframe(self, results: Dict[CohortKey, COGSBreakdown]) -> pd.DataFrame:
        """Convert COGS results to DataFrame for output"""
        records = []
        for key, breakdown in results.items():
            records.append(
                {
                    "month": key.month,
                    "scenario_id": key.scenario_id,
                    "segment_id": key.segment_id,
                    "channel_id": key.channel_id,
                    "cogs_llm_tokens": float(breakdown.cogs_llm_tokens),
                    "cogs_embeddings": float(breakdown.cogs_embeddings),
                    "cogs_compute": float(breakdown.cogs_compute),
                    "cogs_storage": float(breakdown.cogs_storage),
                    "cogs_support": float(breakdown.cogs_support),
                    "cogs_variable_total": float(breakdown.cogs_variable_total),
                    "cogs_platform_fixed": float(breakdown.cogs_platform_fixed),
                    "cogs_third_party": float(breakdown.cogs_third_party),
                    "cogs_fixed_total": float(breakdown.cogs_fixed_total),
                    "cogs_services_impl": float(breakdown.cogs_services_impl),
                    "cogs_services_advisory": float(breakdown.cogs_services_advisory),
                    "cogs_services_total": float(breakdown.cogs_services_total),
                    "cogs_total": float(breakdown.cogs_total),
                    "channel_payout": float(breakdown.channel_payout),
                }
            )

        return pd.DataFrame(records)
