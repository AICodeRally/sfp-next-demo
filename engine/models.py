"""
Data models for AICR Financial Model

Core design rule: Inputs are tables. Outputs are tables.
No logic lives in "cells." Logic lives in the engine and is testable.
"""

from datetime import date
from decimal import Decimal
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# =============================================================================
# ENUMS
# =============================================================================


class ChannelType(str, Enum):
    DIRECT = "direct"
    RESELLER = "reseller"
    REFERRAL = "referral"
    SI_PARTNER = "si_partner"


# -----------------------------------------------------------------------------
# RunSettings enums - control plane timing/allocation choices
# -----------------------------------------------------------------------------


class ChurnTiming(str, Enum):
    """When churn is applied in the cohort calculation"""
    START_OF_MONTH = "start_of_month"  # Churn before new logos arrive
    END_OF_MONTH = "end_of_month"      # Churn after new logos arrive


class NewLogoBilling(str, Enum):
    """When new logos start generating revenue"""
    SAME_MONTH = "same_month"          # Bill immediately on close
    NEXT_MONTH = "next_month"          # Bill starts following month


class AttachRampMode(str, Enum):
    """How pack/addon attach rates ramp over time"""
    IMMEDIATE = "immediate"            # Full attach rate from month 1
    LINEAR = "linear"                  # Linear ramp over attach_ramp_months
    S_CURVE = "s_curve"               # S-curve ramp over attach_ramp_months


class FixedCogsAllocation(str, Enum):
    """How fixed COGS is allocated across segments/channels"""
    BY_ACTIVE_LOGOS = "by_active_logos"    # Pro-rata by logo count
    BY_REVENUE = "by_revenue"              # Pro-rata by revenue
    FLAT_SPLIT = "flat_split"              # Equal split


class CollectionsMode(str, Enum):
    """Cash collection timing model"""
    SIMPLE_DSO = "simple_dso"              # AR = revenue × (DSO/30)
    AGING_BUCKETS = "aging_buckets"        # Detailed aging schedule


class PayablesMode(str, Enum):
    """Cash payment timing model"""
    SIMPLE_DPO = "simple_dpo"              # AP = COGS × (DPO/30)
    BY_VENDOR_CATEGORY = "by_vendor_category"  # Different terms by category


class ServicesRecognition(str, Enum):
    """When services revenue is recognized"""
    ON_CLOSE = "on_close"                  # Recognize immediately
    OVER_PERIOD = "over_period"            # Spread over delivery period


class OutputGrain(str, Enum):
    """Time granularity for outputs"""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"


class SKUType(str, Enum):
    BASE = "base"
    PACK = "pack"
    ADDON = "addon"
    USAGE = "usage"
    SERVICES = "services"


class SKUUnit(str, Enum):
    TENANT = "tenant"
    SEAT = "seat"
    ENV = "env"
    TOKEN_1K = "token_1k"
    CALL = "call"
    HOUR = "hour"
    PROJECT = "project"
    GB = "gb"


class BillingPeriod(str, Enum):
    MONTHLY = "monthly"
    ANNUAL = "annual"


class PriceModel(str, Enum):
    PER_TENANT = "per_tenant"
    PER_SEAT = "per_seat"
    PER_ENV = "per_env"
    PER_USAGE = "per_usage"
    FIXED = "fixed"


class ChannelModel(str, Enum):
    RESALE_DISCOUNT = "resale_discount"
    REVSHARE = "revshare"
    REFERRAL_FEE = "referral_fee"


class ServicesDelivery(str, Enum):
    YOU = "you"
    PARTNER = "partner"
    SPLIT = "split"


class Function(str, Enum):
    ENG = "eng"
    PRODUCT = "product"
    SALES = "sales"
    MARKETING = "marketing"
    CS = "cs"
    OPS = "ops"
    GA = "g&a"


# =============================================================================
# DIMENSION TABLES
# =============================================================================


class DimScenario(BaseModel):
    """Scenario registry"""

    scenario_id: str
    name: str
    description: str = ""
    is_active: bool = True


class DimSegment(BaseModel):
    """Customer segment definition"""

    segment_id: str
    name: str
    notes: str = ""


class DimChannel(BaseModel):
    """Channel partner definition"""

    channel_id: str
    name: str
    channel_type: ChannelType
    is_active: bool = True


class DimSKU(BaseModel):
    """SKU definition"""

    sku_id: str
    sku_type: SKUType
    name: str
    unit: SKUUnit
    is_active: bool = True


# =============================================================================
# PRICING & PACKAGING
# =============================================================================


class PriceBook(BaseModel):
    """List price + billing model per SKU"""

    sku_id: str
    billing_period: BillingPeriod
    price_model: PriceModel
    list_price: Decimal
    annual_prepay_discount_pct: Decimal = Decimal("0.0")
    default_discount_pct: Decimal = Decimal("0.0")
    notes: str = ""

    @field_validator("annual_prepay_discount_pct", "default_discount_pct")
    @classmethod
    def validate_pct(cls, v: Decimal) -> Decimal:
        if not (0 <= v <= 1):
            raise ValueError("Percentage must be between 0 and 1")
        return v


class PackAttachRates(BaseModel):
    """Pack/addon attach behavior per segment/channel"""

    segment_id: str
    channel_id: str
    sku_id: str
    attach_rate: Decimal  # 0.00–1.00
    attach_ramp_months: int = 3
    notes: str = ""

    @field_validator("attach_rate")
    @classmethod
    def validate_attach_rate(cls, v: Decimal) -> Decimal:
        if not (0 <= v <= 1):
            raise ValueError("Attach rate must be between 0 and 1")
        return v


class ChannelTerms(BaseModel):
    """Channel economics per partner"""

    channel_id: str
    model: ChannelModel
    resale_discount_pct: Decimal = Decimal("0.0")
    revshare_pct: Decimal = Decimal("0.0")
    referral_fee_pct: Decimal = Decimal("0.0")
    channel_addon_fee_pct: Decimal = Decimal("0.0")
    services_delivery: ServicesDelivery = ServicesDelivery.YOU
    services_split_pct_to_partner: Decimal = Decimal("0.0")
    payment_terms_days: int = 30
    notes: str = ""


# =============================================================================
# DEMAND / GROWTH
# =============================================================================


class FunnelAssumptions(BaseModel):
    """Lead→win dynamics per segment/channel (monthly)"""

    month: date
    scenario_id: str
    segment_id: str
    channel_id: str
    leads: int
    lead_to_sql: Decimal  # 0.00–1.00
    sql_to_win: Decimal  # 0.00–1.00
    sales_cycle_months: int = 2
    notes: str = ""


class NewLogosOverride(BaseModel):
    """Direct injection of wins (optional)"""

    month: date
    scenario_id: str
    segment_id: str
    channel_id: str
    new_logos: int
    notes: str = ""


class RetentionAssumptions(BaseModel):
    """Churn + expansion per segment/channel"""

    scenario_id: str
    segment_id: str
    channel_id: str
    logo_churn_m: Decimal  # monthly logo churn, 0.00–1.00
    revenue_churn_m: Decimal  # contraction on retained base, 0.00–1.00
    expansion_m: Decimal  # expansion on retained base, 0.00–1.00
    notes: str = ""


class SeatsAndEnvsAssumptions(BaseModel):
    """Per-seat/per-env pricing assumptions"""

    scenario_id: str
    segment_id: str
    channel_id: str
    seats_per_tenant_start: Decimal
    seats_growth_m: Decimal  # monthly growth rate
    envs_per_tenant_start: Decimal
    envs_growth_m: Decimal
    notes: str = ""


# =============================================================================
# USAGE
# =============================================================================


class UsageAssumptions(BaseModel):
    """Usage drivers per active tenant"""

    scenario_id: str
    segment_id: str
    channel_id: str
    tokens_per_tenant_m: Decimal
    embed_1k_tokens_per_tenant_m: Decimal
    compute_hours_per_tenant_m: Decimal
    storage_gb_per_tenant_m: Decimal
    support_tickets_per_tenant_m: Decimal
    notes: str = ""


class UsageMonetization(BaseModel):
    """Included allowance + overage pricing"""

    sku_id: str
    segment_id: str
    included_units_per_tenant_m: Decimal
    overage_price_per_unit: Decimal
    overage_take_rate: Decimal  # share that exceed allowance
    notes: str = ""


# =============================================================================
# COGS
# =============================================================================


class COGSUnitCosts(BaseModel):
    """Unit costs by driver"""

    scenario_id: str
    llm_cost_per_1k_tokens: Decimal
    embed_cost_per_1k_tokens: Decimal
    compute_cost_per_hour: Decimal
    storage_cost_per_gb_m: Decimal
    support_cost_per_ticket: Decimal
    fixed_platform_cogs_m: Decimal  # baseline hosting/min-commit
    notes: str = ""


# =============================================================================
# SERVICES
# =============================================================================


class ServicesAssumptions(BaseModel):
    """Implementation/advisory per new logo"""

    scenario_id: str
    segment_id: str
    channel_id: str
    impl_fee_per_new_logo: Decimal
    impl_cogs_pct: Decimal  # delivery cost as % of services revenue
    advisory_fee_m: Decimal = Decimal("0.0")
    advisory_cogs_pct: Decimal = Decimal("0.0")
    notes: str = ""


# =============================================================================
# OPEX
# =============================================================================


class HeadcountPlan(BaseModel):
    """Hiring plan by function"""

    month: date
    scenario_id: str
    function: Function
    hires: int  # net new heads starting this month
    fully_loaded_annual: Decimal
    ramp_months: int = 3
    notes: str = ""


class OpexAssumptions(BaseModel):
    """Non-headcount opex"""

    month: date
    scenario_id: str
    marketing_spend_m: Decimal
    tools_and_software_m: Decimal
    legal_and_accounting_m: Decimal
    rent_and_admin_m: Decimal
    other_opex_m: Decimal
    notes: str = ""


class SalesCompAssumptions(BaseModel):
    """Commissions / CAC modeling"""

    scenario_id: str
    segment_id: str
    channel_id: str
    commission_pct_of_sub_rev: Decimal
    cac_paid_per_new_logo: Decimal = Decimal("0.0")
    notes: str = ""


# =============================================================================
# WORKING CAPITAL
# =============================================================================


class BillingCollections(BaseModel):
    """Timing of cash receipts"""

    scenario_id: str
    bill_in_advance_pct: Decimal
    annual_prepaid_mix: Decimal
    dso_days: int
    bad_debt_pct: Decimal
    refunds_pct: Decimal
    notes: str = ""


class Payables(BaseModel):
    """Timing of cash outflows"""

    scenario_id: str
    dpo_days: int
    notes: str = ""


class Fundraising(BaseModel):
    """Funding rounds and equity injections"""

    round_name: str  # e.g., "Seed", "Series A"
    close_date: date
    amount: Decimal
    post_money_valuation: Optional[Decimal] = None
    dilution_pct: Optional[Decimal] = None
    notes: str = ""


# =============================================================================
# SETTINGS / CONTROL PLANE
# =============================================================================


class CompanySettings(BaseModel):
    """Company-level configuration (single row)"""

    company_name: str = "AICR"
    currency: str = "USD"
    tax_rate: Decimal = Decimal("0.25")
    shares_outstanding: Decimal = Decimal("10000000")
    fiscal_year_end_month: int = 12  # 1-12
    notes: str = ""

    @field_validator("fiscal_year_end_month")
    @classmethod
    def validate_month(cls, v: int) -> int:
        if not (1 <= v <= 12):
            raise ValueError("Fiscal year end month must be 1-12")
        return v


class RunSettings(BaseModel):
    """
    Control plane for model runs (single row).

    This is the "cockpit" that drives:
    - Which scenario to run
    - Date range for the forecast
    - Timing/allocation choices
    - Export settings

    The engine reads RunSettings FIRST, then filters all inputs accordingly.
    """

    # Run identification
    run_id: Optional[str] = None  # Auto-generated if not provided
    run_name: str = "Default Run"

    # Scenario + time range
    scenario_id: str = "base"
    start_month: date = Field(default_factory=lambda: date(2025, 1, 1))
    end_month: date = Field(default_factory=lambda: date(2026, 12, 1))

    # Timing choices (when things happen in the month)
    churn_timing: ChurnTiming = ChurnTiming.END_OF_MONTH
    new_logo_billing: NewLogoBilling = NewLogoBilling.SAME_MONTH
    attach_ramp_mode: AttachRampMode = AttachRampMode.LINEAR

    # Allocation modes (how costs/collections are distributed)
    fixed_cogs_allocation: FixedCogsAllocation = FixedCogsAllocation.BY_ACTIVE_LOGOS
    collections_mode: CollectionsMode = CollectionsMode.SIMPLE_DSO
    payables_mode: PayablesMode = PayablesMode.SIMPLE_DPO
    services_recognition: ServicesRecognition = ServicesRecognition.ON_CLOSE

    # Output settings
    output_grain: OutputGrain = OutputGrain.MONTHLY
    include_balance_sheet: bool = True
    include_unit_economics: bool = True

    # Export settings
    export_workbook: bool = True
    export_path: str = "output/aicr_fin_model.xlsx"

    notes: str = ""


class RunManifest(BaseModel):
    """
    Provenance record for each model run (written to 99_RunManifest).

    Captures everything needed to reproduce or audit a run.
    """

    run_id: str
    run_name: str
    scenario_id: str

    # Time bounds
    start_month: date
    end_month: date
    months_calculated: int

    # Settings snapshot
    settings_hash: str  # SHA-256 of serialized RunSettings

    # Execution metadata
    engine_version: str = "0.1.0"
    executed_at: str  # ISO timestamp
    execution_duration_ms: int

    # Git/versioning (if available)
    git_commit: Optional[str] = None
    git_branch: Optional[str] = None
    git_dirty: Optional[bool] = None

    # Input checksums
    inputs_hash: str  # SHA-256 of all input tables

    # Validation summary
    validation_passed: bool
    validation_errors: int
    validation_warnings: int

    # Output file info
    export_path: Optional[str] = None
    export_size_bytes: Optional[int] = None


# =============================================================================
# OUTPUT MODELS
# =============================================================================


class OutputUnitEconomics(BaseModel):
    """Unit economics output per month/segment/channel"""

    month: date
    scenario_id: str
    segment_id: str
    channel_id: str
    active_logos: Decimal
    new_logos: Decimal
    churned_logos: Decimal
    mrr: Decimal
    arr: Decimal
    gross_margin_pct: Decimal
    cac: Decimal
    ltv: Decimal
    payback_months: Decimal


class OutputPnL(BaseModel):
    """P&L output per month"""

    month: date
    scenario_id: str
    revenue_subscriptions: Decimal
    revenue_usage: Decimal
    revenue_services: Decimal
    revenue_total: Decimal
    cogs_variable: Decimal
    cogs_fixed: Decimal
    cogs_total: Decimal
    gross_profit: Decimal
    gross_margin_pct: Decimal
    opex_headcount: Decimal
    opex_sales_comp: Decimal
    opex_other: Decimal
    opex_total: Decimal
    ebitda: Decimal
    ebitda_margin_pct: Decimal


class OutputCashFlow(BaseModel):
    """Cash flow output per month"""

    month: date
    scenario_id: str
    cash_begin: Decimal
    cash_from_operations: Decimal
    cash_from_collections: Decimal
    cash_to_cogs: Decimal
    cash_to_opex: Decimal
    cash_to_payables: Decimal
    cash_in: Decimal
    cash_out: Decimal
    net_cash_flow: Decimal
    cash_end: Decimal


class OutputBalanceSheet(BaseModel):
    """Balance sheet output per month"""

    month: date
    scenario_id: str
    # Assets
    cash: Decimal
    ar: Decimal
    prepaid: Decimal = Decimal("0.0")
    total_assets: Decimal
    # Liabilities
    ap: Decimal
    deferred_revenue: Decimal
    accrued_expenses: Decimal = Decimal("0.0")
    total_liabilities: Decimal
    # Equity
    equity: Decimal
    retained_earnings: Decimal
    total_equity: Decimal
    total_liabilities_equity: Decimal


class OutputChannelScorecard(BaseModel):
    """Channel scorecard output per month/channel"""

    month: date
    scenario_id: str
    channel_id: str
    partner_sourced_leads: int
    partner_sourced_wins: int
    win_rate: Decimal
    avg_cycle_days: int
    gross_revenue: Decimal
    net_revenue: Decimal
    effective_take_rate: Decimal
    partner_payout: Decimal
    partner_profitability: Decimal
