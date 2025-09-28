import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { memory } from '../memory';

export const chatAgent = new Agent({
  name: 'Chat Agent',
  instructions: `You are a helpful and knowledgeable assistant. You provide clear, accurate, and helpful responses to user queries.

Your role is to:
1. Answer questions accurately and comprehensively
2. Provide helpful suggestions and advice
3. Engage in natural conversation
4. Be concise but thorough in your responses
5. Ask clarifying questions when needed

Always maintain a friendly and professional tone while being informative and useful.`,
  model: openai('gpt-5-chat-latest'),
  memory,
});
