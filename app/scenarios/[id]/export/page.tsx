"use client";

import { use } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useScenarios } from "@/lib/sfp-store";
import { formatDateTime } from "@/lib/format";

export default function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const scenarios = useScenarios();
  const scenario = scenarios.find((item) => item.id === id);

  if (!scenario) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-6 py-6 shadow-soft">
        <h3 className="text-lg font-semibold text-foreground">Scenario not found</h3>
        <p className="text-sm text-muted">Return to scenarios to choose a valid scenario.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Export & Share"
        description="Create board-ready snapshots and export model outputs."
        actionLabel="Export Snapshot"
        onAction={() => alert("Export stub")}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent Snapshots</CardTitle>
            <CardDescription>Latest scenario runs ready for sharing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((index) => (
              <div key={index} className="rounded-xl border border-border bg-surface px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{scenario.name} • Snapshot {index}</div>
                    <div className="text-xs text-muted">{scenario.outputs ? formatDateTime(scenario.outputs.lastRunAt) : "Not run"}</div>
                  </div>
                  <Button variant="outline" size="sm">Open</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Board Summary</CardTitle>
            <CardDescription>Draft commentary for leadership reviews.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              className="h-40 w-full rounded-xl border border-border bg-surface-alt p-3 text-sm text-foreground"
              placeholder="Summarize key wins, risks, and asks for the board..."
            />
            <div className="grid gap-2">
              <Button>Generate Summary</Button>
              <Button variant="outline">Copy for Deck</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
          <CardDescription>Send to CSV, Excel, or board-ready PDF.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {["CSV", "Excel", "PDF"].map((option) => (
            <div key={option} className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-soft">
              <div className="text-sm font-semibold text-foreground">{option} Export</div>
              <p className="mt-2 text-xs text-muted">Includes scenario inputs + results tables.</p>
              <Button className="mt-4" variant="outline">Download</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
