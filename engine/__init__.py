"""
AICR Financial Model Engine

A pure-function financial modeling engine that produces 3-statement
outputs from structured input tables.

Core Design Rule:
    Inputs are tables. Outputs are tables.
    No logic lives in "cells." Logic lives in the engine and is testable.

Usage:
    from engine import Orchestrator, ModelInputs, create_example_inputs

    inputs = create_example_inputs()  # Or load from Grist/CSV
    orchestrator = Orchestrator(inputs)
    outputs = orchestrator.run()

    # Access results
    pnl_df = outputs.pnl_df
    validation_passed = outputs.validation_report.passed

    # Export
    orchestrator.export_to_csv(outputs, "output/")
"""

# Cohort module
from cohorts import CohortEngine, CohortKey, CohortState

# Revenue module
from revenue import RevenueBreakdown, RevenueEngine

# COGS module
from cogs import COGSBreakdown, COGSEngine

# OpEx module
from opex import HeadcountState, OpexBreakdown, OpexEngine

# Statements module
from statements import (
    AggregatedPnL,
    BalanceSheetSnapshot,
    CashFlowStatement,
    StatementsEngine,
)

# Validation module
from validation import (
    ValidationEngine,
    ValidationReport,
    ValidationResult,
    ValidationSeverity,
)

# Orchestrator
from orchestrator import (
    ModelInputs,
    ModelOutputs,
    Orchestrator,
    create_example_inputs,
    generate_month_range,
)

# Data models
from models import (
    # Enums
    BillingPeriod,
    ChannelModel,
    ChannelType,
    Function,
    PriceModel,
    ServicesDelivery,
    SKUType,
    SKUUnit,
    # Dimensions
    DimChannel,
    DimScenario,
    DimSegment,
    DimSKU,
    # Pricing
    ChannelTerms,
    PackAttachRates,
    PriceBook,
    # Demand
    FunnelAssumptions,
    NewLogosOverride,
    RetentionAssumptions,
    SeatsAndEnvsAssumptions,
    # Usage
    UsageAssumptions,
    UsageMonetization,
    # COGS
    COGSUnitCosts,
    # Services
    ServicesAssumptions,
    # OpEx
    HeadcountPlan,
    OpexAssumptions,
    SalesCompAssumptions,
    # Working Capital
    BillingCollections,
    Payables,
    # Outputs
    OutputBalanceSheet,
    OutputCashFlow,
    OutputChannelScorecard,
    OutputPnL,
    OutputUnitEconomics,
)

__version__ = "0.1.0"
__all__ = [
    # Engines
    "CohortEngine",
    "RevenueEngine",
    "COGSEngine",
    "OpexEngine",
    "StatementsEngine",
    "ValidationEngine",
    "Orchestrator",
    # Data classes
    "CohortKey",
    "CohortState",
    "RevenueBreakdown",
    "COGSBreakdown",
    "HeadcountState",
    "OpexBreakdown",
    "AggregatedPnL",
    "CashFlowStatement",
    "BalanceSheetSnapshot",
    "ValidationReport",
    "ValidationResult",
    "ValidationSeverity",
    "ModelInputs",
    "ModelOutputs",
    # Models
    "BillingPeriod",
    "ChannelModel",
    "ChannelType",
    "Function",
    "PriceModel",
    "ServicesDelivery",
    "SKUType",
    "SKUUnit",
    "DimChannel",
    "DimScenario",
    "DimSegment",
    "DimSKU",
    "ChannelTerms",
    "PackAttachRates",
    "PriceBook",
    "FunnelAssumptions",
    "NewLogosOverride",
    "RetentionAssumptions",
    "SeatsAndEnvsAssumptions",
    "UsageAssumptions",
    "UsageMonetization",
    "COGSUnitCosts",
    "ServicesAssumptions",
    "HeadcountPlan",
    "OpexAssumptions",
    "SalesCompAssumptions",
    "BillingCollections",
    "Payables",
    # Helpers
    "create_example_inputs",
    "generate_month_range",
]
