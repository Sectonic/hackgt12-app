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

/**
 * Calculate snapped position for an item relative to existing placed items
 * @param mouseX - Current mouse X position in stage coordinates
 * @param mouseY - Current mouse Y position in stage coordinates
 * @param currentItem - Item being positioned
 * @param placedEntities - Array of existing placed entities to snap to
 * @param options - Snapping configuration options
 * @returns Snapped position and snap status
 */
export function getSnappedPosition(
  mouseX: number,
  mouseY: number,
  currentItem: Item,
  placedEntities: PlacedEntity[],
  options: SnapOptions = {}
): SnapResult {
  const { snapDistance = 8, scale = 1 } = options;
  
  if (!currentItem || placedEntities.length === 0) {
    return { x: mouseX, y: mouseY, snappedX: false, snappedY: false };
  }

  const adjustedSnapDistance = snapDistance / scale;
  const currentWidth = currentItem.width * currentItem.scale;
  const currentHeight = currentItem.height * currentItem.scale;
  
  let snappedX = mouseX;
  let snappedY = mouseY;
  let foundSnapX = false;
  let foundSnapY = false;
  let snapLineX: number | undefined;
  let snapLineY: number | undefined;

  // Calculate edges of current item at mouse position
  const currentLeft = mouseX - currentWidth / 2;
  const currentRight = mouseX + currentWidth / 2;
  const currentTop = mouseY - currentHeight / 2;
  const currentBottom = mouseY + currentHeight / 2;

  // Check each placed entity for snapping opportunities
  for (const entity of placedEntities) {
    if (entity.type === 'wall') {
      const wall = entity as WallItem;
      
      // For walls, calculate snapping to endpoints and perpendicular points along the line
      const wallStartX = wall.startX;
      const wallStartY = wall.startY;
      const wallEndX = wall.endX;
      const wallEndY = wall.endY;
      
      // Snap to wall endpoints
      if (!foundSnapX && Math.abs(mouseX - wallStartX) < adjustedSnapDistance) {
        snappedX = wallStartX;
        snapLineX = wallStartX;
        foundSnapX = true;
      } else if (!foundSnapX && Math.abs(mouseX - wallEndX) < adjustedSnapDistance) {
        snappedX = wallEndX;
        snapLineX = wallEndX;
        foundSnapX = true;
      }
      
      if (!foundSnapY && Math.abs(mouseY - wallStartY) < adjustedSnapDistance) {
        snappedY = wallStartY;
        snapLineY = wallStartY;
        foundSnapY = true;
      } else if (!foundSnapY && Math.abs(mouseY - wallEndY) < adjustedSnapDistance) {
        snappedY = wallEndY;
        snapLineY = wallEndY;
        foundSnapY = true;
      }
      
      // Snap to wall line (perpendicular distance)
      if (!foundSnapX || !foundSnapY) {
        const wallLength = Math.sqrt((wallEndX - wallStartX) ** 2 + (wallEndY - wallStartY) ** 2);
        if (wallLength > 0) {
          // Calculate perpendicular distance to wall line
          const t = Math.max(0, Math.min(1, 
            ((mouseX - wallStartX) * (wallEndX - wallStartX) + (mouseY - wallStartY) * (wallEndY - wallStartY)) / (wallLength ** 2)
          ));
          
          const closestX = wallStartX + t * (wallEndX - wallStartX);
          const closestY = wallStartY + t * (wallEndY - wallStartY);
          const distanceToWall = Math.sqrt((mouseX - closestX) ** 2 + (mouseY - closestY) ** 2);
          
          if (distanceToWall < adjustedSnapDistance) {
            // Determine if it's more of a horizontal or vertical wall
            const isMoreHorizontal = Math.abs(wallEndX - wallStartX) > Math.abs(wallEndY - wallStartY);
            
            if (isMoreHorizontal && !foundSnapY) {
              snappedY = closestY;
              snapLineY = closestY;
              foundSnapY = true;
            } else if (!isMoreHorizontal && !foundSnapX) {
              snappedX = closestX;
              snapLineX = closestX;
              foundSnapX = true;
            }
          }
        }
      }
    } else {
      // Handle regular placed items
      const placedItem = entity as PlacedItem;
      const placedWidth = placedItem.width * placedItem.scale;
      const placedHeight = placedItem.height * placedItem.scale;
      
      // Calculate edges of placed item
      const placedLeft = placedItem.x - placedWidth / 2;
      const placedRight = placedItem.x + placedWidth / 2;
      const placedTop = placedItem.y - placedHeight / 2;
      const placedBottom = placedItem.y + placedHeight / 2;

      // X-axis snapping (vertical edges)
      if (!foundSnapX) {
        // Snap left edge to left edge
        if (Math.abs(currentLeft - placedLeft) < adjustedSnapDistance) {
          snappedX = placedLeft + currentWidth / 2;
          snapLineX = placedLeft;
          foundSnapX = true;
        }
        // Snap left edge to right edge
        else if (Math.abs(currentLeft - placedRight) < adjustedSnapDistance) {
          snappedX = placedRight + currentWidth / 2;
          snapLineX = placedRight;
          foundSnapX = true;
        }
        // Snap right edge to left edge
        else if (Math.abs(currentRight - placedLeft) < adjustedSnapDistance) {
          snappedX = placedLeft - currentWidth / 2;
          snapLineX = placedLeft;
          foundSnapX = true;
        }
        // Snap right edge to right edge
        else if (Math.abs(currentRight - placedRight) < adjustedSnapDistance) {
          snappedX = placedRight - currentWidth / 2;
          snapLineX = placedRight;
          foundSnapX = true;
        }
        // Snap center to center
        else if (Math.abs(mouseX - placedItem.x) < adjustedSnapDistance) {
          snappedX = placedItem.x;
          snapLineX = placedItem.x;
          foundSnapX = true;
        }
      }

      // Y-axis snapping (horizontal edges)
      if (!foundSnapY) {
        // Snap top edge to top edge
        if (Math.abs(currentTop - placedTop) < adjustedSnapDistance) {
          snappedY = placedTop + currentHeight / 2;
          snapLineY = placedTop;
          foundSnapY = true;
        }
        // Snap top edge to bottom edge
        else if (Math.abs(currentTop - placedBottom) < adjustedSnapDistance) {
          snappedY = placedBottom + currentHeight / 2;
          snapLineY = placedBottom;
          foundSnapY = true;
        }
        // Snap bottom edge to top edge
        else if (Math.abs(currentBottom - placedTop) < adjustedSnapDistance) {
          snappedY = placedTop - currentHeight / 2;
          snapLineY = placedTop;
          foundSnapY = true;
        }
        // Snap bottom edge to bottom edge
        else if (Math.abs(currentBottom - placedBottom) < adjustedSnapDistance) {
          snappedY = placedBottom - currentHeight / 2;
          snapLineY = placedBottom;
          foundSnapY = true;
        }
        // Snap center to center
        else if (Math.abs(mouseY - placedItem.y) < adjustedSnapDistance) {
          snappedY = placedItem.y;
          snapLineY = placedItem.y;
          foundSnapY = true;
        }
      }
    }

    // Break early if both axes are snapped
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

/**
 * Check if a position would snap to any existing items
 * @param mouseX - Mouse X position in stage coordinates
 * @param mouseY - Mouse Y position in stage coordinates
 * @param currentItem - Item being positioned
 * @param placedItems - Array of existing placed items
 * @param options - Snapping configuration options
 * @returns True if position would snap
 */
export function wouldSnap(
  mouseX: number,
  mouseY: number,
  currentItem: Item,
  placedEntities: PlacedEntity[],
  options: SnapOptions = {}
): boolean {
  const result = getSnappedPosition(mouseX, mouseY, currentItem, placedEntities, options);
  return result.snappedX || result.snappedY;
}
