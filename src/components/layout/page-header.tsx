import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  actionVariant?: "primary" | "secondary" | "outline" | "ghost";
  meta?: ReactNode;
};

export function PageHeader({
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  actionVariant = "primary",
  meta
}: PageHeaderProps) {
  return (
    <div className="glass-card-hover flex flex-col gap-4 rounded-2xl px-6 py-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Startup Financial Planning</p>
          <h2 className="gradient-text text-2xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        {actionLabel ? (
          actionHref ? (
            <a href={actionHref} className={cn("self-start")}>
              <Button variant={actionVariant}>{actionLabel}</Button>
            </a>
          ) : (
            <Button variant={actionVariant} onClick={onAction}>
              {actionLabel}
            </Button>
          )
        ) : null}
      </div>
      {meta ? <div className="flex flex-wrap gap-4 text-sm text-muted">{meta}</div> : null}
    </div>
  );
}
