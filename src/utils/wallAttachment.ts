import { Item, WallItem, PlacedEntity, PlacedItem } from '@/app/plans/[planId]/types';

interface AttachmentPoint {
  x: number;
  y: number;
}

interface AttachmentLine {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/**
 * Calculate the attachment point/line for a door or window based on its transformations
 */
export function getAttachmentGeometry(item: Item, x: number, y: number): AttachmentPoint | AttachmentLine {
  const { width, height, rotation, inverted, subtype, scale } = item;
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  
  // Convert rotation to radians
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  if (subtype === 'door') {
    // For doors, calculate the hinge line based on rotation and inversion
    let hingeStartX, hingeStartY, hingeEndX, hingeEndY;
    
    // Base hinge line (left edge of door when not rotated/inverted)
    if (!inverted) {
      hingeStartX = -scaledWidth / 2;
      hingeStartY = -scaledHeight / 2;
      hingeEndX = -scaledWidth / 2;
      hingeEndY = scaledHeight / 2;
    } else {
      // Inverted: hinge is on right edge
      hingeStartX = scaledWidth / 2;
      hingeStartY = -scaledHeight / 2;
      hingeEndX = scaledWidth / 2;
      hingeEndY = scaledHeight / 2;
    }
    
    // Apply rotation
    const rotatedStartX = hingeStartX * cos - hingeStartY * sin;
    const rotatedStartY = hingeStartX * sin + hingeStartY * cos;
    const rotatedEndX = hingeEndX * cos - hingeEndY * sin;
    const rotatedEndY = hingeEndX * sin + hingeEndY * cos;
    
    return {
      startX: x + rotatedStartX,
      startY: y + rotatedStartY,
      endX: x + rotatedEndX,
      endY: y + rotatedEndY
    };
  } else if (subtype === 'window') {
    // For windows, calculate the center line based on rotation
    let centerStartX, centerStartY, centerEndX, centerEndY;
    
    // Determine which axis the window spans based on rotation
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    const isVertical = (normalizedRotation >= 45 && normalizedRotation < 135) || 
                      (normalizedRotation >= 225 && normalizedRotation < 315);
    
    if (isVertical) {
      // Window spans vertically
      centerStartX = 0;
      centerStartY = -scaledHeight / 2;
      centerEndX = 0;
      centerEndY = scaledHeight / 2;
    } else {
      // Window spans horizontally
      centerStartX = -scaledWidth / 2;
      centerStartY = 0;
      centerEndX = scaledWidth / 2;
      centerEndY = 0;
    }
    
    // Apply rotation
    const rotatedStartX = centerStartX * cos - centerStartY * sin;
    const rotatedStartY = centerStartX * sin + centerStartY * cos;
    const rotatedEndX = centerEndX * cos - centerEndY * sin;
    const rotatedEndY = centerEndX * sin + centerEndY * cos;
    
    return {
      startX: x + rotatedStartX,
      startY: y + rotatedStartY,
      endX: x + rotatedEndX,
      endY: y + rotatedEndY
    };
  }
  
  // Fallback for non-door/window items
  return { x, y };
}

/**
 * Check if a line intersects with any wall
 */
export function checkWallIntersection(
  attachmentLine: AttachmentLine,
  walls: WallItem[],
  tolerance: number = 8
): WallItem | null {
  const { startX, startY, endX, endY } = attachmentLine;
  
  for (const wall of walls) {
    // Check if the attachment line intersects with this wall
    if (lineIntersectsWall(startX, startY, endX, endY, wall, tolerance)) {
      return wall;
    }
  }
  
  return null;
}

/**
 * Check if a point is near any wall
 */
export function checkPointNearWall(
  point: AttachmentPoint,
  walls: WallItem[],
  tolerance: number = 8
): WallItem | null {
  for (const wall of walls) {
    const distance = distanceToWallLine(point.x, point.y, wall);
    if (distance <= tolerance) {
      return wall;
    }
  }
  
  return null;
}

/**
 * Check if an item can be placed at the given position (for doors/windows)
 */
export function canPlaceOnWall(
  item: Item,
  x: number,
  y: number,
  placedEntities: PlacedEntity[],
  tolerance: number = 8
): boolean {
  if (!item.subtype || (item.subtype !== 'door' && item.subtype !== 'window')) {
    return true; // Non-wall items can be placed anywhere
  }
  
  // Get all walls
  const walls = placedEntities.filter((entity): entity is WallItem => entity.type === 'wall');
  
  if (walls.length === 0) {
    return false; // Can't place doors/windows without walls
  }
  
  const attachment = getAttachmentGeometry(item, x, y);
  
  if ('startX' in attachment) {
    // Line attachment (doors and windows)
    return checkWallIntersection(attachment, walls, tolerance) !== null;
  } else {
    // Point attachment (fallback)
    return checkPointNearWall(attachment, walls, tolerance) !== null;
  }
}

export function findAttachedWallId(
  item: PlacedItem,
  placedEntities: PlacedEntity[],
  tolerance: number = 8
): string | null {
  if (!item.subtype || (item.subtype !== 'door' && item.subtype !== 'window')) {
    return null;
  }

  const walls = placedEntities.filter((entity): entity is WallItem => entity.type === 'wall');
  if (walls.length === 0) return null;

  const attachment = getAttachmentGeometry(item, item.x, item.y);

  if ('startX' in attachment) {
    const wall = checkWallIntersection(attachment, walls, tolerance);
    return wall ? wall.id : null;
  }

  const wall = checkPointNearWall(attachment, walls, tolerance);
  return wall ? wall.id : null;
}

/**
 * Calculate distance from point to wall line
 */
function distanceToWallLine(x: number, y: number, wall: WallItem): number {
  const { startX, startY, endX, endY } = wall;
  
  const wallLength = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
  if (wallLength === 0) return Math.sqrt((x - startX) ** 2 + (y - startY) ** 2);
  
  const t = Math.max(0, Math.min(1, 
    ((x - startX) * (endX - startX) + (y - startY) * (endY - startY)) / (wallLength ** 2)
  ));
  
  const closestX = startX + t * (endX - startX);
  const closestY = startY + t * (endY - startY);
  
  return Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2);
}

/**
 * Check if a line segment intersects with a wall within tolerance
 */
function lineIntersectsWall(
  lineStartX: number,
  lineStartY: number,
  lineEndX: number,
  lineEndY: number,
  wall: WallItem,
  tolerance: number
): boolean {
  // Check if any point along the line is within tolerance of the wall
  const steps = 10; // Number of points to check along the line
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const pointX = lineStartX + t * (lineEndX - lineStartX);
    const pointY = lineStartY + t * (lineEndY - lineStartY);
    
    const distance = distanceToWallLine(pointX, pointY, wall);
    if (distance <= tolerance) {
      return true;
    }
  }
  
  return false;
}
