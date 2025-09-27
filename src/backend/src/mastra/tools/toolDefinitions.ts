import {
  createMastraToolForFrontendTool,
  createMastraToolForStateSetter,
  createRequestAdditionalContextTool,
} from '@cedar-os/backend';
import { streamJSONEvent } from '../../utils/streamUtils';
import { z } from 'zod';
import { PointSchema, SizeSchema } from '../../../../app/lib/types';

// Define the schemas for our tools based on what we registered in page.tsx

// Schema for the addNewTextLine frontend tool
export const AddNewTextLineSchema = z.object({
  text: z.string().min(1, 'Text cannot be empty').describe('The text to add to the screen'),
  style: z
    .enum(['normal', 'bold', 'italic', 'highlight'])
    .optional()
    .describe('Text style to apply'),
});

// Schema for the changeText state setter
export const ChangeTextSchema = z.object({
  newText: z.string().min(1, 'Text cannot be empty').describe('The new text to display'),
});

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

// Create backend tools for the frontend tool
export const addNewTextLineTool = createMastraToolForFrontendTool(
  'addNewTextLine',
  AddNewTextLineSchema,
  {
    description:
      'Add a new line of text to the screen with optional styling. This tool allows the agent to dynamically add text content that will be displayed on the user interface with different visual styles.',
    toolId: 'addNewTextLine',
    streamEventFn: streamJSONEvent,
    errorSchema: ErrorResponseSchema,
  },
);

// Create backend tools for the state setter
export const changeTextTool = createMastraToolForStateSetter(
  'mainText', // The state key
  'changeText', // The state setter name
  ChangeTextSchema,
  {
    description:
      'Change the main text displayed on the screen. This tool allows the agent to modify the primary text content that users see, replacing the current text with new content.',
    toolId: 'changeText',
    streamEventFn: streamJSONEvent,
    errorSchema: ErrorResponseSchema,
  },
);

export const requestAdditionalContextTool = createRequestAdditionalContextTool();

// Floor Plan Tool Schemas
export const AddWallSchema = z.object({
  start: PointSchema,
  end: PointSchema,
  thickness: z.number().optional().describe('Wall thickness in pixels (default: 8)'),
});

export const AddRoomSchema = z.object({
  points: z.array(PointSchema).min(3, 'Room must have at least 3 points'),
  label: z.string().optional().describe('Room label (e.g., "Living Room", "Kitchen")'),
});

export const AddObjectSchema = z.object({
  type: z.enum(['furniture', 'fixture', 'appliance', 'door', 'window']),
  position: PointSchema,
  size: SizeSchema,
  label: z.string().describe('Object label (e.g., "Sofa", "Refrigerator")'),
  rotation: z.number().optional().describe('Rotation in degrees (default: 0)'),
});

export const UpdateWallSchema = z.object({
  id: z.string().describe('Wall ID to update'),
  start: PointSchema.optional(),
  end: PointSchema.optional(),
  thickness: z.number().optional(),
});

export const UpdateRoomSchema = z.object({
  id: z.string().describe('Room ID to update'),
  points: z.array(PointSchema).optional(),
  label: z.string().optional(),
});

export const UpdateObjectSchema = z.object({
  id: z.string().describe('Object ID to update'),
  position: PointSchema.optional(),
  size: SizeSchema.optional(),
  rotation: z.number().optional(),
  label: z.string().optional(),
});

export const DeleteWallSchema = z.object({
  id: z.string().describe('Wall ID to delete'),
});

export const DeleteRoomSchema = z.object({
  id: z.string().describe('Room ID to delete'),
});

export const DeleteObjectSchema = z.object({
  id: z.string().describe('Object ID to delete'),
});

export const SetToolSchema = z.object({
  tool: z.enum(['select', 'move', 'wall', 'room', 'object', 'text', 'eraser']),
});

export const SetViewportSchema = z.object({
  zoom: z.number().min(0.1).max(5).optional(),
  pan: PointSchema.optional(),
});

// Create floor plan tools
export const addWallTool = createMastraToolForFrontendTool('addWall', AddWallSchema, {
  description: 'Add a wall to the floor plan. Walls define the structure and boundaries of rooms.',
  toolId: 'addWall',
  streamEventFn: streamJSONEvent,
  errorSchema: ErrorResponseSchema,
});

export const addRoomTool = createMastraToolForFrontendTool('addRoom', AddRoomSchema, {
  description:
    'Add a room to the floor plan. Rooms are defined by a series of connected points forming a closed polygon.',
  toolId: 'addRoom',
  streamEventFn: streamJSONEvent,
  errorSchema: ErrorResponseSchema,
});

export const addObjectTool = createMastraToolForFrontendTool('addObject', AddObjectSchema, {
  description: 'Add furniture, fixtures, appliances, doors, or windows to the floor plan.',
  toolId: 'addObject',
  streamEventFn: streamJSONEvent,
  errorSchema: ErrorResponseSchema,
});

export const updateWallTool = createMastraToolForFrontendTool('updateWall', UpdateWallSchema, {
  description: 'Update an existing wall in the floor plan.',
  toolId: 'updateWall',
  streamEventFn: streamJSONEvent,
  errorSchema: ErrorResponseSchema,
});

export const updateRoomTool = createMastraToolForFrontendTool('updateRoom', UpdateRoomSchema, {
  description: 'Update an existing room in the floor plan.',
  toolId: 'updateRoom',
  streamEventFn: streamJSONEvent,
  errorSchema: ErrorResponseSchema,
});

export const updateObjectTool = createMastraToolForFrontendTool(
  'updateObject',
  UpdateObjectSchema,
  {
    description: 'Update an existing object in the floor plan.',
    toolId: 'updateObject',
    streamEventFn: streamJSONEvent,
    errorSchema: ErrorResponseSchema,
  },
);

export const deleteWallTool = createMastraToolForFrontendTool('deleteWall', DeleteWallSchema, {
  description: 'Delete a wall from the floor plan.',
  toolId: 'deleteWall',
  streamEventFn: streamJSONEvent,
  errorSchema: ErrorResponseSchema,
});

export const deleteRoomTool = createMastraToolForFrontendTool('deleteRoom', DeleteRoomSchema, {
  description: 'Delete a room from the floor plan.',
  toolId: 'deleteRoom',
  streamEventFn: streamJSONEvent,
  errorSchema: ErrorResponseSchema,
});

export const deleteObjectTool = createMastraToolForFrontendTool(
  'deleteObject',
  DeleteObjectSchema,
  {
    description: 'Delete an object from the floor plan.',
    toolId: 'deleteObject',
    streamEventFn: streamJSONEvent,
    errorSchema: ErrorResponseSchema,
  },
);

export const setToolTool = createMastraToolForFrontendTool('setTool', SetToolSchema, {
  description: 'Set the active tool for floor plan editing.',
  toolId: 'setTool',
  streamEventFn: streamJSONEvent,
  errorSchema: ErrorResponseSchema,
});

export const setViewportTool = createMastraToolForFrontendTool('setViewport', SetViewportSchema, {
  description: 'Set the viewport zoom and pan for the floor plan editor.',
  toolId: 'setViewport',
  streamEventFn: streamJSONEvent,
  errorSchema: ErrorResponseSchema,
});

/**
 * Registry of all available tools organized by category
 * This structure makes it easy to see tool organization and generate categorized descriptions
 */
export const TOOL_REGISTRY = {
  textManipulation: {
    changeTextTool,
    addNewTextLineTool,
  },
  floorPlanCreation: {
    addWallTool,
    addRoomTool,
    addObjectTool,
  },
  floorPlanEditing: {
    updateWallTool,
    updateRoomTool,
    updateObjectTool,
  },
  floorPlanDeletion: {
    deleteWallTool,
    deleteRoomTool,
    deleteObjectTool,
  },
  floorPlanTools: {
    setToolTool,
    setViewportTool,
  },
};

// Export all tools as an array for easy registration
export const ALL_TOOLS = [
  changeTextTool,
  addNewTextLineTool,
  addWallTool,
  addRoomTool,
  addObjectTool,
  updateWallTool,
  updateRoomTool,
  updateObjectTool,
  deleteWallTool,
  deleteRoomTool,
  deleteObjectTool,
  setToolTool,
  setViewportTool,
];
