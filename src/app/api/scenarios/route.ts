/**
 * API Routes: /api/scenarios
 * GET - List all scenarios
 * POST - Create a new scenario
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const scenarios = await prisma.scenario.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        settings: true,
        inputs: true,
        outputs: true,
      },
    });

    return NextResponse.json(scenarios);
  } catch (error) {
    console.error('Failed to fetch scenarios:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scenarios' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, dataType = 'client' } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Create scenario with default settings and empty inputs
    const scenario = await prisma.scenario.create({
      data: {
        name,
        dataType,
        status: 'draft',
        settings: {
          create: {
            startMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
            monthsForward: 24,
            currency: 'USD',
            scenarioMode: 'base',
            costPer1kTokens: 0.002,
            cacheHitPct: 0,
            tokensPerRun: 1000,
            channelSharePct: 0,
            channelMode: 'direct',
            channelFeePct: 0,
            channelDiscountPct: 0,
          },
        },
        inputs: {
          create: {
            pricingPlans: [],
            cohortPlan: [],
            retentionAssumptions: [],
            usageAssumptions: [],
            cogsUnitCosts: [],
            expensePlan: [],
            headcountPlan: [],
            skus: [],
            servicesSku: [],
            servicesAttachPlan: [],
            deliveryCapacityPlan: [],
          },
        },
        outputs: {
          create: {
            statementsMonthly: [],
            metricsMonthly: [],
            validation: [],
            lastRunAt: null,
            runStatus: null,
          },
        },
      },
      include: {
        settings: true,
        inputs: true,
        outputs: true,
      },
    });

    return NextResponse.json(scenario, { status: 201 });
  } catch (error) {
    console.error('Failed to create scenario:', error);
    return NextResponse.json(
      { error: 'Failed to create scenario' },
      { status: 500 }
    );
  }
}
