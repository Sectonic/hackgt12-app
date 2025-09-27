import { Agent } from '@mastra/core/agent';
import { memory } from '../memory';

/**
 * Floor Plan Planning Agent (Mock Implementation)
 *
 * This agent specializes in understanding user requirements for floor plans
 * and creating structured todo lists in JSON format for implementation tools
 * while also displaying the plan as readable text to the user.
 *
 * This is a mock implementation that doesn't require OpenAI API key for demonstration.
 */

// Mock model that simulates responses
const mockModel = {
  modelId: 'mock-model',
  doGenerate: async ({ prompt }: { prompt: any }) => {
    const userMessage = Array.isArray(prompt) ? prompt.join(' ') : prompt;
    const message = typeof userMessage === 'string' ? userMessage.toLowerCase() : '';

    // Simple pattern matching for demo
    let response = '';

    if (
      message.includes('apartment') ||
      message.includes('bedroom') ||
      message.includes('bathroom')
    ) {
      response = `I understand you want to create a floor plan! Based on your request, I can help you plan this space.

Here's your floor plan todo list:

## Floor Plan Creation Tasks

### Phase 1: Structure & Boundaries
1. Define overall apartment layout (approximately 800-1000 sq ft)
2. Establish exterior walls and main structural elements
3. Plan entry point and main circulation path

### Phase 2: Room Definition  
1. Layout bedroom (120-150 sq ft) with proper proportions
2. Design bathroom (40-50 sq ft) with standard fixtures
3. Plan kitchen area (80-100 sq ft) with work triangle
4. Define living room space (150-200 sq ft) for comfort

### Phase 3: Access & Circulation
1. Position doors between rooms for optimal flow
2. Ensure bathroom privacy and accessibility
3. Plan kitchen access from living area
4. Create clear pathways throughout

### Phase 4: Furniture & Fixtures
1. Place bed and dresser in bedroom
2. Install bathroom fixtures (toilet, sink, shower/tub)
3. Add kitchen appliances and cabinets
4. Arrange living room seating area

### Phase 5: Final Details
1. Add windows for natural light
2. Include storage solutions
3. Label all rooms and key features
4. Review and optimize layout

**JSON Structure for Tools:**
\`\`\`json
{
  "floorPlanType": "residential apartment",
  "requirements": {
    "rooms": ["bedroom", "bathroom", "kitchen", "living room"],
    "dimensions": "800-1000 sq ft total",
    "specialRequirements": ["efficient use of space", "good flow between areas"]
  },
  "todoList": [
    {
      "phase": "Structure & Boundaries",
      "tasks": [
        {"id": "struct-01", "description": "Define overall apartment layout", "priority": "high"},
        {"id": "struct-02", "description": "Establish exterior walls", "priority": "high"}
      ]
    },
    {
      "phase": "Room Definition", 
      "tasks": [
        {"id": "room-01", "description": "Layout bedroom with proper proportions", "priority": "high"},
        {"id": "room-02", "description": "Design bathroom with standard fixtures", "priority": "high"},
        {"id": "room-03", "description": "Plan kitchen with work triangle", "priority": "medium"},
        {"id": "room-04", "description": "Define living room space", "priority": "medium"}
      ]
    }
  ]
}
\`\`\``;
    } else {
      response = `Hello! I'm your Floor Plan Planning Assistant. I'd love to help you create a structured plan for your floor plan.

To get started, could you tell me:
- What type of space are you planning? (residential home, apartment, office, etc.)
- What rooms or areas do you need?
- Do you have any size constraints or special requirements?

Once I understand your needs, I'll create a detailed todo list that breaks down the implementation into clear, manageable tasks!`;
    }

    return {
      response: {
        messages: [{ role: 'assistant', content: response }],
      },
    };
  },
};

export const agentCreatePlan = new Agent({
  name: 'agentCreatePlan',
  instructions:
    'Floor plan planning assistant that creates structured todo lists for implementation.',
  model: mockModel as any,
  tools: {},
  memory,
});
