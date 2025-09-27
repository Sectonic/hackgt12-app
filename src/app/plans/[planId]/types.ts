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
