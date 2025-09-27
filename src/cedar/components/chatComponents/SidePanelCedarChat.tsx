import React from 'react';
import { X, Upload, FileText, Image, Code, Paperclip } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useCedarStore } from 'cedar-os';
import { SidePanelContainer } from '@/cedar/components/structural/SidePanelContainer';
import { CollapsedButton } from '@/cedar/components/chatMessages/structural/CollapsedChatButton';
import Container3D from '@/cedar/components/containers/Container3D';

interface SidePanelCedarChatProps {
  children?: React.ReactNode; // Page content to wrap
  side?: 'left' | 'right';
  title?: string;
  collapsedLabel?: string;
  showCollapsedButton?: boolean; // Control whether to show the collapsed button
  companyLogo?: React.ReactNode;
  dimensions?: {
    width?: number;
    minWidth?: number;
    maxWidth?: number;
  };
  resizable?: boolean;
  className?: string; // Additional CSS classes for positioning
  topOffset?: number; // Top offset in pixels (e.g., for navbar height)
  stream?: boolean; // Whether to use streaming for responses
}

export const SidePanelCedarChat: React.FC<SidePanelCedarChatProps> = ({
  children, // Page content
  side = 'right',
  title = 'Cedar Chat',
  collapsedLabel = 'How can I help you today?',
  showCollapsedButton = true,
  companyLogo,
  dimensions = {
    width: 600,
    minWidth: 300,
    maxWidth: 800,
  },
  resizable = true,
  className = '',
  topOffset = 0,
}) => {
  // Get showChat state and setShowChat from store
  const showChat = useCedarStore((state) => state.showChat);
  const setShowChat = useCedarStore((state) => state.setShowChat);

  // Local chat state (AI SDK direct streaming)
  const [input, setInput] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const [messages, setMessages] = React.useState<
    Array<{ role: 'user' | 'assistant'; content: string; fileType?: string; fileName?: string }>
  >([]);
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const detectFileType = (file: File): string => {
    const extension = file.name.toLowerCase().split('.').pop();
    const mimeType = file.type.toLowerCase();

    if (extension === 'svg' || mimeType === 'image/svg+xml') {
      return 'svg';
    } else if (extension === 'json' || mimeType === 'application/json') {
      return 'json';
    } else if (mimeType.startsWith('image/')) {
      return 'image';
    } else {
      return 'file';
    }
  };

  const getFileIcon = (fileType: string) => {
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

  const cleanText = (text: string) => {
    // Clean up the text by fixing common streaming issues
    return text
      .replace(/([.!?])([A-Z])/g, '$1 $2') // Add space after sentence endings
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
      .replace(/(\w)([A-Z])/g, '$1 $2') // Add space between words and capitals
      .replace(/([a-z])(\d)/g, '$1 $2') // Add space between letters and numbers
      .replace(/(\d)([A-Z])/g, '$1 $2') // Add space between numbers and capitals
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\s+([.!?])/g, '$1') // Remove spaces before punctuation
      .trim();
  };

  const handleFileUpload = async (file: File) => {
    const fileType = detectFileType(file);
    setUploadedFile(file);
    
    // Add user message with file info
    setMessages((prev) => [...prev, { 
      role: 'user', 
      content: `📁 Uploaded ${fileType.toUpperCase()} file: ${file.name}`,
      fileType,
      fileName: file.name
    }]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  async function handleSend() {
    if ((!input.trim() && !uploadedFile) || isSending) return;
    
    const userText = input.trim();
    const hasFile = uploadedFile !== null;
    
    setInput('');
    setUploadedFile(null);
    setIsSending(true);

    // Append user message
    setMessages((prev) => [...prev, { 
      role: 'user', 
      content: userText || (hasFile ? `📁 Analyzing uploaded file: ${uploadedFile?.name}` : ''),
      fileType: hasFile ? detectFileType(uploadedFile!) : undefined,
      fileName: hasFile ? uploadedFile?.name : undefined
    }]);

    // Prepare assistant message placeholder
    let assistantIndex: number;
    setMessages((prev) => {
      assistantIndex = prev.length + 1;
      return [...prev, { role: 'assistant', content: '' }];
    });

    try {
      // Prepare the prompt with file context if needed
      let prompt = userText;
      if (hasFile && uploadedFile) {
        const fileType = detectFileType(uploadedFile);
        prompt = `I've uploaded a ${fileType.toUpperCase()} file (${uploadedFile.name}). ${userText || 'Please analyze this file and provide insights about the floor plan.'}`;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, temperature: 0.2 }),
      });
      if (!res.ok || !res.body) throw new Error('Failed to stream response');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE lines
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const part of parts) {
          const line = part.trim();
          if (!line) continue;
          if (line.startsWith('event: done')) continue;
          if (line.startsWith('data:')) {
            const payload = line.slice(5).trim();
            if (!payload) continue;
            
            // Process the text properly
            let delta = payload;
            
            // Handle escaped characters
            delta = delta.replace(/\\n/g, '\n');
            delta = delta.replace(/\\t/g, '\t');
            delta = delta.replace(/\\"/g, '"');
            delta = delta.replace(/\\\\/g, '\\');
            
            setMessages((prev) => {
              const copy = [...prev];
              const idx = assistantIndex! - 1; // last pushed index
              if (copy[idx] && copy[idx].role === 'assistant') {
                // Add proper spacing between words if needed
                if (delta && !delta.match(/^[\s\n]/) && copy[idx].content && !copy[idx].content.endsWith(' ') && !copy[idx].content.endsWith('\n')) {
                  delta = ' ' + delta;
                }
                
                copy[idx] = {
                  role: 'assistant',
                  content: copy[idx].content + delta,
                };
              }
              return copy;
            });
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong.' },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      {showCollapsedButton && (
        <AnimatePresence mode="wait">
          {!showChat && (
            <CollapsedButton
              side={side}
              label={collapsedLabel}
              onClick={() => setShowChat(true)}
              layoutId="cedar-sidepanel-chat"
              position="fixed"
            />
          )}
        </AnimatePresence>
      )}

      <SidePanelContainer
        isActive={showChat}
        side={side}
        dimensions={dimensions}
        resizable={resizable}
        topOffset={topOffset}
        panelClassName={`dark:bg-gray-900 ${className}`}
        panelContent={
          <Container3D className="flex flex-col h-full">
            {/* Header */}
            <div className="flex-shrink-0 z-20 flex flex-row items-center justify-between px-4 py-2 min-w-0 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center min-w-0 flex-1">
                {companyLogo && <div className="flex-shrink-0 w-6 h-6 mr-2">{companyLogo}</div>}
                <span className="font-bold text-lg truncate">{title}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                  onClick={() => setShowChat(false)}
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Chat messages - takes up remaining space */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="h-full overflow-y-auto p-4 space-y-3">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={
                      m.role === 'user'
                        ? 'ml-auto max-w-[80%] rounded-lg bg-blue-500/90 text-white px-3 py-2'
                        : 'mr-auto max-w-[80%] rounded-lg bg-gray-100 dark:bg-gray-800 text-foreground px-3 py-2'
                    }
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {cleanText(m.content).split('\n').map((line, lineIndex) => {
                        // Handle markdown formatting
                        const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|#{1,6}\s+.*|^[-*+]\s+.*|^\d+\.\s+.*)/g);
                        return (
                          <div key={lineIndex} className="mb-1">
                            {parts.map((part, partIndex) => {
                              if (part.startsWith('**') && part.endsWith('**')) {
                                return (
                                  <strong key={partIndex} className="font-bold">
                                    {part.slice(2, -2)}
                                  </strong>
                                );
                              } else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
                                return (
                                  <em key={partIndex} className="italic">
                                    {part.slice(1, -1)}
                                  </em>
                                );
                              } else if (part.startsWith('`') && part.endsWith('`')) {
                                return (
                                  <code key={partIndex} className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-sm">
                                    {part.slice(1, -1)}
                                  </code>
                                );
                              } else if (part.match(/^#{1,6}\s+/)) {
                                const level = part.match(/^#+/)?.[0].length || 1;
                                const text = part.replace(/^#+\s+/, '');
                                const headingClass = `font-bold ${level === 1 ? 'text-xl' : level === 2 ? 'text-lg' : 'text-base'} mt-2 mb-1`;
                                
                                if (level === 1) {
                                  return <h1 key={partIndex} className={headingClass}>{text}</h1>;
                                } else if (level === 2) {
                                  return <h2 key={partIndex} className={headingClass}>{text}</h2>;
                                } else if (level === 3) {
                                  return <h3 key={partIndex} className={headingClass}>{text}</h3>;
                                } else if (level === 4) {
                                  return <h4 key={partIndex} className={headingClass}>{text}</h4>;
                                } else if (level === 5) {
                                  return <h5 key={partIndex} className={headingClass}>{text}</h5>;
                                } else {
                                  return <h6 key={partIndex} className={headingClass}>{text}</h6>;
                                }
                              } else if (part.match(/^[-*+]\s+/)) {
                                return (
                                  <div key={partIndex} className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>{part.replace(/^[-*+]\s+/, '')}</span>
                                  </div>
                                );
                              } else if (part.match(/^\d+\.\s+/)) {
                                return (
                                  <div key={partIndex} className="flex items-start">
                                    <span className="mr-2">{part.match(/^\d+/)?.[0]}.</span>
                                    <span>{part.replace(/^\d+\.\s+/, '')}</span>
                                  </div>
                                );
                              }
                              return part;
                            })}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* File info display */}
                    {m.fileType && m.fileName && (
                      <div className="mt-2 flex items-center space-x-2 text-xs opacity-75">
                        {getFileIcon(m.fileType)}
                        <span>{m.fileName}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Chat input - fixed at bottom */}
            <div className="flex-shrink-0 p-3">
              {/* File upload indicator */}
              {uploadedFile && (
                <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getFileIcon(detectFileType(uploadedFile))}
                    <span className="text-sm font-medium">{uploadedFile.name}</span>
                  </div>
                  <button
                    onClick={() => setUploadedFile(null)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={uploadedFile ? "Add a message about the file..." : "Type your message..."}
                  className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  disabled={isSending}
                />
                
                {/* File upload button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm px-3 py-2"
                  title="Upload file"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                
                <button
                  onClick={handleSend}
                  disabled={isSending || (!input.trim() && !uploadedFile)}
                  className="rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-2 disabled:opacity-50"
                >
                  {isSending ? 'Sending...' : 'Send'}
                </button>
              </div>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,.json,image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file);
                  }
                }}
                className="hidden"
              />
              
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                💡 Press Enter to send • Supports SVG, JSON, and images
              </div>
            </div>
          </Container3D>
        }
      >
        {/* Page content that gets squished when panel opens */}
        {children}
      </SidePanelContainer>
    </>
  );
};
