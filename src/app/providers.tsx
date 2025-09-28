'use client';

import { useState, useEffect } from 'react';
import { Toaster } from '@/app/components/ui/toaster';
import { Toaster as Sonner } from '@/app/components/ui/sonner';
import { TooltipProvider } from '@/app/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/app/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import Header from '@/app/components/Header';
import { CedarCopilot } from 'cedar-os';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);


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
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CedarCopilot
          llmProvider={{
            provider: 'mastra',
            baseURL: 'http://localhost:4112',
            chatPath: '/api/plan/stream',
            apiKey: process.env.NEXT_PUBLIC_MASTRA_API_KEY || 'not-required',
          }}
        >
          <Toaster />
          <Sonner />
          <div className="min-h-screen bg-background">
            <Header user={user} />
            {children}
          </div>
        </CedarCopilot>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
