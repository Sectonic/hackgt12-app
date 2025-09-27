import type { PlanData, LLMResponse, Room, Opening, Annotation } from './types';

/**
 * LLM Integration for semantic labeling of floor plan elements
 * Handles room naming, type classification, and validation
 */

export class LLMLabeler {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(
    apiKey: string,
    baseUrl = 'https://api.openai.com/v1',
    model = 'gpt-4o-mini'
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.model = model;
  }

  /**
   * Generate semantic labels for rooms and openings
   */
  async labelPlan(planData: PlanData): Promise<LLMResponse> {
    const prompt = this.buildPrompt(planData);
    
    try {
      const response = await this.callLLM(prompt);
      return this.parseResponse(response);
    } catch (error) {
      console.error('LLM labeling failed:', error);
      return this.getFallbackResponse(planData);
    }
  }

  /**
   * Build comprehensive prompt for LLM
   */
  private buildPrompt(planData: PlanData): string {
    const roomsData = planData.rooms.map(room => ({
      id: room.id,
      area: room.area,
      centroid: room.centroid,
      polygon: room.polygon.slice(0, 4) // First 4 points for brevity
    }));

    const annotationsData = planData.annotations.map(ann => ({
      text: ann.text,
      position: ann.position
    }));

    return `You are an expert architect analyzing a floor plan. Please provide semantic labels for the following data:

ROOMS:
${JSON.stringify(roomsData, null, 2)}

ANNOTATIONS (text found in the plan):
${JSON.stringify(annotationsData, null, 2)}

OPENINGS:
${JSON.stringify(planData.openings, null, 2)}

Please analyze this data and return a JSON response with:
1. Room names and types based on size, position, and nearby annotations
2. Opening types (door/window) and dimensions
3. Validation issues (self-intersections, connectivity problems)

Common room types: bedroom, bathroom, kitchen, living_room, dining_room, office, storage, hallway, closet, laundry, garage, basement, attic

Return only valid JSON in this format:
{
  "rooms": [{"id": "room-0", "name": "Kitchen", "type": "kitchen", "level": 1}],
  "openings": [{"id": "opening-0", "type": "door", "width": 0.9, "height": 2.1}],
  "validation": {
    "hasSelfIntersections": false,
    "isConnected": true,
    "issues": []
  }
}`;
  }

  /**
   * Call LLM API
   */
  private async callLLM(prompt: string): Promise<string> {
    if (!this.apiKey || this.apiKey.trim() === '') {
      throw new Error('OpenAI API key is required for LLM labeling');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
          temperature: 0.1,
          max_tokens: 2000
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
   * Parse LLM response
   */
  private parseResponse(response: string): LLMResponse {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate response structure
      return {
        rooms: parsed.rooms || [],
        openings: parsed.openings || [],
        validation: {
          hasSelfIntersections: parsed.validation?.hasSelfIntersections || false,
          isConnected: parsed.validation?.isConnected || true,
          issues: parsed.validation?.issues || []
        }
      };
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      return this.getFallbackResponse();
    }
  }

  /**
   * Get fallback response when LLM fails
   */
  private getFallbackResponse(planData?: PlanData): LLMResponse {
    const rooms = planData?.rooms.map(room => ({
      id: room.id,
      name: `Room ${room.id}`,
      type: 'unknown',
      level: 1
    })) || [];

    const openings = planData?.openings.map(opening => ({
      id: opening.id,
      type: opening.type,
      width: opening.width,
      height: opening.height
    })) || [];

    return {
      rooms,
      openings,
      validation: {
        hasSelfIntersections: false,
        isConnected: true,
        issues: ['LLM labeling failed - using fallback labels']
      }
    };
  }

  /**
   * Apply LLM labels to plan data
   */
  applyLabels(planData: PlanData, llmResponse: LLMResponse): PlanData {
    const roomMap = new Map(llmResponse.rooms.map(r => [r.id, r]));
    const openingMap = new Map(llmResponse.openings.map(o => [o.id, o]));

    // Update rooms with LLM labels
    const updatedRooms = planData.rooms.map(room => {
      const labels = roomMap.get(room.id);
      return {
        ...room,
        name: labels?.name || room.name,
        type: labels?.type || room.type,
        level: labels?.level || room.level
      };
    });

    // Update openings with LLM labels
    const updatedOpenings = planData.openings.map(opening => {
      const labels = openingMap.get(opening.id);
      return {
        ...opening,
        type: labels?.type as 'door' | 'window' || opening.type,
        width: labels?.width || opening.width,
        height: labels?.height || opening.height
      };
    });

    return {
      ...planData,
      rooms: updatedRooms,
      openings: updatedOpenings
    };
  }

  /**
   * Validate plan geometry and connectivity
   */
  validatePlan(planData: PlanData): {
    hasSelfIntersections: boolean;
    isConnected: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    // Check for self-intersections in rooms
    const hasSelfIntersections = planData.rooms.some(room => 
      this.hasRoomSelfIntersections(room)
    );
    
    if (hasSelfIntersections) {
      issues.push('Some rooms have self-intersecting boundaries');
    }

    // Check connectivity
    const isConnected = this.checkConnectivity(planData);
    if (!isConnected) {
      issues.push('Plan has disconnected components');
    }

    // Check room areas
    const invalidRooms = planData.rooms.filter(room => room.area <= 0);
    if (invalidRooms.length > 0) {
      issues.push(`${invalidRooms.length} rooms have invalid areas`);
    }

    // Check opening dimensions
    const invalidOpenings = planData.openings.filter(opening => 
      opening.width <= 0 || opening.height <= 0
    );
    if (invalidOpenings.length > 0) {
      issues.push(`${invalidOpenings.length} openings have invalid dimensions`);
    }

    return {
      hasSelfIntersections,
      isConnected,
      issues
    };
  }

  /**
   * Check if room has self-intersections
   */
  private hasRoomSelfIntersections(room: Room): boolean {
    const points = room.polygon;
    const n = points.length;
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        
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
  private segmentsIntersect(seg1: { a: { x: number; y: number }; b: { x: number; y: number } }, seg2: { a: { x: number; y: number }; b: { x: number; y: number } }): boolean {
    const ccw = (A: { x: number; y: number }, B: { x: number; y: number }, C: { x: number; y: number }) => {
      return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
    };
    
    return ccw(seg1.a, seg2.a, seg2.b) !== ccw(seg1.b, seg2.a, seg2.b) &&
           ccw(seg1.a, seg1.b, seg2.a) !== ccw(seg1.a, seg1.b, seg2.b);
  }

  /**
   * Check plan connectivity
   */
  private checkConnectivity(planData: PlanData): boolean {
    // Simple connectivity check - all rooms should be reachable
    // This is a simplified version - a full implementation would use graph algorithms
    return planData.rooms.length > 0;
  }
}
