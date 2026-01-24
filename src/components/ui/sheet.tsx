"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
};

export function Sheet({ open, onOpenChange, title, description, children }: SheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange(false)}
      />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-surface shadow-soft">
        <div className="border-b border-border px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              {title ? <h3 className="text-lg font-semibold text-foreground">{title}</h3> : null}
              {description ? <p className="text-sm text-muted">{description}</p> : null}
            </div>
            <button
              className="rounded-full border border-border px-3 py-1 text-sm text-muted hover:border-primary"
              onClick={() => onOpenChange(false)}
            >
              Close
            </button>
          </div>
        </div>
        <div className={cn("px-6 py-6", "space-y-4")}>{children}</div>
      </div>
    </div>
  );
}
