"use client";

import { Card, CardContent } from "@/components/ui/card";

type KPITrend = "up" | "down" | "flat";

type KPICardProps = {
  label: string;
  value: string;
  delta?: string;
  trend?: KPITrend;
  caption?: string;
  spark?: number[];
};

const trendStyles: Record<KPITrend, string> = {
  up: "text-success",
  down: "text-error",
  flat: "text-muted",
};

export function KPICard({ label, value, delta, trend = "flat", caption, spark }: KPICardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="space-y-3 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{label}</p>
            <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
          </div>
          {delta && (
            <span className={`rounded-full bg-surface-alt px-3 py-1 text-xs font-semibold ${trendStyles[trend]}`}>
              {delta}
            </span>
          )}
        </div>
        {caption && <p className="text-xs text-muted">{caption}</p>}
        {spark && spark.length > 0 && (
          <div className="flex items-end gap-1 pt-1">
            {spark.slice(0, 18).map((point, index) => (
              <span
                key={`${label}-${index}`}
                className="inline-block w-2 rounded-sm bg-primary/25"
                style={{ height: `${Math.max(4, Math.min(point, 24))}px` }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
