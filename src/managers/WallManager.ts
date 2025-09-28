import { WallItem, PlacedEntity } from '@/app/plans/[planId]/types';
import { v4 as uuidv4 } from 'uuid';

export interface WallState {
  startPoint: { x: number; y: number } | null;
}

export class WallManager {
  private state: WallState;
  private onStateChange: (state: WallState) => void;

  constructor(
    initialState: WallState,
    onStateChange: (state: WallState) => void
  ) {
    this.state = initialState;
    this.onStateChange = onStateChange;
  }

  get startPoint(): { x: number; y: number } | null {
    return this.state.startPoint;
  }

  get hasStartPoint(): boolean {
    return this.state.startPoint !== null;
  }

  setStartPoint(x: number, y: number) {
    this.state.startPoint = { x, y };
    this.emitStateChange();
  }

  createWall(endX: number, endY: number): WallItem | null {
    if (!this.state.startPoint) return null;

    const wall: WallItem = {
      id: uuidv4(),
      type: 'wall',
      startX: this.state.startPoint.x,
      startY: this.state.startPoint.y,
      endX,
      endY,
      thickness: 16
    };

    this.reset();
    return wall;
  }

  reset() {
    this.state.startPoint = null;
    this.emitStateChange();
  }

  private emitStateChange() {
    this.onStateChange({ ...this.state });
  }
}
