'use client';

import { useState } from 'react';
import { SidePanelCedarChat } from '@/cedar/components/chatComponents/SidePanelCedarChat';
import { EmbeddedCedarChat } from '@/cedar/components/chatComponents/EmbeddedCedarChat';
import { FloatingCedarChat } from '@/cedar/components/chatComponents/FloatingCedarChat';
import { ChatModeSelector, ChatMode } from '@/app/components/ChatModeSelector';
type LocalChatMode = 'floating' | 'sidepanel' | 'embedded';

export default function ChatTestPage() {
  const [chatMode, setChatMode] = useState<LocalChatMode>('sidepanel');

  const renderChat = () => {
    switch (chatMode) {
      case 'floating':
        return (
          <FloatingCedarChat
            side="right"
            title="Floor Plan Assistant"
            collapsedLabel="Need help with floor plans?"
            dimensions={{
              width: 400,
              height: 600,
              minWidth: 350,
              minHeight: 400,
            }}
            resizable={true}
          />
        );
      case 'sidepanel':
        return (
          <SidePanelCedarChat
            side="right"
            title="Floor Plan Assistant"
            collapsedLabel="Need help with floor plans?"
            dimensions={{
              width: 500,
              minWidth: 350,
              maxWidth: 700,
            }}
            resizable={true}
          >
            <div className="flex-1 flex items-center justify-center min-h-screen">
              <div className="text-center space-y-6">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                  Floor Plan Assistant
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                  Welcome to the Floor Plan Assistant! Click on the chat button to start describing
                  your floor plan requirements, and I'll help you create a structured plan for
                  implementation.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    How it works:
                  </h3>
                  <ol className="text-left text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                    <li>Tell me what type of space you need (residential, office, etc.)</li>
                    <li>Describe the rooms and areas you want</li>
                    <li>Mention any special requirements or constraints</li>
                    <li>I&apos;ll create a detailed todo list for implementing your floor plan</li>
                  </ol>
                </div>
              </div>
            </div>
          </SidePanelCedarChat>
        );
      case 'embedded':
        return (
          <div className="flex min-h-screen">
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center space-y-4 max-w-md">
                <h1 className="text-2xl font-bold">Floor Plan Assistant</h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Chat embedded mode - use the chat interface on the right to get started.
                </p>
              </div>
            </div>
            <div className="w-96 border-l border-gray-200 dark:border-gray-800">
              <EmbeddedCedarChat
                title="Floor Plan Assistant"
                showHeader={true}
                showCloseButton={false}
                stream={true}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ChatModeSelector
        currentMode={chatMode as ChatMode}
        onModeChange={(mode) =>
          setChatMode(mode === 'caption' ? 'embedded' : (mode as LocalChatMode))
        }
      />
      {renderChat()}
    </div>
  );
}
