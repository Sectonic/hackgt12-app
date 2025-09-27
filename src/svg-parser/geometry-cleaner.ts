import type { Point, Segment, SvgPolyline } from './types';

/**
 * Advanced geometric processing for SVG floor plan cleaning
 * Implements coordinate snapping, segment merging, and noise reduction
 */

export class GeometryCleaner {
  private epsilon: number;
  private angleThreshold: number;
  private gapThreshold: number;

  constructor(
    epsilon = 1e-3,
    angleThreshold = 2, // degrees
    gapThreshold = 0.02 // meters
  ) {
    this.epsilon = epsilon;
    this.angleThreshold = angleThreshold;
    this.gapThreshold = gapThreshold;
  }

  /**
   * Snap coordinates to a grid to eliminate noise
   */
  snapCoordinates(points: Point[]): Point[] {
    return points.map(point => ({
      x: Math.round(point.x / this.epsilon) * this.epsilon,
      y: Math.round(point.y / this.epsilon) * this.epsilon
    }));
  }

  /**
   * Remove duplicate consecutive points
   */
  removeDuplicates(points: Point[]): Point[] {
    if (points.length < 2) return points;
    
    const cleaned: Point[] = [points[0]];
    
    for (let i = 1; i < points.length; i++) {
      const prev = cleaned[cleaned.length - 1];
      const current = points[i];
      
      if (this.distance(prev, current) > this.epsilon) {
        cleaned.push(current);
      }
    }
    
    return cleaned;
  }

  /**
   * Merge nearly collinear segments
   */
  mergeCollinearSegments(segments: Segment[]): Segment[] {
    if (segments.length < 2) return segments;
    
    const merged: Segment[] = [];
    let current = segments[0];
    
    for (let i = 1; i < segments.length; i++) {
      const next = segments[i];
      
      if (this.areCollinear(current, next)) {
        // Extend current segment to include next
        current = {
          ...current,
          b: next.b,
          id: current.id || next.id
        };
      } else {
        merged.push(current);
        current = next;
      }
    }
    
    merged.push(current);
    return merged;
  }

  /**
   * Check if two segments are nearly collinear
   */
  private areCollinear(seg1: Segment, seg2: Segment): boolean {
    // Check if segments share an endpoint
    const sharedEndpoint = this.findSharedEndpoint(seg1, seg2);
    if (!sharedEndpoint) return false;
    
    // Calculate angle between segments
    const angle = this.calculateAngle(seg1, seg2);
    return Math.abs(angle) < this.angleThreshold;
  }

  /**
   * Find shared endpoint between two segments
   */
  private findSharedEndpoint(seg1: Segment, seg2: Segment): Point | null {
    const endpoints = [
      { seg: seg1, point: seg1.a },
      { seg: seg1, point: seg1.b },
      { seg: seg2, point: seg2.a },
      { seg: seg2, point: seg2.b }
    ];
    
    for (let i = 0; i < endpoints.length; i++) {
      for (let j = i + 1; j < endpoints.length; j++) {
        if (endpoints[i].seg !== endpoints[j].seg && 
            this.distance(endpoints[i].point, endpoints[j].point) < this.epsilon) {
          return endpoints[i].point;
        }
      }
    }
    
    return null;
  }

  /**
   * Calculate angle between two segments
   */
  private calculateAngle(seg1: Segment, seg2: Segment): number {
    const v1 = this.vector(seg1.a, seg1.b);
    const v2 = this.vector(seg2.a, seg2.b);
    
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    
    const cosAngle = dot / (mag1 * mag2);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    
    return (angle * 180) / Math.PI;
  }

  /**
   * Create vector from two points
   */
  private vector(a: Point, b: Point): Point {
    return { x: b.x - a.x, y: b.y - a.y };
  }

  /**
   * Calculate distance between two points
   */
  private distance(a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Detect shared walls by finding overlapping collinear segments
   */
  detectSharedWalls(segments: Segment[]): Array<{ wall1: Segment; wall2: Segment; overlap: number }> {
    const sharedWalls: Array<{ wall1: Segment; wall2: Segment; overlap: number }> = [];
    
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const seg1 = segments[i];
        const seg2 = segments[j];
        
        if (this.areCollinear(seg1, seg2)) {
          const overlap = this.calculateOverlap(seg1, seg2);
          if (overlap > 0.1) { // Minimum overlap threshold
            sharedWalls.push({ wall1: seg1, wall2: seg2, overlap });
          }
        }
      }
    }
    
    return sharedWalls;
  }

  /**
   * Calculate overlap length between two collinear segments
   */
  private calculateOverlap(seg1: Segment, seg2: Segment): number {
    // Project segments onto a line and find intersection
    const line1 = this.getLineProjection(seg1);
    const line2 = this.getLineProjection(seg2);
    
    const start = Math.max(line1.start, line2.start);
    const end = Math.min(line1.end, line2.end);
    
    return Math.max(0, end - start);
  }

  /**
   * Get line projection for overlap calculation
   */
  private getLineProjection(segment: Segment): { start: number; end: number } {
    // Simple projection onto x-axis for now
    const start = Math.min(segment.a.x, segment.b.x);
    const end = Math.max(segment.a.x, segment.b.x);
    return { start, end };
  }

  /**
   * Clean and process polylines
   */
  cleanPolylines(polylines: SvgPolyline[]): SvgPolyline[] {
    return polylines.map(polyline => {
      let cleaned = this.snapCoordinates(polyline.points);
      cleaned = this.removeDuplicates(cleaned);
      
      return {
        ...polyline,
        points: cleaned
      };
    });
  }

  /**
   * Convert polylines to segments for wall analysis
   */
  polylinesToSegments(polylines: SvgPolyline[]): Segment[] {
    const segments: Segment[] = [];
    
    polylines.forEach((polyline, polyIndex) => {
      const points = polyline.points;
      
      for (let i = 0; i < points.length - 1; i++) {
        segments.push({
          a: points[i],
          b: points[i + 1],
          id: `${polyIndex}-${i}`,
          thickness: polyline.strokeWidth
        });
      }
    });
    
    return segments;
  }

  /**
   * Complete geometric cleaning pipeline
   */
  processGeometry(polylines: SvgPolyline[]): {
    cleanedPolylines: SvgPolyline[];
    segments: Segment[];
    sharedWalls: Array<{ wall1: Segment; wall2: Segment; overlap: number }>;
  } {
    // Step 1: Clean polylines
    const cleanedPolylines = this.cleanPolylines(polylines);
    
    // Step 2: Convert to segments
    const segments = this.polylinesToSegments(cleanedPolylines);
    
    // Step 3: Merge collinear segments
    const mergedSegments = this.mergeCollinearSegments(segments);
    
    // Step 4: Detect shared walls
    const sharedWalls = this.detectSharedWalls(mergedSegments);
    
    return {
      cleanedPolylines,
      segments: mergedSegments,
      sharedWalls
    };
  }
}
