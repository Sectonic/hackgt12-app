import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// Real LLM-powered Floor Plan Assistant API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt: string = body?.prompt ?? '';
    const temperature: number = body?.temperature ?? 0.2;

    console.log('Floor Plan Assistant received:', prompt);

    // Get OpenAI API key from environment
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Create a readable stream for SSE format
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: `You are an expert architectural assistant specializing in floor plan design and space planning. You help users create comprehensive floor plans by:

1. **Understanding Requirements**: Analyzing user needs for residential, commercial, or specialized spaces
2. **Space Planning**: Creating efficient layouts that optimize flow, functionality, and aesthetics
3. **Technical Guidance**: Providing architectural best practices, building codes, and design principles
4. **Project Management**: Breaking down complex projects into manageable phases and tasks
5. **Problem Solving**: Addressing constraints, accessibility needs, and special requirements

Always respond with detailed, actionable advice formatted in clear markdown. Use emojis and visual formatting to make responses engaging and easy to read. Focus on practical, implementable solutions.`
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              temperature: temperature,
              max_tokens: 2000,
              stream: true
            })
          });

          if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('No response body');
          }

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode(`event: done\ndata: \n\n`));
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${content}\n\n`));
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }

          controller.enqueue(encoder.encode(`event: done\ndata: \n\n`));
          controller.close();

        } catch (error) {
          console.error('Streaming error:', error);
          const errorMessage = `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`;
          controller.enqueue(encoder.encode(`data: ${errorMessage}\n\n`));
          controller.enqueue(encoder.encode(`event: done\ndata: \n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API route error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

