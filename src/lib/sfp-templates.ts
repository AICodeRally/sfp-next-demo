import type { Settings, Tables } from "@/lib/sfp-types";

export type ScenarioTemplate = {
  id: string;
  name: string;
  description: string;
  settings?: Partial<Settings>;
  tables?: Partial<Tables>;
};

export const scenarioTemplates: ScenarioTemplate[] = [
  {
    id: "base_case",
    name: "Base Case",
    description: "Balanced growth with steady churn and channel assist.",
  },
  {
    id: "downside_churn",
    name: "Downside Churn",
    description: "Higher churn + slower funnel conversions.",
    settings: {
      scenarioMode: "downside",
      channel: { sharePct: 20, mode: "referral", feePct: 12, discountPct: 6 },
    },
    tables: {
      retentionAssumptions: [
        { id: "ret_down", segment: "Mid-Market", channel: "Direct", logoChurnPct: 4, revenueChurnPct: 2, expansionPct: 1 },
      ],
      cohortPlan: [
        { id: "cohort_down_1", monthOffset: 0, newCustomers: 4 },
        { id: "cohort_down_2", monthOffset: 6, newCustomers: 8 },
      ],
    },
  },
  {
    id: "upside_channel",
    name: "Upside Channel Push",
    description: "Partner acceleration with margin tradeoffs.",
    settings: {
      scenarioMode: "upside",
      channel: { sharePct: 35, mode: "reseller", feePct: 14, discountPct: 8 },
    },
    tables: {
      channelTerms: [
        { id: "ch_up", partner: "Strategic Partner", feePct: 14, discountPct: 6 },
      ],
      cohortPlan: [
        { id: "cohort_up_1", monthOffset: 0, newCustomers: 8 },
        { id: "cohort_up_2", monthOffset: 6, newCustomers: 16 },
      ],
    },
  },
  {
    id: "price_lift",
    name: "Price Lift",
    description: "10% pricing lift with modest churn impact.",
    settings: {
      scenarioMode: "upside",
      revenueMechanics: { saasMixPct: 85, annualPrepaySharePct: 45 },
    },
    tables: {
      pricingPlans: [
        { id: "plan_lift_1", name: "Pro Monthly (Lift)", billing: "monthly", price: 1980, users: 25 },
      ],
    },
  },
  {
    id: "usage_monetize",
    name: "Usage Monetization",
    description: "Higher usage revenue with token cost sensitivity.",
    settings: {
      scenarioMode: "upside",
      aiCostControls: { costPer1kTokens: 0.85, cacheHitPct: 30, tokensPerRun: 1600 },
    },
    tables: {
      usageAssumptions: [
        { id: "use_up", segment: "Mid-Market", channel: "Direct", tokensPerTenant: 32000, computeHours: 3, storageGb: 14 },
      ],
      cogsUnitCosts: [
        { id: "cogs_up", costName: "LLM Tokens", unit: "token_1k", unitCost: 0.85 },
      ],
    },
  },
  {
    id: "services_heavy",
    name: "Services Heavy",
    description: "Implementation-led revenue with higher COGS mix.",
    settings: {
      revenueMechanics: { saasMixPct: 60, annualPrepaySharePct: 25 },
    },
    tables: {
      servicesSku: [
        { id: "svc_heavy", name: "Implementation Program", price: 18000, costPct: 55 },
      ],
      servicesAttachPlan: [
        { id: "sap_heavy", monthOffset: 0, attachRatePct: 45 },
      ],
    },
  },
  {
    id: "hiring_freeze",
    name: "Hiring Freeze",
    description: "Zero net new hires, reduced OpEx, slower growth.",
    settings: {
      scenarioMode: "downside",
    },
    tables: {
      headcountPlan: [
        { id: "hc_freeze", role: "Founders", count: 2, fullyLoadedCost: 18000 },
      ],
      expensePlan: [
        { id: "exp_freeze", category: "Marketing", monthlyCost: 4000 },
      ],
    },
  },
];
