import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/app/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  Eye, 
  Edit, 
  Share2, 
  Trash2, 
  FileText, 
  Clock,
  Calendar
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Plan {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  thumbnail?: string;
}

interface PlanCardProps {
  plan: Plan;
  onEdit?: (plan: Plan) => void;
  onDelete?: (plan: Plan) => void;
  onShare?: (plan: Plan) => void;
  onView?: (plan: Plan) => void;
}

export default function PlanCard({ plan, onEdit, onDelete, onShare, onView }: PlanCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleAction = (action: string) => {
    switch (action) {
      case 'view':
        onView?.(plan);
        break;
      case 'edit':
        onEdit?.(plan);
        break;
      case 'share':
        onShare?.(plan);
        break;
      case 'delete':
        onDelete?.(plan);
        break;
    }
  };

  return (
    <Card 
      className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-border/50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors mb-2 truncate">
              {plan.title}
            </CardTitle>
            <CardDescription className="flex items-center space-x-2 text-sm">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span>
                Updated {formatDistanceToNow(new Date(plan.updated_at), { addSuffix: true })}
              </span>
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleAction('view')}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Plan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction('edit')}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Plan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction('share')}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Plan
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleAction('delete')}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Plan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {plan.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {plan.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Created {formatDistanceToNow(new Date(plan.created_at), { addSuffix: true })}</span>
          </div>
          
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleAction('view')}
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleAction('edit')}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleAction('share')}
            >
              <Share2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
