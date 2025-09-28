import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// Function to extract and log JSON from response
function extractAndLogJSON(response: string) {
  try {
    // Look for JSON patterns in the response
    const jsonMatch = response.match(/\{[\s\S]*"todoList"[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      console.log('📋 Floor Plan To-Do List (JSON):', JSON.stringify(parsed, null, 2));
    }
  } catch (error) {
    console.log('No structured JSON found in response');
  }
}

// Real LLM-powered Floor Plan Assistant API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt: string = body?.prompt ?? '';
    const temperature: number = body?.temperature ?? 0.2;

    console.log('Floor Plan Assistant received:', prompt);

    // Get OpenAI API key from environment
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
      // Return a helpful error message instead of throwing
      const errorMessage = `🔑 **API Key Required**

I need a valid OpenAI API key to provide AI assistance. Please:

1. **Get an API key** from [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Add it to your environment** by updating the \`OPENAI_API_KEY\` in your \`.env\` file
3. **Restart the server** to apply the changes

**Current status**: No valid API key found.

*For development, you can also set \`OPENAI_API_KEY\` in your environment variables.*`;

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${errorMessage}\n\n`));
          controller.enqueue(encoder.encode(`event: done\ndata: \n\n`));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
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
                  content: `You are a floor planning assistant. Your role is to understand the user requirements and create a structured to-do list.

IMPORTANT INSTRUCTIONS:
1. Respond ONLY in natural language - do NOT show JSON to the user
2. Create a structured to-do list in your response using numbered lists and clear descriptions
3. Use emojis and markdown formatting to make it engaging
4. Focus on practical, actionable tasks
5. Do NOT include any JSON code blocks or structured data in your response

You are an expert architectural assistant specializing in floor plan design and space planning. You help users create comprehensive floor plans by:

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
          let fullResponse = '';

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
                  // Extract and log JSON to console
                  extractAndLogJSON(fullResponse);
                  controller.enqueue(encoder.encode(`event: done\ndata: \n\n`));
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    fullResponse += content;
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
          let errorMessage = 'Sorry, I encountered an error.';
          
          if (error instanceof Error) {
            if (error.message.includes('401')) {
              errorMessage = `🔑 **Authentication Error**

Your OpenAI API key appears to be invalid or expired. Please:

1. **Check your API key** at [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Verify the key** is correctly set in your environment
3. **Ensure you have credits** in your OpenAI account

**Error**: ${error.message}`;
            } else if (error.message.includes('429')) {
              errorMessage = `⏱️ **Rate Limit Exceeded**

You've hit the OpenAI API rate limit. Please:

1. **Wait a moment** and try again
2. **Check your usage** at [OpenAI Platform](https://platform.openai.com/usage)
3. **Consider upgrading** your plan if needed

**Error**: ${error.message}`;
            } else {
              errorMessage = `❌ **API Error**

I encountered an issue with the OpenAI API:

**Error**: ${error.message}

Please check your API key and try again.`;
            }
          }
          
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

