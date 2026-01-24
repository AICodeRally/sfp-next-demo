import { addMonths, format, parseISO } from "date-fns";
import type { Outputs, Scenario } from "@/lib/sfp-types";

function monthIso(startMonth: string, offset: number) {
  const base = parseISO(`${startMonth}-01`);
  return format(addMonths(base, offset), "yyyy-MM");
}

function getMonthlyPrice(scenario: Scenario) {
  const plan = scenario.tables.pricingPlans[0];
  if (!plan) return 0;
  return plan.billing === "annual" ? plan.price / 12 : plan.price;
}

function getTierValue(entries: Array<{ monthOffset: number; value: number }>, month: number, fallback: number) {
  const sorted = [...entries].sort((a, b) => a.monthOffset - b.monthOffset);
  let current = fallback;
  for (const entry of sorted) {
    if (entry.monthOffset <= month) {
      current = entry.value;
    }
  }
  return current;
}

export function runModel(scenario: Scenario): Outputs {
  const horizon = scenario.settings.modelHorizon;
  const months = horizon.monthsForward;
  const monthlyPrice = getMonthlyPrice(scenario);

  const cohortEntries = scenario.tables.cohortPlan.map((row) => ({
    monthOffset: row.monthOffset,
    value: row.newCustomers
  }));

  const attachEntries = scenario.tables.servicesAttachPlan.map((row) => ({
    monthOffset: row.monthOffset,
    value: row.attachRatePct
  }));

  const saasSku = scenario.tables.skus.find((sku) => sku.category === "saas");
  const servicesSku = scenario.tables.servicesSku[0];

  const aiProfile = scenario.tables.aiUsageProfile[0];
  const usageAssumption = scenario.tables.usageAssumptions[0];
  const retention = scenario.tables.retentionAssumptions[0];
  const tokenUnitCost =
    scenario.tables.cogsUnitCosts.find((row) => row.unit === "token_1k")?.unitCost ??
    scenario.settings.aiCostControls.costPer1kTokens;
  const hourUnitCost = scenario.tables.cogsUnitCosts.find((row) => row.unit === "hour")?.unitCost ?? 0;
  const storageUnitCost = scenario.tables.cogsUnitCosts.find((row) => row.unit === "gb")?.unitCost ?? 0;
  const effectiveCache = aiProfile ? (aiProfile.cachePct + scenario.settings.aiCostControls.cacheHitPct) / 2 : scenario.settings.aiCostControls.cacheHitPct;

  const opexBase = scenario.tables.expensePlan.reduce((sum, row) => sum + row.monthlyCost, 0);
  const headcountCost = scenario.tables.headcountPlan.reduce((sum, row) => sum + row.count * row.fullyLoadedCost, 0);
  const capacityCost = scenario.tables.deliveryCapacityPlan.reduce((sum, row) => sum + row.cost, 0);
  const opexTotal = opexBase + headcountCost + capacityCost;

  const channelFactor = 1 - (scenario.settings.channel.sharePct / 100) * ((scenario.settings.channel.feePct + scenario.settings.channel.discountPct) / 100);

  const statementsMonthly: Outputs["statementsMonthly"] = [];
  const metricsMonthly: Outputs["metricsMonthly"] = [];

  let customers = 0;
  let cashBalance = 750000;
  let minCustomers = Number.POSITIVE_INFINITY;
  let minRevenue = Number.POSITIVE_INFINITY;
  let minCash = Number.POSITIVE_INFINITY;
  let minGrossMargin = Number.POSITIVE_INFINITY;
  let maxAiCogsPct = 0;
  let minRunway = Number.POSITIVE_INFINITY;

  for (let month = 0; month < months; month += 1) {
    const monthLabel = monthIso(horizon.startMonth, month);
    const newCustomers = getTierValue(cohortEntries, month, 0);
    const churnRate = retention ? retention.logoChurnPct / 100 : 0;
    customers += newCustomers;
    const churned = customers * churnRate;
    customers = Math.max(0, customers - churned);

    const saasRevenue = customers * monthlyPrice * channelFactor;
    const servicesAttach = getTierValue(attachEntries, month, 0) / 100;
    const servicesRevenue = servicesSku ? newCustomers * servicesSku.price * servicesAttach : 0;

    const saasCogs = saasSku ? saasRevenue * (saasSku.costPct / 100) : saasRevenue * 0.2;
    const servicesCogs = servicesSku ? servicesRevenue * (servicesSku.costPct / 100) : servicesRevenue * 0.4;

    const tokensPerCustomer = usageAssumption ? usageAssumption.tokensPerTenant : aiProfile ? aiProfile.tokensPerCustomer : scenario.settings.aiCostControls.tokensPerRun;
    const computeHours = usageAssumption ? usageAssumption.computeHours : 0;
    const storageGb = usageAssumption ? usageAssumption.storageGb : 0;
    const aiCogs =
      (tokensPerCustomer / 1000) * tokenUnitCost * (1 - effectiveCache / 100) * customers +
      computeHours * hourUnitCost * customers +
      storageGb * storageUnitCost * customers;

    const totalRevenue = saasRevenue + servicesRevenue;
    const totalCogs = saasCogs + servicesCogs + aiCogs;
    const netIncome = totalRevenue - totalCogs - opexTotal;
    cashBalance += netIncome;

    const runwayMonths = netIncome < 0 ? Math.max(0, cashBalance / Math.abs(netIncome)) : 99;

    statementsMonthly.push({
      month: monthLabel,
      revenue: totalRevenue,
      cogs: totalCogs,
      opex: opexTotal,
      netIncome,
      cashBalance
    });

    const gmSaasPct = saasRevenue > 0 ? ((saasRevenue - saasCogs - aiCogs) / saasRevenue) * 100 : 0;
    const gmServicesPct = servicesRevenue > 0 ? ((servicesRevenue - servicesCogs) / servicesRevenue) * 100 : 0;
    const gmBlendedPct = totalRevenue > 0 ? ((totalRevenue - totalCogs) / totalRevenue) * 100 : 0;

    metricsMonthly.push({
      month: monthLabel,
      arr: saasRevenue * 12,
      aiCogsPct: saasRevenue > 0 ? (aiCogs / saasRevenue) * 100 : 0,
      gmSaasPct,
      gmServicesPct,
      gmBlendedPct,
      runwayMonths
    });

    minCustomers = Math.min(minCustomers, customers);
    minRevenue = Math.min(minRevenue, totalRevenue);
    minCash = Math.min(minCash, cashBalance);
    minGrossMargin = Math.min(minGrossMargin, gmBlendedPct);
    maxAiCogsPct = Math.max(maxAiCogsPct, saasRevenue > 0 ? (aiCogs / saasRevenue) * 100 : 0);
    minRunway = Math.min(minRunway, runwayMonths);
  }

  return {
    statementsMonthly,
    metricsMonthly,
    lastRunAt: new Date().toISOString(),
    runStatus: "success",
    validation: [
      {
        id: "no_negative_customers",
        severity: "error",
        passed: minCustomers >= 0,
        message: minCustomers >= 0 ? "Active customers never below zero." : "Active customers dip below zero."
      },
      {
        id: "revenue_non_negative",
        severity: "error",
        passed: minRevenue >= 0,
        message: minRevenue >= 0 ? "Revenue stays non-negative." : "Revenue falls below zero."
      },
      {
        id: "gross_margin_positive",
        severity: "warning",
        passed: minGrossMargin >= 0,
        message: minGrossMargin >= 0 ? "Gross margin remains positive." : "Gross margin drops below zero."
      },
      {
        id: "cash_balance_non_negative",
        severity: "warning",
        passed: minCash >= 0,
        message: minCash >= 0 ? "Cash balance remains positive." : "Cash balance drops below zero."
      },
      {
        id: "ai_cogs_ratio",
        severity: "warning",
        passed: maxAiCogsPct <= 30,
        message: maxAiCogsPct <= 30 ? "AI COGS stays within 30% of SaaS revenue." : "AI COGS exceeds 30% of SaaS revenue."
      },
      {
        id: "runway_health",
        severity: "info",
        passed: minRunway >= 6,
        message: minRunway >= 6 ? "Runway stays above 6 months." : "Runway dips below 6 months."
      }
    ]
  };
}
