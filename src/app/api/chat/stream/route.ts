import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward the request to the Mastra backend
    const mastraUrl = process.env.NEXT_PUBLIC_MASTRA_URL || 'http://localhost:4111';
    const response = await fetch(`${mastraUrl}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Mastra backend responded with status: ${response.status}`);
    }

    // Return the response from Mastra backend
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'text/plain',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error proxying request to Mastra backend:', error);
    return new Response(JSON.stringify({ error: 'Failed to connect to chat service' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
