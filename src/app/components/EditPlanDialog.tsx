import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { useToast } from '@/app/hooks/use-toast';
import { Save, X } from 'lucide-react';

interface Plan {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface EditPlanDialogProps {
  plan: Plan | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPlan: Plan) => void;
}

export default function EditPlanDialog({ plan, isOpen, onClose, onSave }: EditPlanDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (plan) {
      setTitle(plan.title);
      setDescription(plan.description || '');
    }
  }, [plan]);

  const handleSave = () => {
    if (!plan || !title.trim()) return;

    const updatedPlan: Plan = {
      ...plan,
      title: title.trim(),
      description: description.trim(),
      updated_at: new Date().toISOString(),
    };

    onSave(updatedPlan);
    toast({
      title: "Plan updated!",
      description: `"${updatedPlan.title}" has been successfully updated.`,
    });
    onClose();
  };

  const handleCancel = () => {
    setTitle(plan?.title || '');
    setDescription(plan?.description || '');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Plan</DialogTitle>
          <DialogDescription>
            Make changes to your plan details. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="title" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Plan Title
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter plan title..."
              className="w-full"
            />
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="description" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Description
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter plan description..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
