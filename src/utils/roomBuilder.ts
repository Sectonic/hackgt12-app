import { DEFAULT_ROOM_FLOORING, RoomDefinition, RoomWallReference, WallItem } from '@/app/plans/[planId]/types';

export interface RoomNodeRef {
  id: string;
  x: number;
  y: number;
}

export interface RoomBuilderState {
  nodeOrder: RoomNodeRef[];
  wallSequence: RoomWallReference[];
  isClosed: boolean;
}

const NODE_PRECISION = 3;
const WALL_SELECTION_TOLERANCE = 12;
const POINT_TOLERANCE = 0.5;

export const ROOM_WALL_TOLERANCE = WALL_SELECTION_TOLERANCE;

export function createEmptyRoomBuilderState(): RoomBuilderState {
  return {
    nodeOrder: [],
    wallSequence: [],
    isClosed: false
  };
}

function formatNodeId(x: number, y: number): string {
  return `${x.toFixed(NODE_PRECISION)}:${y.toFixed(NODE_PRECISION)}`;
}

function pointsRoughlyEqual(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.abs(a.x - b.x) <= POINT_TOLERANCE && Math.abs(a.y - b.y) <= POINT_TOLERANCE;
}

function nodesEqual(a: RoomNodeRef | undefined, b: RoomNodeRef | undefined): boolean {
  if (!a || !b) return false;
  return a.id === b.id;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function makeNodeRef(x: number, y: number): RoomNodeRef {
  return {
    id: formatNodeId(x, y),
    x,
    y
  };
}

interface WallSelectionCandidateInternal {
  wall: WallItem;
  distance: number;
  primaryEndpoint: 'start' | 'end';
}

export interface WallSelectionCandidate {
  wall: WallItem;
  primaryEndpoint: 'start' | 'end';
}

function distanceToSegment(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number }
): number {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (lengthSquared === 0) {
    return distance(point, start);
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSquared)
  );

  const projection = {
    x: start.x + t * segmentX,
    y: start.y + t * segmentY
  };

  return distance(point, projection);
}

export function findClosestWall(
  walls: WallItem[],
  x: number,
  y: number,
  tolerance = WALL_SELECTION_TOLERANCE
): WallSelectionCandidate | null {
  const target = { x, y };
  let closest: WallSelectionCandidateInternal | null = null;

  walls.forEach((wall) => {
    const start = { x: wall.startX, y: wall.startY };
    const end = { x: wall.endX, y: wall.endY };
    const segmentDistance = distanceToSegment(target, start, end);

    if (segmentDistance <= tolerance) {
      const startDistance = distance(target, start);
      const endDistance = distance(target, end);
      const primaryEndpoint = startDistance <= endDistance ? 'start' : 'end';

      if (!closest || segmentDistance < closest.distance) {
        closest = {
          wall,
          distance: segmentDistance,
          primaryEndpoint
        };
      }
    }
  });

  if (!closest) {
    return null;
  }

  return {
    wall: (closest as WallSelectionCandidateInternal).wall,
    primaryEndpoint: (closest as WallSelectionCandidateInternal).primaryEndpoint
  };
}

export function initializeBuilderFromRoom(
  room: RoomDefinition,
  walls: WallItem[]
): RoomBuilderState {
  if (!room || room.walls.length === 0) {
    return createEmptyRoomBuilderState();
  }

  const nodeOrder: RoomNodeRef[] = [];
  const wallSequence: RoomWallReference[] = [];

  room.walls.forEach((reference, index) => {
    const wall = walls.find((w) => w.id === reference.wallId);
    if (!wall) return;

    const direction = reference.direction === 'reverse' ? 'reverse' : 'forward';
    const start = direction === 'forward'
      ? { x: wall.startX, y: wall.startY }
      : { x: wall.endX, y: wall.endY };
    const end = direction === 'forward'
      ? { x: wall.endX, y: wall.endY }
      : { x: wall.startX, y: wall.startY };

    if (index === 0) {
      nodeOrder.push(makeNodeRef(start.x, start.y));
    }

    nodeOrder.push(makeNodeRef(end.x, end.y));
    wallSequence.push({ wallId: wall.id, direction: reference.direction });
  });

  const isClosed = nodeOrder.length > 2 && nodesEqual(nodeOrder[0], nodeOrder[nodeOrder.length - 1]);

  return {
    nodeOrder,
    wallSequence,
    isClosed
  };
}

function buildStateFromSequence(
  sequence: RoomWallReference[],
  walls: WallItem[]
): RoomBuilderState {
  if (sequence.length === 0) {
    return createEmptyRoomBuilderState();
  }

  const nodeOrder: RoomNodeRef[] = [];

  sequence.forEach((reference, index) => {
    const wall = walls.find((candidate) => candidate.id === reference.wallId);
    if (!wall) return;

    const direction = reference.direction === 'reverse' ? 'reverse' : 'forward';
    const start = direction === 'forward'
      ? { x: wall.startX, y: wall.startY }
      : { x: wall.endX, y: wall.endY };
    const end = direction === 'forward'
      ? { x: wall.endX, y: wall.endY }
      : { x: wall.startX, y: wall.startY };

    const startNode = makeNodeRef(start.x, start.y);
    const endNode = makeNodeRef(end.x, end.y);

    if (index === 0) {
      nodeOrder.push(startNode);
    } else {
      const last = nodeOrder[nodeOrder.length - 1];
      if (!nodesEqual(last, startNode)) {
        nodeOrder.push(startNode);
      }
    }

    nodeOrder.push(endNode);
  });

  const isClosed = nodeOrder.length > 2 && nodesEqual(nodeOrder[0], nodeOrder[nodeOrder.length - 1]);

  return {
    nodeOrder,
    wallSequence: sequence,
    isClosed
  };
}

export function handleWallSelection(
  currentState: RoomBuilderState,
  candidate: WallSelectionCandidate,
  walls: WallItem[]
): RoomBuilderState {
  const { wall, primaryEndpoint } = candidate;
  const existingIndex = currentState.wallSequence.findIndex((reference) => reference.wallId === wall.id);

  if (currentState.isClosed) {
    if (existingIndex !== -1) {
      const trimmedSequence = currentState.wallSequence.slice(0, existingIndex);
      return buildStateFromSequence(trimmedSequence, walls);
    }

    const direction = primaryEndpoint === 'start' ? undefined : 'reverse';
    return buildStateFromSequence([{ wallId: wall.id, direction }], walls);
  }

  if (currentState.wallSequence.length === 0) {
    const direction = primaryEndpoint === 'start' ? undefined : 'reverse';
    return buildStateFromSequence([{ wallId: wall.id, direction }], walls);
  }

  if (existingIndex !== -1) {
    const trimmedSequence = existingIndex === currentState.wallSequence.length - 1
      ? currentState.wallSequence.slice(0, -1)
      : currentState.wallSequence.slice(0, existingIndex);
    return buildStateFromSequence(trimmedSequence, walls);
  }

  const firstNode = currentState.nodeOrder[0];
  const lastNode = currentState.nodeOrder[currentState.nodeOrder.length - 1];
  const startNode = makeNodeRef(wall.startX, wall.startY);
  const endNode = makeNodeRef(wall.endX, wall.endY);

  let nextSequence: RoomWallReference[] | null = null;

  if (pointsRoughlyEqual(startNode, lastNode)) {
    nextSequence = [
      ...currentState.wallSequence,
      { wallId: wall.id }
    ];
  } else if (pointsRoughlyEqual(endNode, lastNode)) {
    nextSequence = [
      ...currentState.wallSequence,
      { wallId: wall.id, direction: 'reverse' }
    ];
  } else if (pointsRoughlyEqual(startNode, firstNode)) {
    nextSequence = [
      { wallId: wall.id, direction: 'reverse' },
      ...currentState.wallSequence
    ];
  } else if (pointsRoughlyEqual(endNode, firstNode)) {
    nextSequence = [
      { wallId: wall.id },
      ...currentState.wallSequence
    ];
  }

  if (!nextSequence) {
    return currentState;
  }

  return buildStateFromSequence(nextSequence, walls);
}

export function roomBuilderHasValidCycle(state: RoomBuilderState): boolean {
  return state.isClosed && state.wallSequence.length >= 3;
}

export function buildRoomDefinitionFromState(
  state: RoomBuilderState,
  overrides: Partial<RoomDefinition> = {}
): RoomDefinition | null {
  if (!roomBuilderHasValidCycle(state)) {
    return null;
  }

  const { id, name, color, flooring } = overrides;

  return {
    id: id ?? '',
    name: name ?? 'Room',
    flooring: flooring ?? DEFAULT_ROOM_FLOORING,
    color,
    walls: [...state.wallSequence]
  };
}

export function nodesToDisplay(state: RoomBuilderState): RoomNodeRef[] {
  if (state.nodeOrder.length === 0) {
    return [];
  }

  if (state.isClosed && state.nodeOrder.length > 1) {
    return state.nodeOrder.slice(0, -1);
  }

  return state.nodeOrder;
}

export function mergeNodeLists(nodes: RoomNodeRef[]): RoomNodeRef[] {
  const seen = new Set<string>();
  return nodes.filter((node) => {
    if (seen.has(node.id)) {
      return false;
    }
    seen.add(node.id);
    return true;
  });
}

export function collectWallNodeRefs(walls: WallItem[]): RoomNodeRef[] {
  const refs: RoomNodeRef[] = [];
  walls.forEach((wall) => {
    refs.push(makeNodeRef(wall.startX, wall.startY));
    refs.push(makeNodeRef(wall.endX, wall.endY));
  });
  return mergeNodeLists(refs);
}
