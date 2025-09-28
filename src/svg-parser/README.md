# 🏗️ Advanced SVG Floor Plan Parser

A comprehensive TypeScript system for parsing, processing, and analyzing SVG floor plans with advanced geometric algorithms, room detection, and LLM integration.

## ✨ Features

### 🔧 **Full Geometric Processing**
- **Coordinate Snapping**: Eliminates noise with configurable epsilon values
- **Segment Merging**: Combines nearly collinear segments for cleaner geometry
- **Shared Wall Detection**: Identifies overlapping walls between rooms
- **Noise Reduction**: Removes duplicate points and tiny segments

### 🏠 **Advanced Room Detection**
- **Planar Graph Algorithms**: Builds connectivity graphs from wall segments
- **Cycle Detection**: Finds closed room boundaries using DFS algorithms
- **Hole Removal**: Handles complex room shapes with nested boundaries
- **Area Calculation**: Precise polygon area computation using shoelace formula

### 🤖 **LLM Integration**
- **Semantic Labeling**: AI-powered room type classification
- **Opening Analysis**: Intelligent door/window detection and sizing
- **Validation Assistance**: LLM-guided plan quality assessment
- **Context-Aware**: Uses nearby text annotations for better labeling

### ✅ **Comprehensive Validation**
- **Self-Intersection Detection**: Identifies geometric issues
- **Connectivity Analysis**: Ensures plan coherence
- **Data Integrity**: Validates all geometric and semantic data
- **Quality Metrics**: Provides detailed statistics and warnings

## 🚀 Quick Start

### Installation

```bash
npm install svg-floor-plan-parser
```

### Basic Usage

```typescript
import { FloorPlanParser } from 'svg-floor-plan-parser';

const parser = new FloorPlanParser('your-openai-api-key');

// Process an SVG floor plan
const result = await parser.processFloorPlan(svgString);

console.log('Rooms detected:', result.planData.rooms.length);
console.log('Validation:', result.validation.isValid);
```

### Advanced Usage

```typescript
import { 
  FloorPlanParser, 
  GeometryCleaner, 
  RoomDetector, 
  LLMLabeler 
} from 'svg-floor-plan-parser';

// Custom configuration
const geometryCleaner = new GeometryCleaner(
  1e-3,  // epsilon for coordinate snapping
  2,     // angle threshold for collinear segments
  0.02   // gap threshold for merging
);

const roomDetector = new RoomDetector(
  1e-3,  // tolerance for graph building
  0.1    // minimum room area
);

const llmLabeler = new LLMLabeler(
  'your-api-key',
  'https://api.openai.com/v1',
  'gpt-4'
);
```

## 📊 Processing Pipeline

### 1. **SVG Parsing**
```typescript
// Handles complex SVG elements
- Lines, polylines, paths, rectangles
- Circles, ellipses, curves
- Transform matrices and groups
- Text annotations
- ViewBox and unit detection
```

### 2. **Geometric Cleaning**
```typescript
// Advanced geometric processing
- Coordinate snapping to grid
- Duplicate point removal
- Collinear segment merging
- Shared wall detection
- Noise reduction
```

### 3. **Room Detection**
```typescript
// Planar graph algorithms
- Build connectivity graph
- Find simple cycles
- Filter valid rooms
- Remove holes
- Calculate areas and centroids
```

### 4. **LLM Integration**
```typescript
// Semantic analysis
- Room type classification
- Opening type detection
- Validation assistance
- Context-aware labeling
```

### 5. **Validation**
```typescript
// Comprehensive quality checks
- Self-intersection detection
- Connectivity validation
- Data integrity checks
- Statistical analysis
```

## 🎯 API Reference

### FloorPlanParser

Main orchestrator class that coordinates all processing steps.

```typescript
class FloorPlanParser {
  constructor(apiKey?: string)
  
  async processFloorPlan(svgString: string): Promise<ProcessingResult>
  exportToJSON(planData: PlanData): string
  exportToGeoJSON(planData: PlanData): string
  getStatistics(planData: PlanData): Statistics
}
```

### GeometryCleaner

Advanced geometric processing with configurable parameters.

```typescript
class GeometryCleaner {
  constructor(epsilon?: number, angleThreshold?: number, gapThreshold?: number)
  
  snapCoordinates(points: Point[]): Point[]
  removeDuplicates(points: Point[]): Point[]
  mergeCollinearSegments(segments: Segment[]): Segment[]
  detectSharedWalls(segments: Segment[]): SharedWall[]
  processGeometry(polylines: SvgPolyline[]): GeometryResult
}
```

### RoomDetector

Planar graph algorithms for room detection.

```typescript
class RoomDetector {
  constructor(tolerance?: number, minArea?: number)
  
  buildPlanarGraph(segments: Segment[]): Map<string, Point[]>
  findSimpleCycles(graph: Map<string, Point[]>): Point[][]
  filterValidRooms(cycles: Point[][]): Point[][]
  removeHoles(cycles: Point[][]): Point[][]
  detectRooms(segments: Segment[]): Room[]
}
```

### LLMLabeler

AI-powered semantic labeling and validation.

```typescript
class LLMLabeler {
  constructor(apiKey: string, baseUrl?: string, model?: string)
  
  async labelPlan(planData: PlanData): Promise<LLMResponse>
  applyLabels(planData: PlanData, llmResponse: LLMResponse): PlanData
  validatePlan(planData: PlanData): ValidationResult
}
```

### PlanValidator

Comprehensive validation system.

```typescript
class PlanValidator {
  constructor(tolerance?: number, minRoomArea?: number, minWallLength?: number)
  
  validatePlan(planData: PlanData): ValidationResult
  validateRooms(rooms: Room[]): ValidationResult
  validateWalls(walls: Wall[]): ValidationResult
  validateOpenings(openings: Opening[]): ValidationResult
}
```

## 📈 Data Types

### Core Types

```typescript
interface Point {
  x: number;
  y: number;
}

interface Segment {
  a: Point;
  b: Point;
  id?: string;
  thickness?: number;
}

interface Room {
  id: string;
  polygon: Point[];
  area: number;
  centroid: Point;
  name?: string;
  type?: string;
  level?: number;
}

interface PlanData {
  rooms: Room[];
  walls: Wall[];
  openings: Opening[];
  annotations: Annotation[];
  metadata: PlanMetadata;
}
```

### Processing Results

```typescript
interface ProcessingResult {
  parsedSvg: ParsedSvg;
  planData: PlanData;
  llmResponse?: LLMResponse;
  validation: ValidationResult;
}

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
  statistics: Statistics;
}
```

## 🔧 Configuration

### Geometric Processing

```typescript
const geometryCleaner = new GeometryCleaner(
  1e-3,  // epsilon: coordinate snapping precision
  2,     // angleThreshold: degrees for collinear detection
  0.02   // gapThreshold: meters for segment merging
);
```

### Room Detection

```typescript
const roomDetector = new RoomDetector(
  1e-3,  // tolerance: graph building precision
  0.1    // minArea: minimum room area in square meters
);
```

### LLM Integration

```typescript
const llmLabeler = new LLMLabeler(
  'sk-your-api-key',           // OpenAI API key
  'https://api.openai.com/v1', // API base URL
  'gpt-4'                      // Model name
);
```

## 📊 Export Formats

### JSON Export
```typescript
const jsonData = parser.exportToJSON(planData);
// Exports complete plan data as JSON
```

### GeoJSON Export
```typescript
const geoJsonData = parser.exportToGeoJSON(planData);
// Exports rooms as GeoJSON features for GIS applications
```

## 🧪 Testing

```bash
npm test
```

## 📝 Examples

### Basic Floor Plan Processing

```typescript
import { FloorPlanParser } from 'svg-floor-plan-parser';

const parser = new FloorPlanParser();
const result = await parser.processFloorPlan(svgContent);

console.log(`Detected ${result.planData.rooms.length} rooms`);
console.log(`Total area: ${result.validation.statistics.totalArea} m²`);
console.log(`Valid: ${result.validation.isValid}`);
```

### Custom Geometric Processing

```typescript
import { GeometryCleaner } from 'svg-floor-plan-parser';

const cleaner = new GeometryCleaner(0.001, 1, 0.01);
const result = cleaner.processGeometry(polylines);

console.log(`Cleaned ${result.cleanedPolylines.length} polylines`);
console.log(`Found ${result.sharedWalls.length} shared walls`);
```

### LLM-Powered Analysis

```typescript
import { LLMLabeler } from 'svg-floor-plan-parser';

const labeler = new LLMLabeler('your-api-key');
const labels = await labeler.labelPlan(planData);

console.log('Room labels:', labels.rooms);
console.log('Opening analysis:', labels.openings);
console.log('Validation issues:', labels.validation.issues);
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- GitHub Issues: [Report bugs and request features](https://github.com/your-repo/issues)
- Documentation: [Full API documentation](https://your-docs-site.com)
- Examples: [Code examples and tutorials](https://your-examples-site.com)

---

**Built with ❤️ for architects, engineers, and developers working with floor plan data.**
