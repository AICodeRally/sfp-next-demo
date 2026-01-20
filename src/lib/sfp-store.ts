"use client";

import { useSyncExternalStore } from "react";
import { seedScenarios } from "@/lib/sfp-seed";
import type { Scenario, Settings, Tables } from "@/lib/sfp-types";
import { runModel } from "@/lib/sfp-model";

const STORE_KEY = "sfp_scenarios_v1";
let cache: Scenario[] | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function nowIso() {
  return new Date().toISOString();
}

function ensureSeeded(scenarios: Scenario[]) {
  if (scenarios.length > 0) return scenarios;
  return seedScenarios.map((scenario) => ({ ...scenario, createdAt: nowIso(), updatedAt: nowIso() }));
}

function readStorage(): Scenario[] {
  if (typeof window === "undefined") {
    return seedScenarios;
  }

  if (cache) return cache;

  const raw = window.localStorage.getItem(STORE_KEY);
  if (!raw) {
    cache = ensureSeeded([]);
    window.localStorage.setItem(STORE_KEY, JSON.stringify(cache));
    return cache;
  }

  try {
    cache = ensureSeeded(JSON.parse(raw) as Scenario[]);
  } catch {
    cache = ensureSeeded([]);
  }

  window.localStorage.setItem(STORE_KEY, JSON.stringify(cache));
  return cache;
}

function writeStorage(next: Scenario[]) {
  cache = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
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
    return {
      ...scenario,
      status: scenario.status === "locked" ? "draft" : "locked",
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
