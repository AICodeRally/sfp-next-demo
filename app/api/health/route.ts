/**
 * API Route: /api/health
 * GET - Health check for the Next.js app and Python engine
 */

import { NextResponse } from 'next/server';

const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:8000';

export async function GET() {
  try {
    // Check Python engine health
    const engineHealth = await fetch(`${ENGINE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    }).then((res) => res.json()).catch(() => null);

    return NextResponse.json({
      status: 'healthy',
      app: 'sfp-next-demo',
      version: '0.1.0',
      engine: engineHealth || { status: 'unavailable' },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'degraded',
      app: 'sfp-next-demo',
      version: '0.1.0',
      engine: { status: 'unavailable' },
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
