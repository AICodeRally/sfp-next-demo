"use client";

import * as React from "react";
import { use } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { runScenarioModel, updateSettings, useScenarios } from "@/lib/sfp-store";
import type { Settings } from "@/lib/sfp-types";

export default function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const scenarios = useScenarios();
  const scenario = scenarios.find((item) => item.id === id);

  const [draft, setDraft] = React.useState<Settings | null>(scenario?.settings ?? null);

  React.useEffect(() => {
    if (scenario) setDraft(scenario.settings);
  }, [scenario]);

  if (!scenario || !draft) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-6 py-6 shadow-soft">
        <h3 className="text-lg font-semibold text-foreground">Scenario not found</h3>
        <p className="text-sm text-muted">Return to scenarios to choose a valid scenario.</p>
      </div>
    );
  }

  function updateDraft(path: string, value: string | number) {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const keys = path.split(".");
      let cursor: any = next;
      keys.slice(0, -1).forEach((key) => {
        cursor = cursor[key];
      });
      cursor[keys[keys.length - 1]] = value;
      return next;
    });
  }

  function handleSave() {
    if (!scenario || !draft) return;
    updateSettings(scenario.id, draft);
  }

  function handleRun() {
    if (!scenario) return;
    runScenarioModel(scenario.id);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scenario Settings"
        description="Tune global assumptions before moving into structured tables."
        actionLabel="Run Model"
        onAction={handleRun}
        actionVariant="primary"
        meta={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleSave}>
              Save Settings
            </Button>
            <span className="rounded-full bg-surface-alt px-3 py-1 text-xs text-muted">{scenario.outputs ? "Run available" : "No results yet"}</span>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Model Horizon</CardTitle>
            <CardDescription>Set the time window and reporting currency.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">Start Month</label>
              <Input
                type="month"
                value={draft.modelHorizon.startMonth}
                onChange={(event) => updateDraft("modelHorizon.startMonth", event.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">Months Forward</label>
              <Input
                type="number"
                value={draft.modelHorizon.monthsForward}
                onChange={(event) => updateDraft("modelHorizon.monthsForward", Number(event.target.value))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">Currency</label>
              <Select
                value={draft.modelHorizon.currency}
                onChange={(event) => updateDraft("modelHorizon.currency", event.target.value)}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scenario Mode</CardTitle>
            <CardDescription>Base, upside, or downside forecast posture.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">Mode</label>
              <Select
                value={draft.scenarioMode}
                onChange={(event) => updateDraft("scenarioMode", event.target.value)}
              >
                <option value="base">Base</option>
                <option value="upside">Upside</option>
                <option value="downside">Downside</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Mechanics</CardTitle>
            <CardDescription>Blended SaaS/services mix and prepay assumptions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">SaaS Mix %</label>
              <Input
                type="number"
                value={draft.revenueMechanics.saasMixPct}
                onChange={(event) => updateDraft("revenueMechanics.saasMixPct", Number(event.target.value))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">Annual Prepay %</label>
              <Input
                type="number"
                value={draft.revenueMechanics.annualPrepaySharePct}
                onChange={(event) => updateDraft("revenueMechanics.annualPrepaySharePct", Number(event.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Channel</CardTitle>
            <CardDescription>Partner share, mode, and fee structure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">Channel Share %</label>
              <Input
                type="number"
                value={draft.channel.sharePct}
                onChange={(event) => updateDraft("channel.sharePct", Number(event.target.value))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">Mode</label>
              <Select value={draft.channel.mode} onChange={(event) => updateDraft("channel.mode", event.target.value)}>
                <option value="referral">Referral</option>
                <option value="reseller">Reseller</option>
              </Select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">Fee %</label>
                <Input
                  type="number"
                  value={draft.channel.feePct}
                  onChange={(event) => updateDraft("channel.feePct", Number(event.target.value))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">Discount %</label>
                <Input
                  type="number"
                  value={draft.channel.discountPct}
                  onChange={(event) => updateDraft("channel.discountPct", Number(event.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Cost Controls</CardTitle>
            <CardDescription>Cost per 1K tokens, cache, and usage inputs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">Cost per 1K Tokens</label>
              <Input
                type="number"
                value={draft.aiCostControls.costPer1kTokens}
                onChange={(event) => updateDraft("aiCostControls.costPer1kTokens", Number(event.target.value))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">Cache Hit %</label>
              <Input
                type="number"
                value={draft.aiCostControls.cacheHitPct}
                onChange={(event) => updateDraft("aiCostControls.cacheHitPct", Number(event.target.value))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">Tokens per Run</label>
              <Input
                type="number"
                value={draft.aiCostControls.tokensPerRun}
                onChange={(event) => updateDraft("aiCostControls.tokensPerRun", Number(event.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Collections Terms</CardTitle>
            <CardDescription>High-level cash collection assumptions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">DSO</label>
              <Input
                type="number"
                value={draft.collectionsTerms.dso}
                onChange={(event) => updateDraft("collectionsTerms.dso", Number(event.target.value))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">Net Terms</label>
              <Input
                type="number"
                value={draft.collectionsTerms.netTerms}
                onChange={(event) => updateDraft("collectionsTerms.netTerms", Number(event.target.value))}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
