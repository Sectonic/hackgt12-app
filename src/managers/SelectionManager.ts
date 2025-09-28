import { PlacedItem, PlacedEntity, WallItem, GroupTransformation } from '@/app/plans/[planId]/types';

export class SelectionManager {

  static getSelectionCenter(selectedItems: PlacedEntity[]): { x: number; y: number } {
    if (selectedItems.length === 0) return { x: 0, y: 0 };
    
    const sumX = selectedItems.reduce((sum, entity) => {
      if (entity.type === 'wall') {
        const wall = entity as WallItem;
        return sum + (wall.startX + wall.endX) / 2;
      } else {
        const item = entity as PlacedItem;
        return sum + item.x;
      }
    }, 0);
    
    const sumY = selectedItems.reduce((sum, entity) => {
      if (entity.type === 'wall') {
        const wall = entity as WallItem;
        return sum + (wall.startY + wall.endY) / 2;
      } else {
        const item = entity as PlacedItem;
        return sum + item.y;
      }
    }, 0);
    
    return {
      x: sumX / selectedItems.length,
      y: sumY / selectedItems.length
    };
  }

  static moveSelectedItems(
    selectedItems: PlacedItem[], 
    deltaX: number, 
    deltaY: number
  ): PlacedItem[] {
    return selectedItems.map(item => ({
      ...item,
      x: item.x + deltaX,
      y: item.y + deltaY
    }));
  }

  static rotateSelectedItems(
    selectedItems: PlacedItem[], 
    deltaRotation: number
  ): PlacedItem[] {
    if (selectedItems.length === 0) return selectedItems;
    
    const center = this.getSelectionCenter(selectedItems);
    const rotationRad = deltaRotation * (Math.PI / 180);
    
    return selectedItems.map(item => {
      const relativeX = item.x - center.x;
      const relativeY = item.y - center.y;
      
      const rotatedX = relativeX * Math.cos(rotationRad) - relativeY * Math.sin(rotationRad);
      const rotatedY = relativeX * Math.sin(rotationRad) + relativeY * Math.cos(rotationRad);
      
      return {
        ...item,
        x: center.x + rotatedX,
        y: center.y + rotatedY,
        rotation: (item.rotation + deltaRotation) % 360
      };
    });
  }

  static scaleSelectedItems(
    selectedItems: PlacedItem[], 
    scaleFactor: number
  ): PlacedItem[] {
    if (selectedItems.length === 0) return selectedItems;
    
    const center = this.getSelectionCenter(selectedItems);
    
    return selectedItems.map(item => {
      const relativeX = item.x - center.x;
      const relativeY = item.y - center.y;
      
      return {
        ...item,
        x: center.x + relativeX * scaleFactor,
        y: center.y + relativeY * scaleFactor,
        scale: Math.max(0.1, Math.min(3, item.scale * scaleFactor))
      };
    });
  }

  static flipSelectedItems(
    selectedItems: PlacedItem[], 
    direction: 'horizontal' | 'vertical'
  ): PlacedItem[] {
    if (selectedItems.length === 0) return selectedItems;
    
    const center = this.getSelectionCenter(selectedItems);
    
    return selectedItems.map(item => {
      let newX = item.x;
      let newY = item.y;
      
      if (direction === 'horizontal') {
        newX = center.x - (item.x - center.x);
      } else {
        newY = center.y - (item.y - center.y);
      }
      
      return {
        ...item,
        x: newX,
        y: newY,
        inverted: !item.inverted
      };
    });
  }


  static toggleItemSelection(
    selectedItems: PlacedItem[], 
    item: PlacedItem
  ): PlacedItem[] {
    const isSelected = selectedItems.some(selected => selected.id === item.id);
    
    if (isSelected) {
      return selectedItems.filter(selected => selected.id !== item.id);
    } else {
      return [...selectedItems, item];
    }
  }

  static selectSingleItem(item: PlacedItem): PlacedItem[] {
    return [item];
  }

  // New entity selection methods
  static toggleEntitySelection(
    selectedItems: PlacedEntity[], 
    entity: PlacedEntity
  ): PlacedEntity[] {
    const isSelected = selectedItems.some(selected => selected.id === entity.id);
    
    if (isSelected) {
      return selectedItems.filter(selected => selected.id !== entity.id);
    } else {
      return [...selectedItems, entity];
    }
  }

  static selectSingleEntity(entity: PlacedEntity): PlacedEntity[] {
    return [entity];
  }

  static moveSelectedEntities(
    selectedEntities: PlacedEntity[], 
    deltaX: number, 
    deltaY: number
  ): PlacedEntity[] {
    return selectedEntities.map(entity => {
      if (entity.type === 'wall') {
        const wall = entity as WallItem;
        return {
          ...wall,
          startX: wall.startX + deltaX,
          startY: wall.startY + deltaY,
          endX: wall.endX + deltaX,
          endY: wall.endY + deltaY
        };
      } else {
        const item = entity as PlacedItem;
        return {
          ...item,
          x: item.x + deltaX,
          y: item.y + deltaY
        };
      }
    });
  }

  static rotateSelectedEntities(
    selectedEntities: PlacedEntity[], 
    deltaRotation: number
  ): PlacedEntity[] {
    if (selectedEntities.length === 0) return selectedEntities;
    
    const center = this.getSelectionCenter(selectedEntities);
    const rotationRad = deltaRotation * (Math.PI / 180);
    
    return selectedEntities.map(entity => {
      if (entity.type === 'wall') {
        const wall = entity as WallItem;
        
        // Rotate wall endpoints around selection center
        const startRelX = wall.startX - center.x;
        const startRelY = wall.startY - center.y;
        const endRelX = wall.endX - center.x;
        const endRelY = wall.endY - center.y;
        
        const newStartX = startRelX * Math.cos(rotationRad) - startRelY * Math.sin(rotationRad);
        const newStartY = startRelX * Math.sin(rotationRad) + startRelY * Math.cos(rotationRad);
        const newEndX = endRelX * Math.cos(rotationRad) - endRelY * Math.sin(rotationRad);
        const newEndY = endRelX * Math.sin(rotationRad) + endRelY * Math.cos(rotationRad);
        
        return {
          ...wall,
          startX: center.x + newStartX,
          startY: center.y + newStartY,
          endX: center.x + newEndX,
          endY: center.y + newEndY
        };
      } else {
        const item = entity as PlacedItem;
        const relativeX = item.x - center.x;
        const relativeY = item.y - center.y;
        
        const rotatedX = relativeX * Math.cos(rotationRad) - relativeY * Math.sin(rotationRad);
        const rotatedY = relativeX * Math.sin(rotationRad) + relativeY * Math.cos(rotationRad);
        
        return {
          ...item,
          x: center.x + rotatedX,
          y: center.y + rotatedY,
          rotation: (item.rotation + deltaRotation) % 360
        };
      }
    });
  }

  static scaleSelectedEntities(
    selectedEntities: PlacedEntity[], 
    scaleFactor: number
  ): PlacedEntity[] {
    if (selectedEntities.length === 0) return selectedEntities;
    
    const center = this.getSelectionCenter(selectedEntities);
    
    return selectedEntities.map(entity => {
      if (entity.type === 'wall') {
        const wall = entity as WallItem;
        
        // Scale wall endpoints relative to selection center
        const startRelX = (wall.startX - center.x) * scaleFactor;
        const startRelY = (wall.startY - center.y) * scaleFactor;
        const endRelX = (wall.endX - center.x) * scaleFactor;
        const endRelY = (wall.endY - center.y) * scaleFactor;
        
        return {
          ...wall,
          startX: center.x + startRelX,
          startY: center.y + startRelY,
          endX: center.x + endRelX,
          endY: center.y + endRelY,
          thickness: wall.thickness * scaleFactor
        };
      } else {
        const item = entity as PlacedItem;
        const relativeX = (item.x - center.x) * scaleFactor;
        const relativeY = (item.y - center.y) * scaleFactor;
        
        return {
          ...item,
          x: center.x + relativeX,
          y: center.y + relativeY,
          scale: item.scale * scaleFactor
        };
      }
    });
  }

  static flipSelectedEntities(
    selectedEntities: PlacedEntity[], 
    direction: 'horizontal' | 'vertical'
  ): PlacedEntity[] {
    if (selectedEntities.length === 0) return selectedEntities;
    
    const center = this.getSelectionCenter(selectedEntities);
    
    return selectedEntities.map(entity => {
      if (entity.type === 'wall') {
        const wall = entity as WallItem;
        
        if (direction === 'horizontal') {
          // Flip horizontally around center
          const startRelX = wall.startX - center.x;
          const endRelX = wall.endX - center.x;
          
          return {
            ...wall,
            startX: center.x - startRelX,
            endX: center.x - endRelX
          };
        } else {
          // Flip vertically around center
          const startRelY = wall.startY - center.y;
          const endRelY = wall.endY - center.y;
          
          return {
            ...wall,
            startY: center.y - startRelY,
            endY: center.y - endRelY
          };
        }
      } else {
        const item = entity as PlacedItem;
        
        if (direction === 'horizontal') {
          const relativeX = item.x - center.x;
          return {
            ...item,
            x: center.x - relativeX,
            inverted: !item.inverted
          };
        } else {
          const relativeY = item.y - center.y;
          return {
            ...item,
            y: center.y - relativeY,
            inverted: !item.inverted
          };
        }
      }
    });
  }
}
