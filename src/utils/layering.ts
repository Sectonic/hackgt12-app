import { PlacedItem } from '@/app/plans/[planId]/types';

export enum ItemLayer {
  FLOOR = 'floor',
  LARGE_FURNITURE = 'large_furniture', 
  MEDIUM_FURNITURE = 'medium_furniture',
  SMALL_ITEMS = 'small_items',
  DOORS_WINDOWS = 'doors_windows'
}

export function getItemLayer(item: PlacedItem): ItemLayer {
  const { file } = item;
  
  // Floor elements (lowest)
  if (file.startsWith('floor_')) {
    return ItemLayer.FLOOR;
  }
  
  // Doors and windows (highest furniture layer for easy selection)
  if (file.startsWith('door') || file.startsWith('window')) {
    return ItemLayer.DOORS_WINDOWS;
  }
  
  // Large furniture
  if (['bed_', 'sofa_', 'dining_table_', 'office_desk_', 'wardrobe_', 'fridge', 'stove', 'bath', 'shower'].some(prefix => file.startsWith(prefix))) {
    return ItemLayer.LARGE_FURNITURE;
  }
  
  // Medium furniture  
  if (['chair_', 'nightstand', 'dresser', 'cabinet', 'storage', 'table_', 'bookshelf', 'tv_stand', 'toilet', 'sink'].some(prefix => file.startsWith(prefix)) ||
      ['ottoman', 'lounge'].some(name => file.includes(name))) {
    return ItemLayer.MEDIUM_FURNITURE;
  }
  
  // Default to small items
  return ItemLayer.SMALL_ITEMS;
}

export function getLayerOrder(): ItemLayer[] {
  return [
    ItemLayer.FLOOR,
    ItemLayer.LARGE_FURNITURE,
    ItemLayer.MEDIUM_FURNITURE, 
    ItemLayer.SMALL_ITEMS,
    ItemLayer.DOORS_WINDOWS
  ];
}
