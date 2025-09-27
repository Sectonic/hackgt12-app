import type { PlanData, Room, Segment } from './types';

/**
 * Comprehensive plan validation system
 * Checks for geometric issues, connectivity, and data integrity
 */

export class PlanValidator {
  private tolerance: number;
  private minRoomArea: number;
  private minWallLength: number;

  constructor(
    tolerance = 1e-3,
    minRoomArea = 0.1,
    minWallLength = 0.01
  ) {
    this.tolerance = tolerance;
    this.minRoomArea = minRoomArea;
    this.minWallLength = minWallLength;
  }

  /**
   * Comprehensive plan validation
   */
  validatePlan(planData: PlanData): {
    isValid: boolean;
    issues: string[];
    warnings: string[];
    statistics: {
      roomCount: number;
      totalArea: number;
      wallLength: number;
      openingCount: number;
    };
  } {
    const issues: string[] = [];
    const warnings: string[] = [];
    
    // Validate rooms
    const roomValidation = this.validateRooms(planData.rooms);
    issues.push(...roomValidation.issues);
    warnings.push(...roomValidation.warnings);
    
    // Validate walls
    const wallValidation = this.validateWalls(planData.walls);
    issues.push(...wallValidation.issues);
    warnings.push(...wallValidation.warnings);
    
    // Validate openings
    const openingValidation = this.validateOpenings(planData.openings);
    issues.push(...openingValidation.issues);
    warnings.push(...openingValidation.warnings);
    
    // Check connectivity
    const connectivityValidation = this.validateConnectivity(planData);
    issues.push(...connectivityValidation.issues);
    warnings.push(...connectivityValidation.warnings);
    
    // Calculate statistics
    const statistics = this.calculateStatistics(planData);
    
    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      statistics
    };
  }

  /**
   * Validate room data
   */
  private validateRooms(rooms: Room[]): { issues: string[]; warnings: string[] } {
    const issues: string[] = [];
    const warnings: string[] = [];
    
    if (rooms.length === 0) {
      issues.push('No rooms found in plan');
      return { issues, warnings };
    }
    
    rooms.forEach((room, index) => {
      // Check room area
      if (room.area < this.minRoomArea) {
        issues.push(`Room ${room.id} has area ${room.area.toFixed(3)} < minimum ${this.minRoomArea}`);
      }
      
      // Check for self-intersections
      if (this.hasRoomSelfIntersections(room)) {
        issues.push(`Room ${room.id} has self-intersecting boundaries`);
      }
      
      // Check polygon validity
      if (room.polygon.length < 3) {
        issues.push(`Room ${room.id} has invalid polygon with ${room.polygon.length} points`);
      }
      
      // Check for duplicate points
      if (this.hasDuplicatePoints(room.polygon)) {
        warnings.push(`Room ${room.id} has duplicate consecutive points`);
      }
      
      // Check for collinear edges
      if (this.hasCollinearEdges(room.polygon)) {
        warnings.push(`Room ${room.id} has collinear edges`);
      }
    });
    
    return { issues, warnings };
  }

  /**
   * Validate wall data
   */
  private validateWalls(walls: any[]): { issues: string[]; warnings: string[] } {
    const issues: string[] = [];
    const warnings: string[] = [];
    
    walls.forEach(wall => {
      if (!wall.segments || wall.segments.length === 0) {
        issues.push(`Wall ${wall.id} has no segments`);
        return;
      }
      
      wall.segments.forEach((segment: Segment) => {
        const length = this.calculateDistance(segment.a, segment.b);
        
        if (length < this.minWallLength) {
          issues.push(`Wall ${wall.id} has segment shorter than ${this.minWallLength}`);
        }
        
        if (length < this.tolerance) {
          warnings.push(`Wall ${wall.id} has very short segment: ${length.toFixed(6)}`);
        }
      });
    });
    
    return { issues, warnings };
  }

  /**
   * Validate opening data
   */
  private validateOpenings(openings: any[]): { issues: string[]; warnings: string[] } {
    const issues: string[] = [];
    const warnings: string[] = [];
    
    openings.forEach(opening => {
      if (opening.width <= 0) {
        issues.push(`Opening ${opening.id} has invalid width: ${opening.width}`);
      }
      
      if (opening.height <= 0) {
        issues.push(`Opening ${opening.id} has invalid height: ${opening.height}`);
      }
      
      if (opening.width > 3.0) {
        warnings.push(`Opening ${opening.id} has very wide width: ${opening.width}m`);
      }
      
      if (opening.height > 3.0) {
        warnings.push(`Opening ${opening.id} has very high height: ${opening.height}m`);
      }
    });
    
    return { issues, warnings };
  }

  /**
   * Validate plan connectivity
   */
  private validateConnectivity(planData: PlanData): { issues: string[]; warnings: string[] } {
    const issues: string[] = [];
    const warnings: string[] = [];
    
    // Check if all rooms are connected (simplified check)
    if (planData.rooms.length > 1) {
      const isConnected = this.checkRoomConnectivity(planData);
      if (!isConnected) {
        warnings.push('Plan may have disconnected room components');
      }
    }
    
    return { issues, warnings };
  }

  /**
   * Check if rooms are connected
   */
  private checkRoomConnectivity(planData: PlanData): boolean {
    // Simplified connectivity check
    // A full implementation would use graph algorithms to verify
    // that all rooms are reachable from each other
    
    if (planData.rooms.length <= 1) return true;
    
    // Check if any rooms share boundaries (simplified)
    for (let i = 0; i < planData.rooms.length; i++) {
      for (let j = i + 1; j < planData.rooms.length; j++) {
        if (this.roomsShareBoundary(planData.rooms[i], planData.rooms[j])) {
          return true; // At least two rooms are connected
        }
      }
    }
    
    return false;
  }

  /**
   * Check if two rooms share a boundary
   */
  private roomsShareBoundary(room1: Room, room2: Room): boolean {
    // Simplified boundary sharing check
    // A full implementation would check for shared edges
    
    const tolerance = this.tolerance * 10; // Use larger tolerance for boundary detection
    
    for (const p1 of room1.polygon) {
      for (const p2 of room2.polygon) {
        if (this.calculateDistance(p1, p2) < tolerance) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Calculate plan statistics
   */
  private calculateStatistics(planData: PlanData): {
    roomCount: number;
    totalArea: number;
    wallLength: number;
    openingCount: number;
  } {
    const roomCount = planData.rooms.length;
    const totalArea = planData.rooms.reduce((sum, room) => sum + room.area, 0);
    const wallLength = planData.walls.reduce((sum, wall) => 
      sum + wall.segments.reduce((segSum, segment) => 
        segSum + this.calculateDistance(segment.a, segment.b), 0), 0);
    const openingCount = planData.openings.length;
    
    return {
      roomCount,
      totalArea,
      wallLength,
      openingCount
    };
  }

  /**
   * Check for room self-intersections
   */
  private hasRoomSelfIntersections(room: Room): boolean {
    const points = room.polygon;
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
   * Check for duplicate consecutive points
   */
  private hasDuplicatePoints(points: { x: number; y: number }[]): boolean {
    for (let i = 0; i < points.length - 1; i++) {
      if (this.calculateDistance(points[i], points[i + 1]) < this.tolerance) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check for collinear edges
   */
  private hasCollinearEdges(points: { x: number; y: number }[]): boolean {
    if (points.length < 3) return false;
    
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const p3 = points[(i + 2) % points.length];
      
      if (this.areCollinear(p1, p2, p3)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if three points are collinear
   */
  private areCollinear(p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }): boolean {
    const area = Math.abs(
      (p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)
    ) / 2;
    
    return area < this.tolerance;
  }

  /**
   * Check if two segments intersect
   */
  private segmentsIntersect(seg1: { a: { x: number; y: number }; b: { x: number; y: number } }, seg2: { a: { x: number; y: number }; b: { x: number; y: number } }): boolean {
    const ccw = (A: { x: number; y: number }, B: { x: number; y: number }, C: { x: number; y: number }) => {
      return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
    };
    
    return ccw(seg1.a, seg2.a, seg2.b) !== ccw(seg1.b, seg2.a, seg2.b) &&
           ccw(seg1.a, seg1.b, seg2.a) !== ccw(seg1.a, seg1.b, seg2.b);
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
