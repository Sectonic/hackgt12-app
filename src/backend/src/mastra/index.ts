import { Mastra } from '@mastra/core/mastra';
import { agentCreatePlan } from './agents/agentCreatePlan';
import { apiRoutes } from './apiRegistry';
import { storage } from './memory';

/**
 * Main Mastra configuration
 *
 * This is where you configure your agents, workflows, storage, and other settings.
 * Clean setup with agentCreatePlan for floor plan todo list generation.
 */

export const mastra = new Mastra({
  agents: { agentCreatePlan },
  storage,
  telemetry: {
    enabled: true,
  },
  server: {
    apiRoutes,
  },
});
