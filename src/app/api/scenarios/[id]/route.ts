/**
 * API Routes: /api/scenarios/[id]
 * GET - Get a single scenario
 * PUT - Update a scenario
 * DELETE - Delete a scenario
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const scenario = await prisma.scenario.findUnique({
      where: { id },
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

    return NextResponse.json(scenario);
  } catch (error) {
    console.error('Failed to fetch scenario:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scenario' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, status, dataType, settings, inputs } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (dataType !== undefined) updateData.dataType = dataType;

    // Update scenario
    const scenario = await prisma.scenario.update({
      where: { id },
      data: updateData,
      include: {
        settings: true,
        inputs: true,
        outputs: true,
      },
    });

    // Update settings if provided
    if (settings) {
      await prisma.scenarioSettings.update({
        where: { scenarioId: id },
        data: settings,
      });
    }

    // Update inputs if provided
    if (inputs) {
      await prisma.scenarioInputs.update({
        where: { scenarioId: id },
        data: inputs,
      });
    }

    // Fetch updated scenario
    const updated = await prisma.scenario.findUnique({
      where: { id },
      include: {
        settings: true,
        inputs: true,
        outputs: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update scenario:', error);
    return NextResponse.json(
      { error: 'Failed to update scenario' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    await prisma.scenario.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete scenario:', error);
    return NextResponse.json(
      { error: 'Failed to delete scenario' },
      { status: 500 }
    );
  }
}
