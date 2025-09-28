import { z } from "zod";

// Basic geometric types
export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const SizeSchema = z.object({
  width: z.number(),
  height: z.number(),
});

// Wall schema
export const WallSchema = z.object({
  id: z.string(),
  start: PointSchema,
  end: PointSchema,
  thickness: z.number().default(8),
  height: z.number().default(240),
  material: z.string().default("drywall"),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date()),
});

// Room schema
export const RoomSchema = z.object({
  id: z.string(),
  points: z.array(PointSchema),
  label: z.string().default("Room"),
  floor_material: z.string().default("hardwood"),
  color: z.string().default("#4F7BD7"),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date()),
});

// Object schema (furniture, fixtures, etc.)
export const ObjectSchema = z.object({
  id: z.string(),
  type: z.enum(["furniture", "fixture", "appliance", "door", "window"]),
  position: PointSchema,
  size: SizeSchema,
  rotation: z.number().default(0),
  label: z.string(),
  room_id: z.string().optional(),
  properties: z.record(z.any()).default({}),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date()),
});

// Canvas snapshot schema
export const SnapshotSchema = z.object({
  walls: z.array(WallSchema),
  rooms: z.array(RoomSchema),
  objects: z.array(ObjectSchema),
  viewport: z.object({
    x: z.number(),
    y: z.number(),
    scale: z.number(),
  }),
  grid_size: z.number().default(16),
  created_at: z.date().default(() => new Date()),
});

// Agent command schemas
export const AgentCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ADD_WALL"),
    payload: z.object({
      start: PointSchema,
      end: PointSchema,
      thickness: z.number().optional(),
    }),
  }),
  z.object({
    type: z.literal("UPDATE_WALL"),
    payload: z.object({
      id: z.string(),
      start: PointSchema.optional(),
      end: PointSchema.optional(),
      thickness: z.number().optional(),
    }),
  }),
  z.object({
    type: z.literal("DELETE_WALL"),
    payload: z.object({
      id: z.string(),
    }),
  }),
  z.object({
    type: z.literal("ADD_ROOM"),
    payload: z.object({
      points: z.array(PointSchema),
      label: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("UPDATE_ROOM"),
    payload: z.object({
      id: z.string(),
      points: z.array(PointSchema).optional(),
      label: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("DELETE_ROOM"),
    payload: z.object({
      id: z.string(),
    }),
  }),
  z.object({
    type: z.literal("ADD_OBJECT"),
    payload: z.object({
      type: ObjectSchema.shape.type,
      position: PointSchema,
      size: SizeSchema,
      label: z.string(),
    }),
  }),
  z.object({
    type: z.literal("UPDATE_OBJECT"),
    payload: z.object({
      id: z.string(),
      position: PointSchema.optional(),
      size: SizeSchema.optional(),
      rotation: z.number().optional(),
      label: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("DELETE_OBJECT"),
    payload: z.object({
      id: z.string(),
    }),
  }),
  z.object({
    type: z.literal("UNDO"),
    payload: z.object({}),
  }),
  z.object({
    type: z.literal("REDO"),
    payload: z.object({}),
  }),
  z.object({
    type: z.literal("SNAP_TO_GRID"),
    payload: z.object({
      enabled: z.boolean(),
    }),
  }),
]);

// Plan schemas for database
export const PlanSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  title: z.string().min(1).max(100),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  is_archived: z.boolean().default(false),
});

export const PlanMemberSchema = z.object({
  id: z.string().uuid(),
  plan_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(["admin", "editor", "viewer"]),
  created_at: z.string().datetime(),
});

export const PlanRevisionSchema = z.object({
  id: z.string().uuid(),
  plan_id: z.string().uuid(),
  user_id: z.string().uuid(),
  snapshot: SnapshotSchema,
  created_at: z.string().datetime(),
});

export const ShareLinkSchema = z.object({
  id: z.string().uuid(),
  plan_id: z.string().uuid(),
  token: z.string(),
  can_edit: z.boolean(),
  created_by: z.string().uuid(),
  expires_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
});

// Type exports
export type Point = z.infer<typeof PointSchema>;
export type Size = z.infer<typeof SizeSchema>;
export type Wall = z.infer<typeof WallSchema>;
export type Room = z.infer<typeof RoomSchema>;
export type EditorObject = z.infer<typeof ObjectSchema>;
export type Snapshot = z.infer<typeof SnapshotSchema>;
export type AgentCommand = z.infer<typeof AgentCommandSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type PlanMember = z.infer<typeof PlanMemberSchema>;
export type PlanRevision = z.infer<typeof PlanRevisionSchema>;
export type ShareLink = z.infer<typeof ShareLinkSchema>;

// Editor tool types
export type EditorTool = "select" | "move" | "wall" | "room" | "object" | "text" | "eraser";

// Editor state type
export interface EditorState {
  tool: EditorTool;
  zoom: number;
  pan: Point;
  grid_size: number;
  snap_to_grid: boolean;
  walls: Record<string, Wall>;
  rooms: Record<string, Room>;
  objects: Record<string, EditorObject>;
  selected_ids: string[];
  history: Snapshot[];
  history_index: number;
}