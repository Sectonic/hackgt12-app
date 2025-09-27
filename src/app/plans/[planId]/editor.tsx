"use client";

import { useEffect, useState } from 'react';
import { useWindow } from '@/hooks/useWindow';
import { useZoom } from '@/hooks/useZoom';
import { Stage, Layer } from 'react-konva';
import Toolbar, { ToolType } from './toolBar';
import { PlacedIcon, PreviewIcon } from './IconComponents';
import { Item, PlacedItem } from './types';
import { v4 as uuidv4 } from 'uuid';
import History from '@/components/History';
import KeyboardManager from '@/components/KeyboardManager';

interface EditorProps {
  items: Item[];
}

export default function Editor({ items }: EditorProps) {
  const { innerWidth, innerHeight } = useWindow();
  const [selectedTool, setSelectedTool] = useState<ToolType>('select');
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [screenCursorPos, setScreenCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
  const [isClient, setIsClient] = useState(false);
  const { scale, position, handleWheel } = useZoom();

  const historyManager = History<PlacedItem[]>({
    initialState: [],
    onChange: setPlacedItems,
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
  };

  const handleStageClick = (e: any) => {
    if (e.evt.button !== 0) return;
    
    if (!currentItem) return;

    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const stageX = (pointer.x - stage.x()) / stage.scaleX();
    const stageY = (pointer.y - stage.y()) / stage.scaleY();

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
      x: stageX,
      y: stageY,
    };

    const newPlacedItems = [...placedItems, newItem];
    historyManager.addToHistory(newPlacedItems);
  };

  const handleStageRightClick = (e: any) => {
    e.evt.preventDefault();
    
    if (currentItem) {
      setCurrentItem(null);
    } else if (selectedTool !== 'select') {
      setSelectedTool('select');
    }
  };

  useEffect(() => {
    if (selectedTool !== 'furniture' && selectedTool !== 'wall') {
      setCurrentItem(null);
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
        {currentItem && (
            <PreviewIcon
            type={currentItem.type}
            file={currentItem.file}
            width={currentItem.width}
            height={currentItem.height}
            x={screenCursorPos.x}
            y={screenCursorPos.y}
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
                {placedItems.map((item) => (
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
                ))}
            </Layer>
            </Stage>
        </div>
    </>
  );
}
