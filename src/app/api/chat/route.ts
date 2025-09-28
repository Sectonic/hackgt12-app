import { NextRequest, NextResponse } from 'next/server';
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
    const { messages, stream = false } = body;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
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

    if (stream) {
      // Handle streaming response
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
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            controller.error(error);
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Handle non-streaming response
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: chatMessages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || 'No response generated';

      return NextResponse.json({ 
        response,
        usage: completion.usage 
      });
    }
  } catch (error) {
    console.error('Chat API error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `OpenAI API error: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
