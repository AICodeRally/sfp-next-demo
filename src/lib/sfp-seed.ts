import type { Scenario, CompanyProfile } from "@/lib/sfp-types";

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  const base = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${prefix}_${base}`;
}

// Demo Company Profiles
export const demoCompanyProfiles: CompanyProfile[] = [
  {
    id: "demo_saas_startup",
    name: "CloudFlow Analytics",
    industry: "technology",
    stage: "seed",
    teamSize: 8,
    foundedYear: 2025,
    description: "AI-powered business analytics platform for mid-market SaaS companies",
    website: "https://cloudflow.example.com",
    createdAt: nowIso(),
    updatedAt: nowIso()
  },
  {
    id: "demo_healthtech",
    name: "MediSync Health",
    industry: "healthcare",
    stage: "series-a",
    teamSize: 25,
    foundedYear: 2024,
    description: "Patient care coordination platform connecting providers, patients, and caregivers",
    website: "https://medisync.example.com",
    createdAt: nowIso(),
    updatedAt: nowIso()
  },
  {
    id: "demo_fintech",
    name: "FinFlow Capital",
    industry: "finance",
    stage: "seed",
    teamSize: 12,
    foundedYear: 2025,
    description: "Automated financial planning and investment platform for small businesses",
    website: "https://finflow.example.com",
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
];

const defaultNewTables = {
  scenarios: [
    { id: makeId("scn"), name: "Base Case", description: "Primary scenario", isActive: "yes" as const }
  ],
  channels: [
    { id: makeId("chn"), name: "Direct", type: "direct" as const },
    { id: makeId("chn"), name: "Partner", type: "referral" as const }
  ],
  retentionAssumptions: [
    { id: makeId("ret"), segment: "Mid-Market", channel: "Direct", logoChurnPct: 2, revenueChurnPct: 1, expansionPct: 2 }
  ],
  usageAssumptions: [
    { id: makeId("use"), segment: "Mid-Market", channel: "Direct", tokensPerTenant: 24000, computeHours: 2, storageGb: 10 }
  ],
  cogsUnitCosts: [
    { id: makeId("cogs"), costName: "LLM Tokens", unit: "token_1k" as const, unitCost: 0.75 }
  ],
  runSettings: [
    { id: makeId("run"), runName: "Board Plan", outputGrain: "monthly" as const, includeBalanceSheet: "yes" as const, includeUnitEconomics: "yes" as const }
  ]
};

export const seedScenarios: Scenario[] = [
  {
    id: "sfp_base",
    name: "Base Scenario",
    status: "draft",
    dataType: "client", // Default client data
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
      ...defaultNewTables,
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
  },
  // Demo Scenario: Conservative SaaS Growth
  {
    id: "demo_conservative_2026",
    name: "Conservative SaaS Growth - 2026",
    status: "draft",
    dataType: "demo",
    demoMetadata: {
      year: 2026,
      category: "saas",
      description: "Conservative growth model for early-stage SaaS startup"
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
    settings: {
      modelHorizon: {
        startMonth: "2026-01",
        monthsForward: 18,
        currency: "USD"
      },
      scenarioMode: "base",
      revenueMechanics: {
        saasMixPct: 90,
        annualPrepaySharePct: 40
      },
      channel: {
        sharePct: 15,
        mode: "referral",
        feePct: 8,
        discountPct: 3
      },
      aiCostControls: {
        costPer1kTokens: 0.60,
        cacheHitPct: 40,
        tokensPerRun: 1000
      },
      collectionsTerms: {
        dso: 30,
        netTerms: 30
      }
    },
    tables: {
      ...defaultNewTables,
      segments: [
        { id: makeId("seg"), name: "SMB", targetPct: 70, notes: "Core focus" },
        { id: makeId("seg"), name: "Mid-Market", targetPct: 30, notes: "Expansion" }
      ],
      skus: [
        { id: makeId("sku"), name: "Analytics Pro", category: "saas", basePrice: 1200, costPct: 15 }
      ],
      pricingPlans: [
        { id: makeId("plan"), name: "Pro", billing: "monthly", price: 1200, users: 10 }
      ],
      cohortPlan: [
        { id: makeId("cohort"), monthOffset: 0, newCustomers: 3 },
        { id: makeId("cohort"), monthOffset: 6, newCustomers: 8 }
      ],
      channelTerms: [],
      aiUsageProfile: [
        { id: makeId("ai"), name: "Standard", tokensPerCustomer: 18000, cachePct: 40 }
      ],
      servicesSku: [],
      servicesAttachPlan: [],
      deliveryCapacityPlan: [],
      headcountPlan: [
        { id: makeId("hc"), role: "Founders", count: 2, fullyLoadedCost: 15000 }
      ],
      expensePlan: [
        { id: makeId("exp"), category: "Cloud", monthlyCost: 2000 },
        { id: makeId("exp"), category: "Marketing", monthlyCost: 5000 }
      ],
      collectionsTerms: [
        { id: makeId("col"), segment: "SMB", dso: 28 }
      ]
    },
    outputs: null
  },
  // Template Scenario: SaaS Starter
  {
    id: "template_saas_starter",
    name: "SaaS Starter Template",
    status: "draft",
    dataType: "template",
    demoMetadata: {
      category: "saas",
      description: "Ready-to-use template for SaaS startups"
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
    settings: {
      modelHorizon: {
        startMonth: "2026-01",
        monthsForward: 24,
        currency: "USD"
      },
      scenarioMode: "base",
      revenueMechanics: {
        saasMixPct: 100,
        annualPrepaySharePct: 50
      },
      channel: {
        sharePct: 20,
        mode: "referral",
        feePct: 10,
        discountPct: 5
      },
      aiCostControls: {
        costPer1kTokens: 0.70,
        cacheHitPct: 35,
        tokensPerRun: 1100
      },
      collectionsTerms: {
        dso: 30,
        netTerms: 30
      }
    },
    tables: {
      ...defaultNewTables,
      segments: [
        { id: makeId("seg"), name: "Core Market", targetPct: 100, notes: "Primary segment" }
      ],
      skus: [
        { id: makeId("sku"), name: "Core Product", category: "saas" as const, basePrice: 2000, costPct: 20 }
      ],
      pricingPlans: [
        { id: makeId("plan"), name: "Standard", billing: "monthly" as const, price: 2000, users: 20 }
      ],
      cohortPlan: [
        { id: makeId("cohort"), monthOffset: 0, newCustomers: 5 }
      ],
      channelTerms: [],
      aiUsageProfile: [],
      servicesSku: [],
      servicesAttachPlan: [],
      deliveryCapacityPlan: [],
      headcountPlan: [
        { id: makeId("hc"), role: "Team", count: 3, fullyLoadedCost: 16000 }
      ],
      expensePlan: [
        { id: makeId("exp"), category: "Operations", monthlyCost: 5000 }
      ],
      collectionsTerms: []
    },
    outputs: null
  }
];
