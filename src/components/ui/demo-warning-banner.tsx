/**
 * Demo Warning Banner
 *
 * Displays when demo data is present in the system.
 * Provides clear visual distinction and link to manage demo data.
 *
 * Usage:
 * const stats = getScenarioStats();
 * {stats.demo > 0 && <DemoWarningBanner count={stats.demo} />}
 */

"use client";

import Link from "next/link";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

interface DemoWarningBannerProps {
  count: number;
  showManageLink?: boolean;
}

export function DemoWarningBanner({ count, showManageLink = true }: DemoWarningBannerProps) {
  return (
    <div className="rounded-lg border border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20 p-4">
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100">
            Demo Data Present
          </h3>
          <p className="mt-1 text-sm text-orange-800 dark:text-orange-200">
            You have {count} demo {count === 1 ? "scenario" : "scenarios"} in your workspace.
            Demo data is for exploration only and should be removed before production use.
          </p>
          {showManageLink && (
            <Link
              href="/demo-library"
              className="mt-2 inline-flex items-center text-sm font-medium text-orange-700 dark:text-orange-300 hover:text-orange-900 dark:hover:text-orange-100 hover:underline"
            >
              Manage Demo Data →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
