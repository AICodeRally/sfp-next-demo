"use client";

import { useSyncExternalStore } from "react";
import { seedScenarios } from "@/lib/sfp-seed";
import { scenarioTemplates } from "@/lib/sfp-templates";
import type { Scenario, Settings, Tables, CompanyProfile, DataType, DemoMetadata } from "@/lib/sfp-types";
import { runModel } from "@/lib/sfp-model";
import { migrateLocalStorageV1toV2 } from "@/lib/migrate-v1-to-v2";

const STORE_KEY_SCENARIOS = "sfp_scenarios_v2"; // Bumped from v1 for data type migration
const STORE_KEY_PROFILE = "sfp_company_profile_v1";
let cache: Scenario[] | null = null;
let profileCache: CompanyProfile | null | undefined = undefined; // undefined = not loaded, null = no profile
const listeners = new Set<() => void>();
const profileListeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function emitProfile() {
  profileListeners.forEach((listener) => listener());
}

function nowIso() {
  return new Date().toISOString();
}

const baseTables = seedScenarios[0]?.tables;

function normalizeScenario(scenario: Scenario): Scenario {
  const tables = baseTables ? { ...baseTables, ...scenario.tables } : scenario.tables;
  const outputs = scenario.outputs ? { ...scenario.outputs, validation: scenario.outputs.validation ?? [] } : null;
  return { ...scenario, tables, outputs };
}

function ensureSeeded(scenarios: Scenario[]) {
  if (scenarios.length > 0) return scenarios.map(normalizeScenario);
  return seedScenarios.map((scenario) => normalizeScenario({ ...scenario, createdAt: nowIso(), updatedAt: nowIso() }));
}

function readStorage(): Scenario[] {
  if (typeof window === "undefined") {
    return seedScenarios;
  }

  if (cache) return cache;

  // Auto-migrate v1 to v2 on first load
  migrateLocalStorageV1toV2();

  const raw = window.localStorage.getItem(STORE_KEY_SCENARIOS);
  if (!raw) {
    cache = ensureSeeded([]);
    window.localStorage.setItem(STORE_KEY_SCENARIOS, JSON.stringify(cache));
    return cache;
  }

  try {
    cache = ensureSeeded(JSON.parse(raw) as Scenario[]);
  } catch {
    cache = ensureSeeded([]);
  }

  window.localStorage.setItem(STORE_KEY_SCENARIOS, JSON.stringify(cache));
  return cache;
}

function writeStorage(next: Scenario[]) {
  cache = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORE_KEY_SCENARIOS, JSON.stringify(next));
  }
  emit();
}

function makeId(prefix: string) {
  const base = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${prefix}_${base}`;
}

export function useScenarios() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => readStorage(),
    () => seedScenarios
  );
}

export function getScenarioById(id: string) {
  return readStorage().find((scenario) => scenario.id === id) ?? null;
}

export function createScenario(name: string) {
  const scenarios = readStorage();
  const base = scenarios[0] ?? seedScenarios[0];
  const now = nowIso();
  const next: Scenario = {
    ...base,
    id: makeId("sfp"),
    name,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    outputs: null
  };
  writeStorage([next, ...scenarios]);
  return next;
}

export function createScenarioFromTemplate(templateId: string) {
  const scenarios = readStorage();
  const base = scenarios[0] ?? seedScenarios[0];
  const template = scenarioTemplates.find((item) => item.id === templateId);
  if (!template) return null;
  const now = nowIso();
  const settings = {
    ...base.settings,
    ...template.settings,
    modelHorizon: { ...base.settings.modelHorizon, ...template.settings?.modelHorizon },
    revenueMechanics: { ...base.settings.revenueMechanics, ...template.settings?.revenueMechanics },
    channel: { ...base.settings.channel, ...template.settings?.channel },
    aiCostControls: { ...base.settings.aiCostControls, ...template.settings?.aiCostControls },
    collectionsTerms: { ...base.settings.collectionsTerms, ...template.settings?.collectionsTerms },
  };
  const tables = {
    ...base.tables,
    ...template.tables,
  };
  const next: Scenario = {
    ...base,
    id: makeId("sfp"),
    name: template.name,
    status: "draft",
    dataType: "template",
    createdAt: now,
    updatedAt: now,
    settings,
    tables,
    outputs: null,
  };
  writeStorage([next, ...scenarios]);
  return next;
}

export function cloneScenario(id: string) {
  const scenarios = readStorage();
  const source = scenarios.find((scenario) => scenario.id === id);
  if (!source) return null;
  const now = nowIso();
  const clone: Scenario = {
    ...source,
    id: makeId("sfp"),
    name: `${source.name} Copy`,
    status: "draft",
    createdAt: now,
    updatedAt: now
  };
  writeStorage([clone, ...scenarios]);
  return clone;
}

export function toggleScenarioLock(id: string) {
  const scenarios = readStorage().map((scenario) => {
    if (scenario.id !== id) return scenario;
    const newStatus: "draft" | "locked" = scenario.status === "locked" ? "draft" : "locked";
    return {
      ...scenario,
      status: newStatus,
      updatedAt: nowIso()
    };
  });
  writeStorage(scenarios);
}

export function updateSettings(id: string, settings: Settings) {
  const scenarios = readStorage().map((scenario) => {
    if (scenario.id !== id) return scenario;
    return {
      ...scenario,
      settings,
      updatedAt: nowIso()
    };
  });
  writeStorage(scenarios);
}

export function updateTables(id: string, tables: Tables) {
  const scenarios = readStorage().map((scenario) => {
    if (scenario.id !== id) return scenario;
    return {
      ...scenario,
      tables,
      updatedAt: nowIso()
    };
  });
  writeStorage(scenarios);
}

export function updateTableRow<T extends keyof Tables>(id: string, tableKey: T, rowId: string, patch: Partial<Tables[T][number]>) {
  const scenarios = readStorage().map((scenario) => {
    if (scenario.id !== id) return scenario;
    const rows = scenario.tables[tableKey].map((row) => (row.id === rowId ? { ...row, ...patch } : row));
    return {
      ...scenario,
      tables: {
        ...scenario.tables,
        [tableKey]: rows
      },
      updatedAt: nowIso()
    };
  });
  writeStorage(scenarios);
}

export function addTableRow<T extends keyof Tables>(id: string, tableKey: T, row: Tables[T][number]) {
  const scenarios = readStorage().map((scenario) => {
    if (scenario.id !== id) return scenario;
    return {
      ...scenario,
      tables: {
        ...scenario.tables,
        [tableKey]: [...scenario.tables[tableKey], row]
      },
      updatedAt: nowIso()
    };
  });
  writeStorage(scenarios);
}

export function deleteTableRow<T extends keyof Tables>(id: string, tableKey: T, rowId: string) {
  const scenarios = readStorage().map((scenario) => {
    if (scenario.id !== id) return scenario;
    return {
      ...scenario,
      tables: {
        ...scenario.tables,
        [tableKey]: scenario.tables[tableKey].filter((row) => row.id !== rowId)
      },
      updatedAt: nowIso()
    };
  });
  writeStorage(scenarios);
}

export function runScenarioModel(id: string) {
  const scenarios = readStorage().map((scenario) => {
    if (scenario.id !== id) return scenario;
    return {
      ...scenario,
      outputs: runModel(scenario),
      updatedAt: nowIso()
    };
  });
  writeStorage(scenarios);
}

export function makeRowId(prefix: string) {
  return makeId(prefix);
}

// ============================================================
// Company Profile Management
// ============================================================

function readProfileStorage(): CompanyProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (profileCache !== undefined) return profileCache;

  const raw = window.localStorage.getItem(STORE_KEY_PROFILE);
  if (!raw) {
    profileCache = null;
    return null;
  }

  try {
    profileCache = JSON.parse(raw) as CompanyProfile;
  } catch {
    profileCache = null;
  }

  return profileCache;
}

function writeProfileStorage(profile: CompanyProfile | null) {
  profileCache = profile;
  if (typeof window !== "undefined") {
    if (profile === null) {
      window.localStorage.removeItem(STORE_KEY_PROFILE);
    } else {
      window.localStorage.setItem(STORE_KEY_PROFILE, JSON.stringify(profile));
    }
  }
  emitProfile();
}

export function getCompanyProfile(): CompanyProfile | null {
  return readProfileStorage();
}

export function saveCompanyProfile(profile: CompanyProfile) {
  writeProfileStorage(profile);
}

export function deleteCompanyProfile() {
  writeProfileStorage(null);
}

export function useCompanyProfile(): CompanyProfile | null {
  return useSyncExternalStore(
    (listener) => {
      profileListeners.add(listener);
      return () => profileListeners.delete(listener);
    },
    () => readProfileStorage(),
    () => null
  );
}

// ============================================================
// Data Type Management
// ============================================================

export function updateScenarioDataType(id: string, dataType: DataType, demoMetadata?: DemoMetadata) {
  const scenarios = readStorage().map((scenario) => {
    if (scenario.id !== id) return scenario;
    return {
      ...scenario,
      dataType,
      demoMetadata: dataType === "demo" || dataType === "template" ? demoMetadata : undefined,
      updatedAt: nowIso()
    };
  });
  writeStorage(scenarios);
}

export function filterScenariosByDataType(filter: "all" | "demo" | "client"): Scenario[] {
  const scenarios = readStorage();
  if (filter === "all") return scenarios;
  if (filter === "demo") return scenarios.filter((s) => s.dataType === "demo" || s.dataType === "template");
  return scenarios.filter((s) => s.dataType === "client");
}

export function bulkDeleteDemoData() {
  const scenarios = readStorage().filter((s) => s.dataType === "client");
  writeStorage(scenarios);
}

export function getScenarioStats() {
  const scenarios = readStorage();
  return {
    total: scenarios.length,
    demo: scenarios.filter((s) => s.dataType === "demo").length,
    template: scenarios.filter((s) => s.dataType === "template").length,
    client: scenarios.filter((s) => s.dataType === "client").length
  };
}

export function deleteScenario(id: string) {
  const scenarios = readStorage().filter((s) => s.id !== id);
  writeStorage(scenarios);
}
