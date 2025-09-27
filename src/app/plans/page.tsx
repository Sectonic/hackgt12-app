'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Plus, FileText } from 'lucide-react';
import { SidePanelCedarChat } from '@/cedar/components/chatComponents/SidePanelCedarChat';
import { useCedarStore } from 'cedar-os';
import { supabase } from '@/app/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

export default function PlansPage() {
  const [activeTab, setActiveTab] = useState('my-plans');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Get Cedar store functions
  const setShowChat = useCedarStore((state) => state.setShowChat);

  // Function to handle "Create New Plan" button click
  const handleCreatePlan = () => {
    setShowChat(true);
  };

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

  const plansContent = (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Floor Plans</h1>
          <p className="text-muted-foreground">Manage your architectural projects</p>
        </div>
        <Button onClick={handleCreatePlan} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>New Plan</span>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="my-plans">My Plans</TabsTrigger>
          <TabsTrigger value="shared">Shared with Me</TabsTrigger>
        </TabsList>

        <TabsContent value="my-plans" className="mt-6">
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No plans yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first floor plan to get started
            </p>
            <Button onClick={handleCreatePlan}>Create New Plan</Button>
          </div>
        </TabsContent>

        <TabsContent value="shared" className="mt-6">
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No shared plans</h3>
            <p className="text-muted-foreground">Plans shared with you will appear here</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <SidePanelCedarChat
      title="LayOut Assistant"
      collapsedLabel="Need help?"
      showCollapsedButton={true}
    >
      {plansContent}
    </SidePanelCedarChat>
  );
}
