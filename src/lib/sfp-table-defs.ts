import type { Tables } from "@/lib/sfp-types";

export type ColumnType = "text" | "number" | "select";

export type ColumnDef = {
  key: string;
  label: string;
  type: ColumnType;
  options?: string[];
};

export type TableDef = {
  key: keyof Tables;
  label: string;
  description: string;
  columns: ColumnDef[];
  newRow: () => Tables[keyof Tables][number];
};

export const tableDefs: TableDef[] = [
  {
    key: "scenarios",
    label: "Scenarios",
    description: "Scenario registry used by the model engine.",
    columns: [
      { key: "name", label: "Name", type: "text" },
      { key: "description", label: "Description", type: "text" },
      { key: "isActive", label: "Active", type: "select", options: ["yes", "no"] }
    ],
    newRow: () => ({ id: "", name: "Base", description: "Primary scenario", isActive: "yes" })
  },
  {
    key: "channels",
    label: "Channels",
    description: "Sales channels and partner motions.",
    columns: [
      { key: "name", label: "Name", type: "text" },
      { key: "type", label: "Type", type: "select", options: ["direct", "reseller", "referral", "si_partner"] }
    ],
    newRow: () => ({ id: "", name: "Direct", type: "direct" })
  },
  {
    key: "segments",
    label: "Segments",
    description: "Customer cohorts and target mix for revenue planning.",
    columns: [
      { key: "name", label: "Name", type: "text" },
      { key: "targetPct", label: "Target %", type: "number" },
      { key: "notes", label: "Notes", type: "text" }
    ],
    newRow: () => ({ id: "", name: "New Segment", targetPct: 0, notes: "" })
  },
  {
    key: "skus",
    label: "SKUs",
    description: "Define core products and services with base costs.",
    columns: [
      { key: "name", label: "Name", type: "text" },
      { key: "category", label: "Category", type: "select", options: ["saas", "services"] },
      { key: "basePrice", label: "Base Price", type: "number" },
      { key: "costPct", label: "Cost %", type: "number" }
    ],
    newRow: () => ({ id: "", name: "New SKU", category: "saas", basePrice: 0, costPct: 0 })
  },
  {
    key: "pricingPlans",
    label: "Pricing Plans",
    description: "Price points and billing cadence for SaaS offerings.",
    columns: [
      { key: "name", label: "Plan", type: "text" },
      { key: "billing", label: "Billing", type: "select", options: ["monthly", "annual"] },
      { key: "price", label: "Price", type: "number" },
      { key: "users", label: "Users", type: "number" }
    ],
    newRow: () => ({ id: "", name: "New Plan", billing: "monthly", price: 0, users: 1 })
  },
  {
    key: "cohortPlan",
    label: "Cohort Plan",
    description: "Monthly new customer plan that drives ARR growth.",
    columns: [
      { key: "monthOffset", label: "Month", type: "number" },
      { key: "newCustomers", label: "New Customers", type: "number" }
    ],
    newRow: () => ({ id: "", monthOffset: 0, newCustomers: 0 })
  },
  {
    key: "channelTerms",
    label: "Channel Terms",
    description: "Partner fees and discounts for resale or referral motion.",
    columns: [
      { key: "partner", label: "Partner", type: "text" },
      { key: "feePct", label: "Fee %", type: "number" },
      { key: "discountPct", label: "Discount %", type: "number" }
    ],
    newRow: () => ({ id: "", partner: "New Partner", feePct: 0, discountPct: 0 })
  },
  {
    key: "retentionAssumptions",
    label: "Retention Assumptions",
    description: "Churn, contraction, and expansion assumptions by segment/channel.",
    columns: [
      { key: "segment", label: "Segment", type: "text" },
      { key: "channel", label: "Channel", type: "text" },
      { key: "logoChurnPct", label: "Logo Churn %", type: "number" },
      { key: "revenueChurnPct", label: "Revenue Churn %", type: "number" },
      { key: "expansionPct", label: "Expansion %", type: "number" }
    ],
    newRow: () => ({ id: "", segment: "Mid-Market", channel: "Direct", logoChurnPct: 2, revenueChurnPct: 1, expansionPct: 2 })
  },
  {
    key: "aiUsageProfile",
    label: "AI Usage Profile",
    description: "Token consumption and cache behavior by customer.",
    columns: [
      { key: "name", label: "Profile", type: "text" },
      { key: "tokensPerCustomer", label: "Tokens/Customer", type: "number" },
      { key: "cachePct", label: "Cache %", type: "number" }
    ],
    newRow: () => ({ id: "", name: "New Profile", tokensPerCustomer: 0, cachePct: 0 })
  },
  {
    key: "usageAssumptions",
    label: "Usage Assumptions",
    description: "Usage drivers per tenant for AI and infrastructure.",
    columns: [
      { key: "segment", label: "Segment", type: "text" },
      { key: "channel", label: "Channel", type: "text" },
      { key: "tokensPerTenant", label: "Tokens / Tenant", type: "number" },
      { key: "computeHours", label: "Compute Hours", type: "number" },
      { key: "storageGb", label: "Storage (GB)", type: "number" }
    ],
    newRow: () => ({ id: "", segment: "Mid-Market", channel: "Direct", tokensPerTenant: 24000, computeHours: 2, storageGb: 10 })
  },
  {
    key: "cogsUnitCosts",
    label: "COGS Unit Costs",
    description: "Unit cost assumptions for usage and platform expenses.",
    columns: [
      { key: "costName", label: "Cost Name", type: "text" },
      { key: "unit", label: "Unit", type: "select", options: ["token_1k", "hour", "gb"] },
      { key: "unitCost", label: "Unit Cost", type: "number" }
    ],
    newRow: () => ({ id: "", costName: "LLM Tokens", unit: "token_1k", unitCost: 0.75 })
  },
  {
    key: "servicesSku",
    label: "Services SKU",
    description: "Services catalog entry for implementation or advisory work.",
    columns: [
      { key: "name", label: "Name", type: "text" },
      { key: "price", label: "Price", type: "number" },
      { key: "costPct", label: "Cost %", type: "number" }
    ],
    newRow: () => ({ id: "", name: "New Service", price: 0, costPct: 0 })
  },
  {
    key: "servicesAttachPlan",
    label: "Services Attach Plan",
    description: "Attach rate and services mix by growth phase.",
    columns: [
      { key: "monthOffset", label: "Month", type: "number" },
      { key: "attachRatePct", label: "Attach %", type: "number" }
    ],
    newRow: () => ({ id: "", monthOffset: 0, attachRatePct: 0 })
  },
  {
    key: "deliveryCapacityPlan",
    label: "Delivery Capacity Plan",
    description: "Team capacity and delivery-related costs.",
    columns: [
      { key: "role", label: "Role", type: "text" },
      { key: "monthlyCapacity", label: "Monthly Capacity", type: "number" },
      { key: "cost", label: "Cost", type: "number" }
    ],
    newRow: () => ({ id: "", role: "New Role", monthlyCapacity: 0, cost: 0 })
  },
  {
    key: "headcountPlan",
    label: "Headcount Plan",
    description: "Headcount ramp and fully loaded costs by role.",
    columns: [
      { key: "role", label: "Role", type: "text" },
      { key: "count", label: "Count", type: "number" },
      { key: "fullyLoadedCost", label: "Loaded Cost", type: "number" }
    ],
    newRow: () => ({ id: "", role: "New Role", count: 0, fullyLoadedCost: 0 })
  },
  {
    key: "expensePlan",
    label: "Expense Plan",
    description: "Operating expenses that scale outside headcount.",
    columns: [
      { key: "category", label: "Category", type: "text" },
      { key: "monthlyCost", label: "Monthly Cost", type: "number" }
    ],
    newRow: () => ({ id: "", category: "New Expense", monthlyCost: 0 })
  },
  {
    key: "collectionsTerms",
    label: "Collections Terms",
    description: "DSO expectations by segment to model cash timing.",
    columns: [
      { key: "segment", label: "Segment", type: "text" },
      { key: "dso", label: "DSO", type: "number" }
    ],
    newRow: () => ({ id: "", segment: "New Segment", dso: 0 })
  },
  {
    key: "runSettings",
    label: "Run Settings",
    description: "Output grain and statement toggles.",
    columns: [
      { key: "runName", label: "Run Name", type: "text" },
      { key: "outputGrain", label: "Output Grain", type: "select", options: ["monthly", "quarterly"] },
      { key: "includeBalanceSheet", label: "Balance Sheet", type: "select", options: ["yes", "no"] },
      { key: "includeUnitEconomics", label: "Unit Economics", type: "select", options: ["yes", "no"] }
    ],
    newRow: () => ({ id: "", runName: "Board Plan", outputGrain: "monthly", includeBalanceSheet: "yes", includeUnitEconomics: "yes" })
  }
];

export const tableDefMap = new Map(tableDefs.map((def) => [def.key, def]));
