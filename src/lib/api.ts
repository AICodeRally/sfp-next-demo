/**
 * API Client for SFP Financial Model
 * Frontend utilities for calling API routes
 */

import type { Scenario } from '@/lib/sfp-types';

const API_BASE = '/api';

// Type definitions for API responses
export interface ApiScenario {
  id: string;
  name: string;
  status: string;
  dataType: string;
  createdAt: string;
  updatedAt: string;
  settings: ApiScenarioSettings | null;
  inputs: ApiScenarioInputs | null;
  outputs: ApiScenarioOutputs | null;
}

export interface ApiScenarioSettings {
  id: string;
  scenarioId: string;
  startMonth: string;
  monthsForward: number;
  currency: string;
  scenarioMode: string;
  costPer1kTokens: number;
  cacheHitPct: number;
  tokensPerRun: number;
  channelSharePct: number;
  channelMode: string;
  channelFeePct: number;
  channelDiscountPct: number;
}

export interface ApiScenarioInputs {
  id: string;
  scenarioId: string;
  pricingPlans: unknown[];
  cohortPlan: unknown[];
  retentionAssumptions: unknown[];
  usageAssumptions: unknown[];
  cogsUnitCosts: unknown[];
  expensePlan: unknown[];
  headcountPlan: unknown[];
  skus: unknown[];
  servicesSku: unknown[];
  servicesAttachPlan: unknown[];
  deliveryCapacityPlan: unknown[];
}

export interface ApiScenarioOutputs {
  id: string;
  scenarioId: string;
  statementsMonthly: unknown[];
  metricsMonthly: unknown[];
  validation: unknown[];
  lastRunAt: string | null;
  runStatus: string | null;
}

export interface ModelRunResult {
  success: boolean;
  result: {
    statementsMonthly: unknown[];
    metricsMonthly: unknown[];
    validation: unknown[];
    lastRunAt: string;
    runStatus: string;
  };
  duration: number;
}

// API Error class
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Generic fetch wrapper
async function fetchApi<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(error.error || 'Request failed', response.status);
  }

  return response.json();
}

// Scenario CRUD
export const scenarioApi = {
  async list(): Promise<ApiScenario[]> {
    return fetchApi<ApiScenario[]>('/scenarios');
  },

  async get(id: string): Promise<ApiScenario> {
    return fetchApi<ApiScenario>(`/scenarios/${id}`);
  },

  async create(name: string, dataType = 'client'): Promise<ApiScenario> {
    return fetchApi<ApiScenario>('/scenarios', {
      method: 'POST',
      body: JSON.stringify({ name, dataType }),
    });
  },

  async update(
    id: string,
    data: {
      name?: string;
      status?: string;
      dataType?: string;
      settings?: Partial<ApiScenarioSettings>;
      inputs?: Partial<ApiScenarioInputs>;
    }
  ): Promise<ApiScenario> {
    return fetchApi<ApiScenario>(`/scenarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<{ success: boolean }> {
    return fetchApi<{ success: boolean }>(`/scenarios/${id}`, {
      method: 'DELETE',
    });
  },
};

// Model operations
export const modelApi = {
  async run(scenarioId: string): Promise<ModelRunResult> {
    return fetchApi<ModelRunResult>('/model/run', {
      method: 'POST',
      body: JSON.stringify({ scenarioId }),
    });
  },

  async export(scenarioId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE}/model/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Export failed' }));
      throw new ApiError(error.error || 'Export failed', response.status);
    }

    return response.blob();
  },
};

// Health check
export async function checkHealth(): Promise<{ status: string; engine: string; version: string }> {
  return fetchApi<{ status: string; engine: string; version: string }>('/health');
}
