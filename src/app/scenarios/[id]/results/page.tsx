"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatMonthLabel, formatPercent } from "@/lib/format";
import { runScenarioModel, useScenarios } from "@/lib/sfp-store";

export default function ResultsPage({ params }: { params: { id: string } }) {
  const scenarios = useScenarios();
  const scenario = scenarios.find((item) => item.id === params.id);

  if (!scenario) {
    return (
      <div className="rounded-2xl border border-ink-100 bg-white/80 px-6 py-6 shadow-soft">
        <h3 className="text-lg font-semibold text-ink-900">Scenario not found</h3>
        <p className="text-sm text-ink-500">Return to scenarios to choose a valid scenario.</p>
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

  const arrBridge = outputs.metricsMonthly.slice(0, 6);
  const runway = outputs.statementsMonthly.slice(-6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Results"
        description="Review monthly ARR, margins, AI costs, and runway projections."
        actionLabel="Run Model"
        onAction={() => runScenarioModel(scenario.id)}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ARR Bridge</CardTitle>
            <CardDescription>First six months of ARR lift from cohort plan.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-ink-100">
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Month</TableHead>
                    <TableHead>ARR</TableHead>
                    <TableHead>AI COGS %</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {arrBridge.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell>{formatMonthLabel(row.month)}</TableCell>
                      <TableCell>{formatCurrency(row.arr, currency)}</TableCell>
                      <TableCell>{formatPercent(row.aiCogsPct, 1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gross Margin Mix</CardTitle>
            <CardDescription>SaaS vs services vs blended performance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {outputs.metricsMonthly.slice(0, 3).map((row) => (
              <div key={row.month} className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                <div className="text-xs text-ink-400">{formatMonthLabel(row.month)}</div>
                <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-ink-400">SaaS GM</div>
                    <div className="font-semibold text-ink-900">{formatPercent(row.gmSaasPct, 1)}</div>
                  </div>
                  <div>
                    <div className="text-ink-400">Services GM</div>
                    <div className="font-semibold text-ink-900">{formatPercent(row.gmServicesPct, 1)}</div>
                  </div>
                  <div>
                    <div className="text-ink-400">Blended GM</div>
                    <div className="font-semibold text-ink-900">{formatPercent(row.gmBlendedPct, 1)}</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI COGS vs SaaS</CardTitle>
            <CardDescription>Percent of SaaS revenue consumed by AI costs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {outputs.metricsMonthly.slice(0, 5).map((row) => (
              <div key={row.month} className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-3 text-sm">
                <span className="text-ink-500">{formatMonthLabel(row.month)}</span>
                <span className="font-semibold text-ink-900">{formatPercent(row.aiCogsPct, 1)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Runway Snapshot</CardTitle>
            <CardDescription>Cash balance and burn trend (last 6 months).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {runway.map((row) => (
              <div key={row.month} className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-500">{formatMonthLabel(row.month)}</span>
                  <span className={`font-semibold ${row.netIncome < 0 ? "text-sun-600" : "text-ink-900"}`}>
                    {formatCurrency(row.netIncome, currency)}
                  </span>
                </div>
                <div className="mt-2 text-xs text-ink-400">Cash balance {formatCurrency(row.cashBalance, currency)}</div>
              </div>
            ))}
            <Button variant="outline" onClick={() => runScenarioModel(scenario.id)}>
              Refresh Results
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
