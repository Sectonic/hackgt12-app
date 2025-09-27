'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { Toaster } from '@/app/components/ui/toaster';
import { Toaster as Sonner } from '@/app/components/ui/sonner';
import { supabase } from '@/app/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import Header from '@/app/components/Header';
import Auth from '@/app/pages/Auth';
import Plans from '@/app/pages/Plans';
import Editor from '@/app/pages/Editor';
import ShareView from '@/app/pages/ShareView';
import SVGParser from '@/app/pages/SVGParser';
import NotFound from '@/app/pages/NotFound';
const queryClient = new QueryClient();
export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  useEffect(() => {
    // Check authentication and redirect accordingly
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
      if (user) {
        router.push('/plans');
      } else {
        router.push('/auth');
      }
    };
    checkUser();
  }, [router]);
  // Show loading spinner while redirecting
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
              <Route path="/svg-parser" element={<SVGParser />} />
              <Route path="/s/:token" element={<ShareView />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
