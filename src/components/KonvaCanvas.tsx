import React from 'react';
import { Stage, Layer, Line, Circle, Group, Rect } from 'react-konva';
import { PlacedIcon } from '@/app/plans/[planId]/IconComponents';
import {
  PlacedEntity,
  PlacedItem,
  WallItem,
  Item,
  ComputedRoom,
  NOT_IN_ROOM_ID,
  FlooringType
} from '@/app/plans/[planId]/types';
import { getItemLayer, ItemLayer } from '@/utils/layering';
import { RoomBuilderState } from '@/utils/roomBuilder';

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return hex;
  }

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return hex;
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const FLOORING_PATTERN_SOURCES: Record<FlooringType, string> = {
  floor_tile: '/icons/furniture/floor_tile.svg',
  floor_wood: '/icons/furniture/floor_wood.svg',
  floor_stone: '/icons/furniture/floor_stone.svg',
  floor_carpet: '/icons/furniture/floor_carpet.svg'
};

interface KonvaCanvasProps {
  width: number;
  height: number;
  scale: number;
  position: { x: number; y: number };
  placedEntities: PlacedEntity[];
  rooms: ComputedRoom[];
  selectedItems: PlacedEntity[];
  itemValidityMap: Map<string, boolean>;
  snapGuides: { x?: number; y?: number };
  wallStartPoint: { x: number; y: number } | null;
  snappedPosition: { x: number; y: number } | null;
  currentItem: Item | null;
  isRoomToolActive: boolean;
  roomToolMode: 'view' | 'creating' | 'editing';
  activeRoomId: string | null;
  roomBuilderState: RoomBuilderState;
  roomColorMap: Map<string, string | undefined>;
  onWheel: (e: any) => void;
  onMouseMove: (e: any) => void;
  onMouseDown: (e: any) => void;
  onMouseUp: (e: any) => void;
  onClick: (e: any) => void;
  onContextMenu: (e: any) => void;
}

export default function KonvaCanvas({
  width,
  height,
  scale,
  position,
  placedEntities,
  rooms,
  selectedItems,
  itemValidityMap,
  snapGuides,
  wallStartPoint,
  snappedPosition,
  currentItem,
  isRoomToolActive,
  roomToolMode,
  activeRoomId,
  roomBuilderState,
  roomColorMap,
  onWheel,
  onMouseMove,
  onMouseDown,
  onMouseUp,
  onClick,
  onContextMenu
}: KonvaCanvasProps) {

  const [floorPatternImages, setFloorPatternImages] = React.useState<Record<FlooringType, HTMLImageElement | null>>({
    floor_tile: null,
    floor_wood: null,
    floor_stone: null,
    floor_carpet: null
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    let isCancelled = false;

    (Object.entries(FLOORING_PATTERN_SOURCES) as [FlooringType, string][]).forEach(([flooringType, src]) => {
      const image = new window.Image();
      image.crossOrigin = 'anonymous';
      image.src = src;
      image.onload = () => {
        if (isCancelled) return;
        setFloorPatternImages((prev) => {
          if (prev[flooringType] === image) {
            return prev;
          }
          return {
            ...prev,
            [flooringType]: image
          };
        });
      };
      image.onerror = () => {
        if (isCancelled) return;
        setFloorPatternImages((prev) => ({
          ...prev,
          [flooringType]: null
        }));
      };
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Group items by layer
  const itemsByLayer = React.useMemo(() => {
    const layers: Record<ItemLayer, PlacedItem[]> = {
      [ItemLayer.FLOOR]: [],
      [ItemLayer.LARGE_FURNITURE]: [],
      [ItemLayer.MEDIUM_FURNITURE]: [],
      [ItemLayer.SMALL_ITEMS]: [],
      [ItemLayer.DOORS_WINDOWS]: []
    };

    placedEntities
      .filter(entity => entity.type !== 'wall')
      .filter(entity => !selectedItems.some(selected => selected.id === entity.id))
      .forEach(entity => {
        const item = entity as PlacedItem;
        const layer = getItemLayer(item);
        layers[layer].push(item);
      });

    return layers;
  }, [placedEntities, selectedItems]);

  const walls = React.useMemo(() => 
    placedEntities.filter(entity => entity.type === 'wall') as WallItem[],
    [placedEntities]
  );

  const isRoomWorkflowActive = roomToolMode !== 'view';
  const builderBaseColor = roomToolMode === 'editing' && activeRoomId
    ? roomColorMap.get(activeRoomId) ?? '#f97316'
    : '#f97316';
  const builderStrokeColor = builderBaseColor;
  const builderFillColor = hexToRgba(builderBaseColor, 0.2);
  const builderDashPattern: [number, number] = [12 / scale, 8 / scale];
  const dimmedItemOpacity = isRoomWorkflowActive ? 0.35 : 1;
  const dimmedWallOpacity = isRoomWorkflowActive ? 0.3 : 1;
  const builderHasPath = roomBuilderState.nodeOrder.length >= 2;
  const builderHasPolygon = roomBuilderState.nodeOrder.length >= 3;

  const renderItemsForLayer = (items: PlacedItem[], layer: ItemLayer) => {
    return items.map((item) => {
      const baseScale = item.scale ?? 1;
      const scaleX = item.inverted ? -baseScale : baseScale;
      const scaleY = baseScale;
      const color = item.roomId && item.roomId !== NOT_IN_ROOM_ID
        ? roomColorMap.get(item.roomId ?? '') ?? '#cbd5f5'
        : undefined;
      const overlayOpacity = item.roomId && item.roomId === activeRoomId ? 0.35 : 0.18;
      const shouldRenderRoomOverlay = Boolean(color && (isRoomToolActive || layer === ItemLayer.FLOOR));
      const groupOpacity = layer === ItemLayer.FLOOR && isRoomWorkflowActive
        ? item.roomId === activeRoomId ? 1 : dimmedItemOpacity
        : dimmedItemOpacity;

      return (
        <Group
          key={item.id}
          x={item.x}
          y={item.y}
          rotation={item.rotation}
          scaleX={scaleX}
          scaleY={scaleY}
          opacity={groupOpacity}
        >
          {shouldRenderRoomOverlay && (
            <Rect
              x={-item.width / 2}
              y={-item.height / 2}
              width={item.width}
              height={item.height}
              cornerRadius={4}
              fill={color}
              opacity={overlayOpacity}
              listening={false}
            />
          )}
          <PlacedIcon
            type={item.type}
            file={item.file}
            width={item.width}
            height={item.height}
            x={0}
            y={0}
            inverted={false}
            rotation={0}
            scale={1}
            itemScale={1}
          />
        </Group>
      );
    });
  };

  return (
    <div className="grid-background">
      <Stage
        width={width}
        height={height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        onWheel={onWheel}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onClick={onClick}
        onContextMenu={onContextMenu}
      >
        {/* Layer 1: Room overlays (bottom) */}
        <Layer listening={false}>
          {rooms.map((room) => {
            if (room.polygonPoints.length < 6) {
              return null;
            }

            const isUnassigned = room.id === NOT_IN_ROOM_ID;
            const isActiveRoom = activeRoomId === room.id;
            const roomFill = isUnassigned ? undefined : room.color;
            let fillOpacity = isActiveRoom ? 0.35 : isUnassigned ? 0.08 : 0.18;
            let strokeColor: string | undefined = isActiveRoom ? (room.color ?? '#2563eb') : undefined;
            let strokeWidth = isActiveRoom ? 3 / scale : 0;
            const patternImage = floorPatternImages[room.flooring];

            if (isRoomWorkflowActive) {
              // When actively creating/editing rooms, use blue overlay styling
              fillOpacity = isActiveRoom ? 0.45 : isUnassigned ? 0.05 : 0.08;
              strokeColor = isActiveRoom ? (room.color ?? builderStrokeColor) : undefined;
              strokeWidth = isActiveRoom ? Math.max(3 / scale, 2 / scale) : 0;
            }

            return (
              <React.Fragment key={`room-${room.id}`}>
                {patternImage && (
                  <Line
                    points={room.polygonPoints}
                    closed
                    fillPatternImage={patternImage}
                    fillPatternRepeat="repeat"
                    strokeEnabled={false}
                    listening={false}
                  />
                )}
                {roomFill && (
                  <Line
                    points={room.polygonPoints}
                    closed
                    fill={roomFill}
                    opacity={fillOpacity}
                    strokeEnabled={false}
                    listening={false}
                  />
                )}
                {(strokeColor || strokeWidth > 0) && (
                  <Line
                    points={room.polygonPoints}
                    closed
                    fillEnabled={false}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    opacity={fillOpacity}
                    listening={false}
                  />
                )}
              </React.Fragment>
            );
          })}
        </Layer>

        {/* Layer 1b: Room builder aids */}
        <Layer listening={false}>
          {isRoomWorkflowActive && builderHasPath && (
            <Line
              points={roomBuilderState.nodeOrder.flatMap((node) => [node.x, node.y])}
              stroke={builderStrokeColor}
              strokeWidth={Math.max(3 / scale, 2.2 / scale)}
              dash={builderDashPattern}
              closed={roomBuilderState.isClosed}
              fill={builderHasPolygon ? builderFillColor : undefined}
              listening={false}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </Layer>

        {/* Layer 2: Floor elements */}
        <Layer listening={true}>
          {renderItemsForLayer(itemsByLayer[ItemLayer.FLOOR], ItemLayer.FLOOR)}
        </Layer>

        {/* Layer 3: Walls */}
        <Layer listening={false}>
          {walls.map((wall) => {
            const isBuilderWall = isRoomWorkflowActive && roomBuilderState.wallSequence.some((segment) => segment.wallId === wall.id);
            const isActiveRoomWall = activeRoomId
              ? (wall.roomIds ?? []).includes(activeRoomId)
              : false;
            const activeColor = activeRoomId ? roomColorMap.get(activeRoomId) ?? '#2563eb' : '#2563eb';
            const thickness = wall.thickness / scale;

            let strokeColor = '#374151';
            let strokeWidth = thickness;
            let opacity = isRoomWorkflowActive ? dimmedWallOpacity : 1;

            if (isBuilderWall) {
              strokeColor = builderStrokeColor;
              strokeWidth = Math.max(thickness, 3 / scale);
              opacity = 0.92;
            } else if (isActiveRoomWall) {
              strokeColor = isRoomWorkflowActive ? (roomColorMap.get(activeRoomId as string) ?? builderStrokeColor) : activeColor;
              strokeWidth = Math.max(thickness, isRoomWorkflowActive ? 3 / scale : 2.5 / scale);
              opacity = isRoomWorkflowActive ? 0.9 : 0.85;
            }

            return (
              <React.Fragment key={wall.id}>
                <Line
                  points={[wall.startX, wall.startY, wall.endX, wall.endY]}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  opacity={opacity}
                  listening={false}
                  lineCap="round"
                />
                {!isRoomWorkflowActive && (
                  <>
                    <Circle
                      x={wall.startX}
                      y={wall.startY}
                      radius={6 / scale}
                      fill="#4b5563"
                      opacity={0.5}
                      listening={false}
                    />
                    <Circle
                      x={wall.endX}
                      y={wall.endY}
                      radius={6 / scale}
                      fill="#4b5563"
                      opacity={0.5}
                      listening={false}
                    />
                  </>
                )}
              </React.Fragment>
            );
          })}
        </Layer>

        {/* Layer 4: Large furniture */}
        <Layer listening={true}>
          {renderItemsForLayer(itemsByLayer[ItemLayer.LARGE_FURNITURE], ItemLayer.LARGE_FURNITURE)}
        </Layer>

        {/* Layer 5: Medium furniture */}
        <Layer listening={true}>
          {renderItemsForLayer(itemsByLayer[ItemLayer.MEDIUM_FURNITURE], ItemLayer.MEDIUM_FURNITURE)}
        </Layer>

        {/* Layer 6: Small items */}
        <Layer listening={true}>
          {renderItemsForLayer(itemsByLayer[ItemLayer.SMALL_ITEMS], ItemLayer.SMALL_ITEMS)}
        </Layer>

        {/* Layer 7: Doors and Windows (highest selectable layer) */}
        <Layer listening={true}>
          {renderItemsForLayer(itemsByLayer[ItemLayer.DOORS_WINDOWS], ItemLayer.DOORS_WINDOWS)}
        </Layer>

        {/* Layer 8: Interface elements (top) */}
        <Layer listening={false}>
          {/* Snap guides */}
          {snapGuides.x !== undefined && (
            <Line
              points={[snapGuides.x, -10000, snapGuides.x, 10000]}
              stroke="rgba(59, 130, 246, 0.6)"
              strokeWidth={1 / scale}
              listening={false}
            />
          )}
          {snapGuides.y !== undefined && (
            <Line
              points={[-10000, snapGuides.y, 10000, snapGuides.y]}
              stroke="rgba(59, 130, 246, 0.6)"
              strokeWidth={1 / scale}
              listening={false}
            />
          )}

          {/* Wall placement indicators */}
          {currentItem?.file === 'wall' && (
            <>
              {!wallStartPoint && snappedPosition && (
                <Circle
                  x={snappedPosition.x}
                  y={snappedPosition.y}
                  radius={8 / scale}
                  fill="#3b82f6"
                  stroke="#1d4ed8"
                  strokeWidth={2 / scale}
                  listening={false}
                />
              )}
              
              {wallStartPoint && (
                <Circle
                  x={wallStartPoint.x}
                  y={wallStartPoint.y}
                  radius={8 / scale}
                  fill="#3b82f6"
                  listening={false}
                />
              )}
              
              {wallStartPoint && snappedPosition && (
                <>
                  <Circle
                    x={snappedPosition.x}
                    y={snappedPosition.y}
                    radius={8 / scale}
                    fill="#10b981"
                    stroke="#059669"
                    strokeWidth={2 / scale}
                    listening={false}
                  />
                  <Line
                    points={[wallStartPoint.x, wallStartPoint.y, snappedPosition.x, snappedPosition.y]}
                    stroke="#64748b"
                    strokeWidth={16 / scale}
                    opacity={0.5}
                    listening={false}
                  />
                </>
              )}
            </>
          )}
        </Layer>
      </Stage>
    </div>
  );
}
