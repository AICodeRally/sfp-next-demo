/**
 * Demo Library Page
 *
 * Centralized view of all demo and template data.
 * Features:
 * - Filter by data type (demo/template/client)
 * - View demo metadata
 * - Convert demo to client
 * - Delete individual scenarios
 * - Bulk delete all demo data
 * - Statistics dashboard
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTypeBadge } from "@/components/ui/data-type-badge";
import { formatDateTime } from "@/lib/format";
import {
  useScenarios,
  getScenarioStats,
  updateScenarioDataType,
  deleteScenario,
  bulkDeleteDemoData,
} from "@/lib/sfp-store";
import { ArrowLeftIcon, ExclamationTriangleIcon, TrashIcon } from "@radix-ui/react-icons";

export default function DemoLibraryPage() {
  const scenarios = useScenarios();
  const stats = getScenarioStats();
  const [filter, setFilter] = useState<"all" | "demo" | "template" | "client">("all");
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // Filter scenarios
  const filteredScenarios = scenarios.filter((s) => {
    if (filter === "all") return true;
    return s.dataType === filter;
  });

  function handleConvertToClient(id: string) {
    updateScenarioDataType(id, "client");
  }

  function handleDelete(id: string) {
    if (confirm("Delete this scenario? This action cannot be undone.")) {
      deleteScenario(id);
    }
  }

  function handleBulkDelete() {
    bulkDeleteDemoData();
    setShowBulkConfirm(false);
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/settings"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold">Demo Library</h1>
        <p className="text-muted-foreground mt-2">
          Manage demo and template data across your workspace
        </p>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Scenarios</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Demo Data</CardDescription>
            <CardTitle className="text-3xl text-orange-600">{stats.demo}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Templates</CardDescription>
            <CardTitle className="text-3xl text-teal-600">{stats.template}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Client Data</CardDescription>
            <CardTitle className="text-3xl text-emerald-600">{stats.client}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Bulk Actions */}
      {(stats.demo > 0 || stats.template > 0) && (
        <div className="mb-6 rounded-lg border border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20 p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                Bulk Operations
              </h3>
              <p className="mt-1 text-sm text-orange-800 dark:text-orange-200">
                You have {stats.demo + stats.template} demo/template scenarios.
                You can delete all non-client data at once.
              </p>
              {!showBulkConfirm ? (
                <Button
                  onClick={() => setShowBulkConfirm(true)}
                  variant="outline"
                  size="sm"
                  className="mt-3 border-orange-500 text-orange-700 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-950"
                >
                  Delete All Demo Data
                </Button>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    Are you sure? This will delete {stats.demo + stats.template} scenarios permanently.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleBulkDelete}
                      size="sm"
                      variant="primary"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Yes, Delete All
                    </Button>
                    <Button
                      onClick={() => setShowBulkConfirm(false)}
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

      {/* Filter Tabs */}
      <div className="mb-4 flex gap-2">
        <Button
          variant={filter === "all" ? "primary" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All ({stats.total})
        </Button>
        <Button
          variant={filter === "demo" ? "primary" : "outline"}
          size="sm"
          onClick={() => setFilter("demo")}
        >
          Demo ({stats.demo})
        </Button>
        <Button
          variant={filter === "template" ? "primary" : "outline"}
          size="sm"
          onClick={() => setFilter("template")}
        >
          Templates ({stats.template})
        </Button>
        <Button
          variant={filter === "client" ? "primary" : "outline"}
          size="sm"
          onClick={() => setFilter("client")}
        >
          Client ({stats.client})
        </Button>
      </div>

      {/* Scenario List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filter === "all"
              ? "All Scenarios"
              : filter === "demo"
              ? "Demo Scenarios"
              : filter === "template"
              ? "Template Scenarios"
              : "Client Scenarios"}
          </CardTitle>
          <CardDescription>
            {filteredScenarios.length} {filteredScenarios.length === 1 ? "scenario" : "scenarios"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredScenarios.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No scenarios in this category
            </p>
          ) : (
            filteredScenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ink-100 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/scenarios/${scenario.id}/settings`}
                      className="text-base font-semibold text-ink-900 dark:text-gray-100 hover:underline"
                    >
                      {scenario.name}
                    </Link>
                    <DataTypeBadge dataType={scenario.dataType} />
                  </div>
                  <p className="text-xs text-ink-400 dark:text-gray-500">
                    Updated {formatDateTime(scenario.updatedAt)}
                  </p>
                  {scenario.demoMetadata && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {scenario.demoMetadata.year && `Year: ${scenario.demoMetadata.year} • `}
                      {scenario.demoMetadata.category && `Category: ${scenario.demoMetadata.category} • `}
                      {scenario.demoMetadata.description && scenario.demoMetadata.description}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(scenario.dataType === "demo" || scenario.dataType === "template") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConvertToClient(scenario.id)}
                    >
                      Convert to Client
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(scenario.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                  <Link href={`/scenarios/${scenario.id}/settings`}>
                    <Button variant="primary" size="sm">
                      Open
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
