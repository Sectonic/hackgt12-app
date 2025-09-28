import { Point } from "./types";

// Grid snapping
export function snapPoint(point: Point, gridSize: number = 16): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

// Distance between two points
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Check if two line segments intersect
export function intersectSegments(
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point
): Point | null {
  const dax = a2.x - a1.x;
  const day = a2.y - a1.y;
  const dbx = b2.x - b1.x;
  const dby = b2.y - b1.y;
  const dx = a1.x - b1.x;
  const dy = a1.y - b1.y;

  const det = dbx * day - dby * dax;
  if (Math.abs(det) < 1e-10) return null; // Parallel lines

  const u = (dby * dx - dbx * dy) / det;
  const v = (dax * dy - day * dx) / det;

  if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
    return {
      x: a1.x + u * dax,
      y: a1.y + u * day,
    };
  }

  return null;
}

// Check if a point is inside a polygon using ray casting
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  let j = polygon.length - 1;

  for (let i = 0; i < polygon.length; i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
    j = i;
  }

  return inside;
}

// Get bounding box of a polygon
export function getBoundingBox(points: Point[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// Calculate angle between two points in degrees
export function angleBetweenPoints(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

// Rotate a point around another point
export function rotatePoint(
  point: Point,
  center: Point,
  angleInDegrees: number
): Point {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  const cos = Math.cos(angleInRadians);
  const sin = Math.sin(angleInRadians);

  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

// Snap angle to 15-degree increments when Shift is held
export function snapAngle(angle: number, snapIncrement: number = 15): number {
  return Math.round(angle / snapIncrement) * snapIncrement;
}

// Check if a point is near a line segment (for selection)
export function isPointNearLine(
  point: Point,
  lineStart: Point,
  lineEnd: Point,
  threshold: number = 5
): boolean {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) return distance(point, lineStart) <= threshold;

  let param = dot / lenSq;
  param = Math.max(0, Math.min(1, param));

  const closestPoint = {
    x: lineStart.x + param * C,
    y: lineStart.y + param * D,
  };

  return distance(point, closestPoint) <= threshold;
}