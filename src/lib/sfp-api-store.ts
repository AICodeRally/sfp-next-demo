/**
 * SFP API Store - API-backed store with same interface as sfp-store
 *
 * This provides the same hooks and functions as sfp-store but uses
 * the API instead of localStorage. Use this for gradual migration.
 *
 * Usage:
 * - Import from '@/lib/sfp-api-store' instead of '@/lib/sfp-store'
 * - Same function signatures, but async and API-backed
 */

"use client";

import { useCallback, useEffect, useState } from 'react';
import { scenarioApi, modelApi, type ApiScenario } from '@/lib/api';
import type { Scenario, Settings, Tables } from '@/lib/sfp-types';

// Cache for scenarios
let scenariosCache: ApiScenario[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

// Transform API scenario to frontend format
function transformScenario(apiScenario: ApiScenario): Scenario {
  const settings = apiScenario.settings;
  const inputs = apiScenario.inputs;
  const outputs = apiScenario.outputs;

  return {
    id: apiScenario.id,
    name: apiScenario.name,
    status: apiScenario.status as 'draft' | 'locked',
    dataType: apiScenario.dataType as 'demo' | 'template' | 'client',
    createdAt: apiScenario.createdAt,
    updatedAt: apiScenario.updatedAt,
    settings: settings ? {
      modelHorizon: {
        startMonth: settings.startMonth,
        monthsForward: settings.monthsForward,
        currency: settings.currency,
      },
      scenarioMode: settings.scenarioMode as 'base' | 'upside' | 'downside',
      revenueMechanics: {
        saasMixPct: 100,
        annualPrepaySharePct: 0,
      },
      channel: {
        sharePct: settings.channelSharePct,
        mode: settings.channelMode as 'referral' | 'reseller',
        feePct: settings.channelFeePct,
        discountPct: settings.channelDiscountPct,
      },
      aiCostControls: {
        costPer1kTokens: settings.costPer1kTokens,
        cacheHitPct: settings.cacheHitPct,
        tokensPerRun: settings.tokensPerRun,
      },
      collectionsTerms: {
        dso: 30,
        netTerms: 30,
      },
    } : {} as Settings,
    tables: inputs ? {
      segments: [],
      skus: inputs.skus as never[],
      pricingPlans: inputs.pricingPlans as never[],
      cohortPlan: inputs.cohortPlan as never[],
      channelTerms: [],
      aiUsageProfile: [],
      servicesSku: inputs.servicesSku as never[],
      servicesAttachPlan: inputs.servicesAttachPlan as never[],
      deliveryCapacityPlan: inputs.deliveryCapacityPlan as never[],
      headcountPlan: inputs.headcountPlan as never[],
      expensePlan: inputs.expensePlan as never[],
      collectionsTerms: [],
      scenarios: [],
      channels: [],
      retentionAssumptions: inputs.retentionAssumptions as never[],
      usageAssumptions: inputs.usageAssumptions as never[],
      cogsUnitCosts: inputs.cogsUnitCosts as never[],
      runSettings: [],
    } : {} as Tables,
    outputs: outputs && outputs.lastRunAt ? {
      statementsMonthly: outputs.statementsMonthly as never[],
      metricsMonthly: outputs.metricsMonthly as never[],
      lastRunAt: outputs.lastRunAt,
      runStatus: outputs.runStatus as 'idle' | 'success' | 'error',
      validation: outputs.validation as never[],
    } : null,
  };
}

// Hook for scenarios list
export function useScenarios(): Scenario[] {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchScenarios() {
      try {
        const data = await scenarioApi.list();
        if (mounted) {
          scenariosCache = data;
          setScenarios(data.map(transformScenario));
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch scenarios:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchScenarios();

    const listener = () => {
      setScenarios(scenariosCache.map(transformScenario));
    };
    listeners.add(listener);

    return () => {
      mounted = false;
      listeners.delete(listener);
    };
  }, []);

  return scenarios;
}

// Hook for single scenario
export function useScenario(id: string): { scenario: Scenario | null; loading: boolean; error: Error | null } {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchScenario() {
      try {
        const data = await scenarioApi.get(id);
        if (mounted) {
          setScenario(transformScenario(data));
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch scenario'));
          setLoading(false);
        }
      }
    }

    fetchScenario();

    return () => {
      mounted = false;
    };
  }, [id]);

  return { scenario, loading, error };
}

// Get scenario by ID (async)
export async function getScenarioById(id: string): Promise<Scenario | null> {
  try {
    const data = await scenarioApi.get(id);
    return transformScenario(data);
  } catch {
    return null;
  }
}

// Create scenario
export async function createScenario(name: string): Promise<Scenario | null> {
  try {
    const data = await scenarioApi.create(name);
    scenariosCache = [data, ...scenariosCache];
    emit();
    return transformScenario(data);
  } catch (error) {
    console.error('Failed to create scenario:', error);
    return null;
  }
}

// Clone scenario
export async function cloneScenario(id: string): Promise<Scenario | null> {
  try {
    const source = await scenarioApi.get(id);
    const clone = await scenarioApi.create(`${source.name} Copy`);
    // Copy settings and inputs
    await scenarioApi.update(clone.id, {
      settings: source.settings ? {
        startMonth: source.settings.startMonth,
        monthsForward: source.settings.monthsForward,
        currency: source.settings.currency,
        scenarioMode: source.settings.scenarioMode,
        costPer1kTokens: source.settings.costPer1kTokens,
        cacheHitPct: source.settings.cacheHitPct,
        tokensPerRun: source.settings.tokensPerRun,
        channelSharePct: source.settings.channelSharePct,
        channelMode: source.settings.channelMode,
        channelFeePct: source.settings.channelFeePct,
        channelDiscountPct: source.settings.channelDiscountPct,
      } : undefined,
      inputs: source.inputs ? {
        pricingPlans: source.inputs.pricingPlans,
        cohortPlan: source.inputs.cohortPlan,
        retentionAssumptions: source.inputs.retentionAssumptions,
        usageAssumptions: source.inputs.usageAssumptions,
        cogsUnitCosts: source.inputs.cogsUnitCosts,
        expensePlan: source.inputs.expensePlan,
        headcountPlan: source.inputs.headcountPlan,
        skus: source.inputs.skus,
        servicesSku: source.inputs.servicesSku,
        servicesAttachPlan: source.inputs.servicesAttachPlan,
        deliveryCapacityPlan: source.inputs.deliveryCapacityPlan,
      } : undefined,
    });
    const updated = await scenarioApi.get(clone.id);
    scenariosCache = [updated, ...scenariosCache];
    emit();
    return transformScenario(updated);
  } catch (error) {
    console.error('Failed to clone scenario:', error);
    return null;
  }
}

// Toggle lock
export async function toggleScenarioLock(id: string): Promise<void> {
  try {
    const scenario = await scenarioApi.get(id);
    const newStatus = scenario.status === 'locked' ? 'draft' : 'locked';
    await scenarioApi.update(id, { status: newStatus });

    scenariosCache = scenariosCache.map((s) =>
      s.id === id ? { ...s, status: newStatus } : s
    );
    emit();
  } catch (error) {
    console.error('Failed to toggle lock:', error);
  }
}

// Update settings
export async function updateSettings(id: string, settings: Settings): Promise<void> {
  try {
    await scenarioApi.update(id, {
      settings: {
        startMonth: settings.modelHorizon.startMonth,
        monthsForward: settings.modelHorizon.monthsForward,
        currency: settings.modelHorizon.currency,
        scenarioMode: settings.scenarioMode,
        costPer1kTokens: settings.aiCostControls.costPer1kTokens,
        cacheHitPct: settings.aiCostControls.cacheHitPct,
        tokensPerRun: settings.aiCostControls.tokensPerRun,
        channelSharePct: settings.channel.sharePct,
        channelMode: settings.channel.mode,
        channelFeePct: settings.channel.feePct,
        channelDiscountPct: settings.channel.discountPct,
      },
    });
    emit();
  } catch (error) {
    console.error('Failed to update settings:', error);
  }
}

// Update tables
export async function updateTables(id: string, tables: Partial<Tables>): Promise<void> {
  try {
    await scenarioApi.update(id, {
      inputs: {
        pricingPlans: tables.pricingPlans,
        cohortPlan: tables.cohortPlan,
        retentionAssumptions: tables.retentionAssumptions,
        usageAssumptions: tables.usageAssumptions,
        cogsUnitCosts: tables.cogsUnitCosts,
        expensePlan: tables.expensePlan,
        headcountPlan: tables.headcountPlan,
        skus: tables.skus,
        servicesSku: tables.servicesSku,
        servicesAttachPlan: tables.servicesAttachPlan,
        deliveryCapacityPlan: tables.deliveryCapacityPlan,
      },
    });
    emit();
  } catch (error) {
    console.error('Failed to update tables:', error);
  }
}

// Run model
export async function runScenarioModel(id: string): Promise<void> {
  try {
    await modelApi.run(id);

    // Refresh scenario
    const updated = await scenarioApi.get(id);
    scenariosCache = scenariosCache.map((s) =>
      s.id === id ? updated : s
    );
    emit();
  } catch (error) {
    console.error('Failed to run model:', error);
    throw error;
  }
}

// Export to Excel
export async function exportScenarioToExcel(id: string): Promise<Blob> {
  return modelApi.export(id);
}

// Delete scenario
export async function deleteScenario(id: string): Promise<void> {
  try {
    await scenarioApi.delete(id);
    scenariosCache = scenariosCache.filter((s) => s.id !== id);
    emit();
  } catch (error) {
    console.error('Failed to delete scenario:', error);
  }
}

// Get scenario stats
export function getScenarioStats() {
  return {
    total: scenariosCache.length,
    demo: scenariosCache.filter((s) => s.dataType === 'demo').length,
    template: scenariosCache.filter((s) => s.dataType === 'template').length,
    client: scenariosCache.filter((s) => s.dataType === 'client').length,
  };
}

// Generate row ID
export function makeRowId(prefix: string): string {
  const base = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `${prefix}_${base}`;
}
