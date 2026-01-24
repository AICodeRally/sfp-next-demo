"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "settings", label: "Settings" },
  { href: "tables", label: "Tables" },
  { href: "results", label: "Results" },
  { href: "export", label: "Export" }
];

export function ScenarioTabs({ basePath }: { basePath: string }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-2">
      {tabs.map((tab) => {
        const href = `${basePath}/${tab.href}`;
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition",
              active ? "bg-foreground text-background" : "text-muted hover:bg-surface-alt"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
