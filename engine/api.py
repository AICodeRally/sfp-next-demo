"""
FastAPI endpoints for the AICR Financial Model Engine.

Provides REST API for running models, validation, and export.
"""

import json
from datetime import date
from decimal import Decimal
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="SFP Financial Model Engine",
    description="Startup Financial Planning - 3-statement financial model engine",
    version="0.1.0",
)

# Add CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3030",  # Local dev
        "https://*.vercel.app",   # Vercel previews
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================


class ModelHorizon(BaseModel):
    startMonth: str  # YYYY-MM format
    monthsForward: int
    currency: str = "USD"


class AIControlsInput(BaseModel):
    costPer1kTokens: float
    cacheHitPct: float
    tokensPerRun: float


class ChannelInput(BaseModel):
    sharePct: float
    mode: str
    feePct: float
    discountPct: float


class SettingsInput(BaseModel):
    modelHorizon: ModelHorizon
    scenarioMode: str = "base"
    aiCostControls: AIControlsInput
    channel: ChannelInput


class CohortPlanRow(BaseModel):
    id: str
    monthOffset: int
    newCustomers: int


class PricingPlanRow(BaseModel):
    id: str
    name: str
    billing: str
    price: float
    users: int


class RetentionRow(BaseModel):
    id: str
    segment: str
    channel: str
    logoChurnPct: float
    revenueChurnPct: float
    expansionPct: float


class UsageRow(BaseModel):
    id: str
    segment: str
    channel: str
    tokensPerTenant: float
    computeHours: float
    storageGb: float


class CogsUnitCostRow(BaseModel):
    id: str
    costName: str
    unit: str
    unitCost: float


class ExpenseRow(BaseModel):
    id: str
    category: str
    monthlyCost: float


class HeadcountRow(BaseModel):
    id: str
    role: str
    count: int
    fullyLoadedCost: float


class SkuRow(BaseModel):
    id: str
    name: str
    category: str
    basePrice: float
    costPct: float


class ServicesSkuRow(BaseModel):
    id: str
    name: str
    price: float
    costPct: float


class ServicesAttachRow(BaseModel):
    id: str
    monthOffset: int
    attachRatePct: float


class DeliveryCapacityRow(BaseModel):
    id: str
    role: str
    monthlyCapacity: float
    cost: float


class TablesInput(BaseModel):
    pricingPlans: List[PricingPlanRow]
    cohortPlan: List[CohortPlanRow]
    retentionAssumptions: List[RetentionRow] = []
    usageAssumptions: List[UsageRow] = []
    cogsUnitCosts: List[CogsUnitCostRow] = []
    expensePlan: List[ExpenseRow] = []
    headcountPlan: List[HeadcountRow] = []
    skus: List[SkuRow] = []
    servicesSku: List[ServicesSkuRow] = []
    servicesAttachPlan: List[ServicesAttachRow] = []
    deliveryCapacityPlan: List[DeliveryCapacityRow] = []


class RunModelRequest(BaseModel):
    scenarioId: str
    settings: SettingsInput
    tables: TablesInput


class ValidationResult(BaseModel):
    id: str
    severity: str
    passed: bool
    message: str


class StatementRow(BaseModel):
    month: str
    revenue: float
    cogs: float
    opex: float
    netIncome: float
    cashBalance: float


class MetricsRow(BaseModel):
    month: str
    arr: float
    aiCogsPct: float
    gmSaasPct: float
    gmServicesPct: float
    gmBlendedPct: float
    runwayMonths: float


class RunModelResponse(BaseModel):
    statementsMonthly: List[StatementRow]
    metricsMonthly: List[MetricsRow]
    lastRunAt: str
    runStatus: str
    validation: List[ValidationResult]


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================


def parse_month(month_str: str) -> date:
    """Parse YYYY-MM format to date"""
    year, month = month_str.split("-")
    return date(int(year), int(month), 1)


def format_month(d: date) -> str:
    """Format date to YYYY-MM"""
    return f"{d.year:04d}-{d.month:02d}"


def add_months(d: date, months: int) -> date:
    """Add months to a date"""
    total_months = d.month + months - 1
    new_year = d.year + total_months // 12
    new_month = total_months % 12 + 1
    return date(new_year, new_month, 1)


# =============================================================================
# SIMPLE MODEL RUNNER (Adapted from sfp-model.ts logic)
# =============================================================================


def run_simple_model(request: RunModelRequest) -> RunModelResponse:
    """
    Run a simplified financial model (adapted from sfp-model.ts).

    This provides backwards compatibility while the full engine is integrated.
    """
    from datetime import datetime

    settings = request.settings
    tables = request.tables

    start_month = parse_month(settings.modelHorizon.startMonth)
    months_forward = settings.modelHorizon.monthsForward

    # Get monthly price from first pricing plan
    monthly_price = 0.0
    if tables.pricingPlans:
        plan = tables.pricingPlans[0]
        if plan.billing == "annual":
            monthly_price = plan.price / 12
        else:
            monthly_price = plan.price

    # Build cohort entries
    cohort_entries = [
        {"monthOffset": row.monthOffset, "value": row.newCustomers}
        for row in tables.cohortPlan
    ]

    # Build attach rate entries
    attach_entries = [
        {"monthOffset": row.monthOffset, "value": row.attachRatePct}
        for row in tables.servicesAttachPlan
    ]

    # Get SKU and cost info
    saas_sku = next((s for s in tables.skus if s.category == "saas"), None)
    services_sku = tables.servicesSku[0] if tables.servicesSku else None

    retention = tables.retentionAssumptions[0] if tables.retentionAssumptions else None
    usage = tables.usageAssumptions[0] if tables.usageAssumptions else None

    # Get unit costs
    token_unit_cost = settings.aiCostControls.costPer1kTokens
    for cost in tables.cogsUnitCosts:
        if cost.unit == "token_1k":
            token_unit_cost = cost.unitCost
            break

    hour_unit_cost = 0.0
    storage_unit_cost = 0.0
    for cost in tables.cogsUnitCosts:
        if cost.unit == "hour":
            hour_unit_cost = cost.unitCost
        elif cost.unit == "gb":
            storage_unit_cost = cost.unitCost

    effective_cache = settings.aiCostControls.cacheHitPct

    # Calculate OpEx
    opex_base = sum(row.monthlyCost for row in tables.expensePlan)
    headcount_cost = sum(row.count * row.fullyLoadedCost for row in tables.headcountPlan)
    capacity_cost = sum(row.cost for row in tables.deliveryCapacityPlan)
    opex_total = opex_base + headcount_cost + capacity_cost

    # Channel factor
    channel = settings.channel
    channel_factor = 1 - (channel.sharePct / 100) * ((channel.feePct + channel.discountPct) / 100)

    # Run calculations
    statements_monthly = []
    metrics_monthly = []

    customers = 0.0
    cash_balance = 750000.0
    min_customers = float("inf")
    min_revenue = float("inf")
    min_cash = float("inf")
    min_gross_margin = float("inf")
    max_ai_cogs_pct = 0.0
    min_runway = float("inf")

    def get_tier_value(entries, month, fallback):
        sorted_entries = sorted(entries, key=lambda x: x["monthOffset"])
        current = fallback
        for entry in sorted_entries:
            if entry["monthOffset"] <= month:
                current = entry["value"]
        return current

    for month_idx in range(months_forward):
        month_date = add_months(start_month, month_idx)
        month_label = format_month(month_date)

        # Get new customers for this month
        new_customers = get_tier_value(cohort_entries, month_idx, 0)

        # Apply churn
        churn_rate = retention.logoChurnPct / 100 if retention else 0.0
        customers += new_customers
        churned = customers * churn_rate
        customers = max(0, customers - churned)

        # Calculate revenue
        saas_revenue = customers * monthly_price * channel_factor
        services_attach = get_tier_value(attach_entries, month_idx, 0) / 100
        services_revenue = new_customers * services_sku.price * services_attach if services_sku else 0

        # Calculate COGS
        saas_cogs = saas_revenue * (saas_sku.costPct / 100) if saas_sku else saas_revenue * 0.2
        services_cogs = services_revenue * (services_sku.costPct / 100) if services_sku else services_revenue * 0.4

        # AI COGS
        tokens_per_customer = usage.tokensPerTenant if usage else settings.aiCostControls.tokensPerRun
        compute_hours = usage.computeHours if usage else 0
        storage_gb = usage.storageGb if usage else 0

        ai_cogs = (
            (tokens_per_customer / 1000) * token_unit_cost * (1 - effective_cache / 100) * customers +
            compute_hours * hour_unit_cost * customers +
            storage_gb * storage_unit_cost * customers
        )

        total_revenue = saas_revenue + services_revenue
        total_cogs = saas_cogs + services_cogs + ai_cogs
        net_income = total_revenue - total_cogs - opex_total
        cash_balance += net_income

        runway_months = max(0, cash_balance / abs(net_income)) if net_income < 0 else 99

        statements_monthly.append(StatementRow(
            month=month_label,
            revenue=round(total_revenue, 2),
            cogs=round(total_cogs, 2),
            opex=round(opex_total, 2),
            netIncome=round(net_income, 2),
            cashBalance=round(cash_balance, 2),
        ))

        gm_saas_pct = ((saas_revenue - saas_cogs - ai_cogs) / saas_revenue * 100) if saas_revenue > 0 else 0
        gm_services_pct = ((services_revenue - services_cogs) / services_revenue * 100) if services_revenue > 0 else 0
        gm_blended_pct = ((total_revenue - total_cogs) / total_revenue * 100) if total_revenue > 0 else 0
        ai_cogs_pct = (ai_cogs / saas_revenue * 100) if saas_revenue > 0 else 0

        metrics_monthly.append(MetricsRow(
            month=month_label,
            arr=round(saas_revenue * 12, 2),
            aiCogsPct=round(ai_cogs_pct, 2),
            gmSaasPct=round(gm_saas_pct, 2),
            gmServicesPct=round(gm_services_pct, 2),
            gmBlendedPct=round(gm_blended_pct, 2),
            runwayMonths=round(runway_months, 1),
        ))

        min_customers = min(min_customers, customers)
        min_revenue = min(min_revenue, total_revenue)
        min_cash = min(min_cash, cash_balance)
        min_gross_margin = min(min_gross_margin, gm_blended_pct)
        max_ai_cogs_pct = max(max_ai_cogs_pct, ai_cogs_pct)
        min_runway = min(min_runway, runway_months)

    # Build validation results
    validation = [
        ValidationResult(
            id="no_negative_customers",
            severity="error",
            passed=min_customers >= 0,
            message="Active customers never below zero." if min_customers >= 0 else "Active customers dip below zero.",
        ),
        ValidationResult(
            id="revenue_non_negative",
            severity="error",
            passed=min_revenue >= 0,
            message="Revenue stays non-negative." if min_revenue >= 0 else "Revenue falls below zero.",
        ),
        ValidationResult(
            id="gross_margin_positive",
            severity="warning",
            passed=min_gross_margin >= 0,
            message="Gross margin remains positive." if min_gross_margin >= 0 else "Gross margin drops below zero.",
        ),
        ValidationResult(
            id="cash_balance_non_negative",
            severity="warning",
            passed=min_cash >= 0,
            message="Cash balance remains positive." if min_cash >= 0 else "Cash balance drops below zero.",
        ),
        ValidationResult(
            id="ai_cogs_ratio",
            severity="warning",
            passed=max_ai_cogs_pct <= 30,
            message="AI COGS stays within 30% of SaaS revenue." if max_ai_cogs_pct <= 30 else "AI COGS exceeds 30% of SaaS revenue.",
        ),
        ValidationResult(
            id="runway_health",
            severity="info",
            passed=min_runway >= 6,
            message="Runway stays above 6 months." if min_runway >= 6 else "Runway dips below 6 months.",
        ),
    ]

    return RunModelResponse(
        statementsMonthly=statements_monthly,
        metricsMonthly=metrics_monthly,
        lastRunAt=datetime.now().isoformat(),
        runStatus="success",
        validation=validation,
    )


# =============================================================================
# API ENDPOINTS
# =============================================================================


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "engine": "sfp-financial-model", "version": "0.1.0"}


@app.post("/run", response_model=RunModelResponse)
async def run_model(request: RunModelRequest):
    """
    Execute the financial model with provided inputs.

    Returns monthly statements, metrics, and validation results.
    """
    try:
        return run_simple_model(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/validate")
async def validate_model(request: RunModelRequest):
    """
    Run validation only without full model execution.
    """
    try:
        result = run_simple_model(request)
        return {
            "passed": all(v.passed for v in result.validation if v.severity == "error"),
            "validation": result.validation,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/export")
async def export_model(request: RunModelRequest):
    """
    Export model results to Excel format.

    Returns the Excel file as a download.
    """
    # TODO: Implement Excel export
    raise HTTPException(status_code=501, detail="Excel export not yet implemented")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
