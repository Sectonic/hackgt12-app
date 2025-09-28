'use client';

import { Toaster } from '@/app/components/ui/toaster';
import { Toaster as Sonner } from '@/app/components/ui/sonner';
import { TooltipProvider } from '@/app/components/ui/tooltip';
import Header from '@/app/components/Header';
import { CedarCopilot } from 'cedar-os';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useSupabaseUser } from '@/hooks/useSupabaseUser';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const { user } = useSupabaseUser();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CedarCopilot
          llmProvider={{
            provider: 'mastra',
            baseURL: '',
            chatPath: '/api/chat',
            resumePath: '/api/chat/resume',
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
