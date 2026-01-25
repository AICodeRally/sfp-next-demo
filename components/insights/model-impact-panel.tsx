"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ImpactMetric = {
  label: string;
  value: string;
  hint?: string;
};

type ModelImpactPanelProps = {
  title?: string;
  metrics: ImpactMetric[];
  note?: string;
};

export function ModelImpactPanel({ title = "Model Impact", metrics, note }: ModelImpactPanelProps) {
  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-border bg-surface-alt px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">{metric.label}</div>
            <div className="mt-2 text-lg font-semibold text-foreground">{metric.value}</div>
            {metric.hint && <div className="mt-1 text-xs text-muted">{metric.hint}</div>}
          </div>
        ))}
        {note && <p className="text-xs text-muted">{note}</p>}
      </CardContent>
    </Card>
  );
}
