import { useState, useCallback, useEffect } from 'react';

export function useZoom() {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const baseGridSize = 35;
    const adjustedGridSize = baseGridSize * scale;
    document.documentElement.style.setProperty('--grid-size', `${adjustedGridSize}px`);
  }, [scale]);

  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault();

    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const isPinchGesture = e.evt.ctrlKey || e.evt.metaKey;

    if (isPinchGesture) {
      const oldScale = stage.scaleX();
      const scaleBy = 1.02;

      const mousePointTo = {
        x: (pointer.x - offset.x) / oldScale,
        y: (pointer.y - offset.y) / oldScale,
      };

      const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
      const clampedScale = Math.max(0.05, Math.min(10, newScale));

      setScale(clampedScale);
      setOffset({
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      });
    } else {
      setOffset((prev) => ({
        x: prev.x - e.evt.deltaX,
        y: prev.y - e.evt.deltaY,
      }));
    }
  }, [offset]);

  const resetZoom = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(10, prev * 1.1));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(0.05, prev / 1.1));
  }, []);

  return {
    scale,
    position: offset,
    handleWheel,
    resetZoom,
    zoomIn,
    zoomOut,
    setPosition: setOffset,
  };
}

export default useZoom;
