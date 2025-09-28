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
  
  return (
    <img
      src={iconPath}
      alt={file}
      style={{
        position: 'fixed',
        left: x - scaledWidth / 2,
        top: y - scaledHeight / 2,
        width: scaledWidth,
        height: scaledHeight,
        opacity: isInvalid ? 0.3 : 0.5,
        pointerEvents: 'none',
        zIndex: 5,
        transform,
        transformOrigin: 'center center',
        filter: isInvalid ? 'sepia(1) hue-rotate(320deg) saturate(3) brightness(0.8)' : 'none',
        border: isInvalid ? '2px solid #ef4444' : 'none',
        borderRadius: '4px',
      }}
    />
  );
}
