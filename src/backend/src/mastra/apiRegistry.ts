import { registerApiRoute } from '@mastra/core/server';
import { ChatInputSchema, chatWorkflow } from './workflows/chatWorkflow';
import { zodToJsonSchema } from 'zod-to-json-schema';
// import { createSSEStream } from '../utils/streamUtils'; // Not needed with AI SDK v5 compatibility

// Helper function to convert Zod schema to OpenAPI schema
function toOpenApiSchema(schema: Parameters<typeof zodToJsonSchema>[0]) {
  return zodToJsonSchema(schema) as Record<string, unknown>;
}

/**
 * API routes for the Mastra backend
 *
 * These routes handle chat interactions between the Cedar-OS frontend
 * and your Mastra agents. The chat UI will automatically use these endpoints.
 *
 * - /chat: Standard request-response chat endpoint
 * - /chat/stream: Server-sent events (SSE) endpoint for streaming responses
 */
export const apiRoutes = [
  // AI SDK v5 compatible route for Cedar frontend
  registerApiRoute('/chat', {
    method: 'POST',
    openapi: {
      requestBody: {
        content: {
          'application/json': {
            schema: toOpenApiSchema(ChatInputSchema),
          },
        },
      },
    },
    handler: async (c) => {
      try {
        const body = await c.req.json();
        console.log('📨 Received chat request:', {
          prompt: body.prompt?.substring(0, 100) + '...',
        });

        const {
          prompt,
          temperature,
          maxTokens,
          systemPrompt,
          additionalContext,
          resourceId,
          threadId,
        } = ChatInputSchema.parse(body);

        console.log('🚀 Starting chat workflow...');

        const run = await chatWorkflow.createRunAsync();
        const result = await run.start({
          inputData: {
            prompt,
            temperature,
            maxTokens,
            systemPrompt,
            additionalContext,
            resourceId,
            threadId,
          },
        });

        if (result.status !== 'success') {
          console.error('❌ Workflow failed:', result.status);
          throw new Error(`Workflow failed: ${result.status}`);
        }

        console.log('✅ Chat workflow completed successfully');

        // Use Mastra's AI SDK v5 compatible streaming
        const streamResult = result.result?.streamResult;
        if (streamResult && streamResult.aisdk?.v5?.toUIMessageStreamResponse) {
          console.log('📡 Returning AI SDK v5 compatible stream response');
          return streamResult.aisdk.v5.toUIMessageStreamResponse();
        }

        // Fallback to non-streaming response
        console.log('⚠️ No stream result found, returning static response');
        return c.json({
          content: result.result?.content || 'No response generated',
          usage: result.result?.usage || {},
        });
      } catch (error) {
        console.error('❌ API Error:', error);
        return c.json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
      }
    },
  }),

  // Legacy route for backward compatibility
  registerApiRoute('/chat/stream', {
    method: 'POST',
    openapi: {
      requestBody: {
        content: {
          'application/json': {
            schema: toOpenApiSchema(ChatInputSchema),
          },
        },
      },
    },
    handler: async (c) => {
      try {
        const body = await c.req.json();
        console.log('📨 Received legacy chat request:', {
          prompt: body.prompt?.substring(0, 100) + '...',
        });

        const {
          prompt,
          temperature,
          maxTokens,
          systemPrompt,
          additionalContext,
          resourceId,
          threadId,
        } = ChatInputSchema.parse(body);

        console.log('🚀 Starting chat workflow...');

        const run = await chatWorkflow.createRunAsync();
        const result = await run.start({
          inputData: {
            prompt,
            temperature,
            maxTokens,
            systemPrompt,
            additionalContext,
            resourceId,
            threadId,
          },
        });

        if (result.status !== 'success') {
          console.error('❌ Workflow failed:', result.status);
          throw new Error(`Workflow failed: ${result.status}`);
        }

        console.log('✅ Chat workflow completed successfully');

        // Use Mastra's AI SDK v5 compatible streaming
        const streamResult = result.result?.streamResult;
        if (streamResult && streamResult.aisdk?.v5?.toUIMessageStreamResponse) {
          console.log('📡 Returning AI SDK v5 compatible stream response');
          return streamResult.aisdk.v5.toUIMessageStreamResponse();
        }

        // Fallback to non-streaming response
        console.log('⚠️ No stream result found, returning static response');
        return c.json({
          content: result.result?.content || 'No response generated',
          usage: result.result?.usage || {},
        });
      } catch (error) {
        console.error('❌ Legacy API Error:', error);
        return c.json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
      }
    },
  }),
];
