import { NextRequest } from 'next/server';

// Dynamic plan generation based on user input
function generateDynamicPlan(prompt: string) {
  const lowerPrompt = prompt.toLowerCase();

  // Analyze the user's input to determine the type of project
  let projectType = 'general';
  let roomCount = 1;
  const specialRequirements = [];

  // Detect project type
  if (lowerPrompt.includes('apartment') || lowerPrompt.includes('flat')) {
    projectType = 'apartment';
  } else if (lowerPrompt.includes('house') || lowerPrompt.includes('home')) {
    projectType = 'house';
  } else if (lowerPrompt.includes('office') || lowerPrompt.includes('workplace')) {
    projectType = 'office';
  } else if (lowerPrompt.includes('restaurant') || lowerPrompt.includes('cafe')) {
    projectType = 'restaurant';
  } else if (lowerPrompt.includes('retail') || lowerPrompt.includes('shop')) {
    projectType = 'retail';
  }

  // Detect room count
  const roomMatches = lowerPrompt.match(/(\d+)\s*(bedroom|room|bed)/);
  if (roomMatches) {
    roomCount = parseInt(roomMatches[1]);
  } else if (lowerPrompt.includes('studio')) {
    roomCount = 1;
  } else if (lowerPrompt.includes('two') || lowerPrompt.includes('2')) {
    roomCount = 2;
  } else if (lowerPrompt.includes('three') || lowerPrompt.includes('3')) {
    roomCount = 3;
  }

  // Detect special requirements
  if (lowerPrompt.includes('accessible') || lowerPrompt.includes('wheelchair')) {
    specialRequirements.push('accessibility');
  }
  if (lowerPrompt.includes('open') || lowerPrompt.includes('open concept')) {
    specialRequirements.push('open concept');
  }
  if (lowerPrompt.includes('kitchen') || lowerPrompt.includes('cooking')) {
    specialRequirements.push('kitchen design');
  }
  if (lowerPrompt.includes('bathroom') || lowerPrompt.includes('toilet')) {
    specialRequirements.push('bathroom design');
  }
  if (lowerPrompt.includes('storage') || lowerPrompt.includes('closet')) {
    specialRequirements.push('storage solutions');
  }

  // Generate dynamic todo list based on analysis
  const todoList = [];
  let todoId = 1;

  // Always start with measurement tasks
  todoList.push({
    id: `todo-${todoId.toString().padStart(2, '0')}`,
    description: `Measure the overall space dimensions and create a base floor plan`,
    priority: 'high',
    category: 'measurement',
  });
  todoId++;

  // Add project-specific tasks
  if (projectType === 'apartment') {
    todoList.push({
      id: `todo-${todoId.toString().padStart(2, '0')}`,
      description: `Plan the ${roomCount}-bedroom apartment layout with living areas`,
      priority: 'high',
      category: 'design',
    });
    todoId++;

    if (roomCount > 1) {
      todoList.push({
        id: `todo-${todoId.toString().padStart(2, '0')}`,
        description: `Design bedroom layouts and privacy considerations`,
        priority: 'high',
        category: 'design',
      });
      todoId++;
    }
  } else if (projectType === 'house') {
    todoList.push({
      id: `todo-${todoId.toString().padStart(2, '0')}`,
      description: `Design the ${roomCount}-bedroom house floor plan with common areas`,
      priority: 'high',
      category: 'design',
    });
    todoId++;

    todoList.push({
      id: `todo-${todoId.toString().padStart(2, '0')}`,
      description: `Plan the kitchen and dining area layout`,
      priority: 'high',
      category: 'design',
    });
    todoId++;
  } else if (projectType === 'office') {
    todoList.push({
      id: `todo-${todoId.toString().padStart(2, '0')}`,
      description: `Design workspace layout with desk arrangements and meeting areas`,
      priority: 'high',
      category: 'design',
    });
    todoId++;

    todoList.push({
      id: `todo-${todoId.toString().padStart(2, '0')}`,
      description: `Plan reception and common areas for office functionality`,
      priority: 'medium',
      category: 'design',
    });
    todoId++;
  } else if (projectType === 'restaurant') {
    todoList.push({
      id: `todo-${todoId.toString().padStart(2, '0')}`,
      description: `Design dining area layout with table arrangements and flow`,
      priority: 'high',
      category: 'design',
    });
    todoId++;

    todoList.push({
      id: `todo-${todoId.toString().padStart(2, '0')}`,
      description: `Plan kitchen layout with cooking stations and service areas`,
      priority: 'high',
      category: 'design',
    });
    todoId++;
  } else if (projectType === 'retail') {
    todoList.push({
      id: `todo-${todoId.toString().padStart(2, '0')}`,
      description: `Design retail floor plan with product display areas`,
      priority: 'high',
      category: 'design',
    });
    todoId++;

    todoList.push({
      id: `todo-${todoId.toString().padStart(2, '0')}`,
      description: `Plan checkout and customer service areas`,
      priority: 'high',
      category: 'design',
    });
    todoId++;
  }

  // Add special requirements
  if (specialRequirements.includes('accessibility')) {
    todoList.push({
      id: `todo-${todoId.toString().padStart(2, '0')}`,
      description: `Ensure ADA compliance and accessibility features throughout`,
      priority: 'high',
      category: 'design',
    });
    todoId++;
  }

  if (specialRequirements.includes('kitchen design')) {
    todoList.push({
      id: `todo-${todoId.toString().padStart(2, '0')}`,
      description: `Design kitchen layout with work triangle and appliance placement`,
      priority: 'high',
      category: 'design',
    });
    todoId++;
  }

  if (specialRequirements.includes('bathroom design')) {
    todoList.push({
      id: `todo-${todoId.toString().padStart(2, '0')}`,
      description: `Plan bathroom layout with fixtures and plumbing considerations`,
      priority: 'high',
      category: 'design',
    });
    todoId++;
  }

  // Add standard tasks
  todoList.push({
    id: `todo-${todoId.toString().padStart(2, '0')}`,
    description: `Plan door and window placement for optimal flow`,
    priority: 'medium',
    category: 'design',
  });
  todoId++;

  todoList.push({
    id: `todo-${todoId.toString().padStart(2, '0')}`,
    description: `Design furniture placement and traffic flow patterns`,
    priority: 'medium',
    category: 'design',
  });
  todoId++;

  if (specialRequirements.includes('storage solutions')) {
    todoList.push({
      id: `todo-${todoId.toString().padStart(2, '0')}`,
      description: `Plan storage solutions and closet spaces`,
      priority: 'medium',
      category: 'design',
    });
    todoId++;
  }

  // Add documentation tasks
  todoList.push({
    id: `todo-${todoId.toString().padStart(2, '0')}`,
    description: `Create detailed technical drawings with measurements`,
    priority: 'medium',
    category: 'documentation',
  });
  todoId++;

  todoList.push({
    id: `todo-${todoId.toString().padStart(2, '0')}`,
    description: `Generate 3D visualization and renderings`,
    priority: 'low',
    category: 'documentation',
  });
  todoId++;

  // Add review tasks
  todoList.push({
    id: `todo-${todoId.toString().padStart(2, '0')}`,
    description: `Review and validate the final floor plan for compliance`,
    priority: 'low',
    category: 'review',
  });

  return {
    todoList,
    projectType,
    roomCount,
    specialRequirements,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    // Generate dynamic plan based on user input
    const dynamicResponse = generateDynamicPlan(prompt);

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send the structured JSON first
        const jsonData = `data: ${JSON.stringify(dynamicResponse)}\n\n`;
        controller.enqueue(encoder.encode(jsonData));

        // Send a human-readable explanation
        const explanation = `Based on your request: "${prompt}", I've analyzed your requirements and created a customized floor plan task list for a ${dynamicResponse.projectType} with ${dynamicResponse.roomCount} room(s). Here's your structured plan:\n\n`;
        controller.enqueue(encoder.encode(`data: ${explanation.replace(/\n/g, '\\n')}\n\n`));

        // Send each todo item
        dynamicResponse.todoList.forEach((todo, index) => {
          const item = `${index + 1}. ${todo.description} (Priority: ${todo.priority}, Category: ${todo.category})\n`;
          controller.enqueue(encoder.encode(`data: ${item.replace(/\n/g, '\\n')}\n\n`));
        });

        // Add project-specific insights
        if (dynamicResponse.specialRequirements.length > 0) {
          const insights = `\nSpecial considerations identified: ${dynamicResponse.specialRequirements.join(', ')}\n`;
          controller.enqueue(encoder.encode(`data: ${insights.replace(/\n/g, '\\n')}\n\n`));
        }

        // Send completion signal
        controller.enqueue(encoder.encode('event: done\ndata: \n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in plan creation:', error);
    return new Response(JSON.stringify({ error: 'Failed to create plan' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
