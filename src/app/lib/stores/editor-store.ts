import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import {
  EditorState,
  EditorTool,
  Wall,
  Room,
  EditorObject,
  Snapshot,
  Point,
  AgentCommand,
} from "../types";
import { snapPoint, isPointInPolygon, getBoundingBox } from "../geometry";

interface EditorActions {
  // Tool management
  setTool: (tool: EditorTool) => void;
  
  // Viewport management
  setZoom: (zoom: number) => void;
  setPan: (pan: Point) => void;
  setGridSize: (size: number) => void;
  toggleSnapToGrid: () => void;
  
  // Wall operations
  addWall: (start: Point, end: Point, thickness?: number) => void;
  updateWall: (id: string, updates: Partial<Wall>) => void;
  deleteWall: (id: string) => void;
  
  // Room operations
  addRoom: (points: Point[], label?: string) => void;
  updateRoom: (id: string, updates: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
  
  // Object operations
  addObject: (object: Omit<EditorObject, "id" | "created_at" | "updated_at">) => void;
  updateObject: (id: string, updates: Partial<EditorObject>) => void;
  deleteObject: (id: string) => void;
  
  // Selection management
  setSelection: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  clearSelection: () => void;
  
  // History management
  undo: () => void;
  redo: () => void;
  saveSnapshot: () => void;
  
  // Agent commands
  applyAgentCommand: (command: AgentCommand) => void;
  applyAgentCommands: (commands: AgentCommand[]) => void;
  
  // Serialization
  serialize: () => Snapshot;
  deserialize: (snapshot: Snapshot) => void;
  
  // Utility
  updateObjectRoomAssignments: () => void;
  getSelectedEntities: () => { walls: Wall[]; rooms: Room[]; objects: EditorObject[] };
}

type EditorStore = EditorState & EditorActions;

export const useEditorStore = create<EditorStore>((set, get) => ({
  // Initial state
  tool: "select",
  zoom: 1,
  pan: { x: 0, y: 0 },
  grid_size: 16,
  snap_to_grid: true,
  walls: {},
  rooms: {},
  objects: {},
  selected_ids: [],
  history: [],
  history_index: -1,

  // Tool management
  setTool: (tool) => set({ tool }),

  // Viewport management
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
  setPan: (pan) => set({ pan }),
  setGridSize: (grid_size) => set({ grid_size }),
  toggleSnapToGrid: () => set((state) => ({ snap_to_grid: !state.snap_to_grid })),

  // Wall operations
  addWall: (start, end, thickness = 8) => {
    const state = get();
    const id = uuidv4();
    const now = new Date();
    
    const processedStart = state.snap_to_grid ? snapPoint(start, state.grid_size) : start;
    const processedEnd = state.snap_to_grid ? snapPoint(end, state.grid_size) : end;
    
    const wall: Wall = {
      id,
      start: processedStart,
      end: processedEnd,
      thickness,
      height: 240,
      material: "drywall",
      created_at: now,
      updated_at: now,
    };

    set((state) => ({
      walls: { ...state.walls, [id]: wall },
      selected_ids: [id],
    }));
    
    get().saveSnapshot();
  },

  updateWall: (id, updates) => {
    const state = get();
    const wall = state.walls[id];
    if (!wall) return;

    const updatedWall = {
      ...wall,
      ...updates,
      updated_at: new Date(),
    };

    if (updates.start && state.snap_to_grid) {
      updatedWall.start = snapPoint(updates.start, state.grid_size);
    }
    if (updates.end && state.snap_to_grid) {
      updatedWall.end = snapPoint(updates.end, state.grid_size);
    }

    set((state) => ({
      walls: { ...state.walls, [id]: updatedWall },
    }));
  },

  deleteWall: (id) => {
    set((state) => {
      const { [id]: deleted, ...walls } = state.walls;
      return {
        walls,
        selected_ids: state.selected_ids.filter((sid) => sid !== id),
      };
    });
    get().saveSnapshot();
  },

  // Room operations
  addRoom: (points, label = "Room") => {
    const state = get();
    const id = uuidv4();
    const now = new Date();
    
    const processedPoints = state.snap_to_grid 
      ? points.map(p => snapPoint(p, state.grid_size))
      : points;
    
    const room: Room = {
      id,
      points: processedPoints,
      label,
      floor_material: "hardwood",
      color: "#4F7BD7",
      created_at: now,
      updated_at: now,
    };

    set((state) => ({
      rooms: { ...state.rooms, [id]: room },
      selected_ids: [id],
    }));
    
    get().updateObjectRoomAssignments();
    get().saveSnapshot();
  },

  updateRoom: (id, updates) => {
    const state = get();
    const room = state.rooms[id];
    if (!room) return;

    const updatedRoom = {
      ...room,
      ...updates,
      updated_at: new Date(),
    };

    if (updates.points && state.snap_to_grid) {
      updatedRoom.points = updates.points.map(p => snapPoint(p, state.grid_size));
    }

    set((state) => ({
      rooms: { ...state.rooms, [id]: updatedRoom },
    }));
    
    get().updateObjectRoomAssignments();
  },

  deleteRoom: (id) => {
    set((state) => {
      const { [id]: deleted, ...rooms } = state.rooms;
      // Clear room_id from objects that were in this room
      const objects = Object.fromEntries(
        Object.entries(state.objects).map(([objId, obj]) => [
          objId,
          obj.room_id === id ? { ...obj, room_id: undefined } : obj,
        ])
      );
      return {
        rooms,
        objects,
        selected_ids: state.selected_ids.filter((sid) => sid !== id),
      };
    });
    get().saveSnapshot();
  },

  // Object operations
  addObject: (objectData) => {
    const state = get();
    const id = uuidv4();
    const now = new Date();
    
    const processedPosition = state.snap_to_grid 
      ? snapPoint(objectData.position, state.grid_size)
      : objectData.position;
    
    const object: EditorObject = {
      ...objectData,
      id,
      position: processedPosition,
      created_at: now,
      updated_at: now,
    };

    set((state) => ({
      objects: { ...state.objects, [id]: object },
      selected_ids: [id],
    }));
    
    get().updateObjectRoomAssignments();
    get().saveSnapshot();
  },

  updateObject: (id, updates) => {
    const state = get();
    const object = state.objects[id];
    if (!object) return;

    const updatedObject = {
      ...object,
      ...updates,
      updated_at: new Date(),
    };

    if (updates.position && state.snap_to_grid) {
      updatedObject.position = snapPoint(updates.position, state.grid_size);
    }

    set((state) => ({
      objects: { ...state.objects, [id]: updatedObject },
    }));
    
    get().updateObjectRoomAssignments();
  },

  deleteObject: (id) => {
    set((state) => {
      const { [id]: deleted, ...objects } = state.objects;
      return {
        objects,
        selected_ids: state.selected_ids.filter((sid) => sid !== id),
      };
    });
    get().saveSnapshot();
  },

  // Selection management
  setSelection: (ids) => set({ selected_ids: ids }),
  addToSelection: (id) => set((state) => ({
    selected_ids: state.selected_ids.includes(id) 
      ? state.selected_ids 
      : [...state.selected_ids, id],
  })),
  removeFromSelection: (id) => set((state) => ({
    selected_ids: state.selected_ids.filter((sid) => sid !== id),
  })),
  clearSelection: () => set({ selected_ids: [] }),

  // History management
  saveSnapshot: () => {
    const state = get();
    const snapshot: Snapshot = {
      walls: Object.values(state.walls),
      rooms: Object.values(state.rooms),
      objects: Object.values(state.objects),
      viewport: {
        x: state.pan.x,
        y: state.pan.y,
        scale: state.zoom,
      },
      grid_size: state.grid_size,
      created_at: new Date(),
    };

    // Trim history if we're not at the end
    const newHistory = state.history.slice(0, state.history_index + 1);
    newHistory.push(snapshot);
    
    // Keep only the last 50 snapshots
    const trimmedHistory = newHistory.slice(-50);

    set({
      history: trimmedHistory,
      history_index: trimmedHistory.length - 1,
    });
  },

  undo: () => {
    const state = get();
    if (state.history_index > 0) {
      const snapshot = state.history[state.history_index - 1];
      get().deserialize(snapshot);
      set({ history_index: state.history_index - 1 });
    }
  },

  redo: () => {
    const state = get();
    if (state.history_index < state.history.length - 1) {
      const snapshot = state.history[state.history_index + 1];
      get().deserialize(snapshot);
      set({ history_index: state.history_index + 1 });
    }
  },

  // Agent commands
  applyAgentCommand: (command) => {
    const { type, payload } = command;
    
    switch (type) {
      case "ADD_WALL":
        get().addWall(payload.start, payload.end, payload.thickness);
        break;
      case "UPDATE_WALL":
        get().updateWall(payload.id, payload);
        break;
      case "DELETE_WALL":
        get().deleteWall(payload.id);
        break;
      case "ADD_ROOM":
        get().addRoom(payload.points, payload.label);
        break;
      case "UPDATE_ROOM":
        get().updateRoom(payload.id, payload);
        break;
      case "DELETE_ROOM":
        get().deleteRoom(payload.id);
        break;
      case "ADD_OBJECT":
        get().addObject(payload);
        break;
      case "UPDATE_OBJECT":
        get().updateObject(payload.id, payload);
        break;
      case "DELETE_OBJECT":
        get().deleteObject(payload.id);
        break;
      case "UNDO":
        get().undo();
        break;
      case "REDO":
        get().redo();
        break;
      case "SNAP_TO_GRID":
        set({ snap_to_grid: payload.enabled });
        break;
    }
  },

  applyAgentCommands: (commands) => {
    commands.forEach((command) => get().applyAgentCommand(command));
  },

  // Serialization
  serialize: () => {
    const state = get();
    return {
      walls: Object.values(state.walls),
      rooms: Object.values(state.rooms),
      objects: Object.values(state.objects),
      viewport: {
        x: state.pan.x,
        y: state.pan.y,
        scale: state.zoom,
      },
      grid_size: state.grid_size,
      created_at: new Date(),
    };
  },

  deserialize: (snapshot) => {
    const walls = Object.fromEntries(snapshot.walls.map((w) => [w.id, w]));
    const rooms = Object.fromEntries(snapshot.rooms.map((r) => [r.id, r]));
    const objects = Object.fromEntries(snapshot.objects.map((o) => [o.id, o]));

    set({
      walls,
      rooms,
      objects,
      pan: { x: snapshot.viewport.x, y: snapshot.viewport.y },
      zoom: snapshot.viewport.scale,
      grid_size: snapshot.grid_size,
      selected_ids: [],
    });
  },

  // Utility functions
  updateObjectRoomAssignments: () => {
    const state = get();
    const updatedObjects: Record<string, EditorObject> = {};
    
    Object.entries(state.objects).forEach(([id, object]) => {
      const objBounds = getBoundingBox([
        object.position,
        {
          x: object.position.x + object.size.width,
          y: object.position.y + object.size.height,
        },
      ]);
      
      const objCenter = {
        x: objBounds.x + objBounds.width / 2,
        y: objBounds.y + objBounds.height / 2,
      };
      
      let assignedRoomId: string | undefined;
      
      // Check which room contains the object's center
      for (const room of Object.values(state.rooms)) {
        if (isPointInPolygon(objCenter, room.points)) {
          assignedRoomId = room.id;
          break;
        }
      }
      
      updatedObjects[id] = {
        ...object,
        room_id: assignedRoomId,
      };
    });
    
    set({ objects: updatedObjects });
  },

  getSelectedEntities: () => {
    const state = get();
    const walls = state.selected_ids
      .map((id) => state.walls[id])
      .filter(Boolean);
    const rooms = state.selected_ids
      .map((id) => state.rooms[id])
      .filter(Boolean);
    const objects = state.selected_ids
      .map((id) => state.objects[id])
      .filter(Boolean);
    
    return { walls, rooms, objects };
  },
}));
