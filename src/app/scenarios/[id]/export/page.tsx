"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { useScenarios } from "@/lib/sfp-store";

export default function ExportPage({ params }: { params: { id: string } }) {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Export"
        description="Capture a snapshot of this scenario for sharing or archiving."
        actionLabel="Export XLSX"
        actionVariant="primary"
        onAction={() => alert("XLSX export stubbed in v0.1.")}
      />

      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
          <CardDescription>Stubbed exports for v0.1 scaffolding.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => alert("XLSX export stubbed in v0.1.")}>Export XLSX</Button>
          <Button variant="outline" onClick={() => alert("PDF snapshot stubbed in v0.1.")}>Export PDF Snapshot</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scenario Version Stamp</CardTitle>
          <CardDescription>Use this identifier in exports and status notes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-ink-600">
          <div>
            <span className="font-semibold text-ink-900">Scenario ID:</span> {scenario.id}
          </div>
          <div>
            <span className="font-semibold text-ink-900">Updated At:</span> {formatDateTime(scenario.updatedAt)}
          </div>
          <div>
            <span className="font-semibold text-ink-900">Status:</span> {scenario.status}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
