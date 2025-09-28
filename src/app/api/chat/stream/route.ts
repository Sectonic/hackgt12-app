import { NextRequest } from 'next/server';
import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Log headers to debug Cedar's requests
    console.log('Cedar request headers:', Object.fromEntries(request.headers.entries()));
    
    const body = await request.json();
    console.log('Cedar request body:', JSON.stringify(body, null, 2));
    const { messages } = body;

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Add system message for floor plan context
    const systemMessage = {
      role: 'system' as const,
      content: `You are a helpful AI assistant integrated into a floor plan editor application. You can help users with:
      - Floor plan design and layout suggestions
      - Room organization and space planning
      - Furniture placement recommendations
      - Interior design advice
      - Answering questions about the floor plan editor features
      - General assistance with home design and architecture
      
      Be concise, helpful, and focus on practical advice related to floor planning and interior design.`
    };

    const chatMessages = [systemMessage, ...messages];

    // Create streaming response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: chatMessages,
      stream: true,
      max_tokens: 1000,
      temperature: 0.7,
    });

    // Create a readable stream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              const data = JSON.stringify({ 
                type: 'content',
                content 
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
            
            // Check if the stream is finished
            if (chunk.choices[0]?.finish_reason) {
              const finishData = JSON.stringify({ 
                type: 'done',
                finish_reason: chunk.choices[0].finish_reason 
              });
              controller.enqueue(encoder.encode(`data: ${finishData}\n\n`));
            }
          }
          
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = JSON.stringify({ 
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Chat stream API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: `OpenAI API error: ${errorMessage}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
