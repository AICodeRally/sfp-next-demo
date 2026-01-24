"use client";

import * as React from "react";
import { use } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { tableDefs, TableDef } from "@/lib/sfp-table-defs";
import { TableEditor } from "@/components/tables/table-editor";
import { useScenarios } from "@/lib/sfp-store";
import { formatCurrency, formatPercent } from "@/lib/format";
import { ModelImpactPanel } from "@/components/insights/model-impact-panel";

const tableGroups: Array<{ label: string; keys: Array<TableDef["key"]> }> = [
  { label: "Dimensions", keys: ["scenarios", "segments", "channels", "skus"] },
  { label: "Pricing & Packaging", keys: ["pricingPlans", "channelTerms", "servicesSku"] },
  { label: "Growth & Retention", keys: ["cohortPlan", "retentionAssumptions", "servicesAttachPlan"] },
  { label: "Usage & AI Costs", keys: ["aiUsageProfile", "usageAssumptions", "cogsUnitCosts"] },
  { label: "Costs", keys: ["deliveryCapacityPlan", "headcountPlan", "expensePlan"] },
  { label: "Run Settings", keys: ["collectionsTerms", "runSettings"] },
];

export default function TablesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const scenarios = useScenarios();
  const scenario = scenarios.find((item) => item.id === id);
  const [activeKey, setActiveKey] = React.useState<TableDef["key"]>(tableDefs[0]?.key ?? "segments");

  const outputs = scenario?.outputs;
  const latestMetrics = outputs?.metricsMonthly?.[outputs.metricsMonthly.length - 1];
  const latestStatement = outputs?.statementsMonthly?.[outputs.statementsMonthly.length - 1];
  const currency = scenario?.settings.modelHorizon.currency ?? "USD";

  const impactMetrics = [
    {
      label: "ARR",
      value: latestMetrics ? formatCurrency(latestMetrics.arr, currency) : "Run a scenario",
      hint: "Latest annual recurring revenue",
    },
    {
      label: "Blended GM",
      value: latestMetrics ? formatPercent(latestMetrics.gmBlendedPct, 1) : "—",
      hint: "Gross margin across SaaS + services",
    },
    {
      label: "Cash Balance",
      value: latestStatement ? formatCurrency(latestStatement.cashBalance, currency) : "—",
      hint: "Latest cash position",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inputs Workbook"
        description="Maintain structured inputs aligned to the engine tables."
        actionLabel="Add Table Row"
        actionVariant="outline"
        onAction={() => {
          const element = document.querySelector("button[data-table-add]") as HTMLButtonElement | null;
          element?.click();
        }}
      />

      <div className="grid gap-6 xl:grid-cols-[240px_1fr_300px]">
        <Card className="h-full">
          <CardContent className="space-y-6 py-5">
            {tableGroups.map((group) => (
              <div key={group.label} className="space-y-2">
                <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted">{group.label}</p>
                <div className="space-y-1">
                  {group.keys.map((key) => {
                    const def = tableDefs.find((item) => item.key === key);
                    if (!def) return null;
                    return (
                      <button
                        key={def.key}
                        onClick={() => setActiveKey(def.key)}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                          activeKey === def.key ? "bg-foreground text-background" : "text-muted hover:bg-surface-alt"
                        }`}
                      >
                        {def.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <TableEditor scenarioId={id} tableKey={activeKey} />
        </div>

        <div className="hidden xl:block">
          <ModelImpactPanel metrics={impactMetrics} note="Run the model to refresh these metrics." />
        </div>
      </div>
    </div>
  );
}
