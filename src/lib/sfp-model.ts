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

  for (let month = 0; month < months; month += 1) {
    const monthLabel = monthIso(horizon.startMonth, month);
    const newCustomers = getTierValue(cohortEntries, month, 0);
    customers += newCustomers;

    const saasRevenue = customers * monthlyPrice * channelFactor;
    const servicesAttach = getTierValue(attachEntries, month, 0) / 100;
    const servicesRevenue = servicesSku ? newCustomers * servicesSku.price * servicesAttach : 0;

    const saasCogs = saasSku ? saasRevenue * (saasSku.costPct / 100) : saasRevenue * 0.2;
    const servicesCogs = servicesSku ? servicesRevenue * (servicesSku.costPct / 100) : servicesRevenue * 0.4;

    const tokensPerCustomer = aiProfile ? aiProfile.tokensPerCustomer : scenario.settings.aiCostControls.tokensPerRun;
    const aiCogs = (tokensPerCustomer / 1000) * scenario.settings.aiCostControls.costPer1kTokens * (1 - effectiveCache / 100) * customers;

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
  }

  return {
    statementsMonthly,
    metricsMonthly,
    lastRunAt: new Date().toISOString(),
    runStatus: "success"
  };
}
