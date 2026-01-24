"""
OpEx Calculation Engine

Step 7 of the calculation pipeline:
- Headcount costs (by function, with ramp)
- Sales compensation (commissions + CAC)
- Non-HC opex (marketing, tools, legal, rent, etc.)
"""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional

import pandas as pd

from cohorts import CohortKey, CohortState
from models import Function, HeadcountPlan, OpexAssumptions, SalesCompAssumptions
from revenue import RevenueBreakdown


@dataclass
class HeadcountState:
    """Headcount state for a function at a point in time"""

    function: Function
    total_heads: int = 0
    fully_ramped_heads: Decimal = Decimal("0")  # FTE equivalent after ramp
    monthly_cost: Decimal = Decimal("0")


@dataclass
class OpexBreakdown:
    """OpEx breakdown for a single month"""

    # Headcount costs by function
    opex_eng: Decimal = Decimal("0")
    opex_product: Decimal = Decimal("0")
    opex_sales: Decimal = Decimal("0")
    opex_marketing_hc: Decimal = Decimal("0")
    opex_cs: Decimal = Decimal("0")
    opex_ops: Decimal = Decimal("0")
    opex_ga: Decimal = Decimal("0")
    opex_headcount_total: Decimal = Decimal("0")

    # Sales comp (separate from HC base)
    opex_commissions: Decimal = Decimal("0")
    opex_cac_payments: Decimal = Decimal("0")
    opex_sales_comp_total: Decimal = Decimal("0")

    # Non-HC opex
    opex_marketing_spend: Decimal = Decimal("0")
    opex_tools: Decimal = Decimal("0")
    opex_legal: Decimal = Decimal("0")
    opex_rent: Decimal = Decimal("0")
    opex_other: Decimal = Decimal("0")
    opex_non_hc_total: Decimal = Decimal("0")

    # Total
    opex_total: Decimal = Decimal("0")


class OpexEngine:
    """
    Calculates OpEx from headcount plan and assumptions.

    Design principle: This is a pure function engine.
    Headcount ramps over time; costs follow.
    """

    def __init__(
        self,
        headcount_plan: List[HeadcountPlan],
        opex_assumptions: List[OpexAssumptions],
        sales_comp_assumptions: Optional[List[SalesCompAssumptions]] = None,
    ):
        self.headcount_df = self._to_headcount_df(headcount_plan)
        self.opex_df = self._to_opex_df(opex_assumptions)
        self.sales_comp_df = self._to_sales_comp_df(sales_comp_assumptions or [])

    def _to_headcount_df(self, headcount: List[HeadcountPlan]) -> pd.DataFrame:
        if not headcount:
            return pd.DataFrame()
        records = [
            {
                "month": h.month,
                "scenario_id": h.scenario_id,
                "function": h.function.value,
                "hires": h.hires,
                "fully_loaded_annual": float(h.fully_loaded_annual),
                "ramp_months": h.ramp_months,
            }
            for h in headcount
        ]
        return pd.DataFrame(records)

    def _to_opex_df(self, opex: List[OpexAssumptions]) -> pd.DataFrame:
        if not opex:
            return pd.DataFrame()
        records = [
            {
                "month": o.month,
                "scenario_id": o.scenario_id,
                "marketing_spend_m": float(o.marketing_spend_m),
                "tools_and_software_m": float(o.tools_and_software_m),
                "legal_and_accounting_m": float(o.legal_and_accounting_m),
                "rent_and_admin_m": float(o.rent_and_admin_m),
                "other_opex_m": float(o.other_opex_m),
            }
            for o in opex
        ]
        return pd.DataFrame(records)

    def _to_sales_comp_df(self, sales_comp: List[SalesCompAssumptions]) -> pd.DataFrame:
        if not sales_comp:
            return pd.DataFrame()
        records = [
            {
                "scenario_id": s.scenario_id,
                "segment_id": s.segment_id,
                "channel_id": s.channel_id,
                "commission_pct_of_sub_rev": float(s.commission_pct_of_sub_rev),
                "cac_paid_per_new_logo": float(s.cac_paid_per_new_logo),
            }
            for s in sales_comp
        ]
        return pd.DataFrame(records)

    def calculate_headcount_cost(
        self,
        month: date,
        scenario_id: str,
        months: List[date],
    ) -> Dict[str, HeadcountState]:
        """
        Calculate headcount costs for each function at a given month.

        Accounts for:
        - Cumulative hires over time
        - Ramp periods (linear cost ramp)
        """
        if self.headcount_df.empty:
            return {}

        # Filter to this scenario
        scenario_df = self.headcount_df[self.headcount_df["scenario_id"] == scenario_id]

        if scenario_df.empty:
            return {}

        # Get all unique functions
        functions = scenario_df["function"].unique()

        results: Dict[str, HeadcountState] = {}
        month_index = months.index(month) if month in months else 0

        for func_name in functions:
            func_df = scenario_df[scenario_df["function"] == func_name]

            total_heads = 0
            total_monthly_cost = Decimal("0")
            ramped_fte = Decimal("0")

            # For each hire month up to current month
            for _, row in func_df.iterrows():
                hire_month = row["month"]
                if hire_month > month:
                    continue

                hires = row["hires"]
                annual_cost = Decimal(str(row["fully_loaded_annual"]))
                monthly_base = annual_cost / 12
                ramp_months = row["ramp_months"]

                # Calculate months since hire
                hire_index = months.index(hire_month) if hire_month in months else 0
                months_since_hire = month_index - hire_index

                # Calculate ramp factor (linear ramp)
                if months_since_hire >= ramp_months:
                    ramp_factor = Decimal("1.0")
                elif months_since_hire <= 0:
                    ramp_factor = Decimal("0.0")
                else:
                    ramp_factor = Decimal(str(months_since_hire / ramp_months))

                # Add to totals
                total_heads += hires
                cost_this_cohort = hires * monthly_base * ramp_factor
                total_monthly_cost += cost_this_cohort
                ramped_fte += Decimal(str(hires)) * ramp_factor

            try:
                function_enum = Function(func_name)
            except ValueError:
                continue

            results[func_name] = HeadcountState(
                function=function_enum,
                total_heads=total_heads,
                fully_ramped_heads=ramped_fte.quantize(Decimal("0.01")),
                monthly_cost=total_monthly_cost.quantize(Decimal("0.01")),
            )

        return results

    def calculate_non_hc_opex(
        self,
        month: date,
        scenario_id: str,
    ) -> tuple[Decimal, Decimal, Decimal, Decimal, Decimal]:
        """
        Get non-headcount opex for a given month.

        Returns: (marketing, tools, legal, rent, other)
        """
        if self.opex_df.empty:
            return Decimal("0"), Decimal("0"), Decimal("0"), Decimal("0"), Decimal("0")

        opex_row = self.opex_df[
            (self.opex_df["month"] == month) & (self.opex_df["scenario_id"] == scenario_id)
        ]

        if opex_row.empty:
            return Decimal("0"), Decimal("0"), Decimal("0"), Decimal("0"), Decimal("0")

        row = opex_row.iloc[0]
        return (
            Decimal(str(row["marketing_spend_m"])),
            Decimal(str(row["tools_and_software_m"])),
            Decimal(str(row["legal_and_accounting_m"])),
            Decimal(str(row["rent_and_admin_m"])),
            Decimal(str(row["other_opex_m"])),
        )

    def calculate_sales_comp(
        self,
        cohort_results: Dict[CohortKey, CohortState],
        revenue_results: Dict[CohortKey, RevenueBreakdown],
        month: date,
        scenario_id: str,
    ) -> tuple[Decimal, Decimal]:
        """
        Calculate sales compensation for a given month.

        Returns: (commissions, cac_payments)
        """
        if self.sales_comp_df.empty:
            return Decimal("0"), Decimal("0")

        total_commissions = Decimal("0")
        total_cac = Decimal("0")

        for key, revenue in revenue_results.items():
            if key.month != month or key.scenario_id != scenario_id:
                continue

            comp_row = self.sales_comp_df[
                (self.sales_comp_df["scenario_id"] == scenario_id)
                & (self.sales_comp_df["segment_id"] == key.segment_id)
                & (self.sales_comp_df["channel_id"] == key.channel_id)
            ]

            if comp_row.empty:
                continue

            comp = comp_row.iloc[0]

            # Commissions on subscription revenue
            commission_pct = Decimal(str(comp["commission_pct_of_sub_rev"]))
            commissions = revenue.mrr_total * commission_pct
            total_commissions += commissions

            # CAC payment per new logo
            cohort_state = cohort_results.get(key)
            if cohort_state:
                cac_per_logo = Decimal(str(comp["cac_paid_per_new_logo"]))
                cac_payment = cohort_state.new_logos * cac_per_logo
                total_cac += cac_payment

        return (
            total_commissions.quantize(Decimal("0.01")),
            total_cac.quantize(Decimal("0.01")),
        )

    def calculate_opex(
        self,
        month: date,
        scenario_id: str,
        months: List[date],
        cohort_results: Dict[CohortKey, CohortState],
        revenue_results: Dict[CohortKey, RevenueBreakdown],
    ) -> OpexBreakdown:
        """
        Calculate full OpEx breakdown for a month.
        """
        # Headcount costs
        hc_costs = self.calculate_headcount_cost(month, scenario_id, months)

        opex_eng = hc_costs.get("eng", HeadcountState(Function.ENG)).monthly_cost
        opex_product = hc_costs.get("product", HeadcountState(Function.PRODUCT)).monthly_cost
        opex_sales = hc_costs.get("sales", HeadcountState(Function.SALES)).monthly_cost
        opex_marketing_hc = hc_costs.get("marketing", HeadcountState(Function.MARKETING)).monthly_cost
        opex_cs = hc_costs.get("cs", HeadcountState(Function.CS)).monthly_cost
        opex_ops = hc_costs.get("ops", HeadcountState(Function.OPS)).monthly_cost
        opex_ga = hc_costs.get("g&a", HeadcountState(Function.GA)).monthly_cost

        opex_headcount_total = (
            opex_eng + opex_product + opex_sales + opex_marketing_hc + opex_cs + opex_ops + opex_ga
        )

        # Sales comp
        opex_commissions, opex_cac = self.calculate_sales_comp(
            cohort_results, revenue_results, month, scenario_id
        )
        opex_sales_comp_total = opex_commissions + opex_cac

        # Non-HC opex
        marketing, tools, legal, rent, other = self.calculate_non_hc_opex(month, scenario_id)
        opex_non_hc_total = marketing + tools + legal + rent + other

        # Total
        opex_total = opex_headcount_total + opex_sales_comp_total + opex_non_hc_total

        return OpexBreakdown(
            opex_eng=opex_eng,
            opex_product=opex_product,
            opex_sales=opex_sales,
            opex_marketing_hc=opex_marketing_hc,
            opex_cs=opex_cs,
            opex_ops=opex_ops,
            opex_ga=opex_ga,
            opex_headcount_total=opex_headcount_total,
            opex_commissions=opex_commissions,
            opex_cac_payments=opex_cac,
            opex_sales_comp_total=opex_sales_comp_total,
            opex_marketing_spend=marketing,
            opex_tools=tools,
            opex_legal=legal,
            opex_rent=rent,
            opex_other=other,
            opex_non_hc_total=opex_non_hc_total,
            opex_total=opex_total,
        )

    def run(
        self,
        months: List[date],
        scenario_id: str,
        cohort_results: Dict[CohortKey, CohortState],
        revenue_results: Dict[CohortKey, RevenueBreakdown],
    ) -> Dict[date, OpexBreakdown]:
        """
        Calculate OpEx for all months.
        """
        results: Dict[date, OpexBreakdown] = {}

        for month in months:
            results[month] = self.calculate_opex(
                month, scenario_id, months, cohort_results, revenue_results
            )

        return results

    def to_dataframe(self, results: Dict[date, OpexBreakdown], scenario_id: str) -> pd.DataFrame:
        """Convert OpEx results to DataFrame for output"""
        records = []
        for month, breakdown in results.items():
            records.append(
                {
                    "month": month,
                    "scenario_id": scenario_id,
                    "opex_eng": float(breakdown.opex_eng),
                    "opex_product": float(breakdown.opex_product),
                    "opex_sales": float(breakdown.opex_sales),
                    "opex_marketing_hc": float(breakdown.opex_marketing_hc),
                    "opex_cs": float(breakdown.opex_cs),
                    "opex_ops": float(breakdown.opex_ops),
                    "opex_ga": float(breakdown.opex_ga),
                    "opex_headcount_total": float(breakdown.opex_headcount_total),
                    "opex_commissions": float(breakdown.opex_commissions),
                    "opex_cac_payments": float(breakdown.opex_cac_payments),
                    "opex_sales_comp_total": float(breakdown.opex_sales_comp_total),
                    "opex_marketing_spend": float(breakdown.opex_marketing_spend),
                    "opex_tools": float(breakdown.opex_tools),
                    "opex_legal": float(breakdown.opex_legal),
                    "opex_rent": float(breakdown.opex_rent),
                    "opex_other": float(breakdown.opex_other),
                    "opex_non_hc_total": float(breakdown.opex_non_hc_total),
                    "opex_total": float(breakdown.opex_total),
                }
            )

        return pd.DataFrame(records)
