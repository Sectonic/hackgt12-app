import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

interface FloorPlanTask {
  id: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  completed?: boolean;
}

interface FloorPlanPhase {
  phase: string;
  description: string;
  tasks: FloorPlanTask[];
}

interface FloorPlanResponse {
  floorPlanType: string;
  requirements: {
    rooms: string[];
    dimensions: string;
    specialRequirements: string[];
  };
  phases: FloorPlanPhase[];
  estimatedTimeframe: string;
  nextSteps: string[];
}

// Mock Floor Plan Assistant API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt: string = body?.prompt ?? '';

    console.log('Floor Plan Assistant received:', prompt);

    const message = prompt.toLowerCase();
    let response: FloorPlanResponse;

    if (
      message.includes('apartment') ||
      message.includes('bedroom') ||
      message.includes('bathroom') ||
      message.includes('house') ||
      message.includes('office') ||
      message.includes('room')
    ) {
      // Determine space type and requirements
      const spaceType = getSpaceType(message);
      const rooms = extractRooms(message);
      const specialRequirements = extractSpecialRequirements(message);

      response = {
        floorPlanType: spaceType,
        requirements: {
          rooms: rooms,
          dimensions: 'Efficient use of available space with proper proportions',
          specialRequirements: specialRequirements,
        },
        phases: [
          {
            phase: 'Planning & Analysis',
            description: 'Initial assessment and requirement gathering',
            tasks: [
              {
                id: 'plan-01',
                description: 'Analyze space requirements and constraints',
                priority: 'high',
              },
              {
                id: 'plan-02',
                description: 'Create initial layout sketches and concepts',
                priority: 'high',
              },
              {
                id: 'plan-03',
                description: 'Define traffic flow patterns and circulation',
                priority: 'medium',
              },
            ],
          },
          {
            phase: 'Structure & Boundaries',
            description: 'Establish the foundation and structural elements',
            tasks: [
              {
                id: 'struct-01',
                description: 'Define overall dimensions and boundary walls',
                priority: 'high',
              },
              {
                id: 'struct-02',
                description: 'Establish load-bearing walls and structural elements',
                priority: 'high',
              },
              {
                id: 'struct-03',
                description: 'Plan main entry points and emergency exits',
                priority: 'high',
              },
            ],
          },
          {
            phase: 'Room Layout & Zoning',
            description: 'Design individual spaces and their relationships',
            tasks: [
              {
                id: 'room-01',
                description: 'Layout primary living/working spaces',
                priority: 'high',
              },
              {
                id: 'room-02',
                description: 'Design functional areas (kitchen, bathroom, etc.)',
                priority: 'high',
              },
              {
                id: 'room-03',
                description: 'Plan storage and utility spaces',
                priority: 'medium',
              },
              {
                id: 'room-04',
                description: 'Optimize room proportions and relationships',
                priority: 'medium',
              },
            ],
          },
          {
            phase: 'Systems & Infrastructure',
            description: 'Plan utilities, lighting, and building systems',
            tasks: [
              {
                id: 'sys-01',
                description: 'Design electrical layout and outlet placement',
                priority: 'high',
              },
              {
                id: 'sys-02',
                description: 'Plan plumbing routes and fixture locations',
                priority: 'high',
              },
              {
                id: 'sys-03',
                description: 'Design HVAC system and ventilation',
                priority: 'medium',
              },
              {
                id: 'sys-04',
                description: 'Plan lighting scheme and natural light optimization',
                priority: 'medium',
              },
            ],
          },
          {
            phase: 'Finalization & Documentation',
            description: 'Complete the design and create final documentation',
            tasks: [
              {
                id: 'final-01',
                description: 'Add furniture layout and space planning',
                priority: 'medium',
              },
              {
                id: 'final-02',
                description: 'Create detailed floor plan drawings',
                priority: 'high',
              },
              {
                id: 'final-03',
                description: 'Generate specifications and material lists',
                priority: 'low',
              },
              {
                id: 'final-04',
                description: 'Review and validate against requirements',
                priority: 'high',
              },
            ],
          },
        ],
        estimatedTimeframe: '2-4 weeks depending on complexity',
        nextSteps: [
          'Begin with planning and analysis phase',
          'Gather detailed space requirements and measurements',
          'Create initial concept sketches for review',
        ],
      };
    } else {
      // Welcome message for new users
      response = {
        floorPlanType: 'consultation',
        requirements: {
          rooms: [],
          dimensions: 'To be determined',
          specialRequirements: [],
        },
        phases: [],
        estimatedTimeframe: 'Consultation phase',
        nextSteps: [
          "Describe the type of space you're planning (home, apartment, office, etc.)",
          'List the rooms or areas you need',
          'Share any size constraints or special requirements',
          'Mention your timeline and budget considerations',
        ],
      };
    }

    // Create formatted text output
    const formattedResponse = formatFloorPlanResponse(response);

    // Create a readable stream for SSE format
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        // Split by words instead of characters for better readability
        const words = formattedResponse.split(' ');
        let wordIndex = 0;

        const interval = setInterval(() => {
          if (wordIndex < words.length) {
            // Send 2-4 words at a time for natural flow
            const wordsPerChunk = Math.min(3, words.length - wordIndex);
            const chunk = words.slice(wordIndex, wordIndex + wordsPerChunk).join(' ');
            const chunkWithSpace = wordIndex + wordsPerChunk < words.length ? chunk + ' ' : chunk;

            controller.enqueue(encoder.encode(`data: ${chunkWithSpace}\n\n`));
            wordIndex += wordsPerChunk;
          } else {
            controller.enqueue(encoder.encode(`event: done\ndata: \n\n`));
            controller.close();
            clearInterval(interval);
          }
        }, 50); // Slightly slower for better readability
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

function getSpaceType(message: string): string {
  if (message.includes('apartment')) return 'Residential Apartment';
  if (message.includes('house')) return 'Residential House';
  if (message.includes('office')) return 'Commercial Office';
  if (message.includes('studio')) return 'Studio Space';
  return 'Custom Space';
}

function extractRooms(message: string): string[] {
  const rooms: string[] = [];
  const roomKeywords = [
    'bedroom',
    'bathroom',
    'kitchen',
    'living room',
    'dining room',
    'office',
    'study',
    'laundry',
    'garage',
    'basement',
    'attic',
  ];

  roomKeywords.forEach((room) => {
    if (message.includes(room)) {
      rooms.push(room.charAt(0).toUpperCase() + room.slice(1));
    }
  });

  return rooms.length > 0 ? rooms : ['To be determined'];
}

function extractSpecialRequirements(message: string): string[] {
  const requirements: string[] = [];

  if (message.includes('accessible') || message.includes('wheelchair')) {
    requirements.push('Accessibility compliance');
  }
  if (message.includes('pet')) {
    requirements.push('Pet-friendly design');
  }
  if (message.includes('natural light')) {
    requirements.push('Natural light optimization');
  }
  if (message.includes('storage')) {
    requirements.push('Ample storage solutions');
  }
  if (message.includes('open')) {
    requirements.push('Open floor plan concept');
  }

  return requirements.length > 0 ? requirements : ['Standard residential requirements'];
}

function formatFloorPlanResponse(response: FloorPlanResponse): string {
  let formatted = '';

  if (response.floorPlanType === 'consultation') {
    formatted = `# Floor Plan Planning Assistant

Welcome! I'm here to help you create a comprehensive floor plan. 

## Getting Started

To provide you with a detailed planning roadmap, I need to understand your project better:

### Please Share:
${response.nextSteps.map((step) => `• ${step}`).join('\n')}

Once you provide these details, I'll create a structured implementation plan with clear phases and actionable tasks!`;
  } else {
    formatted = `# Floor Plan Development Plan

## Project Overview
**Space Type:** ${response.floorPlanType}
**Estimated Timeline:** ${response.estimatedTimeframe}

## Requirements Summary
**Rooms Needed:** ${response.requirements.rooms.join(', ')}
**Dimensions:** ${response.requirements.dimensions}
**Special Requirements:** ${response.requirements.specialRequirements.join(', ')}

## Implementation Phases

${response.phases
  .map(
    (phase, index) => `### Phase ${index + 1}: ${phase.phase}
*${phase.description}*

${phase.tasks.map((task) => `**${task.priority.toUpperCase()} PRIORITY** - ${task.description} \`[${task.id}]\``).join('\n')}
`,
  )
  .join('\n')}

## Next Steps
${response.nextSteps.map((step) => `1. ${step}`).join('\n')}

---
*This plan can be customized based on your specific needs and constraints.*`;
  }

  return formatted;
}
