import { registerApiRoute } from '@mastra/core/server';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import type { Context } from 'hono';
import { floorPlanWorkflow, FloorPlanInputSchema } from './workflows/floorPlanWorkflow';

// ============================================
// SCHEMA DEFINITIONS
// ============================================

// Helper function to convert Zod schema to OpenAPI schema
function toOpenApiSchema(schema: Parameters<typeof zodToJsonSchema>[0]) {
  return zodToJsonSchema(schema) as Record<string, unknown>;
}

// ============================================
// API ROUTES REGISTRATION
// ============================================

export const apiRoutes = [
  registerApiRoute('/chat', {
    method: 'POST',
    openapi: {
      requestBody: {
        content: {
          'application/json': {
            schema: toOpenApiSchema(FloorPlanInputSchema),
          },
        },
        required: true,
      },
      responses: {
        200: {
          description: 'Floor plan generation response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  content: { type: 'string' },
                  PlacedEntity: { type: 'array', items: { type: 'object' } },
                  RoomDefinition: { type: 'array', items: { type: 'object' } },
                  usage: { type: 'object' },
                },
              },
            },
          },
        },
        400: {
          description: 'Invalid request data',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string' },
                  details: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    handler: async (c: Context) => {
      try {
        const body = await c.req.json();
        const { prompt, images, svgData, temperature, maxTokens, systemPrompt, additionalContext, resourceId, threadId } = FloorPlanInputSchema.parse(body);

        const run = await floorPlanWorkflow.createRunAsync();
        const result = await run.start({
          inputData: {
            prompt,
            images,
            svgData,
            temperature,
            maxTokens,
            systemPrompt,
            additionalContext,
            resourceId,
            threadId,
          },
        });

        if (result.status !== 'success') {
          throw new Error(`Floor plan workflow failed: ${result.status}`);
        }

        return c.json(result.result);
      } catch (error) {
        console.error('Floor plan processing error:', error);
        return c.json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
      }
    },
  }),
];