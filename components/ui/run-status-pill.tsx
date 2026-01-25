"use client";

type RunStatus = "pass" | "warn" | "fail" | "idle";

type RunStatusPillProps = {
  status: RunStatus;
  label?: string;
};

const statusStyles: Record<RunStatus, { label: string; className: string }> = {
  pass: { label: "All checks passed", className: "bg-success-bg text-success border-success-border" },
  warn: { label: "Warnings detected", className: "bg-warning-bg text-warning border-warning-border" },
  fail: { label: "Validation failed", className: "bg-error-bg text-error border-error-border" },
  idle: { label: "Not run yet", className: "bg-surface-alt text-muted border-border" },
};

export function RunStatusPill({ status, label }: RunStatusPillProps) {
  const meta = statusStyles[status];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${meta.className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label ?? meta.label}
    </span>
  );
}
