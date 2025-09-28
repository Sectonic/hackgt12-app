import React from 'react';
import { motion } from 'motion/react';
import { CustomMessage, MastraStreamedResponse, Message, MessageRenderer } from 'cedar-os';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  Copy,
  Home,
  Building,
  Ruler,
  PenTool,
  FileText,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApplyPlan } from '@/hooks/useApplyPlan';

// ------------------------------------------------
// Animation Variants
// ------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// ------------------------------------------------
// Floor Plan Interfaces
// ------------------------------------------------

export interface FloorPlanTodo {
  id: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'measurement' | 'design' | 'documentation' | 'review';
}

export interface FloorPlanData {
  todoList: FloorPlanTodo[];
  projectType: string;
  roomCount: number;
  specialRequirements: string[];
}

// ------------------------------------------------
// Helper Functions
// ------------------------------------------------

function getPriorityColor(priority: 'high' | 'medium' | 'low') {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getCategoryIcon(category: 'measurement' | 'design' | 'documentation' | 'review') {
  const iconProps = { className: 'w-4 h-4' };
  switch (category) {
    case 'measurement':
      return <Ruler {...iconProps} />;
    case 'design':
      return <PenTool {...iconProps} />;
    case 'documentation':
      return <FileText {...iconProps} />;
    case 'review':
      return <Eye {...iconProps} />;
    default:
      return <CheckCircle {...iconProps} />;
  }
}

function getCategoryColor(category: 'measurement' | 'design' | 'documentation' | 'review') {
  switch (category) {
    case 'measurement':
      return 'text-blue-600 bg-blue-50';
    case 'design':
      return 'text-purple-600 bg-purple-50';
    case 'documentation':
      return 'text-green-600 bg-green-50';
    case 'review':
      return 'text-orange-600 bg-orange-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

function getProjectTypeIcon(projectType: string) {
  const iconProps = { className: 'w-5 h-5' };
  switch (projectType.toLowerCase()) {
    case 'apartment':
    case 'house':
    case 'home':
      return <Home {...iconProps} />;
    case 'office':
    case 'workplace':
      return <Building {...iconProps} />;
    default:
      return <Home {...iconProps} />;
  }
}

// ------------------------------------------------
// Container Components
// ------------------------------------------------

const ColouredContainer: React.FC<{
  color: 'blue' | 'purple' | 'green' | 'orange' | 'grey';
  className?: string;
  children: React.ReactNode;
}> = ({ color, className = '', children }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
    purple: 'bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800',
    green: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
    orange: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800',
    grey: 'bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800',
  };

  return (
    <div className={cn('rounded-lg border p-4', colorClasses[color], className)}>{children}</div>
  );
};

const ShimmerText: React.FC<{
  text: string;
  state: 'in_progress' | 'complete';
  className?: string;
}> = ({ text, state, className = '' }) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {state === 'in_progress' ? (
        <Clock className="w-4 h-4 animate-spin text-blue-500" />
      ) : (
        <CheckCircle className="w-4 h-4 text-green-500" />
      )}
      <span className={cn('text-sm', state === 'in_progress' ? 'animate-pulse' : '')}>{text}</span>
    </div>
  );
};

// ------------------------------------------------
// FLOOR PLAN TODO LIST RENDERING
// ------------------------------------------------

export const floorPlanTodoMessageRenderer: MessageRenderer<Message> = {
  type: 'floor-plan-todo',
  render: (message: any) => {
    const data = message.payload;

    const applyPlan = useApplyPlan();

    if (!data?.todoList) {
      return null;
    }

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4 w-full"
      >
        {/* Project Header */}
        <motion.div variants={itemVariants}>
          <ColouredContainer color="blue" className="space-y-3">
            <div className="flex items-center gap-3">
              {getProjectTypeIcon(data.projectType)}
              <div>
                <h3 className="font-semibold text-lg capitalize">{data.projectType} Floor Plan</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {data.roomCount} room{data.roomCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {data.specialRequirements && data.specialRequirements.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Special Requirements:</p>
                <div className="flex flex-wrap gap-1">
                  {data.specialRequirements.map((req: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {req}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </ColouredContainer>
        </motion.div>

        {/* Todo List */}
        <motion.div variants={itemVariants} className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Action Plan ({data.todoList.length} tasks)
          </h4>

          <div className="space-y-2">
            {data.todoList.map((todo: FloorPlanTodo, idx: number) => (
              <motion.div
                key={todo.id}
                variants={itemVariants}
                className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className={cn('p-1.5 rounded-full', getCategoryColor(todo.category))}>
                    {getCategoryIcon(todo.category)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-relaxed">
                      {idx + 1}. {todo.description}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn('text-xs flex-shrink-0', getPriorityColor(todo.priority))}
                    >
                      {todo.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {todo.category}
                    </Badge>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div variants={itemVariants}>
          <div className="flex gap-2 pt-2">
            <Button
              variant="default"
              size="sm"
              className="flex items-center gap-2 text-xs"
              onClick={() => applyPlan(data)}
            >
              Apply Plan
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-xs"
              onClick={() => {
                const todoText = data.todoList
                  .map(
                    (todo: FloorPlanTodo, idx: number) =>
                      `${idx + 1}. ${todo.description} (${todo.priority} priority, ${todo.category})`,
                  )
                  .join('\n');
                navigator.clipboard.writeText(todoText);
              }}
            >
              <Copy className="w-3 h-3" />
              Copy Todo List
            </Button>
          </div>
        </motion.div>
      </motion.div>
    );
  },
};

// ------------------------------------------------
// FLOOR PLAN PROGRESS RENDERING
// ------------------------------------------------

export const floorPlanProgressMessageRenderer: MessageRenderer<Message> = {
  type: 'floor-plan-progress',
  render: (message: any) => {
    const text = message.text || 'Analyzing floor plan requirements...';
    const state = message.state || 'in_progress';
    const step = message.step;

    return (
      <ColouredContainer color="grey" className="my-2">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {state === 'in_progress' ? (
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
          </div>
          <div className="flex-1">
            <ShimmerText text={text} state={state} />
            {step && <p className="text-xs text-gray-500 mt-1">{step}</p>}
          </div>
        </div>
      </ColouredContainer>
    );
  },
};

// ------------------------------------------------
// FLOOR PLAN ANALYSIS RENDERING
// ------------------------------------------------

export const floorPlanAnalysisMessageRenderer: MessageRenderer<Message> = {
  type: 'floor-plan-analysis',
  render: (message: any) => {
    const analysis = message.analysis;

    if (!analysis) return null;

    return (
      <ColouredContainer color="purple" className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold">Floor Plan Analysis</h3>
        </div>

        <div className="grid gap-4">
          <div>
            <p className="text-sm font-medium mb-1">Project Type:</p>
            <Badge variant="secondary" className="capitalize">
              {analysis.projectType}
            </Badge>
          </div>

          {analysis.estimatedRooms && (
            <div>
              <p className="text-sm font-medium mb-1">Estimated Rooms:</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {analysis.estimatedRooms} room{analysis.estimatedRooms !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {analysis.suggestedFeatures && analysis.suggestedFeatures.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Suggested Features:</p>
              <div className="flex flex-wrap gap-1">
                {analysis.suggestedFeatures.map((feature: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {analysis.considerations && analysis.considerations.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Key Considerations:</p>
              <ul className="space-y-1">
                {analysis.considerations.map((consideration: string, idx: number) => (
                  <li
                    key={idx}
                    className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                    {consideration}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </ColouredContainer>
    );
  },
};

// ------------------------------------------------
// Export all message renderers
// ------------------------------------------------

export const floorPlanMessageRenderers = [
  floorPlanTodoMessageRenderer,
  floorPlanProgressMessageRenderer,
  floorPlanAnalysisMessageRenderer,
] as MessageRenderer<Message>[];
