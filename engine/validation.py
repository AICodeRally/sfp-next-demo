"""
Validation Gates Engine

Enforces model integrity through validation rules:
- No negative actives
- Rates in bounds [0,1]
- Revenue reconciliation
- COGS reconciliation
- Cash roll-forward
- Balance sheet balances
"""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from enum import Enum
from typing import Dict, List, Optional

from cohorts import CohortKey, CohortState
from cogs import COGSBreakdown
from revenue import RevenueBreakdown
from statements import AggregatedPnL, BalanceSheetSnapshot, CashFlowStatement


class ValidationSeverity(str, Enum):
    ERROR = "error"  # Blocks model run
    WARNING = "warning"  # Flags for review
    INFO = "info"  # Informational


@dataclass
class ValidationResult:
    """Result of a single validation check"""

    gate_id: str
    description: str
    severity: ValidationSeverity
    passed: bool
    message: str
    context: Optional[Dict] = None


@dataclass
class ValidationReport:
    """Complete validation report for a model run"""

    scenario_id: str
    timestamp: str
    results: List[ValidationResult]
    error_count: int = 0
    warning_count: int = 0
    passed: bool = True

    def __post_init__(self):
        self.error_count = sum(1 for r in self.results if not r.passed and r.severity == ValidationSeverity.ERROR)
        self.warning_count = sum(
            1 for r in self.results if not r.passed and r.severity == ValidationSeverity.WARNING
        )
        self.passed = self.error_count == 0


class ValidationEngine:
    """
    Runs validation gates against model outputs.

    Gates are configurable and can be enabled/disabled per scenario.
    """

    def __init__(self, tolerance: Decimal = Decimal("0.01")):
        self.tolerance = tolerance  # Rounding tolerance for reconciliation checks

    # =========================================================================
    # COHORT VALIDATIONS
    # =========================================================================

    def validate_no_negative_actives(
        self,
        cohort_results: Dict[CohortKey, CohortState],
    ) -> List[ValidationResult]:
        """Gate: No negative active logos"""
        results = []

        for key, state in cohort_results.items():
            if state.active_logos < 0:
                results.append(
                    ValidationResult(
                        gate_id="no_negative_actives",
                        description="Active logos must not be negative",
                        severity=ValidationSeverity.ERROR,
                        passed=False,
                        message=f"Negative active logos at {key.month}/{key.segment_id}/{key.channel_id}: {state.active_logos}",
                        context={
                            "month": str(key.month),
                            "segment_id": key.segment_id,
                            "channel_id": key.channel_id,
                            "active_logos": float(state.active_logos),
                        },
                    )
                )

        if not results:
            results.append(
                ValidationResult(
                    gate_id="no_negative_actives",
                    description="Active logos must not be negative",
                    severity=ValidationSeverity.INFO,
                    passed=True,
                    message="All cohorts have non-negative active logos",
                )
            )

        return results

    def validate_churn_in_bounds(
        self,
        cohort_results: Dict[CohortKey, CohortState],
    ) -> List[ValidationResult]:
        """Gate: Churned logos should not exceed active logos"""
        results = []

        for key, state in cohort_results.items():
            # Churn should be between 0 and prior active
            if state.churned_logos < 0:
                results.append(
                    ValidationResult(
                        gate_id="churn_in_bounds",
                        description="Churned logos must be non-negative",
                        severity=ValidationSeverity.ERROR,
                        passed=False,
                        message=f"Negative churn at {key.month}: {state.churned_logos}",
                        context={"month": str(key.month), "churned_logos": float(state.churned_logos)},
                    )
                )

            # Check if churn exceeds what was available (retained + churned should equal prior)
            prior_active = state.retained_logos + state.churned_logos
            if state.churned_logos > prior_active and prior_active > 0:
                results.append(
                    ValidationResult(
                        gate_id="churn_in_bounds",
                        description="Churned logos should not exceed prior active",
                        severity=ValidationSeverity.WARNING,
                        passed=False,
                        message=f"Churn rate >100% at {key.month}: {state.churned_logos} churned from {prior_active} active",
                        context={
                            "month": str(key.month),
                            "churned_logos": float(state.churned_logos),
                            "prior_active": float(prior_active),
                        },
                    )
                )

        if not results:
            results.append(
                ValidationResult(
                    gate_id="churn_in_bounds",
                    description="Churn rates must be in valid range",
                    severity=ValidationSeverity.INFO,
                    passed=True,
                    message="All churn values are within bounds",
                )
            )

        return results

    def validate_cohort_flow(
        self,
        cohort_results: Dict[CohortKey, CohortState],
    ) -> List[ValidationResult]:
        """Gate: active = retained + new (flow reconciliation)"""
        results = []

        for key, state in cohort_results.items():
            expected = state.retained_logos + state.new_logos
            actual = state.active_logos
            diff = abs(expected - actual)

            if diff > self.tolerance:
                results.append(
                    ValidationResult(
                        gate_id="cohort_flow",
                        description="Active logos = retained + new",
                        severity=ValidationSeverity.ERROR,
                        passed=False,
                        message=f"Cohort flow mismatch at {key.month}: {actual} ≠ {expected}",
                        context={
                            "month": str(key.month),
                            "active": float(actual),
                            "retained": float(state.retained_logos),
                            "new": float(state.new_logos),
                            "expected": float(expected),
                        },
                    )
                )

        if not results:
            results.append(
                ValidationResult(
                    gate_id="cohort_flow",
                    description="Active logos = retained + new",
                    severity=ValidationSeverity.INFO,
                    passed=True,
                    message="All cohort flows reconcile",
                )
            )

        return results

    # =========================================================================
    # REVENUE VALIDATIONS
    # =========================================================================

    def validate_revenue_breakdown(
        self,
        revenue_results: Dict[CohortKey, RevenueBreakdown],
    ) -> List[ValidationResult]:
        """Gate: MRR total = base + packs + addons"""
        results = []

        for key, rev in revenue_results.items():
            expected = rev.mrr_base + rev.mrr_packs + rev.mrr_addons
            actual = rev.mrr_total
            diff = abs(expected - actual)

            if diff > self.tolerance:
                results.append(
                    ValidationResult(
                        gate_id="revenue_breakdown",
                        description="MRR total = base + packs + addons",
                        severity=ValidationSeverity.ERROR,
                        passed=False,
                        message=f"MRR breakdown mismatch at {key.month}: {actual} ≠ {expected}",
                        context={
                            "month": str(key.month),
                            "mrr_total": float(actual),
                            "mrr_base": float(rev.mrr_base),
                            "mrr_packs": float(rev.mrr_packs),
                            "mrr_addons": float(rev.mrr_addons),
                        },
                    )
                )

        if not results:
            results.append(
                ValidationResult(
                    gate_id="revenue_breakdown",
                    description="MRR total = base + packs + addons",
                    severity=ValidationSeverity.INFO,
                    passed=True,
                    message="All revenue breakdowns reconcile",
                )
            )

        return results

    def validate_arr_calculation(
        self,
        revenue_results: Dict[CohortKey, RevenueBreakdown],
    ) -> List[ValidationResult]:
        """Gate: ARR = MRR × 12"""
        results = []

        for key, rev in revenue_results.items():
            expected = rev.mrr_total * 12
            actual = rev.arr
            diff = abs(expected - actual)

            if diff > self.tolerance:
                results.append(
                    ValidationResult(
                        gate_id="arr_calculation",
                        description="ARR = MRR × 12",
                        severity=ValidationSeverity.ERROR,
                        passed=False,
                        message=f"ARR mismatch at {key.month}: {actual} ≠ {expected}",
                        context={
                            "month": str(key.month),
                            "arr": float(actual),
                            "mrr_total": float(rev.mrr_total),
                            "expected_arr": float(expected),
                        },
                    )
                )

        if not results:
            results.append(
                ValidationResult(
                    gate_id="arr_calculation",
                    description="ARR = MRR × 12",
                    severity=ValidationSeverity.INFO,
                    passed=True,
                    message="All ARR calculations are correct",
                )
            )

        return results

    def validate_net_revenue(
        self,
        revenue_results: Dict[CohortKey, RevenueBreakdown],
    ) -> List[ValidationResult]:
        """Gate: Net revenue = gross - channel discount"""
        results = []

        for key, rev in revenue_results.items():
            expected = rev.gross_revenue - rev.channel_discount
            actual = rev.net_revenue
            diff = abs(expected - actual)

            if diff > self.tolerance:
                results.append(
                    ValidationResult(
                        gate_id="net_revenue",
                        description="Net revenue = gross - discount",
                        severity=ValidationSeverity.ERROR,
                        passed=False,
                        message=f"Net revenue mismatch at {key.month}: {actual} ≠ {expected}",
                        context={
                            "month": str(key.month),
                            "net_revenue": float(actual),
                            "gross_revenue": float(rev.gross_revenue),
                            "channel_discount": float(rev.channel_discount),
                        },
                    )
                )

        if not results:
            results.append(
                ValidationResult(
                    gate_id="net_revenue",
                    description="Net revenue = gross - discount",
                    severity=ValidationSeverity.INFO,
                    passed=True,
                    message="All net revenue calculations are correct",
                )
            )

        return results

    # =========================================================================
    # COGS VALIDATIONS
    # =========================================================================

    def validate_cogs_breakdown(
        self,
        cogs_results: Dict[CohortKey, COGSBreakdown],
    ) -> List[ValidationResult]:
        """Gate: COGS total = variable + fixed + services"""
        results = []

        for key, cogs in cogs_results.items():
            expected = cogs.cogs_variable_total + cogs.cogs_fixed_total + cogs.cogs_services_total
            actual = cogs.cogs_total
            diff = abs(expected - actual)

            if diff > self.tolerance:
                results.append(
                    ValidationResult(
                        gate_id="cogs_breakdown",
                        description="COGS total = variable + fixed + services",
                        severity=ValidationSeverity.ERROR,
                        passed=False,
                        message=f"COGS breakdown mismatch at {key.month}: {actual} ≠ {expected}",
                        context={
                            "month": str(key.month),
                            "cogs_total": float(actual),
                            "cogs_variable": float(cogs.cogs_variable_total),
                            "cogs_fixed": float(cogs.cogs_fixed_total),
                            "cogs_services": float(cogs.cogs_services_total),
                        },
                    )
                )

        if not results:
            results.append(
                ValidationResult(
                    gate_id="cogs_breakdown",
                    description="COGS total = variable + fixed + services",
                    severity=ValidationSeverity.INFO,
                    passed=True,
                    message="All COGS breakdowns reconcile",
                )
            )

        return results

    def validate_variable_cogs_breakdown(
        self,
        cogs_results: Dict[CohortKey, COGSBreakdown],
    ) -> List[ValidationResult]:
        """Gate: Variable COGS = llm + embed + compute + storage + support"""
        results = []

        for key, cogs in cogs_results.items():
            expected = (
                cogs.cogs_llm_tokens
                + cogs.cogs_embeddings
                + cogs.cogs_compute
                + cogs.cogs_storage
                + cogs.cogs_support
            )
            actual = cogs.cogs_variable_total
            diff = abs(expected - actual)

            if diff > self.tolerance:
                results.append(
                    ValidationResult(
                        gate_id="variable_cogs_breakdown",
                        description="Variable COGS components sum correctly",
                        severity=ValidationSeverity.ERROR,
                        passed=False,
                        message=f"Variable COGS mismatch at {key.month}: {actual} ≠ {expected}",
                        context={
                            "month": str(key.month),
                            "variable_total": float(actual),
                            "llm": float(cogs.cogs_llm_tokens),
                            "embeddings": float(cogs.cogs_embeddings),
                            "compute": float(cogs.cogs_compute),
                            "storage": float(cogs.cogs_storage),
                            "support": float(cogs.cogs_support),
                        },
                    )
                )

        if not results:
            results.append(
                ValidationResult(
                    gate_id="variable_cogs_breakdown",
                    description="Variable COGS components sum correctly",
                    severity=ValidationSeverity.INFO,
                    passed=True,
                    message="All variable COGS breakdowns reconcile",
                )
            )

        return results

    # =========================================================================
    # FINANCIAL STATEMENT VALIDATIONS
    # =========================================================================

    def validate_gross_profit(
        self,
        pnl_results: Dict[date, AggregatedPnL],
    ) -> List[ValidationResult]:
        """Gate: Gross profit = net revenue - COGS - channel payouts"""
        results = []

        for month, pnl in pnl_results.items():
            expected = pnl.net_revenue - pnl.cogs_total - pnl.channel_payouts
            actual = pnl.gross_profit
            diff = abs(expected - actual)

            if diff > self.tolerance:
                results.append(
                    ValidationResult(
                        gate_id="gross_profit",
                        description="Gross profit = net revenue - COGS - payouts",
                        severity=ValidationSeverity.ERROR,
                        passed=False,
                        message=f"Gross profit mismatch at {month}: {actual} ≠ {expected}",
                        context={
                            "month": str(month),
                            "gross_profit": float(actual),
                            "net_revenue": float(pnl.net_revenue),
                            "cogs_total": float(pnl.cogs_total),
                            "channel_payouts": float(pnl.channel_payouts),
                        },
                    )
                )

        if not results:
            results.append(
                ValidationResult(
                    gate_id="gross_profit",
                    description="Gross profit = net revenue - COGS - payouts",
                    severity=ValidationSeverity.INFO,
                    passed=True,
                    message="All gross profit calculations are correct",
                )
            )

        return results

    def validate_ebitda(
        self,
        pnl_results: Dict[date, AggregatedPnL],
    ) -> List[ValidationResult]:
        """Gate: EBITDA = gross profit - OpEx"""
        results = []

        for month, pnl in pnl_results.items():
            expected = pnl.gross_profit - pnl.opex_total
            actual = pnl.ebitda
            diff = abs(expected - actual)

            if diff > self.tolerance:
                results.append(
                    ValidationResult(
                        gate_id="ebitda",
                        description="EBITDA = gross profit - OpEx",
                        severity=ValidationSeverity.ERROR,
                        passed=False,
                        message=f"EBITDA mismatch at {month}: {actual} ≠ {expected}",
                        context={
                            "month": str(month),
                            "ebitda": float(actual),
                            "gross_profit": float(pnl.gross_profit),
                            "opex_total": float(pnl.opex_total),
                        },
                    )
                )

        if not results:
            results.append(
                ValidationResult(
                    gate_id="ebitda",
                    description="EBITDA = gross profit - OpEx",
                    severity=ValidationSeverity.INFO,
                    passed=True,
                    message="All EBITDA calculations are correct",
                )
            )

        return results

    def validate_cash_roll_forward(
        self,
        cashflow_results: Dict[date, CashFlowStatement],
        months: List[date],
    ) -> List[ValidationResult]:
        """Gate: Cash end = cash begin + cash from operations"""
        results = []

        for i, month in enumerate(months):
            cf = cashflow_results.get(month)
            if not cf:
                continue

            expected = cf.cash_begin + cf.cash_from_operations
            actual = cf.cash_end
            diff = abs(expected - actual)

            if diff > self.tolerance:
                results.append(
                    ValidationResult(
                        gate_id="cash_roll_forward",
                        description="Cash end = begin + operations",
                        severity=ValidationSeverity.ERROR,
                        passed=False,
                        message=f"Cash roll-forward mismatch at {month}: {actual} ≠ {expected}",
                        context={
                            "month": str(month),
                            "cash_end": float(actual),
                            "cash_begin": float(cf.cash_begin),
                            "cash_from_operations": float(cf.cash_from_operations),
                        },
                    )
                )

            # Also check continuity: this month's begin = last month's end
            if i > 0:
                prior_cf = cashflow_results.get(months[i - 1])
                if prior_cf:
                    if abs(cf.cash_begin - prior_cf.cash_end) > self.tolerance:
                        results.append(
                            ValidationResult(
                                gate_id="cash_continuity",
                                description="Cash begin = prior month's cash end",
                                severity=ValidationSeverity.ERROR,
                                passed=False,
                                message=f"Cash continuity break at {month}: begin {cf.cash_begin} ≠ prior end {prior_cf.cash_end}",
                                context={
                                    "month": str(month),
                                    "cash_begin": float(cf.cash_begin),
                                    "prior_cash_end": float(prior_cf.cash_end),
                                },
                            )
                        )

        if not results:
            results.append(
                ValidationResult(
                    gate_id="cash_roll_forward",
                    description="Cash roll-forward and continuity",
                    severity=ValidationSeverity.INFO,
                    passed=True,
                    message="Cash roll-forward validates correctly",
                )
            )

        return results

    def validate_balance_sheet_balances(
        self,
        balance_sheet_results: Dict[date, BalanceSheetSnapshot],
    ) -> List[ValidationResult]:
        """Gate: Assets = Liabilities + Equity"""
        results = []

        for month, bs in balance_sheet_results.items():
            diff = abs(bs.total_assets - bs.total_liabilities_equity)

            if diff > self.tolerance:
                results.append(
                    ValidationResult(
                        gate_id="balance_sheet_balances",
                        description="Assets = Liabilities + Equity",
                        severity=ValidationSeverity.ERROR,
                        passed=False,
                        message=f"Balance sheet doesn't balance at {month}: {bs.total_assets} ≠ {bs.total_liabilities_equity}",
                        context={
                            "month": str(month),
                            "total_assets": float(bs.total_assets),
                            "total_liabilities": float(bs.total_liabilities),
                            "total_equity": float(bs.total_equity),
                            "total_liabilities_equity": float(bs.total_liabilities_equity),
                        },
                    )
                )

        if not results:
            results.append(
                ValidationResult(
                    gate_id="balance_sheet_balances",
                    description="Assets = Liabilities + Equity",
                    severity=ValidationSeverity.INFO,
                    passed=True,
                    message="All balance sheets balance correctly",
                )
            )

        return results

    # =========================================================================
    # RUN ALL VALIDATIONS
    # =========================================================================

    def run(
        self,
        scenario_id: str,
        months: List[date],
        cohort_results: Dict[CohortKey, CohortState],
        revenue_results: Dict[CohortKey, RevenueBreakdown],
        cogs_results: Dict[CohortKey, COGSBreakdown],
        pnl_results: Dict[date, AggregatedPnL],
        cashflow_results: Dict[date, CashFlowStatement],
        balance_sheet_results: Dict[date, BalanceSheetSnapshot],
    ) -> ValidationReport:
        """
        Run all validation gates and return comprehensive report.
        """
        from datetime import datetime

        all_results: List[ValidationResult] = []

        # Cohort validations
        all_results.extend(self.validate_no_negative_actives(cohort_results))
        all_results.extend(self.validate_churn_in_bounds(cohort_results))
        all_results.extend(self.validate_cohort_flow(cohort_results))

        # Revenue validations
        all_results.extend(self.validate_revenue_breakdown(revenue_results))
        all_results.extend(self.validate_arr_calculation(revenue_results))
        all_results.extend(self.validate_net_revenue(revenue_results))

        # COGS validations
        all_results.extend(self.validate_cogs_breakdown(cogs_results))
        all_results.extend(self.validate_variable_cogs_breakdown(cogs_results))

        # P&L validations
        all_results.extend(self.validate_gross_profit(pnl_results))
        all_results.extend(self.validate_ebitda(pnl_results))

        # Cash flow validations
        all_results.extend(self.validate_cash_roll_forward(cashflow_results, months))

        # Balance sheet validations
        all_results.extend(self.validate_balance_sheet_balances(balance_sheet_results))

        return ValidationReport(
            scenario_id=scenario_id,
            timestamp=datetime.now().isoformat(),
            results=all_results,
        )

    def to_dataframe(self, report: ValidationReport) -> pd.DataFrame:
        """Convert validation report to DataFrame for output"""
        import pandas as pd

        records = []
        for result in report.results:
            records.append(
                {
                    "gate_id": result.gate_id,
                    "description": result.description,
                    "severity": result.severity.value,
                    "passed": result.passed,
                    "message": result.message,
                }
            )
        return pd.DataFrame(records)
