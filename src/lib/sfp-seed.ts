import type { Scenario } from "@/lib/sfp-types";

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  const base = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${prefix}_${base}`;
}

export const seedScenarios: Scenario[] = [
  {
    id: "sfp_base",
    name: "Base Scenario",
    status: "draft",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    settings: {
      modelHorizon: {
        startMonth: "2026-02",
        monthsForward: 24,
        currency: "USD"
      },
      scenarioMode: "base",
      revenueMechanics: {
        saasMixPct: 80,
        annualPrepaySharePct: 30
      },
      channel: {
        sharePct: 25,
        mode: "referral",
        feePct: 10,
        discountPct: 5
      },
      aiCostControls: {
        costPer1kTokens: 0.75,
        cacheHitPct: 35,
        tokensPerRun: 1200
      },
      collectionsTerms: {
        dso: 35,
        netTerms: 30
      }
    },
    tables: {
      segments: [
        { id: makeId("seg"), name: "Mid-Market", targetPct: 60, notes: "Core ICP" },
        { id: makeId("seg"), name: "Enterprise", targetPct: 40, notes: "Strategic" }
      ],
      skus: [
        { id: makeId("sku"), name: "SFP Core", category: "saas", basePrice: 1800, costPct: 18 },
        { id: makeId("sku"), name: "SFP Services", category: "services", basePrice: 8000, costPct: 42 }
      ],
      pricingPlans: [
        { id: makeId("plan"), name: "Pro Monthly", billing: "monthly", price: 1800, users: 25 },
        { id: makeId("plan"), name: "Enterprise Annual", billing: "annual", price: 18000, users: 75 }
      ],
      cohortPlan: [
        { id: makeId("cohort"), monthOffset: 0, newCustomers: 6 },
        { id: makeId("cohort"), monthOffset: 3, newCustomers: 10 },
        { id: makeId("cohort"), monthOffset: 6, newCustomers: 14 },
        { id: makeId("cohort"), monthOffset: 12, newCustomers: 20 }
      ],
      channelTerms: [
        { id: makeId("ch"), partner: "Catalyst Partners", feePct: 12, discountPct: 4 }
      ],
      aiUsageProfile: [
        { id: makeId("ai"), name: "Default", tokensPerCustomer: 24000, cachePct: 30 }
      ],
      servicesSku: [
        { id: makeId("svc"), name: "Launch Enablement", price: 12000, costPct: 45 }
      ],
      servicesAttachPlan: [
        { id: makeId("sap"), monthOffset: 0, attachRatePct: 25 },
        { id: makeId("sap"), monthOffset: 6, attachRatePct: 35 }
      ],
      deliveryCapacityPlan: [
        { id: makeId("cap"), role: "Delivery Lead", monthlyCapacity: 6, cost: 14000 },
        { id: makeId("cap"), role: "Solutions Architect", monthlyCapacity: 4, cost: 16000 }
      ],
      headcountPlan: [
        { id: makeId("hc"), role: "Founders", count: 2, fullyLoadedCost: 18000 },
        { id: makeId("hc"), role: "GTM", count: 1, fullyLoadedCost: 14000 }
      ],
      expensePlan: [
        { id: makeId("exp"), category: "Cloud + tooling", monthlyCost: 4500 },
        { id: makeId("exp"), category: "Marketing", monthlyCost: 8000 }
      ],
      collectionsTerms: [
        { id: makeId("col"), segment: "Mid-Market", dso: 32 },
        { id: makeId("col"), segment: "Enterprise", dso: 45 }
      ]
    },
    outputs: null
  }
];
