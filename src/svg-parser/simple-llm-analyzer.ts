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
    
    const prompt = this.buildSVGPrompt(svgContent);
    const llmResult = await this.callLLM(prompt);
    
    return this.parseSVGResult(llmResult, svgContent);
  }

  /**
   * Analyze floor plan from JSON data
   */
  async analyzeJSON(jsonData: any): Promise<SimpleFloorPlanData> {
    console.log('Analyzing JSON with LLM...');
    
    const prompt = this.buildJSONPrompt(jsonData);
    const llmResult = await this.callLLM(prompt);
    
    return this.parseJSONResult(llmResult, jsonData);
  }

  /**
   * Analyze floor plan from image (base64 data URL)
   */
  async analyzeImage(imageDataUrl: string): Promise<SimpleFloorPlanData> {
    console.log('Analyzing image with LLM...');
    
    const prompt = this.buildImagePrompt();
    const llmResult = await this.callLLMWithImage(prompt, imageDataUrl);
    
    return this.parseImageResult(llmResult, imageDataUrl);
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
