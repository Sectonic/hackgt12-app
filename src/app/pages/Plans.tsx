import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Plus, FileText } from 'lucide-react';

import { User } from '@supabase/supabase-js';

interface PlansProps {
  user: User | null;
}

export default function Plans({ user }: PlansProps) {
  const [activeTab, setActiveTab] = useState('my-plans');

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Floor Plans</h1>
          <p className="text-muted-foreground">Manage your architectural projects</p>
        </div>
        <Button className="flex items-center space-x-2">
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
            <Button>Create New Plan</Button>
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
}
