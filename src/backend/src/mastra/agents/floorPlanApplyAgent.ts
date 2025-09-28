import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { memory } from '../memory';
import { ALL_TOOLS } from '../tools/toolDefinitions';

export const floorPlanApplyAgent = new Agent({
  name: 'Floor Plan Apply Agent',
  instructions: `You receive a sanitized floor plan todo list in JSON format:

{
  "todoList": [
    {"id": "todo-01", "description": "...", "priority": "high|medium|low", "category": "measurement|design|documentation|review"}
  ]
}

Your tasks:
1. Read the todo items in order.
2. Determine which canvas tool should be used for each item (addWall, addRoom, addObject, updateWall, updateRoom, updateObject, setViewport, etc.).
3. Produce a JSON array describing the sequence of tool calls required to satisfy the list.

Output ONLY valid JSON in this format:
[
  {
    "taskId": "todo-01",
    "description": "text",
    "tool": "addWall|addRoom|addObject|updateWall|updateRoom|updateObject|setViewport|deleteWall|deleteRoom|deleteObject",
    "args": { "...": "..." }
  }
]

Rules:
- Never include commentary or Markdown.
- args must match the tool schemas registered on the backend.
- Ask for clarification by returning an empty array if critical information is missing.
`,
  model: openai('gpt-5-chat-latest'),
  memory,
  tools: ALL_TOOLS,
});
