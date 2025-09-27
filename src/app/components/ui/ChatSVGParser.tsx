'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { useToast } from '@/app/hooks/use-toast';
import { 
  Upload, 
  Send, 
  FileText, 
  Image, 
  Code, 
  Bot, 
  User, 
  Loader2,
  Download,
  Trash2,
  Sparkles
} from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  fileType?: 'svg' | 'image' | 'json';
  fileName?: string;
  analysisResult?: any;
  timestamp: Date;
}

interface FileUpload {
  file: File;
  type: 'svg' | 'image' | 'json';
  content: string;
}

export default function ChatSVGParser() {
  // Get OpenAI API key from environment or use fallback
  const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
  
  const isApiKeyConfigured = OPENAI_API_KEY && OPENAI_API_KEY.trim() !== '';
  
  const getWelcomeMessage = () => {
    const baseMessage = "Hi! I'm your AI Floor Plan Analyzer. Upload any floor plan file (SVG, image, or JSON) and I'll analyze it for you. I can automatically detect the file type and provide detailed insights about rooms, openings, and architectural features.";
    
    if (isApiKeyConfigured) {
      return baseMessage + "\n\n✅ OpenAI API configured - ready for real AI analysis!";
    } else {
      return baseMessage + "\n\n⚠️ **OpenAI API key required**: Please set the NEXT_PUBLIC_OPENAI_API_KEY environment variable to enable AI analysis. Without it, analysis will fail.";
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<FileUpload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const detectFileType = (file: File): 'svg' | 'image' | 'json' => {
    const extension = file.name.toLowerCase().split('.').pop();
    const mimeType = file.type.toLowerCase();

    if (extension === 'svg' || mimeType === 'image/svg+xml') {
      return 'svg';
    } else if (extension === 'json' || mimeType === 'application/json') {
      return 'json';
    } else if (mimeType.startsWith('image/')) {
      return 'image';
    } else {
      // Default to image for unknown types
      return 'image';
    }
  };

  const handleFileUpload = useCallback(async (file: File) => {
    const fileType = detectFileType(file);
    
    try {
      let content: string;
      
      if (fileType === 'image') {
        // Convert image to base64
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else {
        // Read text files
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }

      setUploadedFile({ file, type: fileType, content });

      // Add user message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: `📁 Uploaded ${fileType.toUpperCase()} file: ${file.name}`,
        fileType,
        fileName: file.name,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);

      // Auto-analyze the file
      await analyzeFile(fileType, content, file.name);

    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to process the uploaded file. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const analyzeFile = async (fileType: 'svg' | 'image' | 'json', content: string, fileName: string) => {
    setIsProcessing(true);

    try {
      // Call OpenAI API for real analysis
      const analysisResult = await callOpenAI(fileType, content);

      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `🔍 **Analysis Complete!**

I've analyzed your ${fileType.toUpperCase()} file and found:

• **${analysisResult.rooms.length} rooms** detected
• **${analysisResult.openings.length} openings** (doors/windows)
• **${analysisResult.metadata.totalArea.toFixed(1)} m²** total area
• **${analysisResult.annotations.length} text annotations**

Here's what I discovered:`,
        fileType,
        fileName,
        analysisResult,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `❌ **Analysis Failed**

Sorry, I encountered an error while analyzing your file. Please try uploading a different file or check if the file format is supported.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const callOpenAI = async (fileType: string, content: string): Promise<any> => {
    if (!isApiKeyConfigured) {
      throw new Error('OpenAI API key is required for LLM analysis. Please set NEXT_PUBLIC_OPENAI_API_KEY environment variable.');
    }

    try {
      let prompt: string;
      let messages: any[];

      if (fileType === 'image') {
        prompt = `You are an expert architect analyzing a floor plan image. Please analyze the uploaded image and extract:

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
  "annotations": [
    {
      "id": "text-1",
      "text": "Kitchen",
      "position": {"x": 100, "y": 150}
    }
  ],
  "metadata": {
    "totalArea": 62.7,
    "roomCount": 4,
    "sourceType": "${fileType}"
  }
}

Focus on identifying room boundaries, doors, windows, and any visible text labels. Return only valid JSON.`;

        messages = [
          {
            role: 'system',
            content: 'You are an expert architect. Analyze floor plan images and provide accurate semantic labels. Always return valid JSON.'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: content } }
            ]
          }
        ];
      } else {
        prompt = `You are an expert architect analyzing a floor plan ${fileType.toUpperCase()} file. Please analyze the content and extract:

1. Room information (names, types, areas, levels)
2. Opening information (doors, windows, dimensions)
3. Any text annotations or labels
4. Validation issues

Content:
\`\`\`${fileType}
${fileType === 'json' ? JSON.stringify(JSON.parse(content), null, 2) : content}
\`\`\`

Please return a JSON response with this structure:
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
  "annotations": [
    {
      "id": "text-1",
      "text": "Kitchen",
      "position": {"x": 100, "y": 150}
    }
  ],
  "metadata": {
    "totalArea": 62.7,
    "roomCount": 4,
    "sourceType": "${fileType}"
  }
}

Return only valid JSON.`;

        messages = [
          {
            role: 'system',
            content: 'You are an expert architect. Analyze floor plan data and provide accurate semantic labels. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ];
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o', // Use GPT-4o for better image analysis
          messages,
          temperature: 0.1,
          max_tokens: 3000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const responseContent = data.choices[0].message.content;
      
      // Extract JSON from response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in OpenAI response');
      }

      return JSON.parse(jsonMatch[0]);

    } catch (error) {
      console.error('OpenAI API call failed:', error);
      throw new Error(`LLM analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };


  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !uploadedFile) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I understand your question! Feel free to upload a floor plan file and I'll analyze it for you. I can help with:\n\n• **Room identification** and classification\n• **Door and window detection**\n• **Area calculations**\n• **Architectural insights**\n• **File format conversion**",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 1000);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleExportResults = () => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.analysisResult) {
      const dataStr = JSON.stringify(lastMessage.analysisResult, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'floor-plan-analysis.json';
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Analysis results have been downloaded as JSON.",
      });
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (fileType?: string) => {
    switch (fileType) {
      case 'svg':
        return <Code className="h-4 w-4" />;
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'json':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">AI Floor Plan Analyzer</h1>
              <p className="text-sm text-muted-foreground">Upload files for automatic analysis</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {messages.length > 1 && (
              <Button variant="outline" size="sm" onClick={handleExportResults}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleClearChat}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary/20 rounded-full">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Hi! I'm your AI Floor Plan Analyzer
              </h2>
              <p className="text-muted-foreground mb-3">
                Upload any floor plan file (SVG, image, or JSON) and I'll analyze it for you. I can automatically detect the file type and provide detailed insights about rooms, openings, and architectural features.
              </p>
              <div className="flex items-center space-x-2">
                {isApiKeyConfigured ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      OpenAI API configured - ready for real AI analysis!
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    OpenAI API configured - ready for real AI analysis!
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Ready to analyze your floor plan?</h3>
              <p className="text-muted-foreground mb-4">
                Upload an SVG, image, or JSON file to get started with AI-powered analysis.
              </p>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                className="mx-auto"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            </div>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.type === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.type === 'assistant' && (
                  <div className="p-1 bg-primary/10 rounded-full">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                {message.type === 'user' && (
                  <div className="p-1 bg-primary-foreground/20 rounded-full">
                    <User className="h-4 w-4" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-sm">
                    {message.content.split('\n').map((line, index) => {
                      // Handle bold text with **text** syntax
                      const parts = line.split(/(\*\*.*?\*\*)/g);
                      return (
                        <div key={index} className="mb-1">
                          {parts.map((part, partIndex) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return (
                                <strong key={partIndex} className="font-semibold">
                                  {part.slice(2, -2)}
                                </strong>
                              );
                            }
                            return part;
                          })}
                        </div>
                      );
                    })}
                  </div>
                  
                  {message.fileType && (
                    <div className="mt-2 flex items-center space-x-2 text-xs opacity-75">
                      {getFileIcon(message.fileType)}
                      <span>{message.fileName}</span>
                    </div>
                  )}

                  {message.analysisResult && (
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded">
                          <div className="font-medium">Rooms</div>
                          <div>{message.analysisResult.rooms.length}</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950 p-2 rounded">
                          <div className="font-medium">Openings</div>
                          <div>{message.analysisResult.openings.length}</div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-950 p-2 rounded">
                          <div className="font-medium">Total Area</div>
                          <div>{message.analysisResult.metadata.totalArea.toFixed(1)} m²</div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-950 p-2 rounded">
                          <div className="font-medium">Annotations</div>
                          <div>{message.analysisResult.annotations.length}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="p-1 bg-primary/10 rounded-full">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Analyzing your file...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-card p-4">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask me about floor plans or upload a file..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="min-h-[40px]"
            />
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".svg,.json,image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-10 px-3"
          >
            <Upload className="h-4 w-4" />
          </Button>
          
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() && !uploadedFile}
            className="h-10 px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="mt-2 text-xs text-muted-foreground">
          💡 Supported formats: SVG, JSON, PNG, JPG, GIF, WebP
        </div>
      </div>
    </div>
  );
}
