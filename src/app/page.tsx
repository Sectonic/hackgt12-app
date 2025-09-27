'use client';

import React, { useEffect, useState } from 'react';
import { Toaster } from '@/app/components/ui/toaster';
import { Toaster as Sonner } from '@/app/components/ui/sonner';
import { TooltipProvider } from '@/app/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '@/app/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import Header from '@/app/components/Header';
import Auth from '@/app/pages/Auth';
import Plans from '@/app/pages/Plans';
import Editor from '@/app/pages/Editor';
import ShareView from '@/app/pages/ShareView';
import NotFound from '@/app/pages/NotFound';
// import { ChatModeSelector } from '@/app/components/ChatModeSelector';
import { SidePanelCedarChat } from '@/cedar/components/chatComponents/SidePanelCedarChat';
import { DebuggerPanel } from '@/cedar/components/debugger/DebuggerPanel';

type ChatMode = 'floating' | 'sidepanel' | 'caption';

const queryClient = new QueryClient();

export default function HomePage() {
  const [chatMode] = React.useState<ChatMode>('sidepanel');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const renderContent = () => {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} />
        <Routes>
          <Route
            path="/"
            element={user ? <Navigate to="/plans" replace /> : <Navigate to="/auth" replace />}
          />
          <Route path="/auth" element={user ? <Navigate to="/plans" replace /> : <Auth />} />
          <Route
            path="/plans"
            element={user ? <Plans user={user} /> : <Navigate to="/auth" replace />}
          />
          <Route
            path="/plans/:id/editor"
            element={user ? <Editor user={user} /> : <Navigate to="/auth" replace />}
          />
          <Route path="/s/:token" element={<ShareView />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    );
  };

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (chatMode === 'sidepanel') {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SidePanelCedarChat
              side="right"
              title="LayOut AI Assistant"
              collapsedLabel="LayOut AI"
              showCollapsedButton={true}
            >
              <DebuggerPanel />
              {renderContent()}
            </SidePanelCedarChat>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>{renderContent()}</BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
