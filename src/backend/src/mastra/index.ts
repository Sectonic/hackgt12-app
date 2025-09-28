import { Mastra } from '@mastra/core/mastra';
import { floorPlanAgent } from './agents/floorPlanAgent';
import { apiRoutes } from './apiRegistry';
import { storage } from './memory';

/**
 * Main Mastra configuration
 *
 * This is where you configure your agents, workflows, storage, and other settings.
 * Configured for multimodal floor plan processing and generation.
 */

export const mastra = new Mastra({
  agents: { floorPlanAgent },
  storage,
  telemetry: {
    enabled: true,
  },
  server: {
    apiRoutes,
  },
});