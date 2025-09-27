'use client';

import React, { useState, useCallback } from 'react';
import { SimpleLLMAnalyzer, SimpleFloorPlanData } from './simple-llm-analyzer';

const SimpleLLMAnalyzerDemo: React.FC = () => {
  const [inputType, setInputType] = useState<'svg' | 'json'>('svg');
  const [inputContent, setInputContent] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [result, setResult] = useState<SimpleFloorPlanData | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setInputContent(e.target?.result as string);
        setResult(null);
        setError('');
      };
      reader.readAsText(file);
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!inputContent) {
      setError('Please upload a file or enter content first.');
      return;
    }

    if (!apiKey || apiKey.trim() === '') {
      setError('OpenAI API key is required for LLM analysis.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const analyzer = new SimpleLLMAnalyzer(apiKey);
      
      let analysisResult: SimpleFloorPlanData;
      
      if (inputType === 'svg') {
        analysisResult = await analyzer.analyzeSVG(inputContent);
      } else {
        const jsonData = JSON.parse(inputContent);
        analysisResult = await analyzer.analyzeJSON(jsonData);
      }

      setResult(analysisResult);
    } catch (err) {
      setError(`Analysis failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  }, [inputContent, apiKey, inputType]);

  const handleExportJSON = useCallback(() => {
    if (!result) return;

    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'floor-plan-analysis.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const handleClear = useCallback(() => {
    setInputContent('');
    setResult(null);
    setError('');
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🧠 LLM-Only Floor Plan Analyzer
        </h1>
        <p className="text-gray-600 mb-6">
          Upload SVG files or JSON floor plan data for AI-powered semantic analysis. 
          No complex geometric processing - just pure LLM intelligence!
        </p>

        <div className="space-y-4 mb-6">
          {/* Input Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Input Type
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="svg"
                  checked={inputType === 'svg'}
                  onChange={(e) => setInputType(e.target.value as 'svg' | 'json')}
                  className="mr-2"
                />
                SVG Floor Plan
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="json"
                  checked={inputType === 'json'}
                  onChange={(e) => setInputType(e.target.value as 'svg' | 'json')}
                  className="mr-2"
                />
                JSON Floor Plan Data
              </label>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload {inputType.toUpperCase()} File
            </label>
            <input
              type="file"
              accept={inputType === 'svg' ? '.svg' : '.json'}
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Manual Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or Paste {inputType.toUpperCase()} Content
            </label>
            <textarea
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              placeholder={inputType === 'svg' 
                ? 'Paste SVG content here...' 
                : 'Paste JSON floor plan data here...'
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenAI API Key (Required)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={!inputContent || !apiKey || isProcessing}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Analyzing with LLM...' : 'Analyze Floor Plan'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center justify-center space-x-2 text-blue-600 mb-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span>LLM is analyzing your floor plan...</span>
          </div>
        )}
      </div>

      {result && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">LLM Analysis Results</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Statistics */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Analysis Statistics</h3>
              <div className="text-sm text-gray-700 space-y-1">
                <div>Source Type: {result.metadata.sourceType.toUpperCase()}</div>
                <div>Rooms Detected: {result.rooms.length}</div>
                <div>Total Area: {result.metadata.totalArea.toFixed(2)} m²</div>
                <div>Openings: {result.openings.length}</div>
                <div>Annotations: {result.annotations.length}</div>
              </div>
            </div>

            {/* LLM Status */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">
                🤖 LLM Analysis Complete
              </h3>
              <p className="text-sm text-green-700">
                AI-powered semantic analysis using GPT-4
              </p>
            </div>
          </div>

          {/* Rooms */}
          {result.rooms.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-medium text-gray-900 mb-3">Detected Rooms</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.rooms.map((room, index) => (
                  <div key={room.id || index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800">{room.name || `Room ${index + 1}`}</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <div>Type: {room.type || 'Unknown'}</div>
                      <div>Area: {room.area?.toFixed(2) || 'Unknown'} m²</div>
                      <div>Level: {room.level || 'Unknown'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Openings */}
          {result.openings.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-medium text-gray-900 mb-3">Detected Openings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.openings.map((opening, index) => (
                  <div key={opening.id || index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800">
                      {opening.type === 'door' ? '🚪' : '🪟'} {opening.type || 'Opening'} {index + 1}
                    </h4>
                    <div className="text-sm text-green-700 space-y-1">
                      <div>Width: {opening.width?.toFixed(2) || 'Unknown'} m</div>
                      <div>Height: {opening.height?.toFixed(2) || 'Unknown'} m</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* JSON Output */}
          <div>
            <h3 className="text-xl font-medium text-gray-900 mb-3">Analysis JSON</h3>
            <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-auto h-96">
              <code>{JSON.stringify(result, null, 2)}</code>
            </pre>

            <div className="flex space-x-2 mt-4">
              <button
                onClick={handleExportJSON}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Export JSON
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Clear Results
              </button>
            </div>
          </div>
        </div>
      )}

      {!result && !isProcessing && (
        <div className="text-center text-gray-500 p-10 bg-white rounded-lg shadow-lg">
          <p className="text-lg">Upload an SVG file or JSON data to see LLM-powered analysis.</p>
          <p className="text-sm mt-2">
            The AI will analyze your floor plan and provide semantic labels for rooms, openings, and more.
          </p>
        </div>
      )}
    </div>
  );
};

export default SimpleLLMAnalyzerDemo;
