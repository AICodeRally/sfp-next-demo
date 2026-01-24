"use client";

import { useState, use } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KPICard } from "@/components/ui/kpi-card";
import { RunStatusPill } from "@/components/ui/run-status-pill";
import { AreaChart } from "@/components/ui/area-chart";
import { formatCurrency, formatMonthLabel, formatPercent } from "@/lib/format";
import { runScenarioModel, useScenarios } from "@/lib/sfp-store";

const tabs = ["Revenue & Profitability", "Cash & Balance Sheet", "Unit Economics", "Validation"] as const;

type Tab = typeof tabs[number];

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const scenarios = useScenarios();
  const scenario = scenarios.find((item) => item.id === id);
  const [activeTab, setActiveTab] = useState<Tab>(tabs[0]);

  if (!scenario) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-6 py-6 shadow-soft">
        <h3 className="text-lg font-semibold text-foreground">Scenario not found</h3>
        <p className="text-sm text-muted">Return to scenarios to choose a valid scenario.</p>
      </div>
    );
  }

  const outputs = scenario.outputs;
  const currency = scenario.settings.modelHorizon.currency;

  if (!outputs) {
    return (
      <EmptyState
        title="No results yet"
        description="Run the model to generate monthly statements and metrics."
        actionLabel="Run Model"
        onAction={() => runScenarioModel(scenario.id)}
      />
    );
  }

  const latestMetrics = outputs.metricsMonthly[outputs.metricsMonthly.length - 1];
  const latestStatement = outputs.statementsMonthly[outputs.statementsMonthly.length - 1];
  const status = outputs.runStatus === "success" ? "pass" : outputs.runStatus === "error" ? "fail" : "idle";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Results Studio"
        description="Board-ready outputs across revenue, cash, and unit economics."
        actionLabel="Run Model"
        onAction={() => runScenarioModel(scenario.id)}
        meta={<RunStatusPill status={status} />}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard
          label="ARR"
          value={formatCurrency(latestMetrics.arr, currency)}
          delta={formatPercent(latestMetrics.gmBlendedPct, 1) + " GM"}
          trend={latestMetrics.gmBlendedPct >= 60 ? "up" : "flat"}
          caption="Annual recurring revenue"
        />
        <KPICard
          label="Net Income"
          value={formatCurrency(latestStatement.netIncome, currency)}
          delta={latestStatement.netIncome >= 0 ? "Profitable" : "Burning"}
          trend={latestStatement.netIncome >= 0 ? "up" : "down"}
          caption="Monthly profit after COGS + OpEx"
        />
        <KPICard
          label="Cash Balance"
          value={formatCurrency(latestStatement.cashBalance, currency)}
          delta={`${latestMetrics.runwayMonths.toFixed(0)} mos runway`}
          trend={latestMetrics.runwayMonths >= 12 ? "up" : "flat"}
          caption="Latest cash position"
        />
        <KPICard
          label="AI COGS"
          value={formatPercent(latestMetrics.aiCogsPct, 1)}
          delta={formatPercent(latestMetrics.gmSaasPct, 1) + " SaaS GM"}
          trend={latestMetrics.aiCogsPct <= 15 ? "up" : "down"}
          caption="Share of SaaS revenue"
        />
      </section>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab ? "bg-primary text-white" : "bg-surface-alt text-muted hover:bg-info-bg"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Revenue & Profitability" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Monthly revenue and net income.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-border bg-surface px-4 py-4">
                <AreaChart data={outputs.statementsMonthly.map((row) => row.revenue)} />
              </div>
              {outputs.statementsMonthly.slice(0, 6).map((row) => (
                <div key={row.month} className="flex items-center justify-between rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm">
                  <div>
                    <div className="text-xs text-muted">{formatMonthLabel(row.month)}</div>
                    <div className="font-semibold text-foreground">{formatCurrency(row.revenue, currency)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted">Net Income</div>
                    <div className={row.netIncome >= 0 ? "text-success" : "text-error"}>
                      {formatCurrency(row.netIncome, currency)}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>P&L Detail</CardTitle>
              <CardDescription>Latest six months of statements.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHead>Month</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>COGS</TableHead>
                      <TableHead>Net Income</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {outputs.statementsMonthly.slice(-6).map((row) => (
                      <TableRow key={row.month}>
                        <TableCell>{formatMonthLabel(row.month)}</TableCell>
                        <TableCell>{formatCurrency(row.revenue, currency)}</TableCell>
                        <TableCell>{formatCurrency(row.cogs, currency)}</TableCell>
                        <TableCell>{formatCurrency(row.netIncome, currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "Cash & Balance Sheet" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Cash Runway</CardTitle>
              <CardDescription>Latest cash balance and burn.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {outputs.statementsMonthly.slice(-6).map((row) => (
                <div key={row.month} className="rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">{formatMonthLabel(row.month)}</span>
                    <span className="font-semibold text-foreground">{formatCurrency(row.cashBalance, currency)}</span>
                  </div>
                  <div className="mt-2 text-xs text-muted">Net income {formatCurrency(row.netIncome, currency)}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet Placeholder</CardTitle>
              <CardDescription>Balance sheet module will align to AICR engine.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted">
              <p>Coming in vNext: Assets, liabilities, deferred revenue, and equity tables.</p>
              <Button variant="outline" onClick={() => runScenarioModel(scenario.id)}>
                Refresh Results
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "Unit Economics" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Unit Economics Snapshot</CardTitle>
              <CardDescription>Margins and AI cost exposure.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {outputs.metricsMonthly.slice(-6).map((row) => (
                <div key={row.month} className="rounded-xl border border-border bg-surface-alt px-4 py-3">
                  <div className="text-xs text-muted">{formatMonthLabel(row.month)}</div>
                  <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-muted">SaaS GM</div>
                      <div className="font-semibold text-foreground">{formatPercent(row.gmSaasPct, 1)}</div>
                    </div>
                    <div>
                      <div className="text-muted">Services GM</div>
                      <div className="font-semibold text-foreground">{formatPercent(row.gmServicesPct, 1)}</div>
                    </div>
                    <div>
                      <div className="text-muted">AI COGS</div>
                      <div className="font-semibold text-foreground">{formatPercent(row.aiCogsPct, 1)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Unit Economics Table</CardTitle>
              <CardDescription>Monthly metrics for benchmarking.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHead>Month</TableHead>
                      <TableHead>ARR</TableHead>
                      <TableHead>AI COGS %</TableHead>
                      <TableHead>Blended GM</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {outputs.metricsMonthly.slice(-6).map((row) => (
                      <TableRow key={row.month}>
                        <TableCell>{formatMonthLabel(row.month)}</TableCell>
                        <TableCell>{formatCurrency(row.arr, currency)}</TableCell>
                        <TableCell>{formatPercent(row.aiCogsPct, 1)}</TableCell>
                        <TableCell>{formatPercent(row.gmBlendedPct, 1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "Validation" && (
        <Card>
          <CardHeader>
            <CardTitle>Validation & Diagnostics</CardTitle>
            <CardDescription>Integrity gates surfaced from the engine.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {outputs.validation.map((gate) => {
              const style =
                gate.passed && gate.severity === "error"
                  ? "border-success-border bg-success-bg text-success"
                  : gate.passed
                    ? "border-success-border bg-success-bg text-success"
                    : gate.severity === "warning"
                      ? "border-warning-border bg-warning-bg text-warning"
                      : "border-error-border bg-error-bg text-error";
              return (
                <div key={gate.id} className={`rounded-xl border px-4 py-3 ${style}`}>
                  {gate.passed ? "✓" : "⚠"} {gate.message}
                </div>
              );
            })}
            {outputs.validation.length === 0 && (
              <p className="text-xs text-muted">No validation gates recorded.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
