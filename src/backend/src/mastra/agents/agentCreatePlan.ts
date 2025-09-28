import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { memory } from '../memory';

export const agentCreatePlan = new Agent({
  name: 'Floor Planning Assistant',
  instructions: `You are a specialized floor planning assistant. You provide structured plans...`,
  model: openai('gpt-5-chat-latest'),
  memory,
});
