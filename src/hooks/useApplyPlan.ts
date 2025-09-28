import { useCallback } from 'react';

interface FloorPlanTodo {
  id: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'measurement' | 'design' | 'documentation' | 'review';
}

interface FloorPlanPayload {
  todoList: FloorPlanTodo[];
}

export function useApplyPlan() {
  return useCallback(async (payload: FloorPlanPayload) => {
    try {
      const response = await fetch('/api/plan/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Apply workflow failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Error applying plan:', error);
    }
  }, []);
}
