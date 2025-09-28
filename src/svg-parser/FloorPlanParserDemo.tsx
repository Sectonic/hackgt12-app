import React, { useState, useCallback } from 'react';
import { FloorPlanParser } from './index';
import { SimpleSVGParser } from './simple-parser';
import type { PlanData, LLMResponse, FloorPlanData } from './types';

interface ProcessingResult {
  parsedSvg: any;
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
}

export const FloorPlanParserDemo: React.FC = () => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSvgContent(e.target?.result as string);
        setError('');
      };
      reader.readAsText(file);
    } else {
      setError('Please select a valid SVG file');
    }
  }, []);

  const handleProcess = useCallback(async () => {
    if (!svgContent) {
      setError('Please upload an SVG file first');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Try advanced parser first if API key is provided
      if (apiKey && apiKey.trim() !== '') {
        try {
          const parser = new FloorPlanParser(apiKey);
          const result = await parser.processFloorPlan(svgContent);
          setResult(result);
          return;
        } catch (llmError) {
          console.warn('Advanced parser failed, falling back to simple parser:', llmError);
          // Show user-friendly message about fallback
          console.log('Using basic geometric analysis (LLM unavailable)');
          // Continue to fallback parser below
        }
      }
      
      // Fallback to simple parser
      const simpleParser = new SimpleSVGParser();
      const floorPlanData = await simpleParser.processFloorPlan(svgContent);
      
      // Convert to the expected format
      const result = {
        parsedSvg: { polylines: [], annotations: [] },
        planData: {
          rooms: floorPlanData.rooms,
          walls: floorPlanData.walls,
          openings: floorPlanData.openings,
          annotations: floorPlanData.annotations,
          metadata: {
            totalArea: floorPlanData.rooms.reduce((sum, room) => sum + room.area, 0),
            roomCount: floorPlanData.rooms.length,
            wallLength: floorPlanData.walls.reduce((sum, wall) => 
              sum + Math.sqrt((wall.b.x - wall.a.x) ** 2 + (wall.b.y - wall.a.y) ** 2), 0)
          }
        },
        llmResponse: undefined,
        validation: {
          isValid: floorPlanData.validationErrors.length === 0,
          issues: floorPlanData.validationErrors,
          warnings: [],
          statistics: {
            roomCount: floorPlanData.rooms.length,
            totalArea: floorPlanData.rooms.reduce((sum, room) => sum + room.area, 0),
            wallLength: floorPlanData.walls.reduce((sum, wall) => 
              sum + Math.sqrt((wall.b.x - wall.a.x) ** 2 + (wall.b.y - wall.a.y) ** 2), 0),
            openingCount: floorPlanData.openings.length
          }
        }
      };
      
      setResult(result);
    } catch (err) {
      setError(`Processing failed: ${err}`);
    } finally {
      setIsProcessing(false);
    }
  }, [svgContent, apiKey]);

  const handleExportJSON = useCallback(() => {
    if (!result) return;
    
    const dataStr = JSON.stringify(result.planData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'floor-plan.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const handleExportGeoJSON = useCallback(() => {
    if (!result) return;
    
    const parser = new FloorPlanParser();
    const geoJson = parser.exportToGeoJSON(result.planData);
    const dataBlob = new Blob([geoJson], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'floor-plan.geojson';
    link.click();
    URL.revokeObjectURL(url);
  }, [result]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🏗️ Advanced SVG Floor Plan Parser
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Input</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload SVG Floor Plan
              </label>
              <input
                type="file"
                accept=".svg"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OpenAI API Key (Optional - for LLM labeling)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use basic geometric analysis without AI labeling
              </p>
            </div>

            <button
              onClick={handleProcess}
              disabled={!svgContent || isProcessing}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Process Floor Plan'}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Results</h2>
            
            {result && (
              <div className="space-y-4">
                {/* Statistics */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">Statistics</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Rooms: {result.validation.statistics.roomCount}</div>
                    <div>Total Area: {result.validation.statistics.totalArea.toFixed(2)} m²</div>
                    <div>Wall Length: {result.validation.statistics.wallLength.toFixed(2)} m</div>
                    <div>Openings: {result.validation.statistics.openingCount}</div>
                  </div>
                </div>

                {/* Parser Status */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-blue-800 mb-2">
                    Parser Status: {result.llmResponse ? '🤖 Advanced (LLM)' : '⚡ Simple (Basic)'}
                  </h3>
                  <p className="text-sm text-blue-700">
                    {result.llmResponse 
                      ? 'Using advanced parser with AI-powered semantic labeling'
                      : 'Using simple parser with basic geometric analysis (no API key or LLM failed)'
                    }
                  </p>
                </div>

                {/* Validation Status */}
                <div className={`rounded-lg p-4 ${
                  result.validation.isValid 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Validation: {result.validation.isValid ? '✅ Valid' : '❌ Invalid'}
                  </h3>
                  
                  {result.validation.issues.length > 0 && (
                    <div className="mb-2">
                      <p className="text-sm font-medium text-red-800">Issues:</p>
                      <ul className="text-sm text-red-700 list-disc list-inside">
                        {result.validation.issues.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {result.validation.warnings.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Warnings:</p>
                      <ul className="text-sm text-yellow-700 list-disc list-inside">
                        {result.validation.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Rooms */}
                {result.planData.rooms.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-2">Detected Rooms</h3>
                    <div className="space-y-2">
                      {result.planData.rooms.map((room, index) => (
                        <div key={index} className="text-sm bg-white rounded p-2">
                          <div className="font-medium">{room.name || room.id}</div>
                          <div className="text-gray-600">
                            Type: {room.type || 'Unknown'} | 
                            Area: {room.area.toFixed(2)} m²
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* LLM Response */}
                {result.llmResponse && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-2">LLM Analysis</h3>
                    <div className="text-sm">
                      <div>Rooms labeled: {result.llmResponse.rooms.length}</div>
                      <div>Openings analyzed: {result.llmResponse.openings.length}</div>
                      {result.llmResponse.validation.issues.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium">LLM Issues:</p>
                          <ul className="list-disc list-inside">
                            {result.llmResponse.validation.issues.map((issue, index) => (
                              <li key={index}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Export Buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={handleExportJSON}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 text-sm"
                  >
                    Export JSON
                  </button>
                  <button
                    onClick={handleExportGeoJSON}
                    className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 text-sm"
                  >
                    Export GeoJSON
                  </button>
                </div>
              </div>
            )}

            {!result && !isProcessing && (
              <div className="text-center text-gray-500 py-8">
                Upload an SVG file and click "Process Floor Plan" to see results
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🚀 Advanced Features</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">🔧 Geometric Processing</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Coordinate snapping</li>
              <li>• Segment merging</li>
              <li>• Noise reduction</li>
              <li>• Shared wall detection</li>
            </ul>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">🏠 Room Detection</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Planar graph algorithms</li>
              <li>• Cycle detection</li>
              <li>• Hole removal</li>
              <li>• Area calculation</li>
            </ul>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="font-semibold text-purple-800 mb-2">🤖 LLM Integration</h3>
            <ul className="text-sm text-purple-700 space-y-1">
              <li>• Semantic room labeling</li>
              <li>• Type classification</li>
              <li>• Opening analysis</li>
              <li>• Validation assistance</li>
            </ul>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <h3 className="font-semibold text-orange-800 mb-2">✅ Validation</h3>
            <ul className="text-sm text-orange-700 space-y-1">
              <li>• Self-intersection checks</li>
              <li>• Connectivity validation</li>
              <li>• Data integrity</li>
              <li>• Quality metrics</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloorPlanParserDemo;
