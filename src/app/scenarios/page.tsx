"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { cloneScenario, createScenario, toggleScenarioLock, useScenarios } from "@/lib/sfp-store";

export default function ScenariosPage() {
  const scenarios = useScenarios();

  function handleCreate() {
    const scenario = createScenario(`Scenario ${scenarios.length + 1}`);
    if (scenario) {
      window.location.href = `/scenarios/${scenario.id}/settings`;
    }
  }

  if (scenarios.length === 0) {
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
    <div className="space-y-6">
      <PageHeader
        title="Scenarios"
        description="Create, clone, or lock scenarios before running outputs."
        actionLabel="Create Scenario"
        onAction={handleCreate}
      />

      <Card>
        <CardHeader>
          <CardTitle>Scenario Library</CardTitle>
          <CardDescription>Manage active planning versions and lock baselines.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ink-100 bg-white px-4 py-4"
            >
              <div>
                <Link href={`/scenarios/${scenario.id}/settings`} className="text-base font-semibold text-ink-900">
                  {scenario.name}
                </Link>
                <p className="text-xs text-ink-400">Updated {formatDateTime(scenario.updatedAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={scenario.status === "locked" ? "warning" : "secondary"}>
                  {scenario.status === "locked" ? "Locked" : "Draft"}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => cloneScenario(scenario.id)}>
                  Clone
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggleScenarioLock(scenario.id)}>
                  {scenario.status === "locked" ? "Unlock" : "Lock"}
                </Button>
                <Button variant="primary" size="sm" onClick={() => (window.location.href = `/scenarios/${scenario.id}/settings`)}>
                  Open
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
