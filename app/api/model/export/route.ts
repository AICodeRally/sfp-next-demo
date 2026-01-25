/**
 * API Route: /api/model/export
 * POST - Export scenario to Excel
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenarioId } = body;

    if (!scenarioId) {
      return NextResponse.json(
        { error: 'scenarioId is required' },
        { status: 400 }
      );
    }

    // Fetch scenario with all related data
    const scenario = await prisma.scenario.findUnique({
      where: { id: scenarioId },
      include: {
        settings: true,
        inputs: true,
        outputs: true,
      },
    });

    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    if (!scenario.settings || !scenario.inputs) {
      return NextResponse.json(
        { error: 'Scenario is missing settings or inputs' },
        { status: 400 }
      );
    }

    // Transform data for Python engine
    const engineRequest = {
      scenarioId: scenario.id,
      settings: {
        modelHorizon: {
          startMonth: scenario.settings.startMonth,
          monthsForward: scenario.settings.monthsForward,
          currency: scenario.settings.currency,
        },
        scenarioMode: scenario.settings.scenarioMode,
        aiCostControls: {
          costPer1kTokens: scenario.settings.costPer1kTokens,
          cacheHitPct: scenario.settings.cacheHitPct,
          tokensPerRun: scenario.settings.tokensPerRun,
        },
        channel: {
          sharePct: scenario.settings.channelSharePct,
          mode: scenario.settings.channelMode,
          feePct: scenario.settings.channelFeePct,
          discountPct: scenario.settings.channelDiscountPct,
        },
      },
      tables: {
        pricingPlans: scenario.inputs.pricingPlans,
        cohortPlan: scenario.inputs.cohortPlan,
        retentionAssumptions: scenario.inputs.retentionAssumptions,
        usageAssumptions: scenario.inputs.usageAssumptions,
        cogsUnitCosts: scenario.inputs.cogsUnitCosts,
        expensePlan: scenario.inputs.expensePlan,
        headcountPlan: scenario.inputs.headcountPlan,
        skus: scenario.inputs.skus,
        servicesSku: scenario.inputs.servicesSku,
        servicesAttachPlan: scenario.inputs.servicesAttachPlan,
        deliveryCapacityPlan: scenario.inputs.deliveryCapacityPlan,
      },
    };

    // Call Python engine export endpoint
    const engineResponse = await fetch(`${ENGINE_URL}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(engineRequest),
    });

    if (!engineResponse.ok) {
      const errorText = await engineResponse.text();
      throw new Error(`Engine export error: ${errorText}`);
    }

    // Get Excel file from engine and pass through
    const excelBuffer = await engineResponse.arrayBuffer();
    const filename = `${scenario.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}
