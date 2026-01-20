"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { formatDateTime } from "@/lib/format";
import { createScenario, useScenarios } from "@/lib/sfp-store";

export default function HomePage() {
  const scenarios = useScenarios();
  const recent = scenarios.slice(0, 3);

  function handleCreate() {
    const scenario = createScenario(`Scenario ${scenarios.length + 1}`);
    if (scenario) {
      window.location.href = `/scenarios/${scenario.id}/settings`;
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Startup Financial Planning"
        description="Build a scenario, tune the tables, and run a deterministic model in minutes."
        actionLabel="Create Scenario"
        onAction={handleCreate}
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Workflow Snapshot</CardTitle>
            <CardDescription>Settings → Tables → Results → Export</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted">
            <div className="rounded-xl border border-border bg-surface-alt px-4 py-3 transition-colors hover:bg-info-bg">
              Configure model horizon, revenue mechanics, channel assumptions, and AI costs.
            </div>
            <div className="rounded-xl border border-border bg-surface-alt px-4 py-3 transition-colors hover:bg-info-bg">
              Maintain clean, structured inputs across the planning tables.
            </div>
            <div className="rounded-xl border border-border bg-surface-alt px-4 py-3 transition-colors hover:bg-info-bg">
              Run the model to produce monthly statements and outcome metrics.
            </div>
            <div className="rounded-xl border border-border bg-surface-alt px-4 py-3 transition-colors hover:bg-info-bg">
              Export snapshots for leadership reviews and board updates.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Scenarios</CardTitle>
            <CardDescription>Jump back into your latest planning runs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.map((scenario) => (
              <Link
                key={scenario.id}
                href={`/scenarios/${scenario.id}/settings`}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm transition-all hover:border-primary hover:shadow-glass"
              >
                <div>
                  <div className="font-medium text-foreground">{scenario.name}</div>
                  <div className="text-xs text-muted">Updated {formatDateTime(scenario.updatedAt)}</div>
                </div>
                <span className="text-xs text-primary">Open →</span>
              </Link>
            ))}
            <Link href="/scenarios" className="text-sm font-medium text-primary hover:text-secondary">
              View all scenarios →
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="theme-card-strong px-6 py-6 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Next Modules</p>
            <h3 className="gradient-text text-lg font-semibold">Future domain layers</h3>
            <p className="mt-1 text-sm text-muted">Career Planning and Business Models will snap into the same shell.</p>
          </div>
          <Button variant="outline">View Roadmap</Button>
        </div>
      </div>
    </div>
  );
}
