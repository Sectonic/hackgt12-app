// ---------------------------------------------
// Workflows are a Mastra primitive to orchestrate agents and complex sequences of tasks
// Docs: https://mastra.ai/en/docs/workflows/overview
// ---------------------------------------------

import { createWorkflow, createStep } from '@mastra/core/workflows';
import { RuntimeContext } from '@mastra/core/di';
import { z } from 'zod';
import { createPlanAgent } from '../agents/createPlanAgent';
import { ActionSchema } from './chatWorkflowTypes';

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
  // TODO: Add any structured output fields your application needs
  object: ActionSchema.optional(),
  usage: z.any().optional(),
  streamResult: z.any().optional(), // Mastra stream result for AI SDK v5 compatibility
});

export type ChatOutput = z.infer<typeof ChatOutputSchema>;

const callAgent = createStep({
  id: 'callAgent',
  description: 'Invoke the chat agent with the user prompt using streamVNext',
  inputSchema: ChatInputSchema,
  outputSchema: ChatOutputSchema,
  execute: async ({ inputData }) => {
    const {
      prompt,
      temperature,
      maxTokens,
      systemPrompt,
      additionalContext,
      resourceId,
      threadId,
    } = inputData;

    console.log('🔄 Chat workflow received input:', {
      prompt: prompt?.substring(0, 100) + '...',
      agent: 'createPlanAgent',
    });

    // Create runtime context with additionalContext
    const runtimeContext = new RuntimeContext();
    runtimeContext.set('additionalContext', additionalContext);

    const messages = [
      'User message: ' + prompt,
      'Additional context (for background knowledge): ' + JSON.stringify(additionalContext),
    ];

    /**
     * Using Mastra streamVNext for enhanced streaming capabilities.
     * Return the stream result directly - it will be processed by the API route
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

    console.log('📡 Returning Mastra stream result for AI SDK v5 compatibility...');

    // Return the stream result - it contains AI SDK v5 compatible methods
    return {
      streamResult,
      content: '', // Will be populated when stream completes
      usage: {}, // Will be populated when stream completes
    };
  },
});

export const chatWorkflow = createWorkflow({
  id: 'chatWorkflow',
  description: 'Chat workflow that handles agent interactions with optional streaming support',
  inputSchema: ChatInputSchema,
  outputSchema: ChatOutputSchema,
})
  .then(callAgent)
  .commit();
