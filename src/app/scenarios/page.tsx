"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { DataTypeBadge } from "@/components/ui/data-type-badge";
import { DemoWarningBanner } from "@/components/ui/demo-warning-banner";
import { formatDateTime } from "@/lib/format";
import { cloneScenario, createScenario, createScenarioFromTemplate, toggleScenarioLock, useScenarios, getScenarioStats } from "@/lib/sfp-store";
import { scenarioTemplates } from "@/lib/sfp-templates";

const filters = ["all", "template", "client", "demo"] as const;

export default function ScenariosPage() {
  const allScenarios = useScenarios();
  const [filter, setFilter] = useState<typeof filters[number]>("all");
  const stats = getScenarioStats();

  const scenarios = allScenarios.filter((s) => {
    if (filter === "all") return true;
    return s.dataType === filter;
  });

  function handleCreate() {
    const scenario = createScenario(`Scenario ${allScenarios.length + 1}`);
    if (scenario) {
      window.location.href = `/scenarios/${scenario.id}/settings`;
    }
  }

  if (allScenarios.length === 0) {
    return (
      <EmptyState
        title="No scenarios yet"
        description="Create a scenario to start modeling your startup financial plan."
        actionLabel="Create Scenario"
        onAction={handleCreate}
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Scenario Library"
        description="Pick a template or manage active scenarios before running outputs."
        actionLabel="Create Scenario"
        onAction={handleCreate}
      />

      {(stats.demo > 0 || stats.template > 0) && (
        <DemoWarningBanner count={stats.demo + stats.template} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Scenario Templates</CardTitle>
          <CardDescription>Start from a curated playbook with pre-wired assumptions.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {scenarioTemplates.map((template) => (
            <div key={template.name} className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-soft">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">Template</Badge>
                <span className="text-xs text-muted">Ready</span>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-foreground">{template.name}</h3>
              <p className="mt-2 text-sm text-muted">{template.description}</p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => {
                  const scenario = createScenarioFromTemplate(template.id);
                  if (scenario) {
                    window.location.href = `/scenarios/${scenario.id}/settings`;
                  }
                }}
              >
                Apply Template
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === item ? "bg-primary text-white" : "bg-surface-alt text-muted hover:bg-info-bg"
              }`}
            >
              {item === "all" ? "All" : item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">
          Showing {scenarios.length} of {allScenarios.length} scenarios
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {scenarios.map((scenario) => (
          <div
            key={scenario.id}
            className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-soft"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <Link href={`/scenarios/${scenario.id}/settings`} className="text-lg font-semibold text-foreground">
                  {scenario.name}
                </Link>
                <p className="mt-1 text-xs text-muted">Updated {formatDateTime(scenario.updatedAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <DataTypeBadge dataType={scenario.dataType} />
                <Badge variant={scenario.status === "locked" ? "warning" : "secondary"}>
                  {scenario.status === "locked" ? "Locked" : "Draft"}
                </Badge>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => cloneScenario(scenario.id)}>
                Clone
              </Button>
              <Button variant="ghost" size="sm" onClick={() => toggleScenarioLock(scenario.id)}>
                {scenario.status === "locked" ? "Unlock" : "Lock"}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => (window.location.href = `/scenarios/${scenario.id}/settings`)}
              >
                Open
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
