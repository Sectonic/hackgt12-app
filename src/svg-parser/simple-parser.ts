// Simple SVG parser that works without LLM integration
import { XMLParser } from 'fast-xml-parser';
import type { Point, SvgPolyline, Annotation, ParsedSvg, FloorPlanData, Room, Wall, Opening } from './types';

export class SimpleSVGParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true,
      parseTrueNumberOnly: false,
      arrayMode: false
    });
  }

  /**
   * Parse SVG string into geometric primitives
   */
  public async parseSvg(svg: string): Promise<ParsedSvg> {
    const root = this.parser.parse(svg);
    const polylines: SvgPolyline[] = [];
    const annotations: Annotation[] = [];

    const svgElement = root.svg ?? root;

    this.traverseElements(svgElement, [new DOMMatrix()], (element, transform) => {
      const id = element.id || `elem-${Math.random().toString(36).substr(2, 9)}`;
      const originalAttributes = this.extractAttributes(element);

      if (element.line) {
        const lines = Array.isArray(element.line) ? element.line : [element.line];
        lines.forEach(line => {
          const p1 = this.applyTransform({ x: parseFloat(line.x1), y: parseFloat(line.y1) }, transform);
          const p2 = this.applyTransform({ x: parseFloat(line.x2), y: parseFloat(line.y2) }, transform);
          polylines.push({ id, points: [p1, p2], originalElement: 'line', originalAttributes });
        });
      } else if (element.rect) {
        const rects = Array.isArray(element.rect) ? element.rect : [element.rect];
        rects.forEach(rect => {
          const x = parseFloat(rect.x) || 0;
          const y = parseFloat(rect.y) || 0;
          const width = parseFloat(rect.width) || 0;
          const height = parseFloat(rect.height) || 0;
          const p1 = this.applyTransform({ x, y }, transform);
          const p2 = this.applyTransform({ x: x + width, y }, transform);
          const p3 = this.applyTransform({ x: x + width, y: y + height }, transform);
          const p4 = this.applyTransform({ x, y: y + height }, transform);
          polylines.push({ id, points: [p1, p2, p3, p4, p1], originalElement: 'rect', originalAttributes });
        });
      }
    });

    this.extractAnnotations(svgElement, [new DOMMatrix()], annotations);

    return { polylines, annotations };
  }

  /**
   * Process floor plan with basic geometric analysis
   */
  public async processFloorPlan(svgString: string): Promise<FloorPlanData> {
    console.log('Step 1: Parsing SVG...');
    const parsedSvg = await this.parseSvg(svgString);
    console.log('Parsed SVG:', parsedSvg);

    console.log('Step 2: Basic geometric analysis...');
    const rooms = this.detectRoomsBasic(parsedSvg.polylines);
    const walls = this.detectWallsBasic(parsedSvg.polylines);
    const openings = this.detectOpeningsBasic(parsedSvg.polylines);

    const floorPlanData: FloorPlanData = {
      rooms,
      walls,
      openings,
      annotations: parsedSvg.annotations,
      validationErrors: []
    };

    console.log('Step 3: Basic validation...');
    floorPlanData.validationErrors = this.validateBasic(floorPlanData);

    console.log('Floor Plan Processing Complete (Basic Mode).');
    return floorPlanData;
  }

  private detectRoomsBasic(polylines: SvgPolyline[]): Room[] {
    const rooms: Room[] = [];
    
    // Find rectangles as potential rooms
    const rectangles = polylines.filter(p => p.originalElement === 'rect');
    
    rectangles.forEach((rect, index) => {
      if (rect.points.length >= 4) {
        const area = this.calculatePolygonArea(rect.points);
        const centroid = this.calculatePolygonCentroid(rect.points);
        
        rooms.push({
          id: `room-${index}`,
          polygon: rect.points,
          area,
          centroid,
          name: `Room ${index + 1}`,
          type: 'unknown',
          walls: [],
          openings: []
        });
      }
    });

    return rooms;
  }

  private detectWallsBasic(polylines: SvgPolyline[]): Wall[] {
    const walls: Wall[] = [];
    
    // Find lines as potential walls
    const lines = polylines.filter(p => p.originalElement === 'line');
    
    lines.forEach((line, index) => {
      if (line.points.length >= 2) {
        walls.push({
          id: `wall-${index}`,
          a: line.points[0],
          b: line.points[1],
          thickness: 0.2 // Default wall thickness
        });
      }
    });

    return walls;
  }

  private detectOpeningsBasic(polylines: SvgPolyline[]): Opening[] {
    const openings: Opening[] = [];
    
    // Find small lines as potential doors/windows
    const smallLines = polylines.filter(p => 
      p.originalElement === 'line' && 
      this.calculateDistance(p.points[0], p.points[1]) < 2
    );
    
    smallLines.forEach((line, index) => {
      if (line.points.length >= 2) {
        const midpoint = {
          x: (line.points[0].x + line.points[1].x) / 2,
          y: (line.points[0].y + line.points[1].y) / 2
        };
        
        openings.push({
          id: `opening-${index}`,
          wallId: `wall-${index}`,
          offset: 0,
          width: this.calculateDistance(line.points[0], line.points[1]),
          height: 2.1, // Default door height
          type: 'door',
          position: midpoint
        });
      }
    });

    return openings;
  }

  private validateBasic(planData: FloorPlanData): string[] {
    const errors: string[] = [];
    
    if (planData.rooms.length === 0) {
      errors.push('No rooms detected');
    }
    
    if (planData.walls.length === 0) {
      errors.push('No walls detected');
    }
    
    planData.rooms.forEach(room => {
      if (room.area < 1) {
        errors.push(`Room ${room.id} has very small area: ${room.area.toFixed(2)}`);
      }
    });

    return errors;
  }

  private calculatePolygonArea(points: Point[]): number {
    let area = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      area += (points[j].x + points[i].x) * (points[j].y - points[i].y);
    }
    return Math.abs(area / 2);
  }

  private calculatePolygonCentroid(points: Point[]): Point {
    let cx = 0, cy = 0;
    let area = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const factor = (points[j].x * points[i].y - points[i].x * points[j].y);
      area += factor;
      cx += (points[j].x + points[i].x) * factor;
      cy += (points[j].y + points[i].y) * factor;
    }
    area /= 2;
    return { x: cx / (6 * area), y: cy / (6 * area) };
  }

  private calculateDistance(p1: Point, p2: Point): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  }

  private extractAttributes(element: any): Record<string, string> {
    const attributes: Record<string, string> = {};
    for (const key in element) {
      if (key !== 'g' && key !== 'line' && key !== 'rect' && key !== 'text' && typeof element[key] !== 'object') {
        attributes[key] = String(element[key]);
      }
    }
    return attributes;
  }

  private applyTransform(point: Point, transform: DOMMatrix): Point {
    const transformedPoint = transform.transformPoint(new DOMPoint(point.x, point.y));
    return { x: transformedPoint.x, y: transformedPoint.y };
  }

  private traverseElements(element: any, transformStack: DOMMatrix[], callback: (element: any, transform: DOMMatrix) => void) {
    if (!element) return;

    const currentTransform = transformStack[transformStack.length - 1];

    if (element.g) {
      const groupTransform = this.parseTransform(element.transform);
      const newTransform = currentTransform.multiply(groupTransform);
      transformStack.push(newTransform);
      
      const groups = Array.isArray(element.g) ? element.g : [element.g];
      groups.forEach((group: any) => this.traverseElements(group, transformStack, callback));
      
      transformStack.pop();
    }
    
    for (const key in element) {
      if (typeof element[key] === 'object' && key !== 'g') {
        const children = Array.isArray(element[key]) ? element[key] : [element[key]];
        children.forEach(child => {
          if (typeof child === 'object') {
            const childTransform = this.parseTransform(child.transform);
            const newChildTransform = currentTransform.multiply(childTransform);
            transformStack.push(newChildTransform);
            callback(child, newChildTransform);
            this.traverseElements(child, transformStack, callback);
            transformStack.pop();
          }
        });
      }
    }
    callback(element, currentTransform);
  }

  private parseTransform(transformString: string | undefined): DOMMatrix {
    if (!transformString) {
      return new DOMMatrix();
    }
    return new DOMMatrix(transformString);
  }

  private extractAnnotations(svgElement: any, transformStack: DOMMatrix[], annotations: Annotation[]) {
    this.traverseElements(svgElement, transformStack, (element, transform) => {
      if (element.text) {
        const texts = Array.isArray(element.text) ? element.text : [element.text];
        
        texts.forEach((text: any, index: number) => {
          const x = parseFloat(text.x) || 0;
          const y = parseFloat(text.y) || 0;
          const position = this.applyTransform({ x, y }, transform);
          
          annotations.push({
            id: text.id || `text-${Math.random().toString(36).substr(2, 9)}-${index}`,
            text: text['#text'] || '',
            at: position,
            originalElement: 'text',
            originalAttributes: this.extractAttributes(text),
          });
        });
      }
    });
  }
}
