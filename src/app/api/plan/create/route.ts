import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Forward the request to the Mastra backend plan creation endpoint
    const mastraUrl = process.env.NEXT_PUBLIC_MASTRA_URL || 'http://localhost:4111
    ';
    const endpointUrl = new URL('/plan/create', mastraUrl).toString();
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Mastra backend responded with status: ${response.status}`);
    }

    const result = await response.json();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error proxying request to Mastra backend:', error);
    return new Response(JSON.stringify({ error: 'Failed to connect to plan service' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
