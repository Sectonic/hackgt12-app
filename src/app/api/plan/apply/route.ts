import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch('http://localhost:4111/api/workflows/floorPlanApplyWorkflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Mastra workflow apply failed: ${response.status}`);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Apply plan API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to apply plan' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
