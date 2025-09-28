import { PlacedItem, PlacedEntity, WallItem } from '@/app/plans/[planId]/types';
import { CollisionManager } from './CollisionManager';
import { canPlaceOnWall } from '@/utils/wallAttachment';

export interface EditingState {
  selectedItems: PlacedEntity[];
  originalState: PlacedEntity[];
  itemValidityMap: Map<string, boolean>;
}

export class EditingManager {
  private state: EditingState;
  private onStateChange: (state: EditingState) => void;
  private placedEntities: PlacedEntity[];
  private getCurrentState: () => EditingState;

  constructor(
    initialState: EditingState,
    onStateChange: (state: EditingState) => void,
    placedEntities: PlacedEntity[],
    getCurrentState: () => EditingState
  ) {
    this.state = initialState;
    this.onStateChange = onStateChange;
    this.placedEntities = placedEntities;
    this.getCurrentState = getCurrentState;
  }

  get isEditing(): boolean {
    return this.state.selectedItems.length > 0;
  }

  get selectedItems(): PlacedEntity[] {
    return this.state.selectedItems;
  }

  get canSave(): boolean {
    if (!this.isEditing) return true;
    return this.state.selectedItems.every(item => 
      this.state.itemValidityMap.get(item.id) === true
    );
  }

  private validateItem(item: PlacedItem, otherEntities: PlacedEntity[]): boolean {
    if (item.subtype === 'door' || item.subtype === 'window') {
      const doorWindowValid = canPlaceOnWall(item, item.x, item.y, otherEntities);
      if (!doorWindowValid) return false;
    }
    
    const hasCollision = CollisionManager.checkItemCollisions(item, otherEntities, [item.id]);
    return !hasCollision;
  }

  private updateValidityMap(items: PlacedEntity[], currentState?: EditingState, currentEntities?: PlacedEntity[]) {
    const state = currentState || this.state;
    
    if (items.length === 0) {
      state.itemValidityMap.clear();
      if (!currentState) {
        this.emitStateChange();
      }
      return;
    }

    const entitiesToCheck = currentEntities || this.placedEntities;
    const otherEntities = entitiesToCheck.filter(entity => 
      entity.type === 'wall' || !items.some(selected => selected.id === entity.id)
    );
    
    const newValidityMap = new Map<string, boolean>();
    
    items.forEach(entity => {
      const otherItemsInSelection = items.filter(other => other.id !== entity.id);
      const allOtherEntities = [...otherEntities, ...otherItemsInSelection];
      
      let isValid = true;
      if (entity.type === 'wall') {
        // Walls are invalid when they overlap with regular objects (excluding doors/windows)
        const regularObjects = allOtherEntities.filter(other => 
          other.type !== 'wall' && 
          (other as PlacedItem).subtype !== 'door' && 
          (other as PlacedItem).subtype !== 'window'
        );
        isValid = !CollisionManager.checkWallCollisions(entity as WallItem, regularObjects);
      } else {
        const item = entity as PlacedItem;
        if (item.subtype === 'door' || item.subtype === 'window') {
          // Doors/windows are ONLY valid when they can be placed on a wall
          isValid = canPlaceOnWall(item, item.x, item.y, allOtherEntities);
        } else {
          // Regular objects are invalid when they overlap anywhere
          isValid = !CollisionManager.checkItemCollisions(item, allOtherEntities);
        }
      }
      
      newValidityMap.set(entity.id, isValid);
    });
    
    state.itemValidityMap = newValidityMap;
    if (!currentState) {
      this.emitStateChange();
    }
  }

  selectItems(items: PlacedEntity[]) {
    const currentState = this.getCurrentState();
    if (items.length > 0 && currentState.originalState.length === 0) {
      currentState.originalState = [...this.placedEntities];
    }
    
    currentState.selectedItems = items;
    this.updateValidityMap(items, currentState);
    // Explicitly emit state change to ensure React updates
    this.onStateChange({ ...currentState });
  }

  updateSelectedItems(updatedItems: PlacedEntity[], currentEntities?: PlacedEntity[]) {
    this.state.selectedItems = updatedItems;
    this.updateValidityMap(updatedItems, undefined, currentEntities);
  }

  save(): PlacedEntity[] | null {
    if (!this.canSave) return null;
    
    this.state.selectedItems = [];
    this.state.originalState = [];
    this.state.itemValidityMap.clear();
    this.emitStateChange();
    
    return this.placedEntities;
  }

  cancel(): PlacedEntity[] {
    const restoredState = this.state.originalState;
    
    this.state.selectedItems = [];
    this.state.originalState = [];
    this.state.itemValidityMap.clear();
    this.emitStateChange();
    
    return restoredState;
  }

  reset() {
    if (this.isEditing) {
      this.state.selectedItems = [];
      this.state.originalState = [];
      this.state.itemValidityMap.clear();
      this.emitStateChange();
    }
  }

  updatePlacedEntities(newEntities: PlacedEntity[]) {
    this.placedEntities = newEntities;
  }

  private emitStateChange() {
    this.onStateChange({ ...this.state });
  }
}
