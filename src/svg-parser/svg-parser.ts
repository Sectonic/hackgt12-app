import { XMLParser } from 'fast-xml-parser';
// @ts-ignore - svg-pathdata types issue
import { SVGPathData } from 'svg-pathdata';
import type { Point, SvgPolyline, Annotation, ParsedSvg } from './types';

/**
 * Advanced SVG parser for floor plan processing
 * Handles complex SVG elements and converts them to geometric primitives
 */

export class SVGParser {
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
  async parseSVG(svgString: string): Promise<ParsedSvg> {
    try {
      const parsed = this.parser.parse(svgString);
      const svgElement = parsed.svg || parsed;
      
      // Extract viewBox and units
      const viewBox = this.parseViewBox(svgElement.viewBox);
      const units = this.detectUnits(svgElement);
      const scale = this.calculateScale(svgElement, viewBox);
      
      // Parse geometric elements
      const polylines = this.extractPolylines(svgElement);
      const annotations = this.extractAnnotations(svgElement);
      
      return {
        polylines,
        annotations,
        viewBox,
        units,
        scale
      };
    } catch (error) {
      console.error('SVG parsing failed:', error);
      throw new Error(`Failed to parse SVG: ${error}`);
    }
  }

  /**
   * Parse viewBox attribute
   */
  private parseViewBox(viewBoxStr?: string): { x: number; y: number; width: number; height: number } | undefined {
    if (!viewBoxStr) return undefined;
    
    const parts = viewBoxStr.split(/[\s,]+/).map(Number);
    if (parts.length !== 4) return undefined;
    
    return {
      x: parts[0],
      y: parts[1],
      width: parts[2],
      height: parts[3]
    };
  }

  /**
   * Detect units from SVG attributes
   */
  private detectUnits(svgElement: any): string {
    // Check for explicit units in width/height
    const width = svgElement.width || '';
    const height = svgElement.height || '';
    
    if (typeof width === 'string') {
      if (width.includes('mm')) return 'mm';
      if (width.includes('cm')) return 'cm';
      if (width.includes('in')) return 'in';
      if (width.includes('ft')) return 'ft';
    }
    
    // Default to pixels
    return 'px';
  }

  /**
   * Calculate scale factor for unit conversion
   */
  private calculateScale(svgElement: any, viewBox?: { x: number; y: number; width: number; height: number }): number {
    if (!viewBox) return 1;
    
    const width = this.parseNumber(svgElement.width) || viewBox.width;
    const height = this.parseNumber(svgElement.height) || viewBox.height;
    
    // Calculate scale based on viewBox to actual dimensions
    return Math.min(width / viewBox.width, height / viewBox.height);
  }

  /**
   * Parse number from string with units
   */
  private parseNumber(value: any): number | undefined {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return undefined;
    
    const match = value.match(/^([\d.]+)/);
    return match ? parseFloat(match[1]) : undefined;
  }

  /**
   * Extract all polylines from SVG
   */
  private extractPolylines(svgElement: any): SvgPolyline[] {
    const polylines: SvgPolyline[] = [];
    const transformStack: DOMMatrix[] = [new DOMMatrix()];
    
    this.traverseElements(svgElement, transformStack, (element, transform) => {
      // Handle different SVG elements
      if (element.line) {
        polylines.push(...this.parseLine(element.line, transform));
      }
      if (element.polyline) {
        polylines.push(...this.parsePolyline(element.polyline, transform));
      }
      if (element.path) {
        polylines.push(...this.parsePath(element.path, transform));
      }
      if (element.rect) {
        polylines.push(...this.parseRect(element.rect, transform));
      }
      if (element.circle) {
        polylines.push(...this.parseCircle(element.circle, transform));
      }
      if (element.ellipse) {
        polylines.push(...this.parseEllipse(element.ellipse, transform));
      }
    });
    
    return polylines;
  }

  /**
   * Traverse SVG elements recursively
   */
  private traverseElements(
    element: any, 
    transformStack: DOMMatrix[], 
    callback: (element: any, transform: DOMMatrix) => void
  ): void {
    if (!element || typeof element !== 'object') return;
    
    // Apply current transform
    const currentTransform = transformStack[transformStack.length - 1];
    callback(element, currentTransform);
    
    // Handle groups and transforms
    if (element.g) {
      const groupTransform = this.parseTransform(element.transform);
      const newTransform = currentTransform.multiply(groupTransform);
      transformStack.push(newTransform);
      
      const groups = Array.isArray(element.g) ? element.g : [element.g];
      groups.forEach((group: any) => this.traverseElements(group, transformStack, callback));
      
      transformStack.pop();
    }
    
    // Handle children
    Object.keys(element).forEach(key => {
      if (key !== 'g' && typeof element[key] === 'object') {
        this.traverseElements(element[key], transformStack, callback);
      }
    });
  }

  /**
   * Parse transform attribute
   */
  private parseTransform(transformStr?: string): DOMMatrix {
    if (!transformStr) return new DOMMatrix();
    
    // Simple transform parsing - can be extended for complex transforms
    const matrix = new DOMMatrix();
    
    // Handle translate
    const translateMatch = transformStr.match(/translate\(([^,]+),\s*([^)]+)\)/);
    if (translateMatch) {
      const x = parseFloat(translateMatch[1]);
      const y = parseFloat(translateMatch[2]);
      matrix.translateSelf(x, y);
    }
    
    // Handle scale
    const scaleMatch = transformStr.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);
    if (scaleMatch) {
      const sx = parseFloat(scaleMatch[1]);
      const sy = parseFloat(scaleMatch[2] || scaleMatch[1]);
      matrix.scaleSelf(sx, sy);
    }
    
    return matrix;
  }

  /**
   * Parse line elements
   */
  private parseLine(lineElement: any, transform: DOMMatrix): SvgPolyline[] {
    const lines = Array.isArray(lineElement) ? lineElement : [lineElement];
    
    return lines.map((line, index) => {
      const x1 = parseFloat(line.x1) || 0;
      const y1 = parseFloat(line.y1) || 0;
      const x2 = parseFloat(line.x2) || 0;
      const y2 = parseFloat(line.y2) || 0;
      
      const p1 = this.applyTransform({ x: x1, y: y1 }, transform);
      const p2 = this.applyTransform({ x: x2, y: y2 }, transform);
      
      return {
        points: [p1, p2],
        id: `line-${index}`,
        stroke: line.stroke,
        strokeWidth: parseFloat(line['stroke-width']) || 1
      };
    });
  }

  /**
   * Parse polyline elements
   */
  private parsePolyline(polylineElement: any, transform: DOMMatrix): SvgPolyline[] {
    const polylines = Array.isArray(polylineElement) ? polylineElement : [polylineElement];
    
    return polylines.map((polyline, index) => {
      const points = this.parsePointsString(polyline.points);
      const transformedPoints = points.map(p => this.applyTransform(p, transform));
      
      return {
        points: transformedPoints,
        id: `polyline-${index}`,
        stroke: polyline.stroke,
        strokeWidth: parseFloat(polyline['stroke-width']) || 1
      };
    });
  }

  /**
   * Parse path elements
   */
  private parsePath(pathElement: any, transform: DOMMatrix): SvgPolyline[] {
    const paths = Array.isArray(pathElement) ? pathElement : [pathElement];
    
    return paths.map((path, index) => {
      const points = this.pathToPoints(path.d);
      const transformedPoints = points.map(p => this.applyTransform(p, transform));
      
      return {
        points: transformedPoints,
        id: `path-${index}`,
        stroke: path.stroke,
        strokeWidth: parseFloat(path['stroke-width']) || 1
      };
    });
  }

  /**
   * Parse rectangle elements
   */
  private parseRect(rectElement: any, transform: DOMMatrix): SvgPolyline[] {
    const rects = Array.isArray(rectElement) ? rectElement : [rectElement];
    
    return rects.map((rect, index) => {
      const x = parseFloat(rect.x) || 0;
      const y = parseFloat(rect.y) || 0;
      const width = parseFloat(rect.width) || 0;
      const height = parseFloat(rect.height) || 0;
      
      const points = [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
        { x, y } // Close the rectangle
      ];
      
      const transformedPoints = points.map(p => this.applyTransform(p, transform));
      
      return {
        points: transformedPoints,
        id: `rect-${index}`,
        stroke: rect.stroke,
        strokeWidth: parseFloat(rect['stroke-width']) || 1
      };
    });
  }

  /**
   * Parse circle elements
   */
  private parseCircle(circleElement: any, transform: DOMMatrix): SvgPolyline[] {
    const circles = Array.isArray(circleElement) ? circleElement : [circleElement];
    
    return circles.map((circle, index) => {
      const cx = parseFloat(circle.cx) || 0;
      const cy = parseFloat(circle.cy) || 0;
      const r = parseFloat(circle.r) || 0;
      
      // Convert circle to polygon with 16 segments
      const points = this.circleToPolygon(cx, cy, r, 16);
      const transformedPoints = points.map(p => this.applyTransform(p, transform));
      
      return {
        points: transformedPoints,
        id: `circle-${index}`,
        stroke: circle.stroke,
        strokeWidth: parseFloat(circle['stroke-width']) || 1
      };
    });
  }

  /**
   * Parse ellipse elements
   */
  private parseEllipse(ellipseElement: any, transform: DOMMatrix): SvgPolyline[] {
    const ellipses = Array.isArray(ellipseElement) ? ellipseElement : [ellipseElement];
    
    return ellipses.map((ellipse, index) => {
      const cx = parseFloat(ellipse.cx) || 0;
      const cy = parseFloat(ellipse.cy) || 0;
      const rx = parseFloat(ellipse.rx) || 0;
      const ry = parseFloat(ellipse.ry) || 0;
      
      // Convert ellipse to polygon
      const points = this.ellipseToPolygon(cx, cy, rx, ry, 16);
      const transformedPoints = points.map(p => this.applyTransform(p, transform));
      
      return {
        points: transformedPoints,
        id: `ellipse-${index}`,
        stroke: ellipse.stroke,
        strokeWidth: parseFloat(ellipse['stroke-width']) || 1
      };
    });
  }

  /**
   * Convert path data to points
   */
  private pathToPoints(pathData: string): Point[] {
    try {
      const pathDataObj = new SVGPathData(pathData);
      const points: Point[] = [];
      let currentPoint = { x: 0, y: 0 };
      
      for (const command of pathDataObj.commands) {
        switch (command.type) {
          case 'M':
          case 'L':
            currentPoint = { x: command.x, y: command.y };
            points.push(currentPoint);
            break;
          case 'C':
            // Flatten cubic bezier to line segments
            const cubicPoints = this.flattenCubicBezier(
              currentPoint,
              { x: command.x1, y: command.y1 },
              { x: command.x2, y: command.y2 },
              { x: command.x, y: command.y },
              8
            );
            points.push(...cubicPoints.slice(1)); // Skip first point (already added)
            currentPoint = { x: command.x, y: command.y };
            break;
          case 'Q':
            // Flatten quadratic bezier
            const quadPoints = this.flattenQuadraticBezier(
              currentPoint,
              { x: command.x1, y: command.y1 },
              { x: command.x, y: command.y },
              8
            );
            points.push(...quadPoints.slice(1));
            currentPoint = { x: command.x, y: command.y };
            break;
          case 'A':
            // Flatten arc
            const arcPoints = this.flattenArc(
              currentPoint,
              { x: command.x, y: command.y },
              command.rx,
              command.ry,
              command.xAxisRotation,
              command.largeArcFlag,
              command.sweepFlag,
              8
            );
            points.push(...arcPoints.slice(1));
            currentPoint = { x: command.x, y: command.y };
            break;
          case 'Z':
            // Close path
            if (points.length > 0 && !this.pointsEqual(points[0], currentPoint)) {
              points.push({ ...points[0] });
            }
            break;
        }
      }
      
      return points;
    } catch (error) {
      console.error('Path parsing failed:', error);
      return [];
    }
  }

  /**
   * Flatten cubic bezier curve to line segments
   */
  private flattenCubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, segments: number): Point[] {
    const points: Point[] = [p0];
    
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const point = this.cubicBezierPoint(p0, p1, p2, p3, t);
      points.push(point);
    }
    
    return points;
  }

  /**
   * Flatten quadratic bezier curve
   */
  private flattenQuadraticBezier(p0: Point, p1: Point, p2: Point, segments: number): Point[] {
    const points: Point[] = [p0];
    
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const point = this.quadraticBezierPoint(p0, p1, p2, t);
      points.push(point);
    }
    
    return points;
  }

  /**
   * Flatten arc to line segments
   */
  private flattenArc(p0: Point, p1: Point, rx: number, ry: number, rotation: number, largeArc: boolean, sweep: boolean, segments: number): Point[] {
    // Simplified arc flattening - can be improved
    const points: Point[] = [p0];
    
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const angle = t * Math.PI;
      const x = p0.x + rx * Math.cos(angle);
      const y = p0.y + ry * Math.sin(angle);
      points.push({ x, y });
    }
    
    return points;
  }

  /**
   * Calculate point on cubic bezier curve
   */
  private cubicBezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    
    return {
      x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
      y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
    };
  }

  /**
   * Calculate point on quadratic bezier curve
   */
  private quadraticBezierPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
    const u = 1 - t;
    return {
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
    };
  }

  /**
   * Convert circle to polygon
   */
  private circleToPolygon(cx: number, cy: number, r: number, segments: number): Point[] {
    const points: Point[] = [];
    
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      points.push({
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle)
      });
    }
    
    return points;
  }

  /**
   * Convert ellipse to polygon
   */
  private ellipseToPolygon(cx: number, cy: number, rx: number, ry: number, segments: number): Point[] {
    const points: Point[] = [];
    
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      points.push({
        x: cx + rx * Math.cos(angle),
        y: cy + ry * Math.sin(angle)
      });
    }
    
    return points;
  }

  /**
   * Parse points string from polyline
   */
  private parsePointsString(pointsStr: string): Point[] {
    const coords = pointsStr.trim().split(/[\s,]+/).map(Number);
    const points: Point[] = [];
    
    for (let i = 0; i < coords.length; i += 2) {
      if (i + 1 < coords.length) {
        points.push({ x: coords[i], y: coords[i + 1] });
      }
    }
    
    return points;
  }

  /**
   * Apply transform to point
   */
  private applyTransform(point: Point, transform: DOMMatrix): Point {
    return {
      x: transform.a * point.x + transform.c * point.y + transform.e,
      y: transform.b * point.x + transform.d * point.y + transform.f
    };
  }

  /**
   * Check if two points are equal
   */
  private pointsEqual(p1: Point, p2: Point): boolean {
    return Math.abs(p1.x - p2.x) < 1e-6 && Math.abs(p1.y - p2.y) < 1e-6;
  }

  /**
   * Extract text annotations from SVG
   */
  private extractAnnotations(svgElement: any): Annotation[] {
    const annotations: Annotation[] = [];
    
    this.traverseElements(svgElement, [new DOMMatrix()], (element, transform) => {
      if (element.text) {
        const texts = Array.isArray(element.text) ? element.text : [element.text];
        
        texts.forEach((text: any, index: number) => {
          const x = parseFloat(text.x) || 0;
          const y = parseFloat(text.y) || 0;
          const position = this.applyTransform({ x, y }, transform);
          
          annotations.push({
            text: text._text || text || '',
            position,
            id: `text-${index}`
          });
        });
      }
    });
    
    return annotations;
  }
}
