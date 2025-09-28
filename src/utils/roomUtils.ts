import {
  ComputedRoom,
  NOT_IN_ROOM_ID,
  PlacedEntity,
  PlacedItem,
  RoomBoundarySegment,
  RoomDefinition,
  WallItem
} from '@/app/plans/[planId]/types';
import { findAttachedWallId } from './wallAttachment';

interface PolygonCache {
  id: string;
  points: number[];
}

const POINT_TOLERANCE = 0.5;

function pointsRoughlyEqual(a: { x: number; y: number } | null, b: { x: number; y: number } | null): boolean {
  if (!a || !b) return false;
  return Math.abs(a.x - b.x) <= POINT_TOLERANCE && Math.abs(a.y - b.y) <= POINT_TOLERANCE;
}

function buildSegments(room: RoomDefinition, walls: WallItem[]): RoomBoundarySegment[] {
  if (room.walls.length === 0) return [];

  const segments: RoomBoundarySegment[] = [];
  let previousEnd: { x: number; y: number } | null = null;
  let firstPoint: { x: number; y: number } | null = null;

  room.walls.forEach(({ wallId, direction }) => {
    const wall = walls.find((w) => w.id === wallId);
    if (!wall) return;

    const start = direction === 'reverse'
      ? { x: wall.endX, y: wall.endY }
      : { x: wall.startX, y: wall.startY };
    const end = direction === 'reverse'
      ? { x: wall.startX, y: wall.startY }
      : { x: wall.endX, y: wall.endY };

    if (!firstPoint) {
      firstPoint = { ...start };
    }

    if (previousEnd && !pointsRoughlyEqual(previousEnd, start)) {
      segments.push({
        type: 'pseudo',
        start: { ...previousEnd },
        end: { ...start }
      });
    }

    segments.push({
      type: 'wall',
      wallId: wall.id,
      start,
      end
    });

    previousEnd = { ...end };
  });

  if (segments.length > 0 && previousEnd && firstPoint && !pointsRoughlyEqual(previousEnd, firstPoint)) {
    segments.push({
      type: 'pseudo',
      start: { ...previousEnd },
      end: { ...firstPoint }
    });
  }

  return segments;
}

function buildPolygonPoints(segments: RoomBoundarySegment[]): number[] {
  if (segments.length === 0) return [];

  const vertices: { x: number; y: number }[] = [];
  vertices.push({ ...segments[0].start });

  segments.forEach((segment) => {
    const lastVertex = vertices[vertices.length - 1];
    if (!pointsRoughlyEqual(lastVertex, segment.start)) {
      vertices.push({ ...segment.start });
    }
    vertices.push({ ...segment.end });
  });

  if (vertices.length > 1 && pointsRoughlyEqual(vertices[0], vertices[vertices.length - 1])) {
    vertices.pop();
  }

  return vertices.flatMap((point) => [point.x, point.y]);
}

function computePolygonCentroid(points: number[]): { x: number; y: number } | null {
  if (points.length < 6) return null; // fewer than 3 vertices

  let area = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < points.length; i += 2) {
    const nextIndex = (i + 2) % points.length;
    const x0 = points[i];
    const y0 = points[i + 1];
    const x1 = points[nextIndex];
    const y1 = points[nextIndex + 1];

    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }

  area *= 0.5;
  if (Math.abs(area) < 1e-6) return null;

  cx /= 6 * area;
  cy /= 6 * area;

  return { x: cx, y: cy };
}

function arraysEqual(a: string[] | undefined, b: string[] | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return (!a || a.length === 0) && (!b || b.length === 0);
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

function pointInPolygon(x: number, y: number, polygonPoints: number[]): boolean {
  let inside = false;
  const pointsCount = polygonPoints.length / 2;

  for (let i = 0, j = pointsCount - 1; i < pointsCount; j = i++) {
    const xi = polygonPoints[i * 2];
    const yi = polygonPoints[i * 2 + 1];
    const xj = polygonPoints[j * 2];
    const yj = polygonPoints[j * 2 + 1];

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

export function isPointInsideRoom(room: ComputedRoom, x: number, y: number): boolean {
  if (room.polygonPoints.length < 6) return false;
  return pointInPolygon(x, y, room.polygonPoints);
}

export function findRoomAtPoint(rooms: ComputedRoom[], x: number, y: number): ComputedRoom | undefined {
  for (const room of rooms) {
    if (isPointInsideRoom(room, x, y)) {
      return room;
    }
  }
  return undefined;
}

function randomCmykColor(): string {
  const c = Math.random() * 0.55;
  const m = Math.random() * 0.55;
  const y = Math.random() * 0.55;
  const k = Math.random() * 0.2;

  const r = Math.round(255 * (1 - c) * (1 - k));
  const g = Math.round(255 * (1 - m) * (1 - k));
  const b = Math.round(255 * (1 - y) * (1 - k));

  const toHex = (value: number) => value.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function generateRoomColor(existingRooms: RoomDefinition[]): string {
  const usedColors = new Set(existingRooms.map((room) => room.color?.toLowerCase()).filter(Boolean) as string[]);

  for (let attempt = 0; attempt < 12; attempt++) {
    const color = randomCmykColor();
    if (!usedColors.has(color.toLowerCase())) {
      return color;
    }
  }

  // Fallback palette if random selections collide repeatedly
  const fallbackPalette = ['#F97316', '#22D3EE', '#FACC15', '#F472B6', '#4ADE80', '#A78BFA'];
  for (const color of fallbackPalette) {
    if (!usedColors.has(color.toLowerCase())) {
      return color;
    }
  }

  return randomCmykColor();
}

export function generateRoomName(existingRooms: RoomDefinition[], baseName = 'Room'): string {
  const existingNames = new Set(existingRooms.map((room) => room.name));
  let index = existingRooms.length;

  while (index < existingRooms.length + 100) {
    const name = `${baseName} ${index + 1}`;
    if (!existingNames.has(name)) {
      return name;
    }
    index++;
  }

  // Fallback unique identifier if all else fails
  return `${baseName} ${Date.now()}`;
}

export function computeRooms(roomDefinitions: RoomDefinition[], entities: PlacedEntity[]): ComputedRoom[] {
  const walls = entities.filter((entity): entity is WallItem => entity.type === 'wall');

  return roomDefinitions.map((definition) => {
    const segments = buildSegments(definition, walls);
    const polygonPoints = buildPolygonPoints(segments);
    const centroid = computePolygonCentroid(polygonPoints);

    return {
      id: definition.id,
      name: definition.name,
      flooring: definition.flooring,
      color: definition.color,
      segments,
      polygonPoints,
      centroid
    };
  });
}

export function assignEntitiesToRooms(
  entities: PlacedEntity[],
  roomDefinitions: RoomDefinition[]
): PlacedEntity[] {
  const rooms = computeRooms(roomDefinitions, entities);
  const polygonRooms = rooms.filter((room) => room.polygonPoints.length >= 6);

  const walls = entities.filter((entity): entity is WallItem => entity.type === 'wall');
  const wallToRoomIds = new Map<string, string[]>();

  roomDefinitions.forEach((room) => {
    room.walls.forEach(({ wallId }) => {
      const current = wallToRoomIds.get(wallId) ?? [];
      if (!current.includes(room.id) && room.id !== NOT_IN_ROOM_ID) {
        current.push(room.id);
      }
      wallToRoomIds.set(wallId, current);
    });
  });

  const updatedEntities = entities.map((entity) => {
    if (entity.type === 'wall') {
      const wall = entity as WallItem;
      const roomIds = wallToRoomIds.get(wall.id);
      const normalizedRoomIds = roomIds && roomIds.length > 0 ? [...roomIds].sort() : undefined;
      if (arraysEqual(normalizedRoomIds, wall.roomIds)) {
        return wall;
      }
      return {
        ...wall,
        roomIds: normalizedRoomIds
      };
    }

    const item = entity as PlacedItem;
    let targetRoomId = item.roomId ?? NOT_IN_ROOM_ID;

    for (const room of polygonRooms) {
      if (pointInPolygon(item.x, item.y, room.polygonPoints)) {
        targetRoomId = room.id;
        break;
      }
    }

    if (!polygonRooms.some((room) => room.id === targetRoomId)) {
      targetRoomId = NOT_IN_ROOM_ID;
    }

    let attachedToWallId = item.attachedToWallId;
    if (item.subtype === 'door' || item.subtype === 'window') {
      const wallId = findAttachedWallId(item, entities);
      attachedToWallId = wallId ?? undefined;

      if (wallId) {
        const wallRooms = wallToRoomIds.get(wallId);
        if (wallRooms && wallRooms.length === 1) {
          targetRoomId = wallRooms[0];
        }
      }
    }

    if (targetRoomId === item.roomId && attachedToWallId === item.attachedToWallId) {
      return item;
    }

    return {
      ...item,
      roomId: targetRoomId,
      attachedToWallId
    };
  });

  return updatedEntities;
}

export function collectRoomEntityIds(
  entities: PlacedEntity[],
  roomDefinitions: RoomDefinition[]
): Record<string, string[]> {
  const initial: Record<string, string[]> = Object.fromEntries(
    roomDefinitions.map((room) => [room.id, []])
  );

  return entities.reduce((acc, entity) => {
    if (entity.type === 'wall') {
      const wallRoomIds = (entity as WallItem).roomIds ?? [];
      wallRoomIds.forEach((roomId) => {
        if (!acc[roomId]) acc[roomId] = [];
        acc[roomId].push(entity.id);
      });
      return acc;
    }

    const item = entity as PlacedItem;
    const roomId = item.roomId ?? NOT_IN_ROOM_ID;
    if (!acc[roomId]) acc[roomId] = [];
    acc[roomId].push(item.id);
    return acc;
  }, initial);
}
