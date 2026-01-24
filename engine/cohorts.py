"""
Cohort Calculation Engine

Step 1-3 of the calculation pipeline:
1. Generate customer cohorts (new customers by month, by channel/segment)
2. Active customers = prior active + new − churn
3. Attach packs/add-ons (pack attach rates + seat/env growth)
"""

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional, Tuple

import pandas as pd

from models import (
    FunnelAssumptions,
    NewLogosOverride,
    PackAttachRates,
    RetentionAssumptions,
    SeatsAndEnvsAssumptions,
)


@dataclass
class CohortKey:
    """Unique identifier for a cohort slice"""

    month: date
    scenario_id: str
    segment_id: str
    channel_id: str

    def __hash__(self) -> int:
        return hash((self.month, self.scenario_id, self.segment_id, self.channel_id))


@dataclass
class CohortState:
    """State of a cohort at a point in time"""

    active_logos: Decimal = Decimal("0")
    new_logos: Decimal = Decimal("0")
    churned_logos: Decimal = Decimal("0")
    retained_logos: Decimal = Decimal("0")

    # Per-logo metrics
    avg_seats: Decimal = Decimal("1")
    avg_envs: Decimal = Decimal("1")
    total_seats: Decimal = Decimal("0")
    total_envs: Decimal = Decimal("0")

    # Pack attachments (sku_id -> attached_logos)
    pack_attachments: Dict[str, Decimal] = field(default_factory=dict)


class CohortEngine:
    """
    Calculates customer cohorts over time.

    Design principle: This is a pure function engine.
    Input tables in, output tables out. No side effects.
    """

    def __init__(
        self,
        funnel_assumptions: List[FunnelAssumptions],
        retention_assumptions: List[RetentionAssumptions],
        new_logos_override: Optional[List[NewLogosOverride]] = None,
        seats_envs_assumptions: Optional[List[SeatsAndEnvsAssumptions]] = None,
        pack_attach_rates: Optional[List[PackAttachRates]] = None,
    ):
        self.funnel_df = self._to_funnel_df(funnel_assumptions)
        self.retention_df = self._to_retention_df(retention_assumptions)
        self.override_df = self._to_override_df(new_logos_override or [])
        self.seats_envs_df = self._to_seats_envs_df(seats_envs_assumptions or [])
        self.pack_attach_df = self._to_pack_attach_df(pack_attach_rates or [])

    def _to_funnel_df(self, funnel: List[FunnelAssumptions]) -> pd.DataFrame:
        """Convert funnel assumptions to DataFrame"""
        if not funnel:
            return pd.DataFrame()
        records = [
            {
                "month": f.month,
                "scenario_id": f.scenario_id,
                "segment_id": f.segment_id,
                "channel_id": f.channel_id,
                "leads": f.leads,
                "lead_to_sql": float(f.lead_to_sql),
                "sql_to_win": float(f.sql_to_win),
                "sales_cycle_months": f.sales_cycle_months,
            }
            for f in funnel
        ]
        return pd.DataFrame(records)

    def _to_retention_df(self, retention: List[RetentionAssumptions]) -> pd.DataFrame:
        """Convert retention assumptions to DataFrame"""
        if not retention:
            return pd.DataFrame()
        records = [
            {
                "scenario_id": r.scenario_id,
                "segment_id": r.segment_id,
                "channel_id": r.channel_id,
                "logo_churn_m": float(r.logo_churn_m),
                "revenue_churn_m": float(r.revenue_churn_m),
                "expansion_m": float(r.expansion_m),
            }
            for r in retention
        ]
        return pd.DataFrame(records)

    def _to_override_df(self, overrides: List[NewLogosOverride]) -> pd.DataFrame:
        """Convert new logos overrides to DataFrame"""
        if not overrides:
            return pd.DataFrame()
        records = [
            {
                "month": o.month,
                "scenario_id": o.scenario_id,
                "segment_id": o.segment_id,
                "channel_id": o.channel_id,
                "new_logos": o.new_logos,
            }
            for o in overrides
        ]
        return pd.DataFrame(records)

    def _to_seats_envs_df(self, seats_envs: List[SeatsAndEnvsAssumptions]) -> pd.DataFrame:
        """Convert seats/envs assumptions to DataFrame"""
        if not seats_envs:
            return pd.DataFrame()
        records = [
            {
                "scenario_id": s.scenario_id,
                "segment_id": s.segment_id,
                "channel_id": s.channel_id,
                "seats_per_tenant_start": float(s.seats_per_tenant_start),
                "seats_growth_m": float(s.seats_growth_m),
                "envs_per_tenant_start": float(s.envs_per_tenant_start),
                "envs_growth_m": float(s.envs_growth_m),
            }
            for s in seats_envs
        ]
        return pd.DataFrame(records)

    def _to_pack_attach_df(self, pack_attach: List[PackAttachRates]) -> pd.DataFrame:
        """Convert pack attach rates to DataFrame"""
        if not pack_attach:
            return pd.DataFrame()
        records = [
            {
                "segment_id": p.segment_id,
                "channel_id": p.channel_id,
                "sku_id": p.sku_id,
                "attach_rate": float(p.attach_rate),
                "attach_ramp_months": p.attach_ramp_months,
            }
            for p in pack_attach
        ]
        return pd.DataFrame(records)

    def calculate_new_logos(
        self,
        month: date,
        scenario_id: str,
        segment_id: str,
        channel_id: str,
    ) -> Decimal:
        """
        Calculate new logos for a given month/segment/channel.

        Uses override if available, otherwise calculates from funnel.
        """
        # Check for override first
        if not self.override_df.empty:
            override_row = self.override_df[
                (self.override_df["month"] == month)
                & (self.override_df["scenario_id"] == scenario_id)
                & (self.override_df["segment_id"] == segment_id)
                & (self.override_df["channel_id"] == channel_id)
            ]
            if not override_row.empty:
                return Decimal(str(override_row.iloc[0]["new_logos"]))

        # Calculate from funnel
        if self.funnel_df.empty:
            return Decimal("0")

        funnel_row = self.funnel_df[
            (self.funnel_df["month"] == month)
            & (self.funnel_df["scenario_id"] == scenario_id)
            & (self.funnel_df["segment_id"] == segment_id)
            & (self.funnel_df["channel_id"] == channel_id)
        ]

        if funnel_row.empty:
            return Decimal("0")

        row = funnel_row.iloc[0]
        # leads × lead_to_sql × sql_to_win = wins
        # Note: In a more sophisticated model, we'd lag by sales_cycle_months
        wins = row["leads"] * row["lead_to_sql"] * row["sql_to_win"]
        return Decimal(str(round(wins, 2)))

    def calculate_churn(
        self,
        active_logos: Decimal,
        scenario_id: str,
        segment_id: str,
        channel_id: str,
    ) -> Decimal:
        """Calculate churned logos for a given cohort"""
        if self.retention_df.empty:
            return Decimal("0")

        retention_row = self.retention_df[
            (self.retention_df["scenario_id"] == scenario_id)
            & (self.retention_df["segment_id"] == segment_id)
            & (self.retention_df["channel_id"] == channel_id)
        ]

        if retention_row.empty:
            return Decimal("0")

        churn_rate = Decimal(str(retention_row.iloc[0]["logo_churn_m"]))
        churned = active_logos * churn_rate
        return churned.quantize(Decimal("0.01"))

    def calculate_cohort_state(
        self,
        month: date,
        scenario_id: str,
        segment_id: str,
        channel_id: str,
        prior_state: Optional[CohortState] = None,
        months_since_start: int = 0,
    ) -> CohortState:
        """
        Calculate cohort state for a given month.

        active_logos = prior_active + new - churned
        """
        prior_active = prior_state.active_logos if prior_state else Decimal("0")

        # Calculate new logos
        new_logos = self.calculate_new_logos(month, scenario_id, segment_id, channel_id)

        # Calculate churn
        churned_logos = self.calculate_churn(prior_active, scenario_id, segment_id, channel_id)

        # Calculate retained
        retained_logos = prior_active - churned_logos

        # Calculate active
        active_logos = retained_logos + new_logos

        # Validation: no negative actives
        if active_logos < 0:
            raise ValueError(
                f"Negative active logos at {month}/{segment_id}/{channel_id}: {active_logos}"
            )

        # Calculate seats/envs
        avg_seats, avg_envs = self._calculate_seats_envs(
            scenario_id, segment_id, channel_id, months_since_start
        )

        # Calculate pack attachments
        pack_attachments = self._calculate_pack_attachments(
            active_logos, segment_id, channel_id, months_since_start
        )

        return CohortState(
            active_logos=active_logos,
            new_logos=new_logos,
            churned_logos=churned_logos,
            retained_logos=retained_logos,
            avg_seats=avg_seats,
            avg_envs=avg_envs,
            total_seats=active_logos * avg_seats,
            total_envs=active_logos * avg_envs,
            pack_attachments=pack_attachments,
        )

    def _calculate_seats_envs(
        self,
        scenario_id: str,
        segment_id: str,
        channel_id: str,
        months_since_start: int,
    ) -> Tuple[Decimal, Decimal]:
        """Calculate average seats and envs per tenant"""
        if self.seats_envs_df.empty:
            return Decimal("1"), Decimal("1")

        row = self.seats_envs_df[
            (self.seats_envs_df["scenario_id"] == scenario_id)
            & (self.seats_envs_df["segment_id"] == segment_id)
            & (self.seats_envs_df["channel_id"] == channel_id)
        ]

        if row.empty:
            return Decimal("1"), Decimal("1")

        r = row.iloc[0]
        # Compound growth: start × (1 + growth_rate) ^ months
        seats = r["seats_per_tenant_start"] * ((1 + r["seats_growth_m"]) ** months_since_start)
        envs = r["envs_per_tenant_start"] * ((1 + r["envs_growth_m"]) ** months_since_start)

        return Decimal(str(round(seats, 2))), Decimal(str(round(envs, 2)))

    def _calculate_pack_attachments(
        self,
        active_logos: Decimal,
        segment_id: str,
        channel_id: str,
        months_since_start: int,
    ) -> Dict[str, Decimal]:
        """Calculate pack attachments for active logos"""
        if self.pack_attach_df.empty:
            return {}

        attachments: Dict[str, Decimal] = {}
        relevant = self.pack_attach_df[
            (self.pack_attach_df["segment_id"] == segment_id)
            & (self.pack_attach_df["channel_id"] == channel_id)
        ]

        for _, row in relevant.iterrows():
            sku_id = row["sku_id"]
            target_rate = row["attach_rate"]
            ramp_months = row["attach_ramp_months"]

            # Ramp attach rate over ramp_months
            if months_since_start >= ramp_months:
                current_rate = target_rate
            else:
                # Linear ramp
                current_rate = target_rate * (months_since_start / ramp_months)

            attached = active_logos * Decimal(str(current_rate))
            attachments[sku_id] = attached.quantize(Decimal("0.01"))

        return attachments

    def run(
        self,
        months: List[date],
        scenario_id: str,
        segments: List[str],
        channels: List[str],
    ) -> Dict[CohortKey, CohortState]:
        """
        Run cohort calculations for all months/segments/channels.

        Returns a dict mapping CohortKey -> CohortState
        """
        results: Dict[CohortKey, CohortState] = {}

        for segment_id in segments:
            for channel_id in channels:
                prior_state: Optional[CohortState] = None

                for i, month in enumerate(months):
                    key = CohortKey(
                        month=month,
                        scenario_id=scenario_id,
                        segment_id=segment_id,
                        channel_id=channel_id,
                    )

                    state = self.calculate_cohort_state(
                        month=month,
                        scenario_id=scenario_id,
                        segment_id=segment_id,
                        channel_id=channel_id,
                        prior_state=prior_state,
                        months_since_start=i,
                    )

                    results[key] = state
                    prior_state = state

        return results

    def to_dataframe(self, results: Dict[CohortKey, CohortState]) -> pd.DataFrame:
        """Convert cohort results to DataFrame for output"""
        records = []
        for key, state in results.items():
            record = {
                "month": key.month,
                "scenario_id": key.scenario_id,
                "segment_id": key.segment_id,
                "channel_id": key.channel_id,
                "active_logos": float(state.active_logos),
                "new_logos": float(state.new_logos),
                "churned_logos": float(state.churned_logos),
                "retained_logos": float(state.retained_logos),
                "avg_seats": float(state.avg_seats),
                "avg_envs": float(state.avg_envs),
                "total_seats": float(state.total_seats),
                "total_envs": float(state.total_envs),
            }
            # Add pack attachments
            for sku_id, attached in state.pack_attachments.items():
                record[f"attached_{sku_id}"] = float(attached)
            records.append(record)

        return pd.DataFrame(records)
