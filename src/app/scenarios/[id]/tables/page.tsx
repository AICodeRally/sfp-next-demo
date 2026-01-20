"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { tableDefs } from "@/lib/sfp-table-defs";
import { TableEditor } from "@/components/tables/table-editor";

export default function TablesPage({ params }: { params: { id: string } }) {
  const [activeKey, setActiveKey] = React.useState(tableDefs[0]?.key ?? "segments");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tables"
        description="Maintain structured inputs across the planning tables."
        actionLabel="Add Table Row"
        actionVariant="outline"
        onAction={() => {
          const element = document.querySelector("button[data-table-add]") as HTMLButtonElement | null;
          element?.click();
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <Card className="h-full">
          <CardContent className="space-y-2 py-4">
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Table Index</p>
            <div className="space-y-1">
              {tableDefs.map((def) => (
                <button
                  key={def.key}
                  onClick={() => setActiveKey(def.key)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    activeKey === def.key ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100"
                  }`}
                >
                  {def.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <TableEditor scenarioId={params.id} tableKey={activeKey} />
        </div>
      </div>
    </div>
  );
}
