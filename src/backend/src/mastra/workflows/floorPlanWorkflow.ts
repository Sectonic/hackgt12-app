// ---------------------------------------------
// Floor Plan Workflow - Processes multimodal floor plan input
// Converts floor plan requests into structured building components
// ---------------------------------------------

import { createWorkflow, createStep } from '@mastra/core/workflows';
import { RuntimeContext } from '@mastra/core/di';
import { z } from 'zod';
import { floorPlanAgent } from '../agents/floorPlanAgent';

export const FloorPlanInputSchema = z.object({
  prompt: z.string().describe('Text description of the floor plan'),
  images: z.array(z.string()).optional().describe('Base64 encoded images of floor plans'),
  svgData: z.string().optional().describe('SVG data for floor plans'),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  systemPrompt: z.string().optional(),
  additionalContext: z.any().optional(),
  resourceId: z.string().optional(),
  threadId: z.string().optional(),
});

export const FloorPlanOutputSchema = z.object({
  success: z.boolean(),
  content: z.string(),
  PlacedEntity: z.array(z.any()).optional(),
  RoomDefinition: z.array(z.any()).optional(),
  usage: z.any().optional(),
});

export type FloorPlanOutput = z.infer<typeof FloorPlanOutputSchema>;

const processFloorPlan = createStep({
  id: 'processFloorPlan',
  description: 'Process multimodal floor plan input and generate building components',
  inputSchema: FloorPlanInputSchema,
  outputSchema: FloorPlanOutputSchema,
  execute: async ({ inputData }) => {
    const {
      prompt,
      images,
      svgData,
      temperature,
      maxTokens,
      systemPrompt,
      additionalContext,
      resourceId,
      threadId,
    } = inputData;

    console.log('Floor plan workflow received input data', inputData);

    // Create runtime context with additional context
    const runtimeContext = new RuntimeContext();
    runtimeContext.set('additionalContext', additionalContext);

    // Prepare messages with multimodal content
    const messages = [];
    
    // Add the main prompt
    messages.push('Floor plan request: ' + prompt);
    
    // Add image information if provided
    if (images && images.length > 0) {
      messages.push(`Number of floor plan images provided: ${images.length}`);
      // Note: Actual image processing would happen in the agent with proper multimodal handling
    }
    
    // Add SVG data if provided
    if (svgData) {
      messages.push('SVG floor plan data: ' + svgData);
    }
    
    // Add additional context
    if (additionalContext) {
      messages.push('Additional context: ' + JSON.stringify(additionalContext));
    }

    let responseText = '';
    const placedEntities: any[] = [];
    const roomDefinitions: any[] = [];

    /**
     * Using Mastra generate for non-streaming floor plan processing
     */
    const agentResponse = await floorPlanAgent.generate(messages, {
      // Override system prompt if provided
      ...(systemPrompt ? ({ instructions: systemPrompt } as const) : {}),
      temperature: temperature || 0.3, // Lower temperature for more precise measurements
      maxTokens: maxTokens || 4000, // Higher token limit for detailed floor plans
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

    responseText = agentResponse.text || '';

    // For now, create mock data since we need to implement proper tool result extraction
    const toolResults = {
      rooms: [
        {
          id: 'room-1',
          name: 'Living Room',
          polygon: [
            { x: 0, y: 0 },
            { x: 400, y: 0 },
            { x: 400, y: 300 },
            { x: 0, y: 300 }
          ],
          color: '#FF6B6B',
          flooring: 'floor_wood'
        }
      ],
      walls: [
        {
          id: 'wall-1',
          startX: 0,
          startY: 0,
          endX: 400,
          endY: 0,
          thickness: 16,
          roomIds: ['room-1']
        }
      ],
      doorsAndWindows: [],
      objects: []
    };

    // Process tool results into the correct format
    if (toolResults.rooms) {
      roomDefinitions.push(...toolResults.rooms);
    }

    if (toolResults.walls) {
      placedEntities.push(...toolResults.walls.map((wall: any) => ({
        id: wall.id,
        type: 'wall',
        startX: wall.startX,
        startY: wall.startY,
        endX: wall.endX,
        endY: wall.endY,
        thickness: wall.thickness || 16,
        roomIds: wall.roomIds || [],
      })));
    }

    if (toolResults.doorsAndWindows) {
      placedEntities.push(...toolResults.doorsAndWindows.map((item: any) => ({
        id: item.id,
        file: item.file,
        type: 'foundational',
        subtype: item.type,
        name: item.file,
        width: item.width,
        height: item.height,
        inverted: item.inverted || false,
        rotation: item.rotation || 0,
        scale: item.scale || 1,
        x: item.x,
        y: item.y,
        roomId: item.roomId,
        attachedToWallId: item.attachedToWallId,
      })));
    }

    if (toolResults.objects) {
      placedEntities.push(...toolResults.objects.map((obj: any) => ({
        id: obj.id,
        file: obj.file,
        type: obj.type,
        name: obj.name,
        width: obj.width,
        height: obj.height,
        inverted: obj.inverted || false,
        rotation: obj.rotation || 0,
        scale: obj.scale || 1,
        x: obj.x,
        y: obj.y,
        roomId: obj.roomId,
      })));
    }

    const usage = agentResponse.usage || {};

    console.log('Floor plan workflow result', {
      content: responseText,
      PlacedEntity: placedEntities,
      RoomDefinition: roomDefinitions,
      usage: usage,
    });

    return {
      success: true,
      content: responseText,
      PlacedEntity: placedEntities,
      RoomDefinition: roomDefinitions,
      usage: usage,
    };
  },
});

export const floorPlanWorkflow = createWorkflow({
  id: 'floorPlanWorkflow',
  description: 'Floor plan workflow that processes multimodal input and generates building components',
  inputSchema: FloorPlanInputSchema,
  outputSchema: FloorPlanOutputSchema,
})
  .then(processFloorPlan)
  .commit();
