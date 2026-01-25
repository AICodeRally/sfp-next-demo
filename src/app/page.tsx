"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { DataTypeBadge } from "@/components/ui/data-type-badge";
import { KPICard } from "@/components/ui/kpi-card";
import { RunStatusPill } from "@/components/ui/run-status-pill";
import { AreaChart } from "@/components/ui/area-chart";
import { formatCurrency, formatDateTime, formatPercent } from "@/lib/format";
import { createScenario, useScenarios, useCompanyProfile } from "@/lib/sfp-store";

export default function HomePage() {
  const scenarios = useScenarios();
  const profile = useCompanyProfile();
  const activeScenario = scenarios[0];
  const outputs = activeScenario?.outputs;
  const latestMetrics = outputs?.metricsMonthly?.[outputs.metricsMonthly.length - 1];
  const latestStatement = outputs?.statementsMonthly?.[outputs.statementsMonthly.length - 1];
  const currency = activeScenario?.settings.modelHorizon.currency ?? "USD";
  const revenueSeries = outputs?.statementsMonthly?.map((row) => row.revenue) ?? [];

  const status = outputs?.runStatus === "success" ? "pass" : outputs?.runStatus === "error" ? "fail" : "idle";

  function handleCreate() {
    const scenario = createScenario(`Scenario ${scenarios.length + 1}`);
    if (scenario) {
      window.location.href = `/scenarios/${scenario.id}/settings`;
    }
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="Founder Model Studio"
        description="Run board-ready scenarios with full visibility into revenue, cash, and margin drivers."
        actionLabel="Run Latest Model"
        onAction={() => activeScenario && (window.location.href = `/scenarios/${activeScenario.id}/results`)}
        meta={<RunStatusPill status={status} />}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KPICard
          label="ARR"
          value={latestMetrics ? formatCurrency(latestMetrics.arr, currency) : "—"}
          delta={latestMetrics ? "+" + formatPercent(latestMetrics.gmBlendedPct, 0) : undefined}
          trend={latestMetrics && latestMetrics.gmBlendedPct >= 60 ? "up" : "flat"}
          caption="Annual recurring revenue"
          spark={outputs?.metricsMonthly?.map((row) => row.arr / 10000)}
        />
        <KPICard
          label="Blended GM"
          value={latestMetrics ? formatPercent(latestMetrics.gmBlendedPct, 1) : "—"}
          delta={latestMetrics ? formatPercent(latestMetrics.aiCogsPct, 1) + " AI COGS" : undefined}
          trend={latestMetrics && latestMetrics.gmBlendedPct >= 60 ? "up" : "down"}
          caption="Gross margin across SaaS + services"
          spark={outputs?.metricsMonthly?.map((row) => row.gmBlendedPct)}
        />
        <KPICard
          label="Net Income"
          value={latestStatement ? formatCurrency(latestStatement.netIncome, currency) : "—"}
          delta={latestStatement ? (latestStatement.netIncome >= 0 ? "Profitable" : "Burning") : undefined}
          trend={latestStatement && latestStatement.netIncome >= 0 ? "up" : "down"}
          caption="Monthly profit after COGS + OpEx"
          spark={outputs?.statementsMonthly?.map((row) => row.netIncome / 1000)}
        />
        <KPICard
          label="Cash Runway"
          value={latestMetrics ? `${latestMetrics.runwayMonths.toFixed(0)} mos` : "—"}
          delta={latestStatement ? formatCurrency(latestStatement.cashBalance, currency) : undefined}
          trend={latestMetrics && latestMetrics.runwayMonths >= 12 ? "up" : "flat"}
          caption="Estimated runway at current burn"
          spark={outputs?.statementsMonthly?.map((row) => row.cashBalance / 10000)}
        />
        <KPICard
          label="Model Health"
          value={status === "pass" ? "Validated" : status === "fail" ? "Errors" : "Idle"}
          delta={outputs ? `Last run ${formatDateTime(outputs.lastRunAt)}` : "No runs yet"}
          trend={status === "pass" ? "up" : status === "fail" ? "down" : "flat"}
          caption="Validation gates"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="sfp-hero-bg">
          <CardHeader>
            <CardTitle>Latest Run Summary</CardTitle>
            <CardDescription>Quick narrative for your board deck.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted">
            <div className="rounded-xl border border-border bg-surface-alt px-4 py-3">
              {latestMetrics
                ? `ARR climbs to ${formatCurrency(latestMetrics.arr, currency)} with blended GM at ${formatPercent(
                    latestMetrics.gmBlendedPct,
                    1
                  )}.`
                : "Run a scenario to generate your latest executive summary."}
            </div>
            <div className="rounded-xl border border-border bg-surface-alt px-4 py-3">
              {latestStatement
                ? `Monthly net income is ${formatCurrency(latestStatement.netIncome, currency)} and cash ends at ${formatCurrency(
                    latestStatement.cashBalance,
                    currency
                  )}.`
                : "Outputs will highlight profitability and cash trends."}
            </div>
            {revenueSeries.length > 0 && (
              <div className="rounded-xl border border-border bg-surface px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Revenue Trend</p>
                <div className="mt-3">
                  <AreaChart data={revenueSeries} />
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleCreate}>Create Scenario</Button>
              {activeScenario && (
                <Button variant="outline" onClick={() => (window.location.href = `/scenarios/${activeScenario.id}/results`)}>
                  View Results
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scenario Shortcuts</CardTitle>
            <CardDescription>Jump into the scenarios you demo most.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {scenarios.slice(0, 3).map((scenario) => (
              <Link
                key={scenario.id}
                href={`/scenarios/${scenario.id}/settings`}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm transition-all hover:border-primary hover:shadow-glass"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{scenario.name}</span>
                    <DataTypeBadge dataType={scenario.dataType} />
                  </div>
                  <div className="text-xs text-muted">Updated {formatDateTime(scenario.updatedAt)}</div>
                </div>
                <span className="text-xs text-primary shrink-0">Open →</span>
              </Link>
            ))}
            <Link href="/scenarios" className="text-sm font-medium text-primary hover:text-secondary">
              View full library →
            </Link>
          </CardContent>
        </Card>
      </section>

      {profile && (
        <section className="theme-card-strong px-6 py-6 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Company Profile</p>
              <h3 className="gradient-text text-lg font-semibold">{profile.name}</h3>
              <p className="mt-1 text-sm text-muted">
                {profile.industry.charAt(0).toUpperCase() + profile.industry.slice(1)} •{" "}
                {profile.stage.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ")} •{" "}
                {profile.teamSize} {profile.teamSize === 1 ? "person" : "people"}
              </p>
            </div>
            <Button variant="outline" onClick={() => (window.location.href = "/settings/profile")}>
              Update Profile
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
