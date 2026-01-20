import { z } from "zod";

export const ScenarioStatusSchema = z.enum(["draft", "locked"]);
export const ScenarioModeSchema = z.enum(["base", "upside", "downside"]);
export const ChannelModeSchema = z.enum(["referral", "reseller"]);
export const BillingSchema = z.enum(["monthly", "annual"]);
export const SkuCategorySchema = z.enum(["saas", "services"]);

export const SettingsSchema = z.object({
  modelHorizon: z.object({
    startMonth: z.string(),
    monthsForward: z.number().min(6).max(60),
    currency: z.string()
  }),
  scenarioMode: ScenarioModeSchema,
  revenueMechanics: z.object({
    saasMixPct: z.number().min(0).max(100),
    annualPrepaySharePct: z.number().min(0).max(100)
  }),
  channel: z.object({
    sharePct: z.number().min(0).max(100),
    mode: ChannelModeSchema,
    feePct: z.number().min(0).max(100),
    discountPct: z.number().min(0).max(100)
  }),
  aiCostControls: z.object({
    costPer1kTokens: z.number().min(0),
    cacheHitPct: z.number().min(0).max(100),
    tokensPerRun: z.number().min(0)
  }),
  collectionsTerms: z.object({
    dso: z.number().min(0),
    netTerms: z.number().min(0)
  })
});

export const SegmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  targetPct: z.number().min(0).max(100),
  notes: z.string().optional()
});

export const SkuSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: SkuCategorySchema,
  basePrice: z.number().min(0),
  costPct: z.number().min(0).max(100)
});

export const PricingPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  billing: BillingSchema,
  price: z.number().min(0),
  users: z.number().min(1)
});

export const CohortPlanSchema = z.object({
  id: z.string(),
  monthOffset: z.number().min(0),
  newCustomers: z.number().min(0)
});

export const ChannelTermSchema = z.object({
  id: z.string(),
  partner: z.string(),
  feePct: z.number().min(0).max(100),
  discountPct: z.number().min(0).max(100)
});

export const AiUsageProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  tokensPerCustomer: z.number().min(0),
  cachePct: z.number().min(0).max(100)
});

export const ServicesSkuSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().min(0),
  costPct: z.number().min(0).max(100)
});

export const ServicesAttachPlanSchema = z.object({
  id: z.string(),
  monthOffset: z.number().min(0),
  attachRatePct: z.number().min(0).max(100)
});

export const DeliveryCapacityPlanSchema = z.object({
  id: z.string(),
  role: z.string(),
  monthlyCapacity: z.number().min(0),
  cost: z.number().min(0)
});

export const HeadcountPlanSchema = z.object({
  id: z.string(),
  role: z.string(),
  count: z.number().min(0),
  fullyLoadedCost: z.number().min(0)
});

export const ExpensePlanSchema = z.object({
  id: z.string(),
  category: z.string(),
  monthlyCost: z.number().min(0)
});

export const CollectionsTermSchema = z.object({
  id: z.string(),
  segment: z.string(),
  dso: z.number().min(0)
});

export const TablesSchema = z.object({
  segments: z.array(SegmentSchema),
  skus: z.array(SkuSchema),
  pricingPlans: z.array(PricingPlanSchema),
  cohortPlan: z.array(CohortPlanSchema),
  channelTerms: z.array(ChannelTermSchema),
  aiUsageProfile: z.array(AiUsageProfileSchema),
  servicesSku: z.array(ServicesSkuSchema),
  servicesAttachPlan: z.array(ServicesAttachPlanSchema),
  deliveryCapacityPlan: z.array(DeliveryCapacityPlanSchema),
  headcountPlan: z.array(HeadcountPlanSchema),
  expensePlan: z.array(ExpensePlanSchema),
  collectionsTerms: z.array(CollectionsTermSchema)
});

export const StatementMonthlySchema = z.object({
  month: z.string(),
  revenue: z.number(),
  cogs: z.number(),
  opex: z.number(),
  netIncome: z.number(),
  cashBalance: z.number()
});

export const MetricsMonthlySchema = z.object({
  month: z.string(),
  arr: z.number(),
  aiCogsPct: z.number(),
  gmSaasPct: z.number(),
  gmServicesPct: z.number(),
  gmBlendedPct: z.number(),
  runwayMonths: z.number()
});

export const OutputsSchema = z.object({
  statementsMonthly: z.array(StatementMonthlySchema),
  metricsMonthly: z.array(MetricsMonthlySchema),
  lastRunAt: z.string(),
  runStatus: z.enum(["idle", "success", "error"])
});

export const ScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: ScenarioStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  settings: SettingsSchema,
  tables: TablesSchema,
  outputs: OutputsSchema.nullable()
});

export type Scenario = z.infer<typeof ScenarioSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type Tables = z.infer<typeof TablesSchema>;
export type Outputs = z.infer<typeof OutputsSchema>;
