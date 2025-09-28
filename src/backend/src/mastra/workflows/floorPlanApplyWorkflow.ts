import { createStep, createWorkflow } from '@mastra/core/workflows';
import { RuntimeContext } from '@mastra/core/di';
import { z } from 'zod';
import { floorPlanApplyAgent } from '../agents/floorPlanApplyAgent.js';
import { streamJSONEvent } from '../../utils/streamUtils';
import { ALL_TOOLS } from '../tools/toolDefinitions';

const TodoItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  category: z.enum(['measurement', 'design', 'documentation', 'review']),
});

export const FloorPlanApplyInputSchema = z.object({
  todoList: z.array(TodoItemSchema).min(1, 'todoList cannot be empty'),
  additionalContext: z.any().optional(),
  resourceId: z.string().optional(),
  threadId: z.string().optional(),
  streamController: z.instanceof(ReadableStreamDefaultController).optional(),
});

export const FloorPlanApplyOutputSchema = z.object({
  content: z.string(),
  usage: z.any().optional(),
});

export type FloorPlanApplyInput = z.infer<typeof FloorPlanApplyInputSchema>;
export type FloorPlanApplyOutput = z.infer<typeof FloorPlanApplyOutputSchema>;

const applyTodoList = createStep({
  id: 'applyTodoList',
  description: 'Apply the sanitized todo list to the floor plan using interactive tools',
  inputSchema: FloorPlanApplyInputSchema,
  outputSchema: FloorPlanApplyOutputSchema,
  execute: async ({ inputData }) => {
    const { todoList, additionalContext, resourceId, threadId, streamController } = inputData;

    const runtimeContext = new RuntimeContext();
    runtimeContext.set('todoList', todoList);
    runtimeContext.set('additionalContext', additionalContext);
    if (streamController) {
      runtimeContext.set('streamController', streamController);
    }

    const messages = [
      'You are applying the following floor-plan todo list in order.',
      JSON.stringify({ todoList }, null, 2),
      'Use the available tools to execute each task. Provide concise narration explaining each change.',
    ];

    const options = {
      runtimeContext,
      tools: ALL_TOOLS,
      ...(threadId && resourceId
        ? {
            memory: {
              thread: threadId,
              resource: resourceId,
            },
          }
        : {}),
    } as const;

    if (!streamController) {
      const result = await floorPlanApplyAgent.generateVNext(messages, options);
      return {
        content: result.text,
        usage: result.usage,
      } satisfies FloorPlanApplyOutput;
    }

    const streamResult = await floorPlanApplyAgent.streamVNext(messages, options);
    let responseText = '';

    for await (const chunk of streamResult.fullStream) {
      if (chunk.type === 'text-delta') {
        responseText += chunk.payload.text;
        streamJSONEvent(streamController, {
          type: 'text-delta',
          text: chunk.payload.text,
        });
      } else if (chunk.type === 'tool-call' || chunk.type === 'tool-result') {
        streamJSONEvent(streamController, chunk);
      }
    }

    const usage = await streamResult.usage;

    return {
      content: responseText,
      usage,
    } satisfies FloorPlanApplyOutput;
  },
});

export const floorPlanApplyWorkflow = createWorkflow({
  id: 'floorPlanApplyWorkflow',
  description:
    'Applies the sanitized todo list to the floor plan by invoking registered canvas tools.',
  inputSchema: FloorPlanApplyInputSchema,
  outputSchema: FloorPlanApplyOutputSchema,
})
  .then(applyTodoList)
  .commit();
