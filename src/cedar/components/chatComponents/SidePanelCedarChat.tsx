import React from 'react';
import { X } from 'lucide-react';
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
  title = 'Floor Plan Assistant',
  collapsedLabel = 'Create your floor plan tasks',
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
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);

  async function handleSend() {
    if (!input.trim() || isSending) return;
    const userText = input.trim();
    setInput('');
    setIsSending(true);

    // Append user message
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);

    // Prepare assistant message placeholder
    let assistantIndex: number;
    setMessages((prev) => {
      assistantIndex = prev.length + 1;
      return [...prev, { role: 'assistant', content: '' }];
    });

    try {
      const res = await fetch('/api/plan/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userText, temperature: 0.2 }),
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
            // Unescape newline encoding used in SSE
            const delta = payload.replace(/\\n/g, '\n');
            setMessages((prev) => {
              const copy = [...prev];
              const idx = assistantIndex! - 1; // last pushed index
              if (copy[idx] && copy[idx].role === 'assistant') {
                copy[idx] = {
                  role: 'assistant',
                  content: copy[idx].content + delta,
                };

                // Check if the response contains a completed JSON structure
                const fullContent = copy[idx].content;
                try {
                  // Look for JSON structure at the beginning of the response
                  if (fullContent.startsWith('{"todoList":')) {
                    const jsonStr = fullContent.split('\n')[0]; // Get first line
                    const parsed = JSON.parse(jsonStr);
                    if (parsed.todoList && Array.isArray(parsed.todoList)) {
                      console.log('🎯 Completed Floor Plan JSON:', parsed);
                      console.log('📋 Todo List:', parsed.todoList);
                    }
                  }
                  // Also try the regex approach for other cases
                  else {
                    const jsonMatch = fullContent.match(/\{[^{}]*"todoList"[^{}]*\}/);
                    if (jsonMatch) {
                      const jsonStr = jsonMatch[0];
                      const parsed = JSON.parse(jsonStr);
                      if (parsed.todoList && Array.isArray(parsed.todoList)) {
                        console.log('🎯 Completed Floor Plan JSON:', parsed);
                        console.log('📋 Todo List:', parsed.todoList);
                      }
                    }
                  }
                } catch (error) {
                  console.log('JSON parsing failed:', error);
                }
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

      // Final check for JSON in the last assistant message
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          try {
            const content = lastMessage.content;
            // Check if JSON is at the beginning
            if (content.startsWith('{"todoList":')) {
              const jsonStr = content.split('\n')[0];
              const parsed = JSON.parse(jsonStr);
              if (parsed.todoList && Array.isArray(parsed.todoList)) {
                console.log('🎯 Final Floor Plan JSON:', parsed);
                console.log('📋 Final Todo List:', parsed.todoList);
              }
            }
            // Also try regex approach
            else {
              const jsonMatch = content.match(/\{[^{}]*"todoList"[^{}]*\}/);
              if (jsonMatch) {
                const jsonStr = jsonMatch[0];
                const parsed = JSON.parse(jsonStr);
                if (parsed.todoList && Array.isArray(parsed.todoList)) {
                  console.log('🎯 Final Floor Plan JSON:', parsed);
                  console.log('📋 Final Todo List:', parsed.todoList);
                }
              }
            }
          } catch (error) {
            console.log('Final JSON parsing failed:', error);
          }
        }
        return prev;
      });
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
                    {m.content}
                  </div>
                ))}
              </div>
            </div>

            {/* Chat input - fixed at bottom */}
            <div className="flex-shrink-0 p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe your floor plan requirements..."
                  className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  disabled={isSending}
                />
                <button
                  onClick={handleSend}
                  disabled={isSending || !input.trim()}
                  className="rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-2 disabled:opacity-50"
                >
                  {isSending ? 'Sending...' : 'Send'}
                </button>
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
