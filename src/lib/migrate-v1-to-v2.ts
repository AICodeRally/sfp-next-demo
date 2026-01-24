/**
 * Migration script: sfp_scenarios_v1 → sfp_scenarios_v2
 *
 * Changes:
 * - Adds `dataType: "client"` to all existing scenarios
 * - Adds `demoMetadata: undefined` (optional field)
 * - Preserves v1 key as backup for manual rollback
 *
 * Auto-runs on first app load (called from sfp-store.ts)
 */

import type { Scenario } from "@/lib/sfp-types";

const V1_KEY = "sfp_scenarios_v1";
const V2_KEY = "sfp_scenarios_v2";

interface V1Scenario extends Omit<Scenario, "dataType" | "demoMetadata"> {
  // V1 scenarios don't have dataType or demoMetadata
}

export function migrateLocalStorageV1toV2(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  // Check if v2 data already exists (skip if yes)
  const existingV2 = window.localStorage.getItem(V2_KEY);
  if (existingV2) {
    console.log("[Migration] v2 data already exists, skipping migration");
    return false;
  }

  // Read v1 data
  const v1Raw = window.localStorage.getItem(V1_KEY);
  if (!v1Raw) {
    console.log("[Migration] No v1 data found, nothing to migrate");
    return false;
  }

  try {
    const v1Scenarios = JSON.parse(v1Raw) as V1Scenario[];

    // Migrate: Add dataType: "client" to all scenarios
    const v2Scenarios: Scenario[] = v1Scenarios.map((scenario) => ({
      ...scenario,
      dataType: "client" as const,
      demoMetadata: undefined
    }));

    // Save to v2 key
    window.localStorage.setItem(V2_KEY, JSON.stringify(v2Scenarios));

    console.log(`[Migration] Successfully migrated ${v2Scenarios.length} scenarios from v1 to v2`);
    console.log(`[Migration] v1 data preserved at key: ${V1_KEY}`);

    return true;
  } catch (error) {
    console.error("[Migration] Failed to migrate v1 to v2:", error);
    return false;
  }
}

/**
 * Manual rollback helper (for debugging)
 * Restores v1 data to v2 key (removes dataType/demoMetadata fields)
 */
export function rollbackV2toV1(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const v1Raw = window.localStorage.getItem(V1_KEY);
  if (!v1Raw) {
    console.error("[Rollback] No v1 backup found");
    return false;
  }

  try {
    // Copy v1 data to v2 key
    window.localStorage.setItem(V2_KEY, v1Raw);
    console.log("[Rollback] Successfully restored v1 data to v2 key");
    return true;
  } catch (error) {
    console.error("[Rollback] Failed to rollback:", error);
    return false;
  }
}
