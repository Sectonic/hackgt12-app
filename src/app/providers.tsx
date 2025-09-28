'use client';

import { useState, useEffect } from 'react';
import { Toaster } from '@/app/components/ui/toaster';
import { Toaster as Sonner } from '@/app/components/ui/sonner';
import { TooltipProvider } from '@/app/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/app/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import Header from '@/app/components/Header';
import cedarProvider from '@/app/lib/cedar-provider';

const queryClient = new QueryClient();

// Configure Cedar provider
const cedarConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4114',
  endpoints: {
    chat: '/api/agents/agentCreatePlan',
    chatStream: '/api/agents/agentCreatePlan/stream',
  },
};

// Make config available globally for Cedar
if (typeof window !== 'undefined') {
  (window as typeof window & { __CEDAR_CONFIG__: typeof cedarConfig }).__CEDAR_CONFIG__ =
    cedarConfig;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Initialize Cedar provider
    if (typeof window !== 'undefined') {
      (
        window as typeof window & {
          __CEDAR_PROVIDER__: typeof cedarProvider;
          __CEDAR_CONFIG__: typeof cedarConfig;
        }
      ).__CEDAR_PROVIDER__ = cedarProvider;
      (
        window as typeof window & {
          __CEDAR_PROVIDER__: typeof cedarProvider;
          __CEDAR_CONFIG__: typeof cedarConfig;
        }
      ).__CEDAR_CONFIG__ = cedarConfig;
    }
  }, []);

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
        <Toaster />
        <Sonner />
        <div className="min-h-screen bg-background">
          <Header user={user} />
          {children}
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
