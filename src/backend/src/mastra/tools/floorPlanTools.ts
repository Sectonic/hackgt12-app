import { z } from 'zod';
import { Tool } from '@mastra/core/tools';

// ============================================
// COORDINATE SYSTEM SCHEMAS
// ============================================

const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const RoomPolygonSchema = z.object({
  id: z.string(),
  name: z.string(),
  polygon: z.array(PointSchema).min(3),
  color: z.string().optional(),
  flooring: z.enum(['floor_wood', 'floor_tile', 'floor_carpet', 'floor_stone']).default('floor_wood'),
});

const WallSegmentSchema = z.object({
  id: z.string(),
  startX: z.number(),
  startY: z.number(),
  endX: z.number(),
  endY: z.number(),
  thickness: z.number().default(16),
  roomIds: z.array(z.string()).max(2).optional(),
});

const DoorWindowSchema = z.object({
  id: z.string(),
  type: z.enum(['door', 'window']),
  file: z.string(), // Maps to available icon files
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0),
  scale: z.number().default(1),
  inverted: z.boolean().default(false),
  attachedToWallId: z.string(),
  roomId: z.string(), // For doors: room it enters into; for windows: either adjacent room
});

const ObjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  file: z.string(), // Maps to available icon files
  type: z.enum(['furniture', 'foundational']),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0),
  scale: z.number().default(1),
  inverted: z.boolean().default(false),
  roomId: z.string(),
});

// ============================================
// ROOM CREATION TOOLS
// ============================================

export const createRoomsTool = new Tool({
  name: 'create_rooms',
  description: 'Create room polygons with proper coordinate positioning. Each room should have a cyclical polygon that represents its boundaries.',
  schema: z.object({
    rooms: z.array(RoomPolygonSchema),
    coordinateSystemInfo: z.object({
      width: z.number(),
      height: z.number(),
      units: z.string().default('pixels'),
    }),
  }),
  execute: async ({ rooms, coordinateSystemInfo }) => {
    return {
      success: true,
      message: `Successfully created ${rooms.length} rooms`,
      rooms: rooms.map(room => ({
        ...room,
        // Generate random unique color if not provided
        color: room.color || `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
      })),
      coordinateSystem: coordinateSystemInfo,
    };
  },
});

// ============================================
// WALL CREATION TOOLS
// ============================================

export const createWallsTool = new Tool({
  name: 'create_walls',
  description: 'Create wall segments between rooms. Walls should not intersect - if lines cross, create separate segments. Each wall can be part of maximum two rooms.',
  schema: z.object({
    walls: z.array(WallSegmentSchema),
    intersectionInfo: z.object({
      handledIntersections: z.array(z.object({
        originalWallId: z.string(),
        splitIntoWallIds: z.array(z.string()),
        intersectionPoint: PointSchema,
      })).optional(),
    }).optional(),
  }),
  execute: async ({ walls, intersectionInfo }) => {
    // Validate that no wall belongs to more than 2 rooms
    const invalidWalls = walls.filter(wall => wall.roomIds && wall.roomIds.length > 2);
    if (invalidWalls.length > 0) {
      return {
        success: false,
        error: `Invalid walls found: ${invalidWalls.map(w => w.id).join(', ')} belong to more than 2 rooms`,
      };
    }

    return {
      success: true,
      message: `Successfully created ${walls.length} wall segments`,
      walls,
      intersectionHandling: intersectionInfo,
    };
  },
});

// ============================================
// DOOR & WINDOW CREATION TOOLS
// ============================================

export const createDoorsWindowsTool = new Tool({
  name: 'create_doors_windows',
  description: 'Create doors and windows attached to walls. Doors should specify which room they enter into. Windows can be attached to either adjacent room.',
  schema: z.object({
    doorsAndWindows: z.array(DoorWindowSchema),
    availableIcons: z.object({
      doors: z.array(z.string()).default(['door', 'door_2']),
      windows: z.array(z.string()).default(['window', 'window_2', 'window_3']),
    }).optional(),
  }),
  execute: async ({ doorsAndWindows, availableIcons }) => {
    const doors = doorsAndWindows.filter(item => item.type === 'door');
    const windows = doorsAndWindows.filter(item => item.type === 'window');

    return {
      success: true,
      message: `Successfully created ${doors.length} doors and ${windows.length} windows`,
      doors,
      windows,
      totalItems: doorsAndWindows.length,
    };
  },
});

// ============================================
// OBJECT PLACEMENT TOOLS
// ============================================

export const createObjectsTool = new Tool({
  name: 'create_objects',
  description: 'Create furniture and other objects inside rooms. Each object must be mapped to an available icon file and properly positioned within its assigned room.',
  schema: z.object({
    objects: z.array(ObjectSchema),
    availableIcons: z.object({
      furniture: z.array(z.string()).default([
        'bed_double', 'bed_king', 'bed_twin', 'sofa_2', 'sofa_3', 'sofa_4',
        'dining_table_4', 'dining_table_6', 'chair_dining', 'chair_ergonomic',
        'office_desk', 'office_desk_corner', 'fridge', 'stove', 'kitchen_sink',
        'bathroom_sink', 'toilet', 'bath', 'shower', 'tv_stand', 'bookshelf',
        'dresser', 'nightstand', 'cabinet', 'storage', 'table_coffee'
      ]),
      foundational: z.array(z.string()).default(['stairs', 'stairs_l', 'stairs_c']),
    }).optional(),
  }),
  execute: async ({ objects, availableIcons }) => {
    const furniture = objects.filter(obj => obj.type === 'furniture');
    const foundational = objects.filter(obj => obj.type === 'foundational');

    // Group objects by room for easier validation
    const objectsByRoom = objects.reduce((acc, obj) => {
      if (!acc[obj.roomId]) acc[obj.roomId] = [];
      acc[obj.roomId].push(obj);
      return acc;
    }, {} as Record<string, typeof objects>);

    return {
      success: true,
      message: `Successfully created ${furniture.length} furniture items and ${foundational.length} foundational items across ${Object.keys(objectsByRoom).length} rooms`,
      furniture,
      foundational,
      objectsByRoom,
      totalObjects: objects.length,
    };
  },
});

// ============================================
// FLOOR PLAN VALIDATION TOOL
// ============================================

export const validateFloorPlanTool = new Tool({
  name: 'validate_floor_plan',
  description: 'Validate the complete floor plan structure for consistency and proper relationships between all elements.',
  schema: z.object({
    rooms: z.array(RoomPolygonSchema),
    walls: z.array(WallSegmentSchema),
    doorsAndWindows: z.array(DoorWindowSchema),
    objects: z.array(ObjectSchema),
  }),
  execute: async ({ rooms, walls, doorsAndWindows, objects }) => {
    const validationErrors: string[] = [];
    const warnings: string[] = [];

    // Validate room-wall relationships
    const roomIds = new Set(rooms.map(r => r.id));
    walls.forEach(wall => {
      if (wall.roomIds) {
        wall.roomIds.forEach(roomId => {
          if (!roomIds.has(roomId)) {
            validationErrors.push(`Wall ${wall.id} references non-existent room ${roomId}`);
          }
        });
      }
    });

    // Validate door/window-wall relationships
    const wallIds = new Set(walls.map(w => w.id));
    doorsAndWindows.forEach(item => {
      if (!wallIds.has(item.attachedToWallId)) {
        validationErrors.push(`${item.type} ${item.id} references non-existent wall ${item.attachedToWallId}`);
      }
      if (!roomIds.has(item.roomId)) {
        validationErrors.push(`${item.type} ${item.id} references non-existent room ${item.roomId}`);
      }
    });

    // Validate object-room relationships
    objects.forEach(obj => {
      if (!roomIds.has(obj.roomId)) {
        validationErrors.push(`Object ${obj.id} references non-existent room ${obj.roomId}`);
      }
    });

    // Check for rooms without walls
    const roomsWithWalls = new Set();
    walls.forEach(wall => {
      if (wall.roomIds) {
        wall.roomIds.forEach(roomId => roomsWithWalls.add(roomId));
      }
    });
    
    rooms.forEach(room => {
      if (!roomsWithWalls.has(room.id)) {
        warnings.push(`Room ${room.name} (${room.id}) has no associated walls`);
      }
    });

    return {
      isValid: validationErrors.length === 0,
      errors: validationErrors,
      warnings,
      summary: {
        totalRooms: rooms.length,
        totalWalls: walls.length,
        totalDoors: doorsAndWindows.filter(item => item.type === 'door').length,
        totalWindows: doorsAndWindows.filter(item => item.type === 'window').length,
        totalObjects: objects.length,
      },
    };
  },
});

// ============================================
// EXPORT ALL TOOLS
// ============================================

export const floorPlanTools = {
  createRoomsTool,
  createWallsTool,
  createDoorsWindowsTool,
  createObjectsTool,
  validateFloorPlanTool,
};
