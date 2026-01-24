import { z } from "zod";

export const ScenarioStatusSchema = z.enum(["draft", "locked"]);
export const ScenarioModeSchema = z.enum(["base", "upside", "downside"]);
export const ChannelModeSchema = z.enum(["referral", "reseller"]);
export const BillingSchema = z.enum(["monthly", "annual"]);
export const SkuCategorySchema = z.enum(["saas", "services"]);
export const ChannelTypeSchema = z.enum(["direct", "reseller", "referral", "si_partner"]);

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

export const ScenarioDimSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  isActive: z.enum(["yes", "no"])
});

export const ChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ChannelTypeSchema
});

export const RetentionAssumptionSchema = z.object({
  id: z.string(),
  segment: z.string(),
  channel: z.string(),
  logoChurnPct: z.number().min(0).max(100),
  revenueChurnPct: z.number().min(0).max(100),
  expansionPct: z.number().min(0).max(100)
});

export const UsageAssumptionSchema = z.object({
  id: z.string(),
  segment: z.string(),
  channel: z.string(),
  tokensPerTenant: z.number().min(0),
  computeHours: z.number().min(0),
  storageGb: z.number().min(0)
});

export const CogsUnitCostSchema = z.object({
  id: z.string(),
  costName: z.string(),
  unit: z.string(),
  unitCost: z.number().min(0)
});

export const RunSettingSchema = z.object({
  id: z.string(),
  runName: z.string(),
  outputGrain: z.enum(["monthly", "quarterly"]),
  includeBalanceSheet: z.enum(["yes", "no"]),
  includeUnitEconomics: z.enum(["yes", "no"])
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
  collectionsTerms: z.array(CollectionsTermSchema),
  scenarios: z.array(ScenarioDimSchema),
  channels: z.array(ChannelSchema),
  retentionAssumptions: z.array(RetentionAssumptionSchema),
  usageAssumptions: z.array(UsageAssumptionSchema),
  cogsUnitCosts: z.array(CogsUnitCostSchema),
  runSettings: z.array(RunSettingSchema)
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
  runStatus: z.enum(["idle", "success", "error"]),
  validation: z.array(
    z.object({
      id: z.string(),
      severity: z.enum(["info", "warning", "error"]),
      passed: z.boolean(),
      message: z.string()
    })
  )
});

// Data Classification System (matches SPARCC pattern)
export const DataTypeSchema = z.enum(["demo", "template", "client"]);
export type DataType = z.infer<typeof DataTypeSchema>;

// Demo Metadata (contextual tagging)
export const DemoMetadataSchema = z.object({
  year: z.number().optional(),
  businessUnit: z.string().optional(),
  division: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional()
});
export type DemoMetadata = z.infer<typeof DemoMetadataSchema>;

// Company Profile
export const CompanyProfileSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Company name required"),
  industry: z.enum([
    "technology",
    "healthcare",
    "finance",
    "retail",
    "manufacturing",
    "education",
    "other"
  ]),
  stage: z.enum([
    "idea",
    "pre-seed",
    "seed",
    "series-a",
    "series-b",
    "series-c-plus",
    "growth"
  ]),
  teamSize: z.number().min(1),
  foundedYear: z.number().optional(),
  description: z.string().optional(),
  website: z.string().optional().refine(
    (val) => !val || val === "" || val.includes("."),
    { message: "Please enter a valid website (e.g., example.com or https://example.com)" }
  ),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type CompanyProfile = z.infer<typeof CompanyProfileSchema>;

export const ScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: ScenarioStatusSchema,
  dataType: DataTypeSchema.default("client"), // NEW: Data classification
  demoMetadata: DemoMetadataSchema.optional(), // NEW: Demo context tags
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
