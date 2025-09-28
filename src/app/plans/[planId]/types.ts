export interface Item {
  file: string;
  name: string;
  type: 'furniture' | 'foundational';
  subtype?: 'door' | 'window'; // Special wall-attached items
  width: number;
  height: number;
  inverted: boolean;
  rotation: number;
  scale: number;
}

export type WallAttachmentSubtype = 'door' | 'window';

export interface PlacedItem extends Omit<Item, 'file'> {
  id: string;
  file: string;
  x: number;
  y: number;
  roomId: string;
  attachedToWallId?: string;
}

export interface WallItem {
  id: string;
  type: 'wall';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number;
  roomIds?: string[];
}

export type PlacedEntity = PlacedItem | WallItem;


export const NOT_IN_ROOM_ID = 'room-unassigned';

export type FlooringType = 'floor_tile' | 'floor_wood' | 'floor_stone' | 'floor_carpet';

export const DEFAULT_ROOM_FLOORING: FlooringType = 'floor_wood';

export interface RoomWallReference {
  wallId: string;
  direction?: 'forward' | 'reverse';
}

export interface RoomDefinition {
  id: string;
  name: string;
  walls: RoomWallReference[];
  flooring: FlooringType;
  color?: string;
}

export type RoomBoundarySegment =
  | {
      type: 'wall';
      wallId: string;
      start: { x: number; y: number };
      end: { x: number; y: number };
    }
  | {
      type: 'pseudo';
      start: { x: number; y: number };
      end: { x: number; y: number };
    };

export interface ComputedRoom {
  id: string;
  name: string;
  flooring: FlooringType;
  color?: string;
  segments: RoomBoundarySegment[];
  polygonPoints: number[]; // flattened array [x1, y1, x2, y2, ...]
  centroid: { x: number; y: number } | null;
}


export interface GroupTransformation {
  centerX: number;
  centerY: number;
  rotation: number;
  scale: number;
}
