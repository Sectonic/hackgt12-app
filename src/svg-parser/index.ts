import { SVGParser } from './svg-parser';
import { GeometryCleaner } from './geometry-cleaner';
import { RoomDetector } from './room-detector';
import { LLMLabeler } from './llm-labeler';
import { PlanValidator } from './plan-validator';
import type { ParsedSvg, PlanData, LLMResponse } from './types';

/**
 * Complete SVG Floor Plan Parser System
 * Orchestrates all geometric processing, room detection, and LLM integration
 */

export class FloorPlanParser {
  private svgParser: SVGParser;
  private geometryCleaner: GeometryCleaner;
  private roomDetector: RoomDetector;
  private llmLabeler: LLMLabeler;
  private planValidator: PlanValidator;

  constructor(apiKey?: string) {
    this.svgParser = new SVGParser();
    this.geometryCleaner = new GeometryCleaner();
    this.roomDetector = new RoomDetector();
    this.llmLabeler = new LLMLabeler(apiKey || '');
    this.planValidator = new PlanValidator();
  }

  /**
   * Complete floor plan processing pipeline
   */
  async processFloorPlan(svgString: string): Promise<{
    parsedSvg: ParsedSvg;
    planData: PlanData;
    llmResponse?: LLMResponse;
    validation: {
      isValid: boolean;
      issues: string[];
      warnings: string[];
      statistics: {
        roomCount: number;
        totalArea: number;
        wallLength: number;
        openingCount: number;
      };
    };
  }> {
    try {
      // Step 1: Parse SVG
      console.log('Parsing SVG...');
      const parsedSvg = await this.svgParser.parseSVG(svgString);
      
      // Step 2: Geometric cleaning
      console.log('Cleaning geometry...');
      const geometryResult = this.geometryCleaner.processGeometry(parsedSvg.polylines);
      
      // Step 3: Room detection
      console.log('Detecting rooms...');
      const rooms = this.roomDetector.detectRooms(geometryResult.segments);
      
      // Step 4: Create walls from segments
      const walls = this.createWallsFromSegments(geometryResult.segments);
      
      // Step 5: Detect openings
      const openings = this.detectOpenings(geometryResult.segments, rooms);
      
      // Step 6: Create plan data
      const planData: PlanData = {
        rooms,
        walls,
        openings,
        annotations: parsedSvg.annotations,
        metadata: {
          totalArea: rooms.reduce((sum, room) => sum + room.area, 0),
          roomCount: rooms.length,
          wallLength: geometryResult.segments.reduce((sum, seg) => 
            sum + this.calculateDistance(seg.a, seg.b), 0)
        }
      };
      
      // Step 7: LLM labeling (if API key provided)
      let llmResponse: LLMResponse | undefined;
      if (this.llmLabeler['apiKey']) {
        console.log('Applying LLM labels...');
        try {
          llmResponse = await this.llmLabeler.labelPlan(planData);
          const labeledPlan = this.llmLabeler.applyLabels(planData, llmResponse);
          Object.assign(planData, labeledPlan);
        } catch (error) {
          console.warn('LLM labeling failed:', error);
        }
      }
      
      // Step 8: Validation
      console.log('Validating plan...');
      const validation = this.planValidator.validatePlan(planData);
      
      return {
        parsedSvg,
        planData,
        llmResponse,
        validation
      };
      
    } catch (error) {
      console.error('Floor plan processing failed:', error);
      throw new Error(`Floor plan processing failed: ${error}`);
    }
  }

  /**
   * Create walls from segments
   */
  private createWallsFromSegments(segments: any[]): any[] {
    const walls: any[] = [];
    const segmentGroups = this.groupSegmentsByProximity(segments);
    
    segmentGroups.forEach((group, index) => {
      walls.push({
        id: `wall-${index}`,
        segments: group,
        thickness: group[0]?.thickness || 0.1
      });
    });
    
    return walls;
  }

  /**
   * Group segments by proximity
   */
  private groupSegmentsByProximity(segments: any[]): any[][] {
    const groups: any[][] = [];
    const processed = new Set<number>();
    
    segments.forEach((segment, index) => {
      if (processed.has(index)) return;
      
      const group = [segment];
      processed.add(index);
      
      // Find connected segments
      let foundMore = true;
      while (foundMore) {
        foundMore = false;
        
        segments.forEach((otherSegment, otherIndex) => {
          if (processed.has(otherIndex)) return;
          
          if (this.segmentsAreConnected(group[group.length - 1], otherSegment)) {
            group.push(otherSegment);
            processed.add(otherIndex);
            foundMore = true;
          }
        });
      }
      
      groups.push(group);
    });
    
    return groups;
  }

  /**
   * Check if two segments are connected
   */
  private segmentsAreConnected(seg1: any, seg2: any): boolean {
    const tolerance = 1e-3;
    
    return (
      this.pointsEqual(seg1.a, seg2.a, tolerance) ||
      this.pointsEqual(seg1.a, seg2.b, tolerance) ||
      this.pointsEqual(seg1.b, seg2.a, tolerance) ||
      this.pointsEqual(seg1.b, seg2.b, tolerance)
    );
  }

  /**
   * Check if two points are equal within tolerance
   */
  private pointsEqual(p1: any, p2: any, tolerance: number): boolean {
    return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
  }

  /**
   * Detect openings in walls
   */
  private detectOpenings(segments: any[], rooms: any[]): any[] {
    const openings: any[] = [];
    
    // Simple opening detection - look for gaps in walls
    segments.forEach((segment, index) => {
      const length = this.calculateDistance(segment.a, segment.b);
      
      // If segment is very short, it might be an opening
      if (length < 0.5) { // Threshold for opening detection
        openings.push({
          id: `opening-${index}`,
          wallId: `wall-${index}`,
          position: {
            x: (segment.a.x + segment.b.x) / 2,
            y: (segment.a.y + segment.b.y) / 2
          },
          offset: length / 2,
          type: 'door' as const,
          width: length,
          height: 2.1 // Standard door height
        });
      }
    });
    
    return openings;
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(a: any, b: any): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Export plan data to JSON
   */
  exportToJSON(planData: PlanData): string {
    return JSON.stringify(planData, null, 2);
  }

  /**
   * Export plan data to GeoJSON
   */
  exportToGeoJSON(planData: PlanData): string {
    const features = planData.rooms.map(room => ({
      type: 'Feature',
      properties: {
        id: room.id,
        name: room.name,
        type: room.type,
        area: room.area,
        level: room.level
      },
      geometry: {
        type: 'Polygon',
        coordinates: [room.polygon.map(p => [p.x, p.y])]
      }
    }));

    return JSON.stringify({
      type: 'FeatureCollection',
      features
    }, null, 2);
  }

  /**
   * Get processing statistics
   */
  getStatistics(planData: PlanData): {
    rooms: number;
    walls: number;
    openings: number;
    totalArea: number;
    averageRoomArea: number;
    wallLength: number;
  } {
    const roomCount = planData.rooms.length;
    const wallCount = planData.walls.length;
    const openingCount = planData.openings.length;
    const totalArea = planData.rooms.reduce((sum, room) => sum + room.area, 0);
    const averageRoomArea = roomCount > 0 ? totalArea / roomCount : 0;
    const wallLength = planData.walls.reduce((sum, wall) => 
      sum + wall.segments.reduce((segSum, segment) => 
        segSum + this.calculateDistance(segment.a, segment.b), 0), 0);

    return {
      rooms: roomCount,
      walls: wallCount,
      openings: openingCount,
      totalArea,
      averageRoomArea,
      wallLength
    };
  }
}

// Export individual components for advanced usage
export { SVGParser } from './svg-parser';
export { GeometryCleaner } from './geometry-cleaner';
export { RoomDetector } from './room-detector';
export { LLMLabeler } from './llm-labeler';
export { PlanValidator } from './plan-validator';
export * from './types';
