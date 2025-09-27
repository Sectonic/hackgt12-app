'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Save, Download, Share2, Grid, Move, Square, Type, Eraser } from 'lucide-react';
import { supabase } from '@/app/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const id = params.id as string;

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setUser(user);
      setLoading(false);
    };

    getUser();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Toolbar */}
      <Card className="w-16 h-full rounded-none border-r border-border bg-card flex flex-col items-center py-4 space-y-4">
        <Button variant="ghost" size="icon" className="w-10 h-10">
          <Move className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="w-10 h-10">
          <Square className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="w-10 h-10">
          <Grid className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="w-10 h-10">
          <Type className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="w-10 h-10">
          <Eraser className="h-4 w-4" />
        </Button>
      </Card>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <Card className="h-16 rounded-none border-b border-border bg-card flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold">Floor Plan Editor</h1>
            <span className="text-sm text-muted-foreground">Plan ID: {id}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </Card>

        {/* Canvas Area */}
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Grid className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Floor Plan Canvas</h3>
              <p className="text-sm">Floor plan editor functionality coming soon...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Chat Panel */}
      <Card className="w-80 h-full rounded-none border-l border-border bg-card">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">AI Assistant</h3>
          <p className="text-sm text-muted-foreground">Chat with your design assistant</p>
        </div>
        <div className="flex-1 p-4">
          <div className="text-center text-muted-foreground mt-8">
            <p className="text-sm">AI assistant coming soon...</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
