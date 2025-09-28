import React, { useEffect, useState } from 'react';
import { PlacedEntity, PlacedItem, WallItem } from '@/app/plans/[planId]/types';

interface SelectedItemsPreviewProps {
  selectedItems: PlacedEntity[];
  itemValidityMap: Map<string, boolean>;
  stageScale: number;
  stagePosition: { x: number; y: number };
}

export default function SelectedItemsPreview({
  selectedItems,
  itemValidityMap,
  stageScale,
  stagePosition
}: SelectedItemsPreviewProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render during SSR to prevent hydration mismatches
  if (!isClient || selectedItems.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {selectedItems.map((entity) => {
        const isValid = itemValidityMap.get(entity.id) ?? true;
        
        if (entity.type === 'wall') {
          const wall = entity as WallItem;
          
          // Convert wall coordinates to screen coordinates
          const startX = wall.startX * stageScale + stagePosition.x;
          const startY = wall.startY * stageScale + stagePosition.y;
          const endX = wall.endX * stageScale + stagePosition.x;
          const endY = wall.endY * stageScale + stagePosition.y;
          
          // Calculate wall dimensions for border
          const wallLength = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
          const wallAngle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
          const wallThickness = wall.thickness * stageScale;
          
          // Calculate center point
          const centerX = (startX + endX) / 2;
          const centerY = (startY + endY) / 2;
          
          return (
            <div key={wall.id} className="absolute">
              {/* Wall selection border */}
              <div
                className={`border-2 ${
                  isValid 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-red-500 bg-red-500/10'
                }`}
                style={{
                  position: 'fixed',
                  left: centerX - wallLength / 2,
                  top: centerY - (wallThickness + 10) / 2,
                  width: wallLength,
                  height: wallThickness + 10,
                  transform: `rotate(${wallAngle}deg)`,
                  transformOrigin: 'center center',
                  zIndex: 14,
                }}
              />
              
              {/* Wall line representation */}
              <div
                className="bg-gray-600 opacity-70"
                style={{
                  position: 'fixed',
                  left: centerX - wallLength / 2,
                  top: centerY - wallThickness / 2,
                  width: wallLength,
                  height: wallThickness,
                  transform: `rotate(${wallAngle}deg)`,
                  transformOrigin: 'center center',
                  zIndex: 15,
                }}
              />
            </div>
          );
        }
        
        const item = entity as PlacedItem;
        const isItemValid = isValid;
        
        // Convert stage coordinates to screen coordinates
        const screenX = item.x * stageScale + stagePosition.x;
        const screenY = item.y * stageScale + stagePosition.y;
        
        // Calculate item dimensions scaled to match stage scale
        const itemWidth = item.width * item.scale * stageScale;
        const itemHeight = item.height * item.scale * stageScale;
        
        // Calculate border dimensions (slightly larger than the item)
        const borderPadding = 5;
        const borderWidth = itemWidth + borderPadding * 2;
        const borderHeight = itemHeight + borderPadding * 2;
        
        const iconPath = `/icons/${item.type}/${item.file}.svg`;
        
        return (
          <div key={item.id} className="absolute">
            {/* Selection border */}
            <div
              className={`border-2 ${
                isItemValid 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-red-500 bg-red-500/10'
              } rounded-sm`}
              style={{
                position: 'fixed',
                left: screenX - borderWidth / 2,
                top: screenY - borderHeight / 2,
                width: borderWidth,
                height: borderHeight,
                transform: `rotate(${item.rotation}deg)`,
                transformOrigin: 'center center',
                zIndex: 14
              }}
            />
            
            {/* Item image */}
            <img
              src={iconPath}
              alt={item.file}
              className="absolute pointer-events-none"
              style={{
                position: 'fixed',
                left: screenX - itemWidth / 2,
                top: screenY - itemHeight / 2,
                width: itemWidth,
                height: itemHeight,
                objectFit: 'contain',
                transform: `rotate(${item.rotation}deg) ${item.inverted ? 'scaleX(-1)' : ''}`,
                transformOrigin: 'center center',
                filter: isItemValid ? 'none' : 'sepia(1) hue-rotate(320deg) saturate(3) brightness(0.8)',
                zIndex: 15,
                opacity: 0.9
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
