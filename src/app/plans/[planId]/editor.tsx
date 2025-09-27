"use client";

import { useState } from 'react';
import { useWindow } from '@/hooks/useWindow';
import { useZoom } from '@/hooks/useZoom';
import { Stage, Layer, Rect, Circle } from 'react-konva';
import Toolbar, { ToolType } from './toolBar';

export default function Editor() {
    const { innerWidth, innerHeight } = useWindow();
    const [selectedTool, setSelectedTool] = useState<ToolType>('select');
    const { scale, position, handleWheel, handleDragEnd } = useZoom();

    return (
        <>
            <Toolbar 
                selectedTool={selectedTool} 
                onToolSelect={setSelectedTool} 
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
                    onDragEnd={handleDragEnd}
                    draggable
                >
                    <Layer>
                        <Rect
                            x={20}
                            y={50}
                            width={100}
                            height={100}
                            fill="red"
                            shadowBlur={10}
                            draggable
                        />
                        <Circle
                            x={200}
                            y={100}
                            radius={50}
                            fill="green"
                            draggable
                        />
                    </Layer>
                </Stage>
            </div>
        </>
    )
}