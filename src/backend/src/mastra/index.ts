import { Mastra } from '@mastra/core/mastra';
import { agentCreatePlan } from './agents/agentCreatePlan';
import { floorPlanApplyAgent } from './agents/floorPlanApplyAgent';
import { apiRoutes } from './apiRegistry';
import { storage } from './memory';
import { planCreationWorkflow } from './workflows/planCreationWorkflow';
import { floorPlanApplyWorkflow } from './workflows/floorPlanApplyWorkflow';

/**
 * Main Mastra configuration
 *
 * This is where you configure your agents, workflows, storage, and other settings.
 * Clean setup with agentCreatePlan for floor plan todo list generation.
 */

export const mastra = new Mastra({
  agents: { agentCreatePlan, floorPlanApplyAgent },
  workflows: { planCreationWorkflow, floorPlanApplyWorkflow },
  storage,
  telemetry: {
    enabled: true,
  },
  server: {
    apiRoutes,
  },
});
