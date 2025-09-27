import { useState, useCallback, useEffect } from 'react';

export function useZoom() {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const baseGridSize = 35;
    const adjustedGridSize = baseGridSize * scale;
    document.documentElement.style.setProperty('--grid-size', `${adjustedGridSize}px`);
  }, [scale]);

  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault();
    
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    
    // Much smoother scaling - smaller increments
    const deltaY = e.evt.deltaY;
    const scaleBy = 1.02; // Very small increments for smoothness
    
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    
    const newScale = deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    
    // Wider scale limits for more flexibility
    const clampedScale = Math.max(0.05, Math.min(10, newScale));
    
    setScale(clampedScale);
    setPosition({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(10, prev * 1.1));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(0.05, prev / 1.1));
  }, []);

  const handleDragEnd = useCallback((e: any) => {
    setPosition({
      x: e.target.x(),
      y: e.target.y(),
    });
  }, []);

  return {
    scale,
    position,
    handleWheel,
    handleDragEnd,
    resetZoom,
    zoomIn,
    zoomOut,
    setPosition,
  };
}

export default useZoom;
