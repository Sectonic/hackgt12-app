import { Image } from 'react-konva';
import useImage from 'use-image';

interface PlacedIconProps {
  type: 'furniture' | 'foundational';
  file: string;
  width: number;
  height: number;
  x: number;
  y: number;
  scale?: number;
  opacity?: number;
  draggable?: boolean;
  inverted?: boolean;
  rotation?: number;
  itemScale?: number;
}

export function PlacedIcon({ 
  type, 
  file, 
  width, 
  height, 
  x, 
  y, 
  scale = 1, 
  opacity = 1, 
  draggable = false,
  inverted = false,
  rotation = 0,
  itemScale = 1
}: PlacedIconProps) {
  const iconPath = type === 'furniture' ? `/icons/furniture/${file}.svg` : `/icons/foundational/${file}.svg`;
  const [image] = useImage(iconPath);

  if (!image) return null;

  const finalScaleX = scale * itemScale * (inverted ? -1 : 1);
  const finalScaleY = scale * itemScale;

  return (
    <Image
      image={image}
      x={x}
      y={y}
      width={width}
      height={height}
      scaleX={finalScaleX}
      scaleY={finalScaleY}
      rotation={rotation}
      opacity={opacity}
      draggable={draggable}
      offsetX={width / 2}
      offsetY={height / 2}
    />
  );
}

export function PreviewIcon({ 
  type, 
  file, 
  width, 
  height, 
  x, 
  y, 
  scale = 1, 
  inverted = false, 
  rotation = 0,
  itemScale = 1,
  isInvalid = false
}: { 
  type: 'furniture' | 'foundational'; 
  file: string;
  width: number;
  height: number;
  x: number; 
  y: number;
  scale?: number;
  inverted?: boolean;
  rotation?: number;
  itemScale?: number;
  isInvalid?: boolean;
}) {
  const iconPath = type === 'furniture' ? `/icons/furniture/${file}.svg` : `/icons/foundational/${file}.svg`;
  
  const scaledWidth = width * scale * itemScale;
  const scaledHeight = height * scale * itemScale;
  
  let transform = 'translate3d(0, 0, 0)';
  if (rotation !== 0) {
    transform += ` rotate(${rotation}deg)`;
  }
  if (inverted) {
    transform += ' scaleX(-1)';
  }
  
  const invalidStyles = isInvalid
    ? {
        opacity: 0.35,
        boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.5)',
        filter: 'sepia(0.9) hue-rotate(320deg) saturate(3) brightness(0.9)',
      }
    : {};

  return (
    <>
      <div
        style={{
          position: 'fixed',
          left: x - scaledWidth / 2 - 6,
          top: y - scaledHeight / 2 - 6,
          width: scaledWidth + 12,
          height: scaledHeight + 12,
          borderRadius: '4px',
          border: isInvalid ? '2px solid rgba(239, 68, 68, 0.9)' : '2px solid rgba(59, 130, 246, 0.2)',
          backgroundColor: isInvalid ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
          pointerEvents: 'none',
          zIndex: 4,
          transform,
          transformOrigin: 'center center',
        }}
      />
      <img
        src={iconPath}
        alt={file}
        style={{
          position: 'fixed',
          left: x - scaledWidth / 2,
          top: y - scaledHeight / 2,
          width: scaledWidth,
          height: scaledHeight,
          opacity: isInvalid ? 0.35 : 0.6,
          pointerEvents: 'none',
          zIndex: 5,
          transform,
          transformOrigin: 'center center',
          borderRadius: '4px',
          ...invalidStyles,
        }}
      />
    </>
  );
}
