import type { Point, Segment, Room } from './types';

/**
 * Advanced room detection using planar graph algorithms
 * Implements cycle detection for finding closed room boundaries
 */

export class RoomDetector {
  private tolerance: number;
  private minArea: number;

  constructor(tolerance = 1e-3, minArea = 0.1) {
    this.tolerance = tolerance;
    this.minArea = minArea;
  }

  /**
   * Build planar graph from wall segments
   */
  buildPlanarGraph(segments: Segment[]): Map<string, Point[]> {
    const graph = new Map<string, Point[]>();
    
    segments.forEach(segment => {
      const keyA = this.pointKey(segment.a);
      const keyB = this.pointKey(segment.b);
      
      if (!graph.has(keyA)) graph.set(keyA, []);
      if (!graph.has(keyB)) graph.set(keyB, []);
      
      graph.get(keyA)!.push(segment.b);
      graph.get(keyB)!.push(segment.a);
    });
    
    return graph;
  }

  /**
   * Find all simple cycles in the planar graph
   */
  findSimpleCycles(graph: Map<string, Point[]>): Point[][] {
    const cycles: Point[][] = [];
    const visited = new Set<string>();
    
    for (const [startKey, neighbors] of graph) {
      if (visited.has(startKey)) continue;
      
      const startPoint = this.keyToPoint(startKey);
      const cycle = this.findCycleFromPoint(graph, startPoint, visited);
      
      if (cycle && cycle.length >= 3) {
        cycles.push(cycle);
      }
    }
    
    return cycles;
  }

  /**
   * Find cycle starting from a specific point
   */
  private findCycleFromPoint(
    graph: Map<string, Point[]>, 
    startPoint: Point, 
    visited: Set<string>
  ): Point[] | null {
    const startKey = this.pointKey(startPoint);
    const path: Point[] = [startPoint];
    const pathKeys = new Set<string>([startKey]);
    
    return this.dfsFindCycle(graph, startPoint, startPoint, path, pathKeys, visited);
  }

  /**
   * Depth-first search to find cycles
   */
  private dfsFindCycle(
    graph: Map<string, Point[]>,
    current: Point,
    start: Point,
    path: Point[],
    pathKeys: Set<string>,
    visited: Set<string>
  ): Point[] | null {
    const currentKey = this.pointKey(current);
    visited.add(currentKey);
    
    const neighbors = graph.get(currentKey) || [];
    
    for (const neighbor of neighbors) {
      const neighborKey = this.pointKey(neighbor);
      
      // Check if we've found a cycle back to start
      if (neighborKey === this.pointKey(start) && path.length >= 3) {
        return [...path, start];
      }
      
      // Continue DFS if not visited in current path
      if (!pathKeys.has(neighborKey)) {
        path.push(neighbor);
        pathKeys.add(neighborKey);
        
        const result = this.dfsFindCycle(graph, neighbor, start, path, pathKeys, visited);
        if (result) return result;
        
        path.pop();
        pathKeys.delete(neighborKey);
      }
    }
    
    return null;
  }

  /**
   * Filter cycles to find valid rooms
   */
  filterValidRooms(cycles: Point[][]): Point[][] {
    return cycles.filter(cycle => {
      // Check minimum area
      const area = this.calculatePolygonArea(cycle);
      if (area < this.minArea) return false;
      
      // Check for self-intersections
      if (this.hasSelfIntersections(cycle)) return false;
      
      // Check if cycle is counter-clockwise (positive area)
      return area > 0;
    });
  }

  /**
   * Calculate polygon area using shoelace formula
   */
  private calculatePolygonArea(points: Point[]): number {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    
    return Math.abs(area) / 2;
  }

  /**
   * Check for self-intersections in polygon
   */
  private hasSelfIntersections(points: Point[]): boolean {
    const n = points.length;
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue; // Skip adjacent edges
        
        const seg1 = { a: points[i], b: points[(i + 1) % n] };
        const seg2 = { a: points[j], b: points[(j + 1) % n] };
        
        if (this.segmentsIntersect(seg1, seg2)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Check if two segments intersect
   */
  private segmentsIntersect(seg1: { a: Point; b: Point }, seg2: { a: Point; b: Point }): boolean {
    const ccw = (A: Point, B: Point, C: Point) => {
      return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
    };
    
    return ccw(seg1.a, seg2.a, seg2.b) !== ccw(seg1.b, seg2.a, seg2.b) &&
           ccw(seg1.a, seg1.b, seg2.a) !== ccw(seg1.a, seg1.b, seg2.b);
  }

  /**
   * Calculate polygon centroid
   */
  private calculateCentroid(points: Point[]): Point {
    let cx = 0, cy = 0;
    const area = this.calculatePolygonArea(points);
    
    if (area === 0) {
      // Fallback to average of points
      cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
      cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    } else {
      for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        const factor = points[i].x * points[j].y - points[j].x * points[i].y;
        cx += (points[i].x + points[j].x) * factor;
        cy += (points[i].y + points[j].y) * factor;
      }
      
      cx /= (6 * area);
      cy /= (6 * area);
    }
    
    return { x: cx, y: cy };
  }

  /**
   * Convert room polygons to Room objects
   */
  createRooms(roomPolygons: Point[][]): Room[] {
    return roomPolygons.map((polygon, index) => {
      const area = this.calculatePolygonArea(polygon);
      const centroid = this.calculateCentroid(polygon);
      
      return {
        id: `room-${index}`,
        polygon,
        area,
        centroid
      };
    });
  }

  /**
   * Remove holes by nesting analysis
   */
  removeHoles(cycles: Point[][]): Point[][] {
    // Sort cycles by area (largest first)
    const sortedCycles = [...cycles].sort((a, b) => 
      this.calculatePolygonArea(b) - this.calculatePolygonArea(a)
    );
    
    const validRooms: Point[][] = [];
    const processed = new Set<number>();
    
    for (let i = 0; i < sortedCycles.length; i++) {
      if (processed.has(i)) continue;
      
      const outerCycle = sortedCycles[i];
      const holes: Point[][] = [];
      
      // Find holes (smaller cycles inside this one)
      for (let j = i + 1; j < sortedCycles.length; j++) {
        if (processed.has(j)) continue;
        
        const innerCycle = sortedCycles[j];
        if (this.isInside(innerCycle[0], outerCycle)) {
          holes.push(innerCycle);
          processed.add(j);
        }
      }
      
      // Keep the outer boundary, treat holes as openings
      validRooms.push(outerCycle);
      processed.add(i);
    }
    
    return validRooms;
  }

  /**
   * Check if point is inside polygon
   */
  private isInside(point: Point, polygon: Point[]): boolean {
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
          (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  /**
   * Complete room detection pipeline
   */
  detectRooms(segments: Segment[]): Room[] {
    // Step 1: Build planar graph
    const graph = this.buildPlanarGraph(segments);
    
    // Step 2: Find all cycles
    const cycles = this.findSimpleCycles(graph);
    
    // Step 3: Filter valid rooms
    const validCycles = this.filterValidRooms(cycles);
    
    // Step 4: Remove holes
    const roomPolygons = this.removeHoles(validCycles);
    
    // Step 5: Create Room objects
    return this.createRooms(roomPolygons);
  }

  /**
   * Utility methods
   */
  private pointKey(point: Point): string {
    return `${Math.round(point.x / this.tolerance) * this.tolerance},${Math.round(point.y / this.tolerance) * this.tolerance}`;
  }

  private keyToPoint(key: string): Point {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  }
}
