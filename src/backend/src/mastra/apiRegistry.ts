import { registerApiRoute } from '@mastra/core/server';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { agentCreatePlan } from './agents/agentCreatePlan';
import type { Context } from 'hono';
import { planCreationWorkflow, PlanWorkflowRequestSchema } from './workflows/planCreationWorkflow';
import { createSSEStream, streamJSONEvent } from '../utils/streamUtils';

// ============================================
// SCHEMA DEFINITIONS
// ============================================

// Base chat input schema
export const ChatInputSchema = z.object({
  prompt: z.string(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  systemPrompt: z.string().optional(),
  additionalContext: z.any().optional(),
  resourceId: z.string().optional(),
  threadId: z.string().optional(),
});

export const ChatOutputSchema = z.object({
  content: z.string(),
  usage: z.any().optional(),
});

// Plan creation specific schemas
export const PlanInputSchema = z.object({
  prompt: z.string().describe('User requirements for floor plan creation'),
  temperature: z.number().optional().default(0.2),
  maxTokens: z.number().optional(),
  systemPrompt: z.string().optional(),
  additionalContext: z.any().optional(),
  resourceId: z.string().optional(),
  threadId: z.string().optional(),
  projectType: z
    .enum(['apartment', 'house', 'office', 'restaurant', 'retail', 'general'])
    .optional(),
  roomCount: z.number().optional(),
  specialRequirements: z.array(z.string()).optional(),
});

export const PlanOutputSchema = z.object({
  content: z.string(),
  todoList: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      priority: z.enum(['high', 'medium', 'low']),
      category: z.enum(['measurement', 'design', 'documentation', 'review']),
    }),
  ),
  projectType: z.string(),
  roomCount: z.number(),
  specialRequirements: z.array(z.string()),
  usage: z.any().optional(),
});

// Voice input schema for voice-to-text workflows
export const VoiceInputSchema = z.object({
  audioData: z.string().optional().describe('Base64 encoded audio data'),
  audioUrl: z.string().optional().describe('URL to audio file'),
  language: z.string().optional().default('en-US'),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  additionalContext: z.any().optional(),
});

// SVG Parser input schema for floor plan parsing
export const SVGParserInputSchema = z.object({
  svgContent: z.string().describe('SVG content to parse'),
  parseOptions: z
    .object({
      extractRooms: z.boolean().optional().default(true),
      extractDimensions: z.boolean().optional().default(true),
      simplifyGeometry: z.boolean().optional().default(false),
    })
    .optional(),
});

export const SVGParserOutputSchema = z.object({
  rooms: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      area: z.number().optional(),
      coordinates: z.array(
        z.object({
          x: z.number(),
          y: z.number(),
        }),
      ),
    }),
  ),
  dimensions: z.object({
    width: z.number(),
    height: z.number(),
    units: z.string().optional(),
  }),
  metadata: z.any().optional(),
});

// Helper function to convert Zod schema to OpenAPI schema
function toOpenApiSchema(schema: Parameters<typeof zodToJsonSchema>[0]) {
  return zodToJsonSchema(schema) as Record<string, unknown>;
}

// ============================================
// WORKFLOW HANDLERS
// ============================================

// Chat workflow handlers
async function handleChat(c: Context) {
  const body = await c.req.json();
  const data = PlanWorkflowRequestSchema.parse(body);

  const run = await planCreationWorkflow.createRunAsync();
  const result = await run.start(data);

  if (result.status !== 'success') {
    throw new Error(`Workflow failed: ${result.status}`);
  }

  return c.json({
    content: result.result.content,
    usage: result.result.usage,
    todoList: result.result.structuredPlan?.todoList ?? [],
    projectType: result.result.structuredPlan?.projectType ?? data.projectType ?? 'general',
    roomCount: result.result.structuredPlan?.roomCount ?? data.roomCount ?? 1,
    specialRequirements:
      result.result.structuredPlan?.specialRequirements ?? data.specialRequirements ?? [],
  });
}

async function handleChatStream(c: Context) {
  const body = await c.req.json();
  const data = PlanWorkflowRequestSchema.parse(body);

  return createSSEStream(async (controller) => {
    const run = await planCreationWorkflow.createRunAsync();
    const result = await run.start({
      ...data,
      streamController: controller,
    });

    if (result.status !== 'success') {
      throw new Error(`Workflow failed: ${result.status}`);
    }

    if (!result.result.structuredPlanEmitted && result.result.structuredPlan) {
      streamJSONEvent(controller, {
        type: 'floor-plan-todo',
        payload: {
          todoList: result.result.structuredPlan.todoList ?? [],
          projectType: result.result.structuredPlan.projectType ?? data.projectType ?? 'general',
          roomCount: result.result.structuredPlan.roomCount ?? data.roomCount ?? 1,
          specialRequirements:
            result.result.structuredPlan.specialRequirements ?? data.specialRequirements ?? [],
        },
      });
    }
  });
}

// Plan creation workflow handler
async function handlePlanCreation(c: Context) {
  const body = await c.req.json();
  const data = PlanWorkflowRequestSchema.parse(body);

  const run = await planCreationWorkflow.createRunAsync();
  const result = await run.start(data);

  if (result.status !== 'success') {
    throw new Error(`Workflow failed: ${result.status}`);
  }

  return c.json({
    content: result.result.content,
    usage: result.result.usage,
    todoList: result.result.structuredPlan?.todoList ?? [],
    projectType: result.result.structuredPlan?.projectType ?? data.projectType ?? 'general',
    roomCount: result.result.structuredPlan?.roomCount ?? data.roomCount ?? 1,
    specialRequirements:
      result.result.structuredPlan?.specialRequirements ?? data.specialRequirements ?? [],
  });
}

// Plan creation streaming handler
async function handlePlanCreationStream(c: Context) {
  const body = await c.req.json();
  const data = PlanWorkflowRequestSchema.parse(body);

  return createSSEStream(async (controller) => {
    const run = await planCreationWorkflow.createRunAsync();
    const result = await run.start({
      ...data,
      streamController: controller,
    });

    if (result.status !== 'success') {
      throw new Error(`Workflow failed: ${result.status}`);
    }

    if (!result.result.structuredPlanEmitted && result.result.structuredPlan) {
      streamJSONEvent(controller, {
        type: 'floor-plan-todo',
        payload: {
          todoList: result.result.structuredPlan.todoList ?? [],
          projectType: result.result.structuredPlan.projectType ?? data.projectType ?? 'general',
          roomCount: result.result.structuredPlan.roomCount ?? data.roomCount ?? 1,
          specialRequirements:
            result.result.structuredPlan.specialRequirements ?? data.specialRequirements ?? [],
        },
      });
    }
  });
}

// Voice transcription handler (placeholder)
async function handleVoice(c: Context) {
  const body = await c.req.json();
  VoiceInputSchema.parse(body);

  // This would integrate with a voice transcription service
  // For now, return a placeholder response
  return c.json({
    content: 'Voice transcription not yet implemented',
    transcription: '',
    usage: {},
  });
}

// SVG Parser handler (placeholder)
async function handleSVGParser(c: Context) {
  const body = await c.req.json();
  SVGParserInputSchema.parse(body);

  // This would integrate with the SVG parsing functionality
  // For now, return a placeholder response
  return c.json({
    rooms: [],
    dimensions: { width: 0, height: 0 },
    metadata: {},
  });
}

// ============================================
// API ROUTES REGISTRATION
// ============================================

export const apiRoutes = [
  // ---------------------------------------------
  // CHAT ROUTES
  // ---------------------------------------------
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
      responses: {
        200: {
          description: 'Chat response',
          content: {
            'application/json': {
              schema: toOpenApiSchema(ChatOutputSchema),
            },
          },
        },
      },
    },
    handler: handleChat,
  }),

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
      responses: {
        200: {
          description: 'Streaming chat response',
          content: {
            'text/event-stream': {
              schema: { type: 'string' },
            },
          },
        },
      },
    },
    handler: handleChatStream,
  }),

  // ---------------------------------------------
  // PLAN CREATION ROUTES
  // ---------------------------------------------
  registerApiRoute('/plan/create', {
    method: 'POST',
    openapi: {
      requestBody: {
        content: {
          'application/json': {
            schema: toOpenApiSchema(PlanInputSchema),
          },
        },
      },
      responses: {
        200: {
          description: 'Plan creation response',
          content: {
            'application/json': {
              schema: toOpenApiSchema(PlanOutputSchema),
            },
          },
        },
      },
    },
    handler: handlePlanCreation,
  }),

  registerApiRoute('/plan/stream', {
    method: 'POST',
    openapi: {
      requestBody: {
        content: {
          'application/json': {
            schema: toOpenApiSchema(PlanInputSchema),
          },
        },
      },
      responses: {
        200: {
          description: 'Streaming plan creation response',
          content: {
            'text/event-stream': {
              schema: { type: 'string' },
            },
          },
        },
      },
    },
    handler: handlePlanCreationStream,
  }),

  // ---------------------------------------------
  // VOICE ROUTES (Future Implementation)
  // ---------------------------------------------
  registerApiRoute('/voice', {
    method: 'POST',
    openapi: {
      requestBody: {
        content: {
          'application/json': {
            schema: toOpenApiSchema(VoiceInputSchema),
          },
        },
      },
    },
    handler: handleVoice,
  }),

  registerApiRoute('/voice/stream', {
    method: 'POST',
    openapi: {
      requestBody: {
        content: {
          'application/json': {
            schema: toOpenApiSchema(VoiceInputSchema),
          },
        },
      },
    },
    handler: handleVoice,
  }),

  // ---------------------------------------------
  // SVG PARSER ROUTES (Future Implementation)
  // ---------------------------------------------
  registerApiRoute('/svg/parse', {
    method: 'POST',
    openapi: {
      requestBody: {
        content: {
          'application/json': {
            schema: toOpenApiSchema(SVGParserInputSchema),
          },
        },
      },
      responses: {
        200: {
          description: 'SVG parsing response',
          content: {
            'application/json': {
              schema: toOpenApiSchema(SVGParserOutputSchema),
            },
          },
        },
      },
    },
    handler: handleSVGParser,
  }),

  // ---------------------------------------------
  // AGENT ROUTES (Auto-generated by Mastra)
  // ---------------------------------------------
  // Note: Mastra automatically generates agent endpoints
  // Additional agent-specific routes can be added here if needed
];
