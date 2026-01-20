import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "warning" | "success" | "error";
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
        variant === "default" && "bg-info-bg text-info border border-info-border",
        variant === "secondary" && "bg-surface-alt text-muted border border-border",
        variant === "warning" && "bg-warning-bg text-warning border border-warning-border",
        variant === "success" && "bg-success-bg text-success border border-success-border",
        variant === "error" && "bg-error-bg text-error border border-error-border",
        className
      )}
      {...props}
    />
  );
}
