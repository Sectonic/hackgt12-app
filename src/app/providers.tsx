'use client';

import { Toaster } from '@/app/components/ui/toaster';
import { Toaster as Sonner } from '@/app/components/ui/sonner';
import { TooltipProvider } from '@/app/components/ui/tooltip';
import Header from '@/app/components/Header';
import { CedarCopilot } from 'cedar-os';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthContext } from '@/context/auth-context';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';
import { messageRenderers } from '@/cedar/messageRenderers';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSupabaseUser();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthContext.Provider value={{ user, loading }}>
          <CedarCopilot
            llmProvider={{
              provider: 'mastra',
              baseURL: 'http://localhost:4111',
              apiKey: process.env.NEXT_PUBLIC_MASTRA_API_KEY || 'not-required',
            }}
            messageRenderers={messageRenderers}
          >
            <Toaster />
            <Sonner />
            <div className="min-h-screen bg-background">
              <Header />
              {children}
            </div>
          </CedarCopilot>
        </AuthContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
