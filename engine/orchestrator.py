"""
Financial Model Orchestrator

Runs the full calculation pipeline:
1. Load inputs (from Grist or other sources)
2. Run cohort calculations
3. Run revenue calculations
4. Run COGS calculations
5. Run OpEx calculations
6. Produce 3-statement outputs
7. Validate results
8. Export outputs
"""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Any, Dict, List, Optional

import pandas as pd

from cohorts import CohortEngine, CohortKey, CohortState
from cogs import COGSBreakdown, COGSEngine
from models import (
    BillingCollections,
    ChannelTerms,
    COGSUnitCosts,
    CompanySettings,
    FunnelAssumptions,
    HeadcountPlan,
    NewLogosOverride,
    OpexAssumptions,
    PackAttachRates,
    Payables,
    PriceBook,
    RetentionAssumptions,
    RunSettings,
    SalesCompAssumptions,
    SeatsAndEnvsAssumptions,
    ServicesAssumptions,
    UsageAssumptions,
    UsageMonetization,
)
from opex import OpexBreakdown, OpexEngine
from revenue import RevenueBreakdown, RevenueEngine
from statements import AggregatedPnL, BalanceSheetSnapshot, CashFlowStatement, StatementsEngine
from validation import ValidationEngine, ValidationReport


@dataclass
class ModelInputs:
    """Container for all model inputs"""

    # Required fields (no defaults) - must come first
    # Dimensions
    scenario_id: str
    segments: List[str]
    channels: List[str]
    months: List[date]
    sku_breakdown: Dict[str, str]

    # Cohort inputs (required)
    funnel_assumptions: List[FunnelAssumptions]
    retention_assumptions: List[RetentionAssumptions]

    # Revenue inputs (required)
    price_book: List[PriceBook]
    channel_terms: List[ChannelTerms]

    # COGS inputs (required)
    cogs_unit_costs: List[COGSUnitCosts]

    # OpEx inputs (required)
    headcount_plan: List[HeadcountPlan]
    opex_assumptions: List[OpexAssumptions]

    # Optional fields (with defaults) - must come after required
    # Cohort inputs (optional)
    new_logos_override: Optional[List[NewLogosOverride]] = None
    seats_envs_assumptions: Optional[List[SeatsAndEnvsAssumptions]] = None
    pack_attach_rates: Optional[List[PackAttachRates]] = None

    # Revenue inputs (optional)
    usage_assumptions: Optional[List[UsageAssumptions]] = None
    usage_monetization: Optional[List[UsageMonetization]] = None
    services_assumptions: Optional[List[ServicesAssumptions]] = None

    # OpEx inputs (optional)
    sales_comp_assumptions: Optional[List[SalesCompAssumptions]] = None

    # Working capital inputs (optional)
    billing_collections: Optional[List[BillingCollections]] = None
    payables: Optional[List[Payables]] = None

    # Initial balances
    initial_cash: Decimal = Decimal("0")
    initial_contributed_capital: Decimal = Decimal("0")


@dataclass
class ModelOutputs:
    """Container for all model outputs"""

    # Cohort outputs
    cohort_results: Dict[CohortKey, CohortState]
    cohort_df: pd.DataFrame

    # Revenue outputs
    revenue_results: Dict[CohortKey, RevenueBreakdown]
    revenue_df: pd.DataFrame

    # COGS outputs
    cogs_results: Dict[CohortKey, COGSBreakdown]
    cogs_df: pd.DataFrame

    # OpEx outputs
    opex_results: Dict[date, OpexBreakdown]
    opex_df: pd.DataFrame

    # Statement outputs
    pnl_results: Dict[date, AggregatedPnL]
    pnl_df: pd.DataFrame
    cashflow_results: Dict[date, CashFlowStatement]
    cashflow_df: pd.DataFrame
    balance_sheet_results: Dict[date, BalanceSheetSnapshot]
    balance_sheet_df: pd.DataFrame

    # Validation
    validation_report: ValidationReport
    validation_df: pd.DataFrame


class Orchestrator:
    """
    Orchestrates the full financial model calculation pipeline.

    Usage (classic):
        inputs = ModelInputs(...)
        orchestrator = Orchestrator(inputs)
        outputs = orchestrator.run()

    Usage (with RunSettings control plane):
        run_settings = RunSettings(scenario_id="base", start_month=..., end_month=...)
        company_settings = CompanySettings(...)
        inputs = ModelInputs(...)
        orchestrator = Orchestrator(inputs, run_settings=run_settings, company_settings=company_settings)
        outputs = orchestrator.run()

        # Auto-export if enabled in run_settings
        if run_settings.export_workbook:
            orchestrator.export_structured_excel(outputs)
    """

    def __init__(
        self,
        inputs: ModelInputs,
        run_settings: Optional[RunSettings] = None,
        company_settings: Optional[CompanySettings] = None,
    ):
        self.inputs = inputs
        self.run_settings = run_settings or RunSettings(
            scenario_id=inputs.scenario_id,
            start_month=inputs.months[0],
            end_month=inputs.months[-1],
        )
        self.company_settings = company_settings or CompanySettings()

        # Apply run settings to inputs
        self._apply_run_settings()

        # Initialize engines
        self.cohort_engine = CohortEngine(
            funnel_assumptions=inputs.funnel_assumptions,
            retention_assumptions=inputs.retention_assumptions,
            new_logos_override=inputs.new_logos_override,
            seats_envs_assumptions=inputs.seats_envs_assumptions,
            pack_attach_rates=inputs.pack_attach_rates,
        )

        self.revenue_engine = RevenueEngine(
            price_book=inputs.price_book,
            channel_terms=inputs.channel_terms,
            usage_assumptions=inputs.usage_assumptions,
            usage_monetization=inputs.usage_monetization,
            services_assumptions=inputs.services_assumptions,
        )

        self.cogs_engine = COGSEngine(
            cogs_unit_costs=inputs.cogs_unit_costs,
            usage_assumptions=inputs.usage_assumptions,
            services_assumptions=inputs.services_assumptions,
        )

        self.opex_engine = OpexEngine(
            headcount_plan=inputs.headcount_plan,
            opex_assumptions=inputs.opex_assumptions,
            sales_comp_assumptions=inputs.sales_comp_assumptions,
        )

        self.statements_engine = StatementsEngine(
            billing_collections=inputs.billing_collections,
            payables=inputs.payables,
            initial_cash=inputs.initial_cash,
            initial_contributed_capital=inputs.initial_contributed_capital,
        )

        self.validation_engine = ValidationEngine()

    def _apply_run_settings(self) -> None:
        """
        Apply RunSettings to filter and adjust inputs.

        This ensures:
        - Only months within [start_month, end_month] are processed
        - Only data for the selected scenario_id is used
        - Timing choices are applied to engine calculations
        """
        rs = self.run_settings

        # Filter months to the date range
        filtered_months = [
            m for m in self.inputs.months
            if rs.start_month <= m <= rs.end_month
        ]
        if filtered_months:
            self.inputs.months = filtered_months

        # Override scenario_id if different
        if rs.scenario_id != self.inputs.scenario_id:
            self.inputs.scenario_id = rs.scenario_id

        # Filter scenario-specific inputs
        self.inputs.funnel_assumptions = [
            f for f in self.inputs.funnel_assumptions
            if f.scenario_id == rs.scenario_id and rs.start_month <= f.month <= rs.end_month
        ]
        self.inputs.retention_assumptions = [
            r for r in self.inputs.retention_assumptions
            if r.scenario_id == rs.scenario_id
        ]
        self.inputs.cogs_unit_costs = [
            c for c in self.inputs.cogs_unit_costs
            if c.scenario_id == rs.scenario_id
        ]
        self.inputs.headcount_plan = [
            h for h in self.inputs.headcount_plan
            if h.scenario_id == rs.scenario_id and rs.start_month <= h.month <= rs.end_month
        ]
        self.inputs.opex_assumptions = [
            o for o in self.inputs.opex_assumptions
            if o.scenario_id == rs.scenario_id and rs.start_month <= o.month <= rs.end_month
        ]

        if self.inputs.new_logos_override:
            self.inputs.new_logos_override = [
                n for n in self.inputs.new_logos_override
                if n.scenario_id == rs.scenario_id and rs.start_month <= n.month <= rs.end_month
            ]

        if self.inputs.usage_assumptions:
            self.inputs.usage_assumptions = [
                u for u in self.inputs.usage_assumptions
                if u.scenario_id == rs.scenario_id
            ]

        if self.inputs.sales_comp_assumptions:
            self.inputs.sales_comp_assumptions = [
                s for s in self.inputs.sales_comp_assumptions
                if s.scenario_id == rs.scenario_id
            ]

        if self.inputs.billing_collections:
            self.inputs.billing_collections = [
                b for b in self.inputs.billing_collections
                if b.scenario_id == rs.scenario_id
            ]

        if self.inputs.payables:
            self.inputs.payables = [
                p for p in self.inputs.payables
                if p.scenario_id == rs.scenario_id
            ]

    def run(self) -> ModelOutputs:
        """
        Run the full calculation pipeline.

        Returns ModelOutputs with all calculated results and validation.
        """
        # Step 1: Run cohort calculations
        cohort_results = self.cohort_engine.run(
            months=self.inputs.months,
            scenario_id=self.inputs.scenario_id,
            segments=self.inputs.segments,
            channels=self.inputs.channels,
        )
        cohort_df = self.cohort_engine.to_dataframe(cohort_results)

        # Step 2: Run revenue calculations
        revenue_results = self.revenue_engine.run(
            cohort_results=cohort_results,
            sku_breakdown=self.inputs.sku_breakdown,
        )
        revenue_df = self.revenue_engine.to_dataframe(revenue_results)

        # Step 3: Run COGS calculations
        cogs_results = self.cogs_engine.run(
            cohort_results=cohort_results,
            revenue_results=revenue_results,
        )
        cogs_df = self.cogs_engine.to_dataframe(cogs_results)

        # Step 4: Run OpEx calculations
        opex_results = self.opex_engine.run(
            months=self.inputs.months,
            scenario_id=self.inputs.scenario_id,
            cohort_results=cohort_results,
            revenue_results=revenue_results,
        )
        opex_df = self.opex_engine.to_dataframe(opex_results, self.inputs.scenario_id)

        # Step 5: Run statement calculations
        pnl_results, cashflow_results, balance_sheet_results = self.statements_engine.run(
            months=self.inputs.months,
            scenario_id=self.inputs.scenario_id,
            revenue_results=revenue_results,
            cogs_results=cogs_results,
            opex_results=opex_results,
        )
        pnl_df = self.statements_engine.pnl_to_dataframe(pnl_results)
        cashflow_df = self.statements_engine.cashflow_to_dataframe(cashflow_results)
        balance_sheet_df = self.statements_engine.balance_sheet_to_dataframe(balance_sheet_results)

        # Step 6: Run validation
        validation_report = self.validation_engine.run(
            scenario_id=self.inputs.scenario_id,
            months=self.inputs.months,
            cohort_results=cohort_results,
            revenue_results=revenue_results,
            cogs_results=cogs_results,
            pnl_results=pnl_results,
            cashflow_results=cashflow_results,
            balance_sheet_results=balance_sheet_results,
        )
        validation_df = self.validation_engine.to_dataframe(validation_report)

        return ModelOutputs(
            cohort_results=cohort_results,
            cohort_df=cohort_df,
            revenue_results=revenue_results,
            revenue_df=revenue_df,
            cogs_results=cogs_results,
            cogs_df=cogs_df,
            opex_results=opex_results,
            opex_df=opex_df,
            pnl_results=pnl_results,
            pnl_df=pnl_df,
            cashflow_results=cashflow_results,
            cashflow_df=cashflow_df,
            balance_sheet_results=balance_sheet_results,
            balance_sheet_df=balance_sheet_df,
            validation_report=validation_report,
            validation_df=validation_df,
        )

    def export_to_excel(self, outputs: ModelOutputs, filepath: str) -> None:
        """Export all outputs to a single Excel workbook"""
        with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
            outputs.cohort_df.to_excel(writer, sheet_name="Cohorts", index=False)
            outputs.revenue_df.to_excel(writer, sheet_name="Revenue", index=False)
            outputs.cogs_df.to_excel(writer, sheet_name="COGS", index=False)
            outputs.opex_df.to_excel(writer, sheet_name="OpEx", index=False)
            outputs.pnl_df.to_excel(writer, sheet_name="P&L", index=False)
            outputs.cashflow_df.to_excel(writer, sheet_name="Cash Flow", index=False)
            outputs.balance_sheet_df.to_excel(writer, sheet_name="Balance Sheet", index=False)
            outputs.validation_df.to_excel(writer, sheet_name="Validation", index=False)

    def export_to_csv(self, outputs: ModelOutputs, output_dir: str) -> None:
        """Export all outputs to separate CSV files"""
        import os

        os.makedirs(output_dir, exist_ok=True)

        outputs.cohort_df.to_csv(f"{output_dir}/cohorts.csv", index=False)
        outputs.revenue_df.to_csv(f"{output_dir}/revenue.csv", index=False)
        outputs.cogs_df.to_csv(f"{output_dir}/cogs.csv", index=False)
        outputs.opex_df.to_csv(f"{output_dir}/opex.csv", index=False)
        outputs.pnl_df.to_csv(f"{output_dir}/pnl.csv", index=False)
        outputs.cashflow_df.to_csv(f"{output_dir}/cashflow.csv", index=False)
        outputs.balance_sheet_df.to_csv(f"{output_dir}/balance_sheet.csv", index=False)
        outputs.validation_df.to_csv(f"{output_dir}/validation.csv", index=False)


def generate_month_range(start_year: int, start_month: int, num_months: int) -> List[date]:
    """Generate a list of monthly dates"""
    months = []
    year = start_year
    month = start_month

    for _ in range(num_months):
        months.append(date(year, month, 1))
        month += 1
        if month > 12:
            month = 1
            year += 1

    return months


def create_example_inputs() -> ModelInputs:
    """Create example inputs for demonstration"""
    from models import BillingPeriod, ChannelModel, Function, PriceModel, ServicesDelivery

    # Define time horizon: 24 months starting Jan 2025
    months = generate_month_range(2025, 1, 24)

    # Define segments and channels
    segments = ["smb", "mid"]
    channels = ["direct", "partner"]

    # SKU breakdown
    sku_breakdown = {
        "platform_base": "base",
        "ai_pack": "pack",
        "analytics_addon": "addon",
    }

    # Funnel assumptions (simplified: same for all months)
    funnel_assumptions = []
    for month in months:
        for segment in segments:
            for channel in channels:
                leads = 100 if segment == "smb" else 50
                leads = int(leads * (0.6 if channel == "partner" else 1.0))

                lead_to_sql = Decimal("0.30") if segment == "smb" else Decimal("0.40")
                sql_to_win = Decimal("0.20") if channel == "direct" else Decimal("0.30")

                funnel_assumptions.append(
                    FunnelAssumptions(
                        month=month,
                        scenario_id="base",
                        segment_id=segment,
                        channel_id=channel,
                        leads=leads,
                        lead_to_sql=lead_to_sql,
                        sql_to_win=sql_to_win,
                        sales_cycle_months=2,
                    )
                )

    # Retention assumptions
    retention_assumptions = []
    for segment in segments:
        for channel in channels:
            churn = Decimal("0.03") if segment == "smb" else Decimal("0.02")
            churn = churn * (Decimal("0.8") if channel == "partner" else Decimal("1.0"))

            retention_assumptions.append(
                RetentionAssumptions(
                    scenario_id="base",
                    segment_id=segment,
                    channel_id=channel,
                    logo_churn_m=churn,
                    revenue_churn_m=churn * Decimal("0.5"),
                    expansion_m=Decimal("0.02"),
                )
            )

    # Price book
    price_book = [
        PriceBook(
            sku_id="platform_base",
            billing_period=BillingPeriod.ANNUAL,
            price_model=PriceModel.PER_TENANT,
            list_price=Decimal("12000"),
            annual_prepay_discount_pct=Decimal("0.0"),
            default_discount_pct=Decimal("0.0"),
        ),
        PriceBook(
            sku_id="ai_pack",
            billing_period=BillingPeriod.ANNUAL,
            price_model=PriceModel.PER_TENANT,
            list_price=Decimal("6000"),
            annual_prepay_discount_pct=Decimal("0.0"),
            default_discount_pct=Decimal("0.0"),
        ),
        PriceBook(
            sku_id="analytics_addon",
            billing_period=BillingPeriod.MONTHLY,
            price_model=PriceModel.PER_SEAT,
            list_price=Decimal("50"),
            annual_prepay_discount_pct=Decimal("0.0"),
            default_discount_pct=Decimal("0.0"),
        ),
    ]

    # Channel terms
    channel_terms = [
        ChannelTerms(
            channel_id="direct",
            model=ChannelModel.RESALE_DISCOUNT,
            resale_discount_pct=Decimal("0.0"),
            revshare_pct=Decimal("0.0"),
            referral_fee_pct=Decimal("0.0"),
            channel_addon_fee_pct=Decimal("0.0"),
            services_delivery=ServicesDelivery.YOU,
            services_split_pct_to_partner=Decimal("0.0"),
        ),
        ChannelTerms(
            channel_id="partner",
            model=ChannelModel.REVSHARE,
            resale_discount_pct=Decimal("0.0"),
            revshare_pct=Decimal("0.20"),
            referral_fee_pct=Decimal("0.0"),
            channel_addon_fee_pct=Decimal("0.0"),
            services_delivery=ServicesDelivery.SPLIT,
            services_split_pct_to_partner=Decimal("0.50"),
        ),
    ]

    # COGS unit costs
    cogs_unit_costs = [
        COGSUnitCosts(
            scenario_id="base",
            llm_cost_per_1k_tokens=Decimal("0.003"),
            embed_cost_per_1k_tokens=Decimal("0.0001"),
            compute_cost_per_hour=Decimal("0.10"),
            storage_cost_per_gb_m=Decimal("0.023"),
            support_cost_per_ticket=Decimal("25.00"),
            fixed_platform_cogs_m=Decimal("5000.00"),
        ),
    ]

    # Headcount plan (simplified)
    headcount_plan = [
        HeadcountPlan(
            month=months[0],
            scenario_id="base",
            function=Function.ENG,
            hires=5,
            fully_loaded_annual=Decimal("200000"),
            ramp_months=3,
        ),
        HeadcountPlan(
            month=months[0],
            scenario_id="base",
            function=Function.SALES,
            hires=3,
            fully_loaded_annual=Decimal("150000"),
            ramp_months=6,
        ),
        HeadcountPlan(
            month=months[0],
            scenario_id="base",
            function=Function.CS,
            hires=2,
            fully_loaded_annual=Decimal("120000"),
            ramp_months=3,
        ),
        HeadcountPlan(
            month=months[0],
            scenario_id="base",
            function=Function.GA,
            hires=2,
            fully_loaded_annual=Decimal("130000"),
            ramp_months=2,
        ),
    ]

    # OpEx assumptions
    opex_assumptions = []
    for month in months:
        opex_assumptions.append(
            OpexAssumptions(
                month=month,
                scenario_id="base",
                marketing_spend_m=Decimal("15000"),
                tools_and_software_m=Decimal("5000"),
                legal_and_accounting_m=Decimal("3000"),
                rent_and_admin_m=Decimal("8000"),
                other_opex_m=Decimal("2000"),
            )
        )

    return ModelInputs(
        scenario_id="base",
        segments=segments,
        channels=channels,
        months=months,
        sku_breakdown=sku_breakdown,
        funnel_assumptions=funnel_assumptions,
        retention_assumptions=retention_assumptions,
        price_book=price_book,
        channel_terms=channel_terms,
        cogs_unit_costs=cogs_unit_costs,
        headcount_plan=headcount_plan,
        opex_assumptions=opex_assumptions,
        initial_cash=Decimal("1000000"),
        initial_contributed_capital=Decimal("1000000"),
    )
