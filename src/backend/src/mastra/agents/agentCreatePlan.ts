import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { memory } from '../memory';

/**
 * Floor Plan Planning Agent
 *
 * This agent specializes in understanding user requirements for floor plans
 * and creating structured todo lists in JSON format for implementation tools
 * while also displaying the plan as readable text to the user.
 */

export const agentCreatePlan = new Agent({
  name: 'agentCreatePlan',
  instructions:
    'Floor plan planning assistant that creates structured todo lists for implementation.',
  model: openai('gpt-4o-mini'),
  tools: {},
  memory,
});
