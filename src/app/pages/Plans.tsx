import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Plus, FileText } from 'lucide-react';
import PlanCard from '@/app/components/PlanCard';
import EditPlanDialog from '@/app/components/EditPlanDialog';
import SharePlanDialog from '@/app/components/SharePlanDialog';

import { User } from '@supabase/supabase-js';

interface PlansProps {
  user: User | null;
}

// Dummy data for demonstration
const dummyPlans = [
  {
    id: '1',
    title: 'Modern Office Layout',
    description: 'A contemporary open-plan office design with collaborative spaces and private meeting rooms.',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T14:30:00Z',
  },
  {
    id: '2',
    title: 'Residential House Plan',
    description: '3-bedroom family home with open kitchen and living area, perfect for modern living.',
    created_at: '2024-01-10T09:15:00Z',
    updated_at: '2024-01-18T16:45:00Z',
  },
  {
    id: '3',
    title: 'Restaurant Floor Plan',
    description: 'Cozy restaurant layout with bar seating, dining area, and kitchen workspace optimization.',
    created_at: '2024-01-05T11:20:00Z',
    updated_at: '2024-01-12T13:10:00Z',
  },
  {
    id: '4',
    title: 'Retail Store Design',
    description: 'Modern retail space with customer flow optimization and product display areas.',
    created_at: '2024-01-01T08:30:00Z',
    updated_at: '2024-01-08T12:00:00Z',
  },
];

export default function Plans({ user }: PlansProps) {
  const [activeTab, setActiveTab] = useState('my-plans');
  const [plans, setPlans] = useState(dummyPlans);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [sharingPlan, setSharingPlan] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const handleView = (plan: any) => {
    console.log('View plan:', plan.title);
    // Navigate to plan view - could link to /plans/${plan.id}/view
    window.open(`/plans/${plan.id}/editor`, '_blank');
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    setIsEditDialogOpen(true);
  };

  const handleShare = (plan: any) => {
    setSharingPlan(plan);
    setIsShareDialogOpen(true);
  };

  const handleDelete = (plan: any) => {
    if (confirm(`Are you sure you want to delete "${plan.title}"?`)) {
      setPlans(plans.filter(p => p.id !== plan.id));
    }
  };

  const handleSaveEdit = (updatedPlan: any) => {
    setPlans(plans.map(p => p.id === updatedPlan.id ? updatedPlan : p));
  };

  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingPlan(null);
  };

  const closeShareDialog = () => {
    setIsShareDialogOpen(false);
    setSharingPlan(null);
  };

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
          {plans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onView={handleView}
                  onEdit={handleEdit}
                  onShare={handleShare}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No plans yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first floor plan to get started
              </p>
              <Button>Create New Plan</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="shared" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <PlanCard
              plan={{
                id: 'shared-1',
                title: 'Collaborative Workspace',
                description: 'Shared office space design with flexible seating arrangements.',
                created_at: '2024-01-12T10:00:00Z',
                updated_at: '2024-01-19T15:30:00Z',
              }}
              onView={handleView}
              onEdit={handleEdit}
              onShare={handleShare}
              onDelete={handleDelete}
            />
            <PlanCard
              plan={{
                id: 'shared-2',
                title: 'Cafe Layout Design',
                description: 'Cozy coffee shop layout with outdoor seating area.',
                created_at: '2024-01-08T14:20:00Z',
                updated_at: '2024-01-16T11:45:00Z',
              }}
              onView={handleView}
              onEdit={handleEdit}
              onShare={handleShare}
              onDelete={handleDelete}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Plan Dialog */}
      <EditPlanDialog
        plan={editingPlan}
        isOpen={isEditDialogOpen}
        onClose={closeEditDialog}
        onSave={handleSaveEdit}
      />

      {/* Share Plan Dialog */}
      <SharePlanDialog
        plan={sharingPlan}
        isOpen={isShareDialogOpen}
        onClose={closeShareDialog}
      />
    </div>
  );
}
