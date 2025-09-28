import { PlacedItem, PlacedEntity, WallItem } from '@/app/plans/[planId]/types';

export class CollisionManager {
  private static readonly COLLISION_TOLERANCE = 15;

  static checkItemCollisions(
    item: PlacedItem,
    existingEntities: PlacedEntity[],
    excludeIds: string[] = []
  ): boolean {
    const itemBounds = this.getItemBounds(item);
    
    for (const entity of existingEntities) {
      if (excludeIds.includes(entity.id)) continue;
      
      if (entity.type === 'wall') {
        const wall = entity as WallItem;
        if (this.shouldAllowWallInteraction(item, wall)) continue;
      } else {
        const otherItem = entity as PlacedItem;
        const otherBounds = this.getItemBounds(otherItem);
        
        if (this.boundsOverlap(itemBounds, otherBounds)) {
          return true;
        }
      }
    }
    
    return false;
  }

  static checkMultipleItemCollisions(
    items: PlacedItem[],
    existingEntities: PlacedEntity[]
  ): boolean {
    const itemIds = items.map(item => item.id);
    
    for (const item of items) {
      if (this.checkItemCollisions(item, existingEntities, itemIds)) {
        return true;
      }
    }
    
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const bounds1 = this.getItemBounds(items[i]);
        const bounds2 = this.getItemBounds(items[j]);
        
        if (this.boundsOverlap(bounds1, bounds2)) {
          return true;
        }
      }
    }
    
    return false;
  }

  private static getItemBounds(item: PlacedItem) {
    const width = item.width * item.scale;
    const height = item.height * item.scale;
    
    const tolerance = this.COLLISION_TOLERANCE;
    
    return {
      left: item.x - width / 2 + tolerance,
      right: item.x + width / 2 - tolerance,
      top: item.y - height / 2 + tolerance,
      bottom: item.y + height / 2 - tolerance
    };
  }

  private static boundsOverlap(bounds1: any, bounds2: any): boolean {
    return !(
      bounds1.right < bounds2.left ||
      bounds1.left > bounds2.right ||
      bounds1.bottom < bounds2.top ||
      bounds1.top > bounds2.bottom
    );
  }

  private static shouldAllowWallInteraction(item: PlacedItem, wall: WallItem): boolean {
    return item.subtype === 'door' || item.subtype === 'window';
  }

  static validateItemPlacement(
    item: PlacedItem,
    existingEntities: PlacedEntity[]
  ): { valid: boolean; reason?: string } {
    if (this.checkItemCollisions(item, existingEntities)) {
      return { valid: false, reason: 'Item overlaps with existing objects' };
    }
    
    return { valid: true };
  }

  static validateMultipleItemPlacement(
    items: PlacedItem[],
    existingEntities: PlacedEntity[]
  ): { valid: boolean; reason?: string } {
    if (this.checkMultipleItemCollisions(items, existingEntities)) {
      return { valid: false, reason: 'Items overlap with existing objects or each other' };
    }
    
    return { valid: true };
  }

  static checkWallCollisions(
    wall: WallItem,
    existingEntities: PlacedEntity[],
    excludeIds: string[] = []
  ): boolean {
    for (const entity of existingEntities) {
      if (excludeIds.includes(entity.id)) continue;
      
      if (entity.type === 'wall') {
        // Check wall-to-wall collision (line intersection)
        const otherWall = entity as WallItem;
        if (this.checkWallWallCollision(wall, otherWall)) {
          return true;
        }
      } else {
        const item = entity as PlacedItem;
        // Check wall-to-item collision
        if (this.checkWallItemCollision(wall, item)) {
          return true;
        }
      }
    }
    return false;
  }

  private static checkWallWallCollision(wall1: WallItem, wall2: WallItem): boolean {
    // Simple line intersection check
    const x1 = wall1.startX, y1 = wall1.startY, x2 = wall1.endX, y2 = wall1.endY;
    const x3 = wall2.startX, y3 = wall2.startY, x4 = wall2.endX, y4 = wall2.endY;
    
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return false; // Parallel lines
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  private static checkWallItemCollision(wall: WallItem, item: PlacedItem): boolean {
    // Check if item bounds intersect with wall line
    // Use original bounds without tolerance since we'll apply tolerance in distance calculation
    const width = item.width * item.scale;
    const height = item.height * item.scale;
    
    const itemBounds = {
      left: item.x - width / 2,
      right: item.x + width / 2,
      top: item.y - height / 2,
      bottom: item.y + height / 2
    };
    
    // Check if any corner of the item bounds intersects with the wall line
    const corners = [
      { x: itemBounds.left, y: itemBounds.top },
      { x: itemBounds.right, y: itemBounds.top },
      { x: itemBounds.right, y: itemBounds.bottom },
      { x: itemBounds.left, y: itemBounds.bottom }
    ];
    
    for (const corner of corners) {
      const distance = this.distanceToLineSegment(
        corner.x, corner.y,
        wall.startX, wall.startY,
        wall.endX, wall.endY
      );
      // Apply tolerance here - only collide if distance is less than wall thickness/2 minus tolerance
      if (distance <= wall.thickness / 2 - this.COLLISION_TOLERANCE) {
        return true;
      }
    }
    
    return false;
  }

  private static distanceToLineSegment(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      return Math.sqrt(A * A + B * B);
    }
    
    let param = dot / lenSq;
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
