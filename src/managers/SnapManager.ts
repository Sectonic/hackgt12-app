import { Item, PlacedItem, WallItem, PlacedEntity } from '@/app/plans/[planId]/types';

interface SnapOptions {
  snapDistance?: number;
  scale?: number;
}

interface SnapResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
  snapLineX?: number;
  snapLineY?: number;
}

interface WallSnapTarget {
  pos: number;
  desc: string;
}

interface ItemEdge {
  pos: number;
  offset: number;
  desc: string;
}

export class SnapManager {
  private snapDistance: number;
  private scale: number;
  
  constructor(options: SnapOptions = {}) {
    this.snapDistance = options.snapDistance || 8;
    this.scale = options.scale || 1;
  }

  getSnappedPosition(
    mouseX: number,
    mouseY: number,
    currentItem: Item,
    placedEntities: PlacedEntity[]
  ): SnapResult {
    if (!currentItem || placedEntities.length === 0) {
      return { x: mouseX, y: mouseY, snappedX: false, snappedY: false };
    }

    const adjustedSnapDistance = this.snapDistance / this.scale;
    const currentWidth = currentItem.width * currentItem.scale;
    const currentHeight = currentItem.height * currentItem.scale;
    
    let snappedX = mouseX;
    let snappedY = mouseY;
    let foundSnapX = false;
    let foundSnapY = false;
    let snapLineX: number | undefined;
    let snapLineY: number | undefined;

    const currentLeft = mouseX - currentWidth / 2;
    const currentRight = mouseX + currentWidth / 2;
    const currentTop = mouseY - currentHeight / 2;
    const currentBottom = mouseY + currentHeight / 2;

    for (const entity of placedEntities) {
      if (entity.type === 'wall') {
        const result = this.snapToWall(
          entity as WallItem,
          mouseX,
          mouseY,
          currentWidth,
          currentHeight,
          adjustedSnapDistance,
          foundSnapX,
          foundSnapY
        );
        
        if (result.snappedX) {
          snappedX = result.x;
          snapLineX = result.snapLineX;
          foundSnapX = true;
        }
        
        if (result.snappedY) {
          snappedY = result.y;
          snapLineY = result.snapLineY;
          foundSnapY = true;
        }
      } else {
        const result = this.snapToItem(
          entity as PlacedItem,
          currentLeft,
          currentRight,
          currentTop,
          currentBottom,
          mouseX,
          mouseY,
          currentWidth,
          currentHeight,
          adjustedSnapDistance,
          foundSnapX,
          foundSnapY
        );
        
        if (result.snappedX) {
          snappedX = result.x;
          snapLineX = result.snapLineX;
          foundSnapX = true;
        }
        
        if (result.snappedY) {
          snappedY = result.y;
          snapLineY = result.snapLineY;
          foundSnapY = true;
        }
      }

      if (foundSnapX && foundSnapY) break;
    }

    return {
      x: snappedX,
      y: snappedY,
      snappedX: foundSnapX,
      snappedY: foundSnapY,
      snapLineX,
      snapLineY
    };
  }

  private snapToWall(
    wall: WallItem,
    mouseX: number,
    mouseY: number,
    currentWidth: number,
    currentHeight: number,
    adjustedSnapDistance: number,
    foundSnapX: boolean,
    foundSnapY: boolean
  ): { x: number; y: number; snappedX: boolean; snappedY: boolean; snapLineX?: number; snapLineY?: number } {
    const { startX, startY, endX, endY } = wall;
    let resultX = mouseX;
    let resultY = mouseY;
    let resultSnapX = false;
    let resultSnapY = false;
    let resultSnapLineX: number | undefined;
    let resultSnapLineY: number | undefined;

    if (!foundSnapX && Math.abs(mouseX - startX) < adjustedSnapDistance) {
      resultX = startX;
      resultSnapLineX = startX;
      resultSnapX = true;
    } else if (!foundSnapX && Math.abs(mouseX - endX) < adjustedSnapDistance) {
      resultX = endX;
      resultSnapLineX = endX;
      resultSnapX = true;
    }
    
    if (!foundSnapY && Math.abs(mouseY - startY) < adjustedSnapDistance) {
      resultY = startY;
      resultSnapLineY = startY;
      resultSnapY = true;
    } else if (!foundSnapY && Math.abs(mouseY - endY) < adjustedSnapDistance) {
      resultY = endY;
      resultSnapLineY = endY;
      resultSnapY = true;
    }

    if (!resultSnapX || !resultSnapY) {
      const wallResult = this.snapToWallEdges(
        wall,
        mouseX,
        mouseY,
        currentWidth,
        currentHeight,
        adjustedSnapDistance,
        foundSnapX || resultSnapX,
        foundSnapY || resultSnapY
      );
      
      if (!resultSnapX && wallResult.snappedX) {
        resultX = wallResult.x;
        resultSnapLineX = wallResult.snapLineX;
        resultSnapX = true;
      }
      
      if (!resultSnapY && wallResult.snappedY) {
        resultY = wallResult.y;
        resultSnapLineY = wallResult.snapLineY;
        resultSnapY = true;
      }
    }

    return {
      x: resultX,
      y: resultY,
      snappedX: resultSnapX,
      snappedY: resultSnapY,
      snapLineX: resultSnapLineX,
      snapLineY: resultSnapLineY
    };
  }

  private snapToWallEdges(
    wall: WallItem,
    mouseX: number,
    mouseY: number,
    currentWidth: number,
    currentHeight: number,
    adjustedSnapDistance: number,
    foundSnapX: boolean,
    foundSnapY: boolean
  ): { x: number; y: number; snappedX: boolean; snappedY: boolean; snapLineX?: number; snapLineY?: number } {
    const { startX, startY, endX, endY } = wall;
    const wallLength = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
    
    if (wallLength === 0) {
      return { x: mouseX, y: mouseY, snappedX: false, snappedY: false };
    }

    const wallDirX = (endX - startX) / wallLength;
    const wallDirY = (endY - startY) / wallLength;
    const wallPerpX = -wallDirY;
    const wallPerpY = wallDirX;
    const wallThickness = wall.thickness || 16;
    const halfThickness = wallThickness / 2;

    const t = Math.max(0, Math.min(1, 
      ((mouseX - startX) * (endX - startX) + (mouseY - startY) * (endY - startY)) / (wallLength ** 2)
    ));
    
    const closestX = startX + t * (endX - startX);
    const closestY = startY + t * (endY - startY);
    const distanceToWallCenter = Math.sqrt((mouseX - closestX) ** 2 + (mouseY - closestY) ** 2);
    const extendedSnapDistance = adjustedSnapDistance + halfThickness + Math.max(currentWidth, currentHeight) / 2;
    
    if (distanceToWallCenter >= extendedSnapDistance) {
      return { x: mouseX, y: mouseY, snappedX: false, snappedY: false };
    }

    const isMoreHorizontal = Math.abs(endX - startX) > Math.abs(endY - startY);
    
    if (isMoreHorizontal && !foundSnapY) {
      return this.snapToHorizontalWall(
        mouseY,
        currentHeight,
        closestY,
        halfThickness,
        adjustedSnapDistance
      );
    } else if (!isMoreHorizontal && !foundSnapX) {
      return this.snapToVerticalWall(
        mouseX,
        currentWidth,
        closestX,
        halfThickness,
        adjustedSnapDistance
      );
    }

    return { x: mouseX, y: mouseY, snappedX: false, snappedY: false };
  }

  private snapToHorizontalWall(
    mouseY: number,
    currentHeight: number,
    closestY: number,
    halfThickness: number,
    adjustedSnapDistance: number
  ): { x: number; y: number; snappedX: boolean; snappedY: boolean; snapLineX?: number; snapLineY?: number } {
    const itemTop = mouseY - currentHeight / 2;
    const itemBottom = mouseY + currentHeight / 2;
    
    const wallSnapTargets: WallSnapTarget[] = [
      { pos: closestY, desc: 'center' },
      { pos: closestY + halfThickness, desc: 'bottom edge' },
      { pos: closestY - halfThickness, desc: 'top edge' }
    ];
    
    const itemEdges: ItemEdge[] = [
      { pos: itemTop, offset: currentHeight / 2, desc: 'top edge' },
      { pos: mouseY, offset: 0, desc: 'center' },
      { pos: itemBottom, offset: -currentHeight / 2, desc: 'bottom edge' }
    ];
    
    let bestSnapY = mouseY;
    let bestDistance = Infinity;
    let bestWallY = closestY;
    
    for (const wallTarget of wallSnapTargets) {
      for (const itemEdge of itemEdges) {
        const distance = Math.abs(itemEdge.pos - wallTarget.pos);
        if (distance < adjustedSnapDistance && distance < bestDistance) {
          bestDistance = distance;
          bestSnapY = wallTarget.pos + itemEdge.offset;
          bestWallY = wallTarget.pos;
        }
      }
    }
    
    if (bestDistance < adjustedSnapDistance) {
      return {
        x: 0,
        y: bestSnapY,
        snappedX: false,
        snappedY: true,
        snapLineY: bestWallY
      };
    }

    return { x: 0, y: mouseY, snappedX: false, snappedY: false };
  }

  private snapToVerticalWall(
    mouseX: number,
    currentWidth: number,
    closestX: number,
    halfThickness: number,
    adjustedSnapDistance: number
  ): { x: number; y: number; snappedX: boolean; snappedY: boolean; snapLineX?: number; snapLineY?: number } {
    const itemLeft = mouseX - currentWidth / 2;
    const itemRight = mouseX + currentWidth / 2;
    
    const wallSnapTargets: WallSnapTarget[] = [
      { pos: closestX, desc: 'center' },
      { pos: closestX + halfThickness, desc: 'right edge' },
      { pos: closestX - halfThickness, desc: 'left edge' }
    ];
    
    const itemEdges: ItemEdge[] = [
      { pos: itemLeft, offset: currentWidth / 2, desc: 'left edge' },
      { pos: mouseX, offset: 0, desc: 'center' },
      { pos: itemRight, offset: -currentWidth / 2, desc: 'right edge' }
    ];
    
    let bestSnapX = mouseX;
    let bestDistance = Infinity;
    let bestWallX = closestX;
    
    for (const wallTarget of wallSnapTargets) {
      for (const itemEdge of itemEdges) {
        const distance = Math.abs(itemEdge.pos - wallTarget.pos);
        if (distance < adjustedSnapDistance && distance < bestDistance) {
          bestDistance = distance;
          bestSnapX = wallTarget.pos + itemEdge.offset;
          bestWallX = wallTarget.pos;
        }
      }
    }
    
    if (bestDistance < adjustedSnapDistance) {
      return {
        x: bestSnapX,
        y: 0,
        snappedX: true,
        snappedY: false,
        snapLineX: bestWallX
      };
    }

    return { x: mouseX, y: 0, snappedX: false, snappedY: false };
  }

  private snapToItem(
    placedItem: PlacedItem,
    currentLeft: number,
    currentRight: number,
    currentTop: number,
    currentBottom: number,
    mouseX: number,
    mouseY: number,
    currentWidth: number,
    currentHeight: number,
    adjustedSnapDistance: number,
    foundSnapX: boolean,
    foundSnapY: boolean
  ): { x: number; y: number; snappedX: boolean; snappedY: boolean; snapLineX?: number; snapLineY?: number } {
    const placedWidth = placedItem.width * placedItem.scale;
    const placedHeight = placedItem.height * placedItem.scale;
    
    const placedLeft = placedItem.x - placedWidth / 2;
    const placedRight = placedItem.x + placedWidth / 2;
    const placedTop = placedItem.y - placedHeight / 2;
    const placedBottom = placedItem.y + placedHeight / 2;

    let resultX = mouseX;
    let resultY = mouseY;
    let resultSnapX = false;
    let resultSnapY = false;
    let resultSnapLineX: number | undefined;
    let resultSnapLineY: number | undefined;

    if (!foundSnapX) {
      const xSnapResult = this.findBestXSnap(
        currentLeft,
        currentRight,
        mouseX,
        currentWidth,
        placedLeft,
        placedRight,
        placedItem.x,
        adjustedSnapDistance
      );
      
      if (xSnapResult.snapped) {
        resultX = xSnapResult.position;
        resultSnapLineX = xSnapResult.snapLine;
        resultSnapX = true;
      }
    }

    if (!foundSnapY) {
      const ySnapResult = this.findBestYSnap(
        currentTop,
        currentBottom,
        mouseY,
        currentHeight,
        placedTop,
        placedBottom,
        placedItem.y,
        adjustedSnapDistance
      );
      
      if (ySnapResult.snapped) {
        resultY = ySnapResult.position;
        resultSnapLineY = ySnapResult.snapLine;
        resultSnapY = true;
      }
    }

    return {
      x: resultX,
      y: resultY,
      snappedX: resultSnapX,
      snappedY: resultSnapY,
      snapLineX: resultSnapLineX,
      snapLineY: resultSnapLineY
    };
  }

  private findBestXSnap(
    currentLeft: number,
    currentRight: number,
    mouseX: number,
    currentWidth: number,
    placedLeft: number,
    placedRight: number,
    placedCenterX: number,
    adjustedSnapDistance: number
  ): { snapped: boolean; position: number; snapLine: number } {
    const snapChecks = [
      { currentPos: currentLeft, placedPos: placedLeft, offset: currentWidth / 2 },
      { currentPos: currentLeft, placedPos: placedRight, offset: currentWidth / 2 },
      { currentPos: currentRight, placedPos: placedLeft, offset: -currentWidth / 2 },
      { currentPos: currentRight, placedPos: placedRight, offset: -currentWidth / 2 },
      { currentPos: mouseX, placedPos: placedCenterX, offset: 0 }
    ];

    for (const check of snapChecks) {
      if (Math.abs(check.currentPos - check.placedPos) < adjustedSnapDistance) {
        return {
          snapped: true,
          position: check.placedPos + check.offset,
          snapLine: check.placedPos
        };
      }
    }

    return { snapped: false, position: mouseX, snapLine: mouseX };
  }

  private findBestYSnap(
    currentTop: number,
    currentBottom: number,
    mouseY: number,
    currentHeight: number,
    placedTop: number,
    placedBottom: number,
    placedCenterY: number,
    adjustedSnapDistance: number
  ): { snapped: boolean; position: number; snapLine: number } {
    const snapChecks = [
      { currentPos: currentTop, placedPos: placedTop, offset: currentHeight / 2 },
      { currentPos: currentTop, placedPos: placedBottom, offset: currentHeight / 2 },
      { currentPos: currentBottom, placedPos: placedTop, offset: -currentHeight / 2 },
      { currentPos: currentBottom, placedPos: placedBottom, offset: -currentHeight / 2 },
      { currentPos: mouseY, placedPos: placedCenterY, offset: 0 }
    ];

    for (const check of snapChecks) {
      if (Math.abs(check.currentPos - check.placedPos) < adjustedSnapDistance) {
        return {
          snapped: true,
          position: check.placedPos + check.offset,
          snapLine: check.placedPos
        };
      }
    }

    return { snapped: false, position: mouseY, snapLine: mouseY };
  }

  wouldSnap(
    mouseX: number,
    mouseY: number,
    currentItem: Item,
    placedEntities: PlacedEntity[]
  ): boolean {
    const result = this.getSnappedPosition(mouseX, mouseY, currentItem, placedEntities);
    return result.snappedX || result.snappedY;
  }
}
