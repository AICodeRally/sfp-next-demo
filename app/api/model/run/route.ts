/**
 * API Route: /api/model/run
 * POST - Execute the financial model for a scenario
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { scenarioId } = body;

    if (!scenarioId) {
      return NextResponse.json(
        { error: 'scenarioId is required' },
        { status: 400 }
      );
    }

    // Fetch scenario with settings and inputs
    const scenario = await prisma.scenario.findUnique({
      where: { id: scenarioId },
      include: {
        settings: true,
        inputs: true,
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

    // Call Python engine
    const engineResponse = await fetch(`${ENGINE_URL}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(engineRequest),
    });

    if (!engineResponse.ok) {
      const errorText = await engineResponse.text();
      throw new Error(`Engine error: ${errorText}`);
    }

    const result = await engineResponse.json();
    const duration = Date.now() - startTime;

    // Update scenario outputs
    await prisma.scenarioOutputs.update({
      where: { scenarioId },
      data: {
        statementsMonthly: result.statementsMonthly,
        metricsMonthly: result.metricsMonthly,
        validation: result.validation,
        lastRunAt: result.lastRunAt,
        runStatus: result.runStatus,
      },
    });

    // Record the model run
    await prisma.modelRun.create({
      data: {
        scenarioId,
        status: result.runStatus,
        duration,
        inputsSnapshot: engineRequest,
        outputsSnapshot: result,
      },
    });

    return NextResponse.json({
      success: true,
      result,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Model run failed:', error);

    // Record failed run if we have scenarioId
    const body = await request.clone().json().catch(() => ({}));
    if (body.scenarioId) {
      await prisma.modelRun.create({
        data: {
          scenarioId: body.scenarioId,
          status: 'error',
          duration,
          errorMsg: error instanceof Error ? error.message : 'Unknown error',
        },
      }).catch(console.error);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Model run failed' },
      { status: 500 }
    );
  }
}
