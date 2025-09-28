// Core geometric types for SVG floor plan processing
export interface Point {
  x: number;
  y: number;
}

export interface Segment {
  a: Point;
  b: Point;
  id?: string;
  thickness?: number;
}

export interface SvgPolyline {
  points: Point[];
  id?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface Annotation {
  text: string;
  position: Point;
  id?: string;
}

export interface Room {
  id: string;
  polygon: Point[];
  area: number;
  centroid: Point;
  name?: string;
  type?: string;
  level?: number;
}

export interface Wall {
  id: string;
  segments: Segment[];
  thickness?: number;
  material?: string;
}

export interface Opening {
  id: string;
  wallId: string;
  position: Point;
  offset: number;
  type: 'door' | 'window';
  width: number;
  height: number;
}

export interface ParsedSvg {
  polylines: SvgPolyline[];
  annotations: Annotation[];
  viewBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  units?: string;
  scale?: number;
}

export interface PlanData {
  rooms: Room[];
  walls: Wall[];
  openings: Opening[];
  annotations: Annotation[];
  metadata: {
    totalArea: number;
    roomCount: number;
    wallLength: number;
  };
}

export interface LLMResponse {
  rooms: Array<{
    id: string;
    name: string;
    type: string;
    level?: number;
  }>;
  openings: Array<{
    id: string;
    type: 'door' | 'window';
    width: number;
    height: number;
  }>;
  validation: {
    hasSelfIntersections: boolean;
    isConnected: boolean;
    issues: string[];
  };
}
