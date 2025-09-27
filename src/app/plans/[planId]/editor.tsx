"use client";

import { useEffect, useState } from 'react';
import { useWindow } from '@/hooks/useWindow';
import { useZoom } from '@/hooks/useZoom';
import { Stage, Layer, Line, Circle } from 'react-konva';
import Toolbar, { ToolType } from './toolBar';
import { PlacedIcon, PreviewIcon } from './IconComponents';
import { Item, PlacedItem, WallItem, PlacedEntity } from './types';
import { v4 as uuidv4 } from 'uuid';
import History from '@/components/History';
import KeyboardManager from '@/components/KeyboardManager';
import { getSnappedPosition } from '@/utils/snapping';

interface EditorProps {
  items: Item[];
}

export default function Editor({ items }: EditorProps) {
  const { innerWidth, innerHeight } = useWindow();
  const [selectedTool, setSelectedTool] = useState<ToolType>('select');
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [screenCursorPos, setScreenCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [snappedPosition, setSnappedPosition] = useState<{ x: number; y: number } | null>(null);
  const [snapGuides, setSnapGuides] = useState<{ x?: number; y?: number }>({});
  const [placedEntities, setPlacedEntities] = useState<PlacedEntity[]>([]);
  const [wallStartPoint, setWallStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [isClient, setIsClient] = useState(false);
  const { scale, position, handleWheel } = useZoom();

  const historyManager = History<PlacedEntity[]>({
    initialState: [],
    onChange: setPlacedEntities,
    options: { maxHistorySize: 50 }
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  const setCurrentItemWithDefaults = (item: Item | null) => {
    if (item) {
      setCurrentItem({
        ...item,
        inverted: false,
        rotation: 0,
        scale: 1
      });
    } else {
      setCurrentItem(null);
    }
  };

  const handleStageMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    
    setScreenCursorPos({ x: pointer.x, y: pointer.y });

    if (currentItem) {
      const stageX = (pointer.x - stage.x()) / stage.scaleX();
      const stageY = (pointer.y - stage.y()) / stage.scaleY();
      
      const snapDistance = currentItem.file === 'wall' ? 20 : 8;
      
      const snapResult = getSnappedPosition(stageX, stageY, currentItem, placedEntities, { 
        scale, 
        snapDistance 
      });
      setSnappedPosition({ x: snapResult.x, y: snapResult.y });
      
      const guides: { x?: number; y?: number } = {};
      if (snapResult.snappedX && snapResult.snapLineX !== undefined) guides.x = snapResult.snapLineX;
      if (snapResult.snappedY && snapResult.snapLineY !== undefined) guides.y = snapResult.snapLineY;
      setSnapGuides(guides);
    } else {
      setSnappedPosition(null);
      setSnapGuides({});
    }
  };

  const handleStageClick = (e: any) => {
    if (e.evt.button !== 0) return;
    
    if (!currentItem) return;

    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    let finalX, finalY;
    if (snappedPosition) {
      finalX = snappedPosition.x;
      finalY = snappedPosition.y;
    } else {
      finalX = (pointer.x - stage.x()) / stage.scaleX();
      finalY = (pointer.y - stage.y()) / stage.scaleY();
    }

    // Special handling for walls
    if (currentItem.file === 'wall') {
      if (!wallStartPoint) {
        // First click - set start point
        setWallStartPoint({ x: finalX, y: finalY });
      } else {
        // Second click - create wall from start to end point
        const newWall: WallItem = {
          id: uuidv4(),
          type: 'wall',
          startX: wallStartPoint.x,
          startY: wallStartPoint.y,
          endX: finalX,
          endY: finalY,
          thickness: 8 // Default wall thickness
        };

        const newEntities = [...placedEntities, newWall];
        historyManager.addToHistory(newEntities);
        setWallStartPoint(null); // Reset for next wall
      }
    } else {
      // Regular item placement
      const newItem: PlacedItem = {
        id: uuidv4(),
        file: currentItem.file,
        type: currentItem.type,
        name: currentItem.name,
        width: currentItem.width,
        height: currentItem.height,
        inverted: currentItem.inverted,
        rotation: currentItem.rotation,
        scale: currentItem.scale,
        x: finalX,
        y: finalY,
      };

      const newEntities = [...placedEntities, newItem];
      historyManager.addToHistory(newEntities);
    }
  };

  const handleStageRightClick = (e: any) => {
    e.evt.preventDefault();
    
    if (currentItem) {
      setCurrentItem(null);
      setWallStartPoint(null); // Reset wall drawing state
    } else if (selectedTool !== 'select') {
      setSelectedTool('select');
    }
  };

  useEffect(() => {
    if (selectedTool !== 'furniture' && selectedTool !== 'wall') {
      setCurrentItem(null);
      setWallStartPoint(null);
    }
  }, [selectedTool]);

  if (!isClient) {
    return null;
  }

  return (
    <>
        {historyManager.component}
        <KeyboardManager
            currentItem={currentItem}
            onItemChange={setCurrentItem}
            screenCursorPos={screenCursorPos}
            stageScale={scale}
        />
        {currentItem && currentItem.file !== 'wall' && (
            <PreviewIcon
            type={currentItem.type}
            file={currentItem.file}
            width={currentItem.width}
            height={currentItem.height}
            x={snappedPosition ? snappedPosition.x * scale + position.x : screenCursorPos.x}
            y={snappedPosition ? snappedPosition.y * scale + position.y : screenCursorPos.y}
            scale={scale}
            inverted={currentItem.inverted}
            rotation={currentItem.rotation}
            itemScale={currentItem.scale}
            />
        )}
        <Toolbar
            selectedTool={selectedTool}
            onToolSelect={setSelectedTool}
            items={items}
            currentItem={currentItem}
            onItemSelect={setCurrentItemWithDefaults}
        />
        <div className="grid-background">
            <Stage
                width={innerWidth}
                height={innerHeight}
                scaleX={scale}
                scaleY={scale}
                x={position.x}
                y={position.y}
                onWheel={handleWheel}
                onMouseMove={handleStageMouseMove}
                onMouseDown={handleStageClick}
                onContextMenu={handleStageRightClick}
            >
            <Layer>
                {/* Snap guide lines */}
                {snapGuides.x !== undefined && (
                    <Line
                        points={[snapGuides.x, -10000, snapGuides.x, 10000]}
                        stroke="#3b82f6"
                        strokeWidth={1 / scale}
                        opacity={0.4}
                        listening={false}
                    />
                )}
                {snapGuides.y !== undefined && (
                    <Line
                        points={[-10000, snapGuides.y, 10000, snapGuides.y]}
                        stroke="#3b82f6"
                        strokeWidth={1 / scale}
                        opacity={0.4}
                        listening={false}
                    />
                )}
                
                {/* Wall start point indicator */}
                {wallStartPoint && currentItem?.file === 'wall' && (
                    <Circle
                        x={wallStartPoint.x}
                        y={wallStartPoint.y}
                        radius={4 / scale}
                        fill="#3b82f6"
                        listening={false}
                    />
                )}
                
                {/* Preview line for wall drawing */}
                {wallStartPoint && currentItem?.file === 'wall' && snappedPosition && (
                    <Line
                        points={[wallStartPoint.x, wallStartPoint.y, snappedPosition.x, snappedPosition.y]}
                        stroke="#64748b"
                        strokeWidth={8 / scale}
                        opacity={0.5}
                        listening={false}
                    />
                )}
                
                {/* Placed entities */}
                {placedEntities.map((entity) => {
                    if (entity.type === 'wall') {
                        const wall = entity as WallItem;
                        return (
                            <Line
                                key={wall.id}
                                points={[wall.startX, wall.startY, wall.endX, wall.endY]}
                                stroke="#374151" // Closest to #2E3D4D in Tailwind (gray-700)
                                strokeWidth={wall.thickness / scale}
                                listening={false}
                            />
                        );
                    } else {
                        const item = entity as PlacedItem;
                        return (
                            <PlacedIcon 
                                key={item.id} 
                                type={item.type} 
                                file={item.file}
                                width={item.width}
                                height={item.height}
                                x={item.x} 
                                y={item.y}
                                inverted={item.inverted}
                                rotation={item.rotation}
                                itemScale={item.scale}
                            />
                        );
                    }
                })}
            </Layer>
            </Stage>
        </div>
    </>
  );
}
