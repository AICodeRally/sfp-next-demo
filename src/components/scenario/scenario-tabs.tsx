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
    <div className="flex flex-wrap gap-2 rounded-xl border border-ink-100 bg-white/80 p-2">
      {tabs.map((tab) => {
        const href = `${basePath}/${tab.href}`;
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition",
              active ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
