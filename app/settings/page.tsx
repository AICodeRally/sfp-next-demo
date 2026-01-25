/**
 * Account Settings Page
 *
 * Main settings hub with links to:
 * - Company Profile
 * - Data Management (clear demo data)
 * - User Preferences (future expansion)
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getScenarioStats, bulkDeleteDemoData } from "@/lib/sfp-store";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useState } from "react";

export default function SettingsPage() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const stats = getScenarioStats();

  function handleClearDemoData() {
    bulkDeleteDemoData();
    setShowConfirm(false);
    router.refresh();
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account and data preferences</p>
      </div>

      <div className="space-y-4">
        {/* Company Profile */}
        <Link href="/settings/profile">
          <div className="rounded-lg border bg-card p-6 hover:bg-accent transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Company Profile</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Edit company name, industry, stage, and team information
                </p>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </Link>

        {/* Data Management */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Data Management</h2>

          <div className="space-y-4">
            {/* Demo Data Stats */}
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">Scenario Summary</p>
                  <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="text-lg font-semibold">{stats.total}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Demo</p>
                      <p className="text-lg font-semibold text-orange-600">{stats.demo}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Template</p>
                      <p className="text-lg font-semibold text-teal-600">{stats.template}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Client</p>
                      <p className="text-lg font-semibold text-emerald-600">{stats.client}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Clear Demo Data */}
            {(stats.demo > 0 || stats.template > 0) && (
              <div className="rounded-lg border border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20 p-4">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                      Demo & Template Data
                    </h3>
                    <p className="mt-1 text-sm text-orange-800 dark:text-orange-200">
                      You have {stats.demo + stats.template} demo/template scenarios.
                      Consider removing them before production use.
                    </p>
                    {!showConfirm ? (
                      <Button
                        onClick={() => setShowConfirm(true)}
                        variant="outline"
                        size="sm"
                        className="mt-3 border-orange-500 text-orange-700 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-950"
                      >
                        Clear All Demo Data
                      </Button>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                          Are you sure? This will delete {stats.demo + stats.template} scenarios.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleClearDemoData}
                            size="sm"
                            variant="primary"
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Yes, Delete All Demo Data
                          </Button>
                          <Button
                            onClick={() => setShowConfirm(false)}
                            size="sm"
                            variant="outline"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Link to Demo Library */}
            <Link href="/demo-library">
              <Button variant="outline" className="w-full">
                View Demo Library →
              </Button>
            </Link>
          </div>
        </div>

        {/* User Preferences (Future) */}
        <div className="rounded-lg border bg-card p-6 opacity-50 cursor-not-allowed">
          <h2 className="text-lg font-semibold">User Preferences</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Theme, notifications, and display settings (coming soon)
          </p>
        </div>
      </div>
    </div>
  );
}
