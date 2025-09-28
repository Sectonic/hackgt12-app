// ---------------------------------------------
// Plan Creation Workflow
//
// This workflow handles interactions with the floor planning agent
// to create structured to-do lists for floor plan projects.
// ---------------------------------------------

import { createWorkflow, createStep } from '@mastra/core/workflows';
import { RuntimeContext } from '@mastra/core/di';
import { z } from 'zod';
import { agentCreatePlan } from '../agents/agentCreatePlan.js';
import { handleTextStream, streamJSONEvent } from '../../utils/streamUtils';

export const PlanCreationInputSchema = z.object({
  prompt: z.string(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  systemPrompt: z.string().optional(),
  streamController: z.instanceof(ReadableStreamDefaultController).optional(),
  additionalContext: z.any().optional(),
  resourceId: z.string().optional(),
  threadId: z.string().optional(),
});

export const PlanCreationOutputSchema = z.object({
  content: z.string(),
  todoList: z
    .array(
      z.object({
        id: z.string(),
        description: z.string(),
        priority: z.enum(['high', 'medium', 'low']).optional(),
        category: z.enum(['measurement', 'design', 'documentation', 'review']).optional(),
      }),
    )
    .optional(),
  usage: z.any().optional(),
});

export type PlanCreationOutput = z.infer<typeof PlanCreationOutputSchema>;

const callPlanCreationAgent = createStep({
  id: 'callPlanCreationAgent',
  description: 'Invoke the floor planning agent to create structured plans',
  inputSchema: PlanCreationInputSchema,
  outputSchema: PlanCreationOutputSchema,
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

    console.log('Plan creation workflow received input data', inputData);

    // Create runtime context with additionalContext and streamController
    const runtimeContext = new RuntimeContext();
    runtimeContext.set('additionalContext', additionalContext);
    runtimeContext.set('streamController', streamController);

    const messages = [
      'User request: ' + prompt,
      'Additional context: ' + JSON.stringify(additionalContext || {}),
    ];

    let responseText = '';
    let todoList: Array<{
      id: string;
      description: string;
      priority?: 'high' | 'medium' | 'low';
      category?: 'measurement' | 'design' | 'documentation' | 'review';
    }> = [];

    /**
     * Using Mastra streamVNext for enhanced streaming capabilities.
     * streamVNext returns a stream result that we can iterate over to get chunks
     * and properly handle different event types such as text-delta, tool calls, etc.
     */
    const streamResult = await agentCreatePlan.streamVNext(messages, {
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
        await handleTextStream({ textStream: async function* () { yield chunk.payload.text; }() }, streamController);
        responseText += chunk.payload.text;
      } else if (chunk.type === 'tool-result' || chunk.type === 'tool-call') {
        streamJSONEvent(streamController, chunk.type);
      }
    }

    // Try to extract todoList from the response
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*"todoList"[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        if (parsed.todoList && Array.isArray(parsed.todoList)) {
          todoList = parsed.todoList;
        }
      }
    } catch (error) {
      console.log('Could not parse todoList from response:', error);
    }

    const usage = await streamResult.usage;

    console.log('Plan creation workflow result', {
      content: responseText,
      todoList,
      usage: usage,
    });

    return {
      content: responseText,
      todoList,
      usage: usage,
    };
  },
});

export const planCreationWorkflow = createWorkflow({
  id: 'planCreationWorkflow',
  description: 'Workflow for creating structured floor planning to-do lists',
  inputSchema: PlanCreationInputSchema,
  outputSchema: PlanCreationOutputSchema,
})
  .then(callPlanCreationAgent)
  .commit();
