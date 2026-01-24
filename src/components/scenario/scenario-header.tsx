"use client";

import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { useScenarios } from "@/lib/sfp-store";

export function ScenarioHeader({ scenarioId }: { scenarioId: string }) {
  const scenarios = useScenarios();
  const scenario = scenarios.find((item) => item.id === scenarioId);

  if (!scenario) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-6 py-6 shadow-soft">
        <h2 className="text-xl font-semibold text-foreground">Scenario not found</h2>
        <p className="text-sm text-muted">Pick a scenario from the list to continue.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface px-6 py-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Scenario</p>
          <h2 className="text-2xl font-semibold text-foreground">{scenario.name}</h2>
          <p className="mt-1 text-sm text-muted">Updated {formatDateTime(scenario.updatedAt)}</p>
        </div>
        <Badge variant={scenario.status === "locked" ? "warning" : "secondary"}>
          {scenario.status === "locked" ? "Locked" : "Draft"}
        </Badge>
      </div>
      {scenario.outputs ? (
        <div className="mt-3 text-xs text-muted">Last run at {formatDateTime(scenario.outputs.lastRunAt)}</div>
      ) : (
        <div className="mt-3 text-xs text-muted">Model not run yet.</div>
      )}
    </div>
  );
}
