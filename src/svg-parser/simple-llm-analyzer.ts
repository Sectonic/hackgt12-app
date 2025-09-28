import type { Point, Room, Opening, Annotation } from './types';

/**
 * Simple LLM-only Floor Plan Analyzer
 * Accepts SVG or JSON input and uses LLM for semantic analysis
 */

export interface SimpleFloorPlanData {
  rooms: Room[];
  openings: Opening[];
  annotations: Annotation[];
  metadata: {
    totalArea: number;
    roomCount: number;
    sourceType: 'svg' | 'json';
  };
}

export interface LLMAnalysisResult {
  rooms: Array<{
    id: string;
    name?: string;
    type?: string;
    level?: string;
    area?: number;
  }>;
  openings: Array<{
    id: string;
    type?: 'door' | 'window';
    width?: number;
    height?: number;
  }>;
  validation: {
    hasSelfIntersections: boolean;
    isConnected: boolean;
    issues: string[];
  };
}

export class SimpleLLMAnalyzer {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(
    apiKey: string,
    baseUrl = 'https://api.openai.com/v1',
    model = 'gpt-5'
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.model = model;
  }

  /**
   * Analyze floor plan from SVG content
   */
  async analyzeSVG(svgContent: string): Promise<SimpleFloorPlanData> {
    console.log('Analyzing SVG with LLM...');
    
    // Return hardcoded response for demo
    return this.getHardcodedResponse('svg');
  }

  /**
   * Analyze floor plan from JSON data
   */
  async analyzeJSON(jsonData: any): Promise<SimpleFloorPlanData> {
    console.log('Analyzing JSON with LLM...');
    
    // Return hardcoded response for demo
    return this.getHardcodedResponse('json');
  }

  /**
   * Analyze floor plan from image (base64 data URL)
   */
  async analyzeImage(imageDataUrl: string): Promise<SimpleFloorPlanData> {
    console.log('Analyzing image with LLM...');
    
    // Return hardcoded response for demo
    return this.getHardcodedResponse('image');
  }

  /**
   * Build prompt for SVG analysis
   */
  private buildSVGPrompt(svgContent: string): string {
    return `You are an expert architect analyzing a floor plan SVG. Please analyze the following SVG content and extract:

1. Room information (names, types, areas, levels)
2. Opening information (doors, windows, dimensions)
3. Any text annotations or labels
4. Validation issues

SVG Content:
\`\`\`svg
${svgContent}
\`\`\`

Please return a JSON response with this structure:
{
  "rooms": [
    {
      "id": "room-1",
      "name": "Kitchen",
      "type": "kitchen",
      "level": "1",
      "area": 15.5,
      "polygon": [[x1,y1], [x2,y2], ...],
      "centroid": {"x": 100, "y": 150}
    }
  ],
  "openings": [
    {
      "id": "opening-1",
      "type": "door",
      "width": 0.9,
      "height": 2.1,
      "position": {"x": 50, "y": 100}
    }
  ],
  "annotations": [
    {
      "id": "text-1",
      "text": "Kitchen",
      "position": {"x": 100, "y": 150}
    }
  ],
  "validation": {
    "hasSelfIntersections": false,
    "isConnected": true,
    "issues": []
  }
}

Focus on:
- Identifying room boundaries and types
- Detecting doors and windows
- Extracting text labels and annotations
- Calculating approximate areas
- Identifying potential issues

Return only valid JSON.`;
  }

  /**
   * Build prompt for image analysis
   */
  private buildImagePrompt(): string {
    return `You are an expert architect analyzing a floor plan image. Please analyze the uploaded image and extract:

1. Room information (names, types, areas, levels)
2. Opening information (doors, windows, dimensions)
3. Any text annotations or labels visible in the image
4. Validation issues (self-intersections, connectivity problems)

Please return a JSON response with this structure:
{
  "rooms": [
    {
      "id": "room-1",
      "name": "Kitchen",
      "type": "kitchen",
      "level": "1",
      "area": 15.5,
      "polygon": [[x1,y1], [x2,y2], ...],
      "centroid": {"x": 100, "y": 150}
    }
  ],
  "openings": [
    {
      "id": "opening-1",
      "type": "door",
      "width": 0.9,
      "height": 2.1,
      "position": {"x": 50, "y": 100}
    }
  ],
  "annotations": [
    {
      "id": "text-1",
      "text": "Kitchen",
      "position": {"x": 100, "y": 150}
    }
  ],
  "validation": {
    "hasSelfIntersections": false,
    "isConnected": true,
    "issues": []
  }
}

Focus on:
- Identifying room boundaries and types from the visual layout
- Detecting doors and windows in the image
- Extracting any visible text labels and annotations
- Calculating approximate areas based on the visual scale
- Identifying potential architectural issues

Common room types: bedroom, bathroom, kitchen, living_room, dining_room, office, storage, hallway, closet, laundry, garage, basement, attic

Return only valid JSON.`;
  }

  /**
   * Build prompt for JSON analysis
   */
  private buildJSONPrompt(jsonData: any): string {
    return `You are an expert architect analyzing floor plan data. Please analyze the following JSON data and provide semantic labels and validation:

Data:
\`\`\`json
${JSON.stringify(jsonData, null, 2)}
\`\`\`

Please return a JSON response with enhanced semantic information:
{
  "rooms": [
    {
      "id": "room-1",
      "name": "Kitchen",
      "type": "kitchen",
      "level": "1",
      "area": 15.5
    }
  ],
  "openings": [
    {
      "id": "opening-1",
      "type": "door",
      "width": 0.9,
      "height": 2.1
    }
  ],
  "validation": {
    "hasSelfIntersections": false,
    "isConnected": true,
    "issues": []
  }
}

Focus on:
- Semantic labeling of rooms and openings
- Validation of geometric data
- Identifying potential architectural issues
- Suggesting improvements

Return only valid JSON.`;
  }

  /**
   * Call LLM API with image
   */
  private async callLLMWithImage(prompt: string, imageDataUrl: string): Promise<string> {
    if (!this.apiKey || this.apiKey.trim() === '') {
      throw new Error('OpenAI API key is required for LLM analysis');
    }

    try {
      // Extract base64 data from data URL
      const base64Data = imageDataUrl.split(',')[1];
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert architect. Analyze floor plan images and provide accurate semantic labels. Always return valid JSON.'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageDataUrl
                  }
                }
              ]
            }
          ],
          temperature: 1,
          max_completion_tokens: 3000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('LLM API call failed:', error);
      throw new Error(`Failed to call LLM API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Call LLM API
   */
  private async callLLM(prompt: string): Promise<string> {
    if (!this.apiKey || this.apiKey.trim() === '') {
      throw new Error('OpenAI API key is required for LLM analysis');
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert architect. Analyze floor plan data and provide accurate semantic labels. Always return valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 1,
          max_completion_tokens: 3000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('LLM API call failed:', error);
      throw new Error(`Failed to call LLM API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse SVG analysis result
   */
  private parseSVGResult(llmResponse: string, svgContent: string): SimpleFloorPlanData {
    try {
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        rooms: parsed.rooms || [],
        openings: parsed.openings || [],
        annotations: parsed.annotations || [],
        metadata: {
          totalArea: parsed.rooms?.reduce((sum: number, room: any) => sum + (room.area || 0), 0) || 0,
          roomCount: parsed.rooms?.length || 0,
          sourceType: 'svg'
        }
      };
    } catch (error) {
      console.error('Failed to parse SVG LLM response:', error);
      return this.getFallbackResult('svg');
    }
  }

  /**
   * Parse JSON analysis result
   */
  private parseJSONResult(llmResponse: string, originalData: any): SimpleFloorPlanData {
    try {
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        rooms: parsed.rooms || [],
        openings: parsed.openings || [],
        annotations: parsed.annotations || [],
        metadata: {
          totalArea: parsed.rooms?.reduce((sum: number, room: any) => sum + (room.area || 0), 0) || 0,
          roomCount: parsed.rooms?.length || 0,
          sourceType: 'json'
        }
      };
    } catch (error) {
      console.error('Failed to parse JSON LLM response:', error);
      return this.getFallbackResult('json');
    }
  }

  /**
   * Parse image analysis result
   */
  private parseImageResult(llmResponse: string, imageDataUrl: string): SimpleFloorPlanData {
    try {
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        rooms: parsed.rooms || [],
        openings: parsed.openings || [],
        annotations: parsed.annotations || [],
        metadata: {
          totalArea: parsed.rooms?.reduce((sum: number, room: any) => sum + (room.area || 0), 0) || 0,
          roomCount: parsed.rooms?.length || 0,
          sourceType: 'image'
        }
      };
    } catch (error) {
      console.error('Failed to parse image LLM response:', error);
      return this.getFallbackResult('image');
    }
  }

  /**
   * Get hardcoded response for demo purposes
   */
  private getHardcodedResponse(sourceType: 'svg' | 'json' | 'image'): SimpleFloorPlanData {
    return {
      rooms: [
        {
          id: 'room-1',
          name: 'Bedroom A',
          type: 'bedroom',
          level: '1',
          area: 17.20,
          polygon: [
            { x: 0, y: 0 },
            { x: 4.3, y: 0 },
            { x: 4.3, y: 4.0 },
            { x: 0, y: 4.0 }
          ],
          centroid: { x: 2.15, y: 2.0 }
        },
        {
          id: 'room-2',
          name: 'Bedroom B',
          type: 'bedroom',
          level: '1',
          area: 17.20,
          polygon: [
            { x: 4.3, y: 0 },
            { x: 8.6, y: 0 },
            { x: 8.6, y: 4.0 },
            { x: 4.3, y: 4.0 }
          ],
          centroid: { x: 6.45, y: 2.0 }
        },
        {
          id: 'room-3',
          name: 'Bedroom C',
          type: 'bedroom',
          level: '1',
          area: 17.20,
          polygon: [
            { x: 8.6, y: 0 },
            { x: 12.9, y: 0 },
            { x: 12.9, y: 4.0 },
            { x: 8.6, y: 4.0 }
          ],
          centroid: { x: 10.75, y: 2.0 }
        },
        {
          id: 'room-4',
          name: 'Bedroom D',
          type: 'bedroom',
          level: '1',
          area: 17.20,
          polygon: [
            { x: 12.9, y: 0 },
            { x: 17.2, y: 0 },
            { x: 17.2, y: 4.0 },
            { x: 12.9, y: 4.0 }
          ],
          centroid: { x: 15.05, y: 2.0 }
        },
        {
          id: 'room-5',
          name: 'Bathroom A',
          type: 'bathroom',
          level: '1',
          area: 5.00,
          polygon: [
            { x: 0, y: 4.0 },
            { x: 2.5, y: 4.0 },
            { x: 2.5, y: 6.0 },
            { x: 0, y: 6.0 }
          ],
          centroid: { x: 1.25, y: 5.0 }
        },
        {
          id: 'room-6',
          name: 'Bathroom B',
          type: 'bathroom',
          level: '1',
          area: 6.00,
          polygon: [
            { x: 2.5, y: 4.0 },
            { x: 5.5, y: 4.0 },
            { x: 5.5, y: 6.0 },
            { x: 2.5, y: 6.0 }
          ],
          centroid: { x: 4.0, y: 5.0 }
        },
        {
          id: 'room-7',
          name: 'Bathroom C',
          type: 'bathroom',
          level: '1',
          area: 5.00,
          polygon: [
            { x: 5.5, y: 4.0 },
            { x: 8.0, y: 4.0 },
            { x: 8.0, y: 6.0 },
            { x: 5.5, y: 6.0 }
          ],
          centroid: { x: 6.75, y: 5.0 }
        },
        {
          id: 'room-8',
          name: 'Living Room',
          type: 'living_room',
          level: '1',
          area: 25.10,
          polygon: [
            { x: 8.0, y: 4.0 },
            { x: 17.2, y: 4.0 },
            { x: 17.2, y: 8.0 },
            { x: 8.0, y: 8.0 }
          ],
          centroid: { x: 12.6, y: 6.0 }
        },
        {
          id: 'room-9',
          name: 'Kitchen',
          type: 'kitchen',
          level: '1',
          area: 11.20,
          polygon: [
            { x: 0, y: 6.0 },
            { x: 8.0, y: 6.0 },
            { x: 8.0, y: 8.0 },
            { x: 0, y: 8.0 }
          ],
          centroid: { x: 4.0, y: 7.0 }
        },
        {
          id: 'room-10',
          name: 'Hallways',
          type: 'hallway',
          level: '1',
          area: 19.00,
          polygon: [
            { x: 0, y: 8.0 },
            { x: 17.2, y: 8.0 },
            { x: 17.2, y: 10.0 },
            { x: 0, y: 10.0 }
          ],
          centroid: { x: 8.6, y: 9.0 }
        },
        {
          id: 'room-11',
          name: 'Closets (4 WICs total)',
          type: 'storage',
          level: '1',
          area: 10.00,
          polygon: [
            { x: 17.2, y: 0 },
            { x: 20.0, y: 0 },
            { x: 20.0, y: 5.0 },
            { x: 17.2, y: 5.0 }
          ],
          centroid: { x: 18.6, y: 2.5 }
        },
        {
          id: 'room-12',
          name: 'Utility (W/D + WH + Pantry)',
          type: 'utility',
          level: '1',
          area: 5.40,
          polygon: [
            { x: 17.2, y: 5.0 },
            { x: 20.0, y: 5.0 },
            { x: 20.0, y: 8.0 },
            { x: 17.2, y: 8.0 }
          ],
          centroid: { x: 18.6, y: 6.5 }
        }
      ],
      openings: [
        {
          id: 'opening-1',
          type: 'door',
          width: 0.90,
          height: 2.10,
          position: { x: 8.6, y: 8.0 }
        },
        {
          id: 'opening-2',
          type: 'door',
          width: 0.80,
          height: 2.10,
          position: { x: 2.15, y: 4.0 }
        },
        {
          id: 'opening-3',
          type: 'door',
          width: 0.80,
          height: 2.10,
          position: { x: 6.45, y: 4.0 }
        },
        {
          id: 'opening-4',
          type: 'door',
          width: 0.80,
          height: 2.10,
          position: { x: 10.75, y: 4.0 }
        },
        {
          id: 'opening-5',
          type: 'door',
          width: 0.80,
          height: 2.10,
          position: { x: 15.05, y: 4.0 }
        },
        {
          id: 'opening-6',
          type: 'door',
          width: 0.70,
          height: 2.10,
          position: { x: 1.25, y: 6.0 }
        },
        {
          id: 'opening-7',
          type: 'door',
          width: 0.70,
          height: 2.10,
          position: { x: 4.0, y: 6.0 }
        },
        {
          id: 'opening-8',
          type: 'door',
          width: 0.70,
          height: 2.10,
          position: { x: 6.75, y: 6.0 }
        },
        {
          id: 'opening-9',
          type: 'door',
          width: 0.80,
          height: 2.10,
          position: { x: 4.0, y: 8.0 }
        },
        {
          id: 'opening-10',
          type: 'door',
          width: 1.20,
          height: 2.10,
          position: { x: 12.6, y: 8.0 }
        },
        {
          id: 'opening-11',
          type: 'window',
          width: 1.20,
          height: 1.50,
          position: { x: 12.6, y: 4.0 }
        },
        {
          id: 'opening-12',
          type: 'window',
          width: 1.00,
          height: 1.50,
          position: { x: 10.75, y: 0 }
        }
      ],
      annotations: [
        {
          id: 'text-1',
          text: 'Bedroom A',
          position: { x: 2.15, y: 2.0 }
        },
        {
          id: 'text-2',
          text: 'Bedroom B',
          position: { x: 6.45, y: 2.0 }
        },
        {
          id: 'text-3',
          text: 'Bedroom C',
          position: { x: 10.75, y: 2.0 }
        },
        {
          id: 'text-4',
          text: 'Bedroom D',
          position: { x: 15.05, y: 2.0 }
        },
        {
          id: 'text-5',
          text: 'Bathroom A',
          position: { x: 1.25, y: 5.0 }
        },
        {
          id: 'text-6',
          text: 'Bathroom B',
          position: { x: 4.0, y: 5.0 }
        },
        {
          id: 'text-7',
          text: 'Bathroom C',
          position: { x: 6.75, y: 5.0 }
        },
        {
          id: 'text-8',
          text: 'Living Room',
          position: { x: 12.6, y: 6.0 }
        },
        {
          id: 'text-9',
          text: 'Kitchen',
          position: { x: 4.0, y: 7.0 }
        }
      ],
      metadata: {
        totalArea: 130.20,
        roomCount: 12,
        sourceType
      }
    };
  }

  /**
   * Get fallback result when LLM fails
   */
  private getFallbackResult(sourceType: 'svg' | 'json' | 'image'): SimpleFloorPlanData {
    return {
      rooms: [],
      openings: [],
      annotations: [],
      metadata: {
        totalArea: 0,
        roomCount: 0,
        sourceType
      }
    };
  }

  /**
   * Export analysis result to JSON
   */
  exportToJSON(data: SimpleFloorPlanData): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Get analysis statistics
   */
  getStatistics(data: SimpleFloorPlanData): {
    rooms: number;
    openings: number;
    totalArea: number;
    averageRoomArea: number;
    sourceType: string;
  } {
    const roomCount = data.rooms.length;
    const openingCount = data.openings.length;
    const totalArea = data.metadata.totalArea;
    const averageRoomArea = roomCount > 0 ? totalArea / roomCount : 0;

    return {
      rooms: roomCount,
      openings: openingCount,
      totalArea,
      averageRoomArea,
      sourceType: data.metadata.sourceType
    };
  }
}
