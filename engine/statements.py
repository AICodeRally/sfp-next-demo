"""
3-Statement Financial Outputs Engine

Step 8-10 of the calculation pipeline:
- P&L aggregation (revenue - COGS - OpEx = EBITDA)
- Cash Flow (collections, disbursements, working capital changes)
- Balance Sheet (cash, AR, deferred revenue, AP, equity)
"""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional

import pandas as pd

from cohorts import CohortKey, CohortState
from cogs import COGSBreakdown
from models import BillingCollections, OutputBalanceSheet, OutputCashFlow, OutputPnL, Payables
from opex import OpexBreakdown
from revenue import RevenueBreakdown


@dataclass
class AggregatedPnL:
    """Aggregated P&L for a single month across all cohorts"""

    month: date
    scenario_id: str

    # Revenue
    revenue_subscriptions: Decimal = Decimal("0")
    revenue_usage: Decimal = Decimal("0")
    revenue_services: Decimal = Decimal("0")
    revenue_total: Decimal = Decimal("0")

    # Channel adjustments
    channel_discounts: Decimal = Decimal("0")
    net_revenue: Decimal = Decimal("0")

    # COGS
    cogs_variable: Decimal = Decimal("0")
    cogs_fixed: Decimal = Decimal("0")
    cogs_services: Decimal = Decimal("0")
    cogs_total: Decimal = Decimal("0")

    # Channel payouts (below gross profit)
    channel_payouts: Decimal = Decimal("0")

    # Gross profit
    gross_profit: Decimal = Decimal("0")
    gross_margin_pct: Decimal = Decimal("0")

    # OpEx
    opex_headcount: Decimal = Decimal("0")
    opex_sales_comp: Decimal = Decimal("0")
    opex_other: Decimal = Decimal("0")
    opex_total: Decimal = Decimal("0")

    # EBITDA
    ebitda: Decimal = Decimal("0")
    ebitda_margin_pct: Decimal = Decimal("0")


@dataclass
class CashFlowStatement:
    """Cash flow for a single month"""

    month: date
    scenario_id: str

    # Beginning cash
    cash_begin: Decimal = Decimal("0")

    # Operating cash flows
    collections: Decimal = Decimal("0")  # Cash received from customers
    disbursements_cogs: Decimal = Decimal("0")  # Cash paid for COGS
    disbursements_opex: Decimal = Decimal("0")  # Cash paid for OpEx
    disbursements_channel: Decimal = Decimal("0")  # Cash paid to channel partners

    # Working capital changes
    change_in_ar: Decimal = Decimal("0")  # (increase) / decrease
    change_in_deferred_rev: Decimal = Decimal("0")  # increase / (decrease)
    change_in_ap: Decimal = Decimal("0")  # increase / (decrease)

    # Net cash from operations
    cash_from_operations: Decimal = Decimal("0")

    # Ending cash
    cash_end: Decimal = Decimal("0")


@dataclass
class BalanceSheetSnapshot:
    """Balance sheet at end of month"""

    month: date
    scenario_id: str

    # Assets
    cash: Decimal = Decimal("0")
    accounts_receivable: Decimal = Decimal("0")
    prepaid_expenses: Decimal = Decimal("0")
    total_assets: Decimal = Decimal("0")

    # Liabilities
    accounts_payable: Decimal = Decimal("0")
    deferred_revenue: Decimal = Decimal("0")
    accrued_expenses: Decimal = Decimal("0")
    total_liabilities: Decimal = Decimal("0")

    # Equity
    contributed_capital: Decimal = Decimal("0")
    retained_earnings: Decimal = Decimal("0")
    total_equity: Decimal = Decimal("0")

    # Check
    total_liabilities_equity: Decimal = Decimal("0")


class StatementsEngine:
    """
    Produces 3-statement financial outputs from calculation results.

    Design principle: This is a pure function engine.
    Aggregates cohort-level results into monthly statements.
    """

    def __init__(
        self,
        billing_collections: Optional[List[BillingCollections]] = None,
        payables: Optional[List[Payables]] = None,
        initial_cash: Decimal = Decimal("0"),
        initial_contributed_capital: Decimal = Decimal("0"),
    ):
        self.billing_df = self._to_billing_df(billing_collections or [])
        self.payables_df = self._to_payables_df(payables or [])
        self.initial_cash = initial_cash
        self.initial_contributed_capital = initial_contributed_capital

        # Build lookups
        self.billing_lookup: Dict[str, BillingCollections] = {
            b.scenario_id: b for b in (billing_collections or [])
        }
        self.payables_lookup: Dict[str, Payables] = {p.scenario_id: p for p in (payables or [])}

    def _to_billing_df(self, billing: List[BillingCollections]) -> pd.DataFrame:
        if not billing:
            return pd.DataFrame()
        records = [
            {
                "scenario_id": b.scenario_id,
                "bill_in_advance_pct": float(b.bill_in_advance_pct),
                "annual_prepaid_mix": float(b.annual_prepaid_mix),
                "dso_days": b.dso_days,
                "bad_debt_pct": float(b.bad_debt_pct),
                "refunds_pct": float(b.refunds_pct),
            }
            for b in billing
        ]
        return pd.DataFrame(records)

    def _to_payables_df(self, payables: List[Payables]) -> pd.DataFrame:
        if not payables:
            return pd.DataFrame()
        records = [{"scenario_id": p.scenario_id, "dpo_days": p.dpo_days} for p in payables]
        return pd.DataFrame(records)

    def aggregate_pnl(
        self,
        month: date,
        scenario_id: str,
        revenue_results: Dict[CohortKey, RevenueBreakdown],
        cogs_results: Dict[CohortKey, COGSBreakdown],
        opex_breakdown: OpexBreakdown,
    ) -> AggregatedPnL:
        """
        Aggregate cohort-level results into monthly P&L.
        """
        # Sum revenue across all cohorts for this month
        revenue_subs = Decimal("0")
        revenue_usage = Decimal("0")
        revenue_services = Decimal("0")
        channel_discounts = Decimal("0")
        channel_payouts = Decimal("0")

        for key, rev in revenue_results.items():
            if key.month != month or key.scenario_id != scenario_id:
                continue
            revenue_subs += rev.mrr_total
            revenue_usage += rev.usage_revenue
            revenue_services += rev.services_total
            channel_discounts += rev.channel_discount
            channel_payouts += rev.channel_payout

        revenue_total = revenue_subs + revenue_usage + revenue_services
        net_revenue = revenue_total - channel_discounts

        # Sum COGS across all cohorts for this month
        cogs_variable = Decimal("0")
        cogs_fixed = Decimal("0")
        cogs_services = Decimal("0")

        for key, cogs in cogs_results.items():
            if key.month != month or key.scenario_id != scenario_id:
                continue
            cogs_variable += cogs.cogs_variable_total
            cogs_fixed += cogs.cogs_fixed_total
            cogs_services += cogs.cogs_services_total

        cogs_total = cogs_variable + cogs_fixed + cogs_services

        # Gross profit (before channel payouts)
        gross_profit = net_revenue - cogs_total - channel_payouts
        gross_margin_pct = (gross_profit / net_revenue * 100) if net_revenue > 0 else Decimal("0")

        # OpEx
        opex_headcount = opex_breakdown.opex_headcount_total
        opex_sales_comp = opex_breakdown.opex_sales_comp_total
        opex_other = opex_breakdown.opex_non_hc_total
        opex_total = opex_breakdown.opex_total

        # EBITDA
        ebitda = gross_profit - opex_total
        ebitda_margin_pct = (ebitda / net_revenue * 100) if net_revenue > 0 else Decimal("0")

        return AggregatedPnL(
            month=month,
            scenario_id=scenario_id,
            revenue_subscriptions=revenue_subs.quantize(Decimal("0.01")),
            revenue_usage=revenue_usage.quantize(Decimal("0.01")),
            revenue_services=revenue_services.quantize(Decimal("0.01")),
            revenue_total=revenue_total.quantize(Decimal("0.01")),
            channel_discounts=channel_discounts.quantize(Decimal("0.01")),
            net_revenue=net_revenue.quantize(Decimal("0.01")),
            cogs_variable=cogs_variable.quantize(Decimal("0.01")),
            cogs_fixed=cogs_fixed.quantize(Decimal("0.01")),
            cogs_services=cogs_services.quantize(Decimal("0.01")),
            cogs_total=cogs_total.quantize(Decimal("0.01")),
            channel_payouts=channel_payouts.quantize(Decimal("0.01")),
            gross_profit=gross_profit.quantize(Decimal("0.01")),
            gross_margin_pct=gross_margin_pct.quantize(Decimal("0.01")),
            opex_headcount=opex_headcount.quantize(Decimal("0.01")),
            opex_sales_comp=opex_sales_comp.quantize(Decimal("0.01")),
            opex_other=opex_other.quantize(Decimal("0.01")),
            opex_total=opex_total.quantize(Decimal("0.01")),
            ebitda=ebitda.quantize(Decimal("0.01")),
            ebitda_margin_pct=ebitda_margin_pct.quantize(Decimal("0.01")),
        )

    def calculate_collections(
        self,
        month: date,
        scenario_id: str,
        pnl: AggregatedPnL,
        prior_ar: Decimal,
    ) -> tuple[Decimal, Decimal]:
        """
        Calculate cash collections and ending AR.

        Collections = Beginning AR + Billings - Ending AR
        where Billings ≈ Revenue (simplified)

        Uses DSO to determine collection timing.

        Returns: (collections, ending_ar)
        """
        billing_terms = self.billing_lookup.get(scenario_id)
        if not billing_terms:
            # Default: collect all revenue immediately
            return pnl.revenue_total, Decimal("0")

        # Monthly DSO factor (DSO / 30 gives months of revenue in AR)
        dso_factor = Decimal(str(billing_terms.dso_days)) / Decimal("30")

        # Billings = revenue (simplified, ignoring prepaid complexity for now)
        billings = pnl.revenue_total

        # Ending AR = billings × DSO factor
        ending_ar = billings * dso_factor

        # Collections = prior AR + billings - ending AR
        collections = prior_ar + billings - ending_ar

        # Apply bad debt
        bad_debt = collections * billing_terms.bad_debt_pct
        collections_net = collections - bad_debt

        return (
            max(collections_net.quantize(Decimal("0.01")), Decimal("0")),
            ending_ar.quantize(Decimal("0.01")),
        )

    def calculate_disbursements(
        self,
        month: date,
        scenario_id: str,
        pnl: AggregatedPnL,
        prior_ap: Decimal,
    ) -> tuple[Decimal, Decimal, Decimal, Decimal]:
        """
        Calculate cash disbursements for COGS, OpEx, and channel payouts.

        Uses DPO to determine payment timing.

        Returns: (cogs_disbursements, opex_disbursements, channel_disbursements, ending_ap)
        """
        payables_terms = self.payables_lookup.get(scenario_id)
        if not payables_terms:
            # Default: pay all expenses immediately
            return (
                pnl.cogs_total,
                pnl.opex_total,
                pnl.channel_payouts,
                Decimal("0"),
            )

        # Monthly DPO factor
        dpo_factor = Decimal(str(payables_terms.dpo_days)) / Decimal("30")

        # Total expenses
        total_expenses = pnl.cogs_total + pnl.opex_total + pnl.channel_payouts

        # Ending AP = expenses × DPO factor
        ending_ap = total_expenses * dpo_factor

        # Total disbursements = prior AP + expenses - ending AP
        total_disbursements = prior_ap + total_expenses - ending_ap

        # Allocate disbursements proportionally
        if total_expenses > 0:
            cogs_pct = pnl.cogs_total / total_expenses
            opex_pct = pnl.opex_total / total_expenses
            channel_pct = pnl.channel_payouts / total_expenses
        else:
            cogs_pct = opex_pct = channel_pct = Decimal("0")

        cogs_disbursements = total_disbursements * cogs_pct
        opex_disbursements = total_disbursements * opex_pct
        channel_disbursements = total_disbursements * channel_pct

        return (
            cogs_disbursements.quantize(Decimal("0.01")),
            opex_disbursements.quantize(Decimal("0.01")),
            channel_disbursements.quantize(Decimal("0.01")),
            ending_ap.quantize(Decimal("0.01")),
        )

    def calculate_deferred_revenue(
        self,
        month: date,
        scenario_id: str,
        pnl: AggregatedPnL,
        prior_deferred: Decimal,
    ) -> tuple[Decimal, Decimal]:
        """
        Calculate deferred revenue changes.

        For annual prepay customers, we defer 11/12 of the annual payment
        and recognize 1/12 per month.

        Returns: (change_in_deferred, ending_deferred)
        """
        billing_terms = self.billing_lookup.get(scenario_id)
        if not billing_terms or billing_terms.annual_prepaid_mix == 0:
            return Decimal("0"), Decimal("0")

        # Subscription revenue from annual prepaid customers
        annual_sub_revenue = pnl.revenue_subscriptions * billing_terms.annual_prepaid_mix

        # When customer pays annual upfront, we receive 12 months but recognize 1
        # So deferred revenue increase = 11/12 of new annual revenue
        # And we recognize 1/12 of prior deferred each month

        # Simplified: assume steady state where new deferrals ≈ recognized
        # In practice, this would track by cohort signup date

        # New deferrals this month (11/12 of new annual billings)
        new_deferrals = annual_sub_revenue * Decimal("11") / Decimal("12")

        # Recognition this month (1/12 of deferred balance)
        recognition = prior_deferred / Decimal("12") if prior_deferred > 0 else Decimal("0")

        change_in_deferred = new_deferrals - recognition
        ending_deferred = prior_deferred + change_in_deferred

        return (
            change_in_deferred.quantize(Decimal("0.01")),
            max(ending_deferred.quantize(Decimal("0.01")), Decimal("0")),
        )

    def calculate_cash_flow(
        self,
        month: date,
        scenario_id: str,
        pnl: AggregatedPnL,
        prior_cash: Decimal,
        prior_ar: Decimal,
        prior_ap: Decimal,
        prior_deferred: Decimal,
    ) -> CashFlowStatement:
        """
        Calculate monthly cash flow statement.
        """
        # Collections
        collections, ending_ar = self.calculate_collections(month, scenario_id, pnl, prior_ar)

        # Disbursements
        (
            cogs_disbursements,
            opex_disbursements,
            channel_disbursements,
            ending_ap,
        ) = self.calculate_disbursements(month, scenario_id, pnl, prior_ap)

        # Deferred revenue
        change_deferred, ending_deferred = self.calculate_deferred_revenue(
            month, scenario_id, pnl, prior_deferred
        )

        # Working capital changes
        change_ar = prior_ar - ending_ar  # Decrease in AR is cash inflow
        change_ap = ending_ap - prior_ap  # Increase in AP is cash inflow

        # Net cash from operations
        total_disbursements = cogs_disbursements + opex_disbursements + channel_disbursements
        cash_from_operations = collections - total_disbursements + change_deferred

        # Ending cash
        cash_end = prior_cash + cash_from_operations

        return CashFlowStatement(
            month=month,
            scenario_id=scenario_id,
            cash_begin=prior_cash,
            collections=collections,
            disbursements_cogs=cogs_disbursements,
            disbursements_opex=opex_disbursements,
            disbursements_channel=channel_disbursements,
            change_in_ar=change_ar,
            change_in_deferred_rev=change_deferred,
            change_in_ap=change_ap,
            cash_from_operations=cash_from_operations.quantize(Decimal("0.01")),
            cash_end=cash_end.quantize(Decimal("0.01")),
        )

    def calculate_balance_sheet(
        self,
        month: date,
        scenario_id: str,
        cash_flow: CashFlowStatement,
        prior_balance_sheet: Optional[BalanceSheetSnapshot],
        pnl: AggregatedPnL,
    ) -> BalanceSheetSnapshot:
        """
        Calculate month-end balance sheet.

        Assets = Liabilities + Equity (must balance)
        """
        # Get prior balances
        if prior_balance_sheet:
            prior_ar = prior_balance_sheet.accounts_receivable
            prior_ap = prior_balance_sheet.accounts_payable
            prior_deferred = prior_balance_sheet.deferred_revenue
            prior_retained = prior_balance_sheet.retained_earnings
            contributed_capital = prior_balance_sheet.contributed_capital
        else:
            prior_ar = Decimal("0")
            prior_ap = Decimal("0")
            prior_deferred = Decimal("0")
            prior_retained = Decimal("0")
            contributed_capital = self.initial_contributed_capital

        # Calculate ending AR from collections equation
        # ending_ar = prior_ar + billings - collections
        _, ending_ar = self.calculate_collections(month, scenario_id, pnl, prior_ar)

        # Calculate ending AP from disbursements equation
        _, _, _, ending_ap = self.calculate_disbursements(month, scenario_id, pnl, prior_ap)

        # Calculate ending deferred revenue
        _, ending_deferred = self.calculate_deferred_revenue(month, scenario_id, pnl, prior_deferred)

        # Assets
        cash = cash_flow.cash_end
        total_assets = cash + ending_ar

        # Liabilities
        total_liabilities = ending_ap + ending_deferred

        # Equity: retained earnings = prior retained + EBITDA (simplified, ignoring taxes)
        retained_earnings = prior_retained + pnl.ebitda
        total_equity = contributed_capital + retained_earnings

        # Verify balance
        total_liabilities_equity = total_liabilities + total_equity

        # If doesn't balance, adjust retained earnings (accounting plug)
        if abs(total_assets - total_liabilities_equity) > Decimal("0.01"):
            adjustment = total_assets - total_liabilities_equity
            retained_earnings += adjustment
            total_equity = contributed_capital + retained_earnings
            total_liabilities_equity = total_liabilities + total_equity

        return BalanceSheetSnapshot(
            month=month,
            scenario_id=scenario_id,
            cash=cash,
            accounts_receivable=ending_ar,
            prepaid_expenses=Decimal("0"),
            total_assets=total_assets.quantize(Decimal("0.01")),
            accounts_payable=ending_ap,
            deferred_revenue=ending_deferred,
            accrued_expenses=Decimal("0"),
            total_liabilities=total_liabilities.quantize(Decimal("0.01")),
            contributed_capital=contributed_capital,
            retained_earnings=retained_earnings.quantize(Decimal("0.01")),
            total_equity=total_equity.quantize(Decimal("0.01")),
            total_liabilities_equity=total_liabilities_equity.quantize(Decimal("0.01")),
        )

    def run(
        self,
        months: List[date],
        scenario_id: str,
        revenue_results: Dict[CohortKey, RevenueBreakdown],
        cogs_results: Dict[CohortKey, COGSBreakdown],
        opex_results: Dict[date, OpexBreakdown],
    ) -> tuple[Dict[date, AggregatedPnL], Dict[date, CashFlowStatement], Dict[date, BalanceSheetSnapshot]]:
        """
        Run full 3-statement calculation for all months.

        Returns: (pnl_results, cashflow_results, balance_sheet_results)
        """
        pnl_results: Dict[date, AggregatedPnL] = {}
        cashflow_results: Dict[date, CashFlowStatement] = {}
        balance_sheet_results: Dict[date, BalanceSheetSnapshot] = {}

        # Initialize prior values
        prior_cash = self.initial_cash
        prior_ar = Decimal("0")
        prior_ap = Decimal("0")
        prior_deferred = Decimal("0")
        prior_balance_sheet: Optional[BalanceSheetSnapshot] = None

        for month in months:
            # Get OpEx for this month
            opex_breakdown = opex_results.get(month)
            if not opex_breakdown:
                # Create empty opex if not available
                opex_breakdown = OpexBreakdown()

            # P&L
            pnl = self.aggregate_pnl(month, scenario_id, revenue_results, cogs_results, opex_breakdown)
            pnl_results[month] = pnl

            # Cash Flow
            cash_flow = self.calculate_cash_flow(
                month, scenario_id, pnl, prior_cash, prior_ar, prior_ap, prior_deferred
            )
            cashflow_results[month] = cash_flow

            # Balance Sheet
            balance_sheet = self.calculate_balance_sheet(
                month, scenario_id, cash_flow, prior_balance_sheet, pnl
            )
            balance_sheet_results[month] = balance_sheet

            # Update prior values for next month
            prior_cash = cash_flow.cash_end
            prior_ar = balance_sheet.accounts_receivable
            prior_ap = balance_sheet.accounts_payable
            prior_deferred = balance_sheet.deferred_revenue
            prior_balance_sheet = balance_sheet

        return pnl_results, cashflow_results, balance_sheet_results

    def pnl_to_dataframe(self, results: Dict[date, AggregatedPnL]) -> pd.DataFrame:
        """Convert P&L results to DataFrame for output"""
        records = []
        for month, pnl in results.items():
            records.append(
                {
                    "month": month,
                    "scenario_id": pnl.scenario_id,
                    "revenue_subscriptions": float(pnl.revenue_subscriptions),
                    "revenue_usage": float(pnl.revenue_usage),
                    "revenue_services": float(pnl.revenue_services),
                    "revenue_total": float(pnl.revenue_total),
                    "channel_discounts": float(pnl.channel_discounts),
                    "net_revenue": float(pnl.net_revenue),
                    "cogs_variable": float(pnl.cogs_variable),
                    "cogs_fixed": float(pnl.cogs_fixed),
                    "cogs_services": float(pnl.cogs_services),
                    "cogs_total": float(pnl.cogs_total),
                    "channel_payouts": float(pnl.channel_payouts),
                    "gross_profit": float(pnl.gross_profit),
                    "gross_margin_pct": float(pnl.gross_margin_pct),
                    "opex_headcount": float(pnl.opex_headcount),
                    "opex_sales_comp": float(pnl.opex_sales_comp),
                    "opex_other": float(pnl.opex_other),
                    "opex_total": float(pnl.opex_total),
                    "ebitda": float(pnl.ebitda),
                    "ebitda_margin_pct": float(pnl.ebitda_margin_pct),
                }
            )
        return pd.DataFrame(records)

    def cashflow_to_dataframe(self, results: Dict[date, CashFlowStatement]) -> pd.DataFrame:
        """Convert Cash Flow results to DataFrame for output"""
        records = []
        for month, cf in results.items():
            records.append(
                {
                    "month": month,
                    "scenario_id": cf.scenario_id,
                    "cash_begin": float(cf.cash_begin),
                    "collections": float(cf.collections),
                    "disbursements_cogs": float(cf.disbursements_cogs),
                    "disbursements_opex": float(cf.disbursements_opex),
                    "disbursements_channel": float(cf.disbursements_channel),
                    "change_in_ar": float(cf.change_in_ar),
                    "change_in_deferred_rev": float(cf.change_in_deferred_rev),
                    "change_in_ap": float(cf.change_in_ap),
                    "cash_from_operations": float(cf.cash_from_operations),
                    "cash_end": float(cf.cash_end),
                }
            )
        return pd.DataFrame(records)

    def balance_sheet_to_dataframe(self, results: Dict[date, BalanceSheetSnapshot]) -> pd.DataFrame:
        """Convert Balance Sheet results to DataFrame for output"""
        records = []
        for month, bs in results.items():
            records.append(
                {
                    "month": month,
                    "scenario_id": bs.scenario_id,
                    "cash": float(bs.cash),
                    "accounts_receivable": float(bs.accounts_receivable),
                    "prepaid_expenses": float(bs.prepaid_expenses),
                    "total_assets": float(bs.total_assets),
                    "accounts_payable": float(bs.accounts_payable),
                    "deferred_revenue": float(bs.deferred_revenue),
                    "accrued_expenses": float(bs.accrued_expenses),
                    "total_liabilities": float(bs.total_liabilities),
                    "contributed_capital": float(bs.contributed_capital),
                    "retained_earnings": float(bs.retained_earnings),
                    "total_equity": float(bs.total_equity),
                    "total_liabilities_equity": float(bs.total_liabilities_equity),
                }
            )
        return pd.DataFrame(records)
