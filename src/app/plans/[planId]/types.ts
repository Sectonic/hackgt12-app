export interface Item {
  file: string;
  name: string;
  type: 'furniture' | 'foundational';
  width: number;
  height: number;
  inverted: boolean;
  rotation: number;
  scale: number;
}

export interface PlacedItem extends Omit<Item, 'file'> {
  id: string;
  file: string;
  x: number;
  y: number;
}

export interface WallItem {
  id: string;
  type: 'wall';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number;
}

export type PlacedEntity = PlacedItem | WallItem;
