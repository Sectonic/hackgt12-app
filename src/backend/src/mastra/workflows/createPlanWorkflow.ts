import { createWorkflow, createStep } from '@mastra/core/workflows';
import { RuntimeContext } from '@mastra/core/di';
import { z } from 'zod';
import { createPlanAgent } from '../agents/createPlanAgent';
import { handleTextStream, streamJSONEvent, streamTextDeltaJSON } from '../../utils/streamUtils';
import { ActionSchema } from './chatWorkflowTypes';

export const CreatePlanInputSchema = z.object({
  prompt: z.string(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  systemPrompt: z.string().optional(),
  streamController: z.instanceof(ReadableStreamDefaultController).optional(),
  additionalContext: z.any().optional(),
  resourceId: z.string().optional(),
  threadId: z.string().optional(),
});

export const CreatePlanOutputSchema = z.object({
  content: z.string(),
  object: ActionSchema.optional(),
  usage: z.any().optional(),
});

export type CreatePlanOutput = z.infer<typeof CreatePlanOutputSchema>;

const callCreatePlanAgent = createStep({
  id: 'callCreatePlanAgent',
  description: 'Invoke the floor plan planning agent with the user prompt using streamVNext',
  inputSchema: CreatePlanInputSchema,
  outputSchema: CreatePlanOutputSchema,
  execute: async ({ inputData }) => {
    const {
      prompt,
      temperature,
      maxTokens,
      systemPrompt,
      streamController,
      additionalContext,
      resourceId,
      threadId,
    } = inputData;

    if (!streamController) {
      throw new Error('Stream controller is required');
    }

    console.log('Create Plan workflow received input data', inputData);

    // Create runtime context with additionalContext and streamController
    const runtimeContext = new RuntimeContext();
    runtimeContext.set('additionalContext', additionalContext);
    runtimeContext.set('streamController', streamController);

    const messages = [
      'User message: ' + prompt,
      'Additional context (for background knowledge): ' + JSON.stringify(additionalContext),
    ];

    let responseText = '';
    /**
     * Using Mastra streamVNext for enhanced streaming capabilities.
     * streamVNext returns a stream result that we can iterate over to get chunks
     * and properly handle different event types such as text-delta, tool calls, etc.
     */
    const streamResult = await createPlanAgent.streamVNext(messages, {
      // If system prompt is provided, overwrite the default system prompt for this agent
      ...(systemPrompt ? ({ instructions: systemPrompt } as const) : {}),
      modelSettings: {
        temperature,
        maxOutputTokens: maxTokens,
      },
      runtimeContext,
      ...(threadId && resourceId
        ? {
            memory: {
              thread: threadId,
              resource: resourceId,
            },
          }
        : {}),
    });

    for await (const chunk of streamResult.fullStream) {
      if (chunk.type === 'text-delta') {
        await handleTextStream(chunk.payload.text, streamController);
        streamTextDeltaJSON(streamController, chunk.payload.text);
        responseText += chunk.payload.text;
      } else if (chunk.type === 'tool-result' || chunk.type === 'tool-call') {
        streamJSONEvent(streamController, chunk.type, chunk);
      }
    }

    const usage = await streamResult.usage;

    console.log('Create Plan workflow result', {
      content: responseText,
      usage: usage,
    });

    return {
      content: responseText,
      usage: usage,
    };
  },
});

export const createPlanWorkflow = createWorkflow({
  id: 'createPlanWorkflow',
  description:
    'Floor plan planning workflow that handles agent interactions for creating structured todo lists',
  inputSchema: CreatePlanInputSchema,
  outputSchema: CreatePlanOutputSchema,
})
  .then(callCreatePlanAgent)
  .commit();
