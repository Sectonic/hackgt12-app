import { PlacedItem, PlacedEntity, WallItem } from '@/app/plans/[planId]/types';
import { SelectionManager } from './SelectionManager';
import { getItemLayer, getLayerOrder } from '@/utils/layering';

export interface MouseState {
  isDraggingSelection: boolean;
  dragStartPos: { x: number; y: number } | null;
  hasDraggedItems: boolean;
}

export class MouseInteractionManager {
  private state: MouseState;
  private onStateChange: (state: MouseState) => void;

  constructor(
    initialState: MouseState,
    onStateChange: (state: MouseState) => void
  ) {
    this.state = initialState;
    this.onStateChange = onStateChange;
  }

  get isDraggingSelection(): boolean {
    return this.state.isDraggingSelection;
  }

  get hasDraggedItems(): boolean {
    return this.state.hasDraggedItems;
  }


  startDragSelection(startX: number, startY: number) {
    this.state.isDraggingSelection = true;
    this.state.dragStartPos = { x: startX, y: startY };
    this.state.hasDraggedItems = false;
    this.emitStateChange();
  }

  updateDragSelection(
    currentX: number, 
    currentY: number, 
    selectedItems: PlacedEntity[],
    placedEntities: PlacedEntity[],
    scale: number
  ): { movedItems: PlacedEntity[], snapGuides?: { x?: number; y?: number } } | null {
    if (!this.state.isDraggingSelection || !this.state.dragStartPos) {
      return null;
    }

    const deltaX = currentX - this.state.dragStartPos.x;
    const deltaY = currentY - this.state.dragStartPos.y;
    
    if (Math.abs(deltaX) <= 1 && Math.abs(deltaY) <= 1) {
      return null;
    }

    // Mark that we've actually dragged items
    this.state.hasDraggedItems = true;

    const movedItems = SelectionManager.moveSelectedEntities(selectedItems, deltaX, deltaY);
    
    // Update drag start position for next move
    this.state.dragStartPos = { x: currentX, y: currentY };
    this.emitStateChange();
    
    return { movedItems, snapGuides: undefined };
  }

  endDragSelection() {
    this.state.isDraggingSelection = false;
    this.state.dragStartPos = null;
    this.emitStateChange();
  }

  findClickedEntity(
    stageX: number, 
    stageY: number, 
    placedEntities: PlacedEntity[]
  ): PlacedEntity | undefined {
    // Separate walls and items
    const walls = placedEntities.filter(entity => entity.type === 'wall') as WallItem[];
    const items = placedEntities.filter(entity => entity.type !== 'wall') as PlacedItem[];
    
    // Group items by layer priority (highest to lowest)
    const layerOrder = getLayerOrder().reverse(); // Reverse to get highest priority first
    const itemsByLayer: Record<string, PlacedItem[]> = {};
    
    // Initialize empty arrays for each layer
    layerOrder.forEach(layer => {
      itemsByLayer[layer] = [];
    });
    
    // Group items by their layer
    items.forEach(item => {
      const layer = getItemLayer(item);
      itemsByLayer[layer].push(item);
    });
    
    // Check items in layer priority order (highest layer first)
    for (const layer of layerOrder) {
      for (const item of itemsByLayer[layer]) {
        const itemWidth = item.width * item.scale;
        const itemHeight = item.height * item.scale;
        if (stageX >= item.x - itemWidth/2 && stageX <= item.x + itemWidth/2 &&
            stageY >= item.y - itemHeight/2 && stageY <= item.y + itemHeight/2) {
          return item;
        }
      }
    }
    
    // Check walls last (lowest priority)
    for (const wall of walls) {
      const distanceToLine = this.distanceToLineSegment(
        stageX, stageY,
        wall.startX, wall.startY,
        wall.endX, wall.endY
      );
      if (distanceToLine <= wall.thickness / 2 + 10) { // Add some tolerance
        return wall;
      }
    }
    
    return undefined;
  }

  private distanceToLineSegment(
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
      // x1 and x2 are the same point
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

  resetSelection() {
    this.state.isDraggingSelection = false;
    this.state.dragStartPos = null;
    // Note: hasDraggedItems is NOT reset here - it needs to persist for click handler
    this.emitStateChange();
  }

  resetDrag() {
    this.state.isDraggingSelection = false;
    this.state.dragStartPos = null;
    this.state.hasDraggedItems = false;
    this.emitStateChange();
  }

  resetAll() {
    this.state.isDraggingSelection = false;
    this.state.dragStartPos = null;
    this.state.hasDraggedItems = false;
    this.emitStateChange();
  }

  clearDragFlag() {
    this.state.hasDraggedItems = false;
    this.emitStateChange();
  }

  private emitStateChange() {
    this.onStateChange({ ...this.state });
  }
}
