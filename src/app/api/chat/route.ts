import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// Mock Floor Plan Assistant API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt: string = body?.prompt ?? '';

    console.log('Floor Plan Assistant received:', prompt);

    // Simple pattern matching for demo
    const message = prompt.toLowerCase();
    let response = '';

    if (
      message.includes('apartment') ||
      message.includes('bedroom') ||
      message.includes('bathroom') ||
      message.includes('house') ||
      message.includes('office') ||
      message.includes('room')
    ) {
      response = `I understand you want to create a floor plan! Based on your request, I can help you plan this space.

## Floor Plan Creation Tasks

### Phase 1: Structure & Boundaries
1. Define overall layout and dimensions
2. Establish exterior walls and main structural elements  
3. Plan entry point and main circulation path

### Phase 2: Room Definition
1. Layout primary rooms with proper proportions
2. Design functional spaces (bathroom, kitchen, etc.)
3. Plan work areas and activity zones
4. Define living/social spaces for comfort

### Phase 3: Access & Circulation
1. Position doors between rooms for optimal flow
2. Ensure privacy and accessibility where needed
3. Plan connections between functional areas
4. Create clear pathways throughout

### Phase 4: Furniture & Fixtures
1. Place essential furniture and equipment
2. Install necessary fixtures and appliances
3. Add storage solutions and built-ins
4. Arrange spaces for intended use

### Phase 5: Final Details
1. Add windows for natural light and ventilation
2. Include electrical and lighting plans
3. Label all rooms and key features
4. Review and optimize overall layout

**JSON Structure for Implementation:**
\`\`\`json
{
  "floorPlanType": "residential space",
  "requirements": {
    "rooms": ["bedroom", "bathroom", "kitchen", "living area"],
    "dimensions": "efficient use of available space",
    "specialRequirements": ["good flow between areas", "natural light", "privacy"]
  },
  "todoList": [
    {
      "phase": "Structure & Boundaries", 
      "tasks": [
        {"id": "struct-01", "description": "Define overall layout", "priority": "high"},
        {"id": "struct-02", "description": "Establish exterior walls", "priority": "high"}
      ]
    },
    {
      "phase": "Room Definition",
      "tasks": [
        {"id": "room-01", "description": "Layout primary rooms", "priority": "high"},
        {"id": "room-02", "description": "Design functional spaces", "priority": "high"}
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

    // Create a readable stream for SSE format
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        // Stream characters for better spacing preservation
        let charIndex = 0;
        const chars = response.split('');

        const interval = setInterval(() => {
          if (charIndex < chars.length) {
            // Send multiple characters at once for better performance
            const chunkSize = 3;
            const chunk = chars.slice(charIndex, charIndex + chunkSize).join('');
            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
            charIndex += chunkSize;
          } else {
            controller.enqueue(encoder.encode(`event: done\ndata: \n\n`));
            controller.close();
            clearInterval(interval);
          }
        }, 25); // Stream every 25ms for smooth typing effect
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API route error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
