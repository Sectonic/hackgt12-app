import { createStep, createWorkflow } from '@mastra/core/workflows';
import { RuntimeContext } from '@mastra/core/di';
import { z } from 'zod';
import { agentCreatePlan } from '../agents/agentCreatePlan.js';
import { streamJSONEvent } from '../../utils/streamUtils';
import { ALL_TOOLS } from '../tools/toolDefinitions';

const BASE_REQUIREMENT_QUESTIONS: Record<
  'projectType' | 'roomCount' | 'specialRequirements',
  string
> = {
  projectType: 'What type of project are we planning (apartment, house, office, retail, etc.)?',
  roomCount: 'How many rooms should I plan for?',
  specialRequirements:
    'Are there any special requirements or constraints I should keep in mind (accessibility, equipment, styles, regulations, etc.)?',
};

const ProjectTypeSchema = z
  .enum(['apartment', 'house', 'office', 'restaurant', 'retail', 'general'])
  .optional();

export const PlanWorkflowInputSchema = z.object({
  prompt: z.string(),
  temperature: z.number().optional().default(0.2),
  maxTokens: z.number().optional(),
  systemPrompt: z.string().optional(),
  additionalContext: z.any().optional(),
  resourceId: z.string().optional(),
  threadId: z.string().optional(),
  projectType: ProjectTypeSchema,
  roomCount: z.number().optional(),
  specialRequirements: z.array(z.string()).optional(),
  streamController: z.instanceof(ReadableStreamDefaultController).optional(),
});

const TodoItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  category: z.enum(['measurement', 'design', 'documentation', 'review']).optional(),
});

const StructuredPlanSchema = z
  .object({
    todoList: z.array(TodoItemSchema).optional(),
    projectType: z.string().optional(),
    roomCount: z.number().optional(),
    specialRequirements: z.array(z.string()).optional(),
  })
  .optional();

export const PlanWorkflowOutputSchema = z.object({
  content: z.string(),
  usage: z.any().optional(),
  structuredPlan: StructuredPlanSchema,
  structuredPlanEmitted: z.boolean().optional(),
});

export type PlanWorkflowInput = z.infer<typeof PlanWorkflowInputSchema>;
export type PlanWorkflowOutput = z.infer<typeof PlanWorkflowOutputSchema>;

export const PlanWorkflowRequestSchema = PlanWorkflowInputSchema.omit({
  streamController: true,
});

export type PlanWorkflowRequest = z.infer<typeof PlanWorkflowRequestSchema>;

const PlanMetadataSchema = z
  .object({
    projectType: PlanWorkflowInputSchema.shape.projectType,
    roomCount: PlanWorkflowInputSchema.shape.roomCount,
    specialRequirements: PlanWorkflowInputSchema.shape.specialRequirements,
  })
  .partial();

const RequirementStatusSchema = z.enum(['collecting', 'complete']);

type RequirementStatus = z.infer<typeof RequirementStatusSchema>;

type CanvasInstruction = {
  step: number;
  taskId: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'measurement' | 'design' | 'documentation' | 'review';
};

const RequirementStateSchema = PlanWorkflowInputSchema.extend({
  requirementStatus: RequirementStatusSchema,
  pendingQuestions: z.array(z.string()).default([]),
  missingFields: z.array(z.string()).default([]),
  content: z.string().optional(),
  usage: z.any().optional(),
  structuredPlan: StructuredPlanSchema,
  structuredPlanEmitted: z.boolean().optional(),
  canvasInstructions: z
    .object({
      steps: z.array(
        z.object({
          step: z.number(),
          taskId: z.string(),
          description: z.string(),
          priority: z.enum(['high', 'medium', 'low']),
          category: z.enum(['measurement', 'design', 'documentation', 'review']),
        }),
      ),
      metadata: z.object({
        projectType: z.string().optional(),
        roomCount: z.number().optional(),
        specialRequirements: z.array(z.string()).optional(),
      }),
    })
    .optional(),
});

type RequirementState = z.infer<typeof RequirementStateSchema>;

const gatherRequirements = createStep({
  id: 'gatherRequirements',
  description: 'Collect required base inputs from the user before planning',
  inputSchema: PlanWorkflowInputSchema,
  outputSchema: RequirementStateSchema,
  execute: async ({ inputData }) => {
    const { streamController, projectType, roomCount, specialRequirements } = inputData;

    const missingFields: string[] = [];
    if (!projectType) {
      missingFields.push('projectType');
    }
    if (typeof roomCount !== 'number') {
      missingFields.push('roomCount');
    }
    if (!specialRequirements || specialRequirements.length === 0) {
      missingFields.push('specialRequirements');
    }

    if (missingFields.length > 0) {
      const pendingQuestions = missingFields.map(
        (field) => BASE_REQUIREMENT_QUESTIONS[field as keyof typeof BASE_REQUIREMENT_QUESTIONS],
      );

      if (streamController) {
        streamJSONEvent(streamController, {
          type: 'requirements-query',
          payload: {
            missingFields,
            questions: pendingQuestions,
          },
        });
        streamJSONEvent(streamController, {
          type: 'text-delta',
          text: `I still need a few details before I can begin:
${pendingQuestions.map((question, idx) => `${idx + 1}. ${question}`).join('\n')}`,
        });
      }

      return {
        ...inputData,
        requirementStatus: 'collecting' as RequirementStatus,
        pendingQuestions,
        missingFields,
        structuredPlan: undefined,
        structuredPlanEmitted: false,
        content: undefined,
        usage: undefined,
        canvasInstructions: undefined,
      } satisfies RequirementState;
    }

    return {
      ...inputData,
      requirementStatus: 'complete' as RequirementStatus,
      pendingQuestions: [],
      missingFields: [],
      structuredPlan: undefined,
      structuredPlanEmitted: false,
      content: undefined,
      usage: undefined,
      canvasInstructions: undefined,
    } satisfies RequirementState;
  },
});

const generatePlanStructure = createStep({
  id: 'generatePlanStructure',
  description: 'Use GPT-5 to create the plan summary and structured todo list',
  inputSchema: RequirementStateSchema,
  outputSchema: RequirementStateSchema,
  execute: async ({ inputData }) => {
    const {
      requirementStatus,
      missingFields,
      streamController,
      prompt,
      temperature,
      maxTokens,
      systemPrompt,
      additionalContext,
      resourceId,
      threadId,
      projectType,
      roomCount,
      specialRequirements,
    } = inputData;

    if (requirementStatus !== 'complete') {
      const reminder = missingFields.length
        ? `I still need a bit more information: ${missingFields.join(', ')}.`
        : 'I still need a bit more information before we can create the floor plan.';

      if (streamController) {
        streamJSONEvent(streamController, {
          type: 'text-delta',
          text: reminder,
        });
      }

      return {
        ...inputData,
        content: reminder,
        structuredPlan: undefined,
        structuredPlanEmitted: false,
        canvasInstructions: undefined,
      } satisfies RequirementState;
    }

    const messages = [
      'User message: ' + prompt,
      ...(additionalContext ? ['Additional context: ' + JSON.stringify(additionalContext)] : []),
      ...(projectType ? [`Project type: ${projectType}`] : []),
      ...(typeof roomCount === 'number' ? [`Room count: ${roomCount}`] : []),
      ...(specialRequirements && specialRequirements.length
        ? [`Special requirements: ${specialRequirements.join(', ')}`]
        : []),
    ];

    const runtimeContext = new RuntimeContext();
    runtimeContext.set('additionalContext', additionalContext);
    if (streamController) {
      runtimeContext.set('streamController', streamController);
    }

    const generationOptions = {
      ...(systemPrompt ? { instructions: systemPrompt } : {}),
      modelSettings: {
        temperature,
        maxOutputTokens: maxTokens,
      },
      runtimeContext,
      tools: ALL_TOOLS,
      ...(threadId && resourceId
        ? {
            memory: {
              thread: threadId,
              resource: resourceId,
            },
          }
        : {}),
    } as const;

    const fallbackPlan: z.infer<typeof PlanMetadataSchema> & {
      todoList?: (typeof TodoItemSchema)['_input'][];
    } = {
      projectType,
      roomCount,
      specialRequirements,
      todoList: [],
    };

    const extractStructuredPlan = (text: string) => {
      try {
        const jsonMatch = text.match(/\{[\s\S]*"todoList"[\s\S]*\}/);
        if (!jsonMatch) {
          return undefined;
        }
        const parsed = JSON.parse(jsonMatch[0]);
        const candidate = {
          todoList: parsed.todoList,
          projectType: parsed.projectType,
          roomCount: parsed.roomCount,
          specialRequirements: parsed.specialRequirements,
        };
        const validationResult = PlanMetadataSchema.extend({
          todoList: z.array(TodoItemSchema).optional(),
        }).safeParse(candidate);
        return validationResult.success ? validationResult.data : undefined;
      } catch (error) {
        console.log('Could not parse structured floor plan data:', error);
        return undefined;
      }
    };

    const streamResult = streamController
      ? await agentCreatePlan.streamVNext(messages, generationOptions)
      : null;

    if (!streamResult) {
      const result = await agentCreatePlan.generateVNext(messages, generationOptions);
      const structuredPlan = extractStructuredPlan(result.text) ?? fallbackPlan;

      return {
        ...inputData,
        content: result.text,
        usage: result.usage,
        structuredPlan,
        structuredPlanEmitted: false,
        canvasInstructions: undefined,
      } satisfies RequirementState;
    }

    let responseText = '';
    let structuredPlanEmitted = false;
    let latestStructuredPlan:
      | (z.infer<typeof PlanMetadataSchema> & {
          todoList?: (typeof TodoItemSchema)['_input'][];
        })
      | undefined;

    for await (const chunk of streamResult.fullStream) {
      if (chunk.type === 'text-delta') {
        responseText += chunk.payload.text;
        streamJSONEvent(streamController, {
          type: 'text-delta',
          text: chunk.payload.text,
        });
      } else if (chunk.type === 'tool-call' || chunk.type === 'tool-result') {
        streamJSONEvent(streamController, chunk);
      }

      if (!structuredPlanEmitted && responseText.includes('"todoList"')) {
        const maybePlan = extractStructuredPlan(responseText);
        if (maybePlan) {
          latestStructuredPlan = maybePlan;
          structuredPlanEmitted = true;
          streamJSONEvent(streamController, {
            type: 'floor-plan-todo',
            payload: {
              todoList: maybePlan.todoList || [],
              projectType: maybePlan.projectType || projectType || 'general',
              roomCount: maybePlan.roomCount || roomCount || 1,
              specialRequirements: maybePlan.specialRequirements || specialRequirements || [],
            },
          });
        }
      }
    }

    const structuredPlan =
      latestStructuredPlan ?? extractStructuredPlan(responseText) ?? fallbackPlan;
    const usage = await streamResult.usage;

    return {
      ...inputData,
      content: responseText,
      usage,
      structuredPlan,
      structuredPlanEmitted,
      canvasInstructions: undefined,
    } satisfies RequirementState;
  },
});

const SanitizedTodoItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  category: z.enum(['measurement', 'design', 'documentation', 'review']),
});

const buildCanvasInstructions = createStep({
  id: 'buildCanvasInstructions',
  description: 'Convert the structured plan into ordered canvas instruction JSON',
  inputSchema: RequirementStateSchema,
  outputSchema: PlanWorkflowOutputSchema,
  execute: async ({ inputData }) => {
    const {
      requirementStatus,
      missingFields,
      streamController,
      structuredPlan,
      structuredPlanEmitted = false,
      content,
      usage,
    } = inputData;

    if (requirementStatus !== 'complete') {
      const reminder = missingFields.length
        ? `I still need a bit more information: ${missingFields.join(', ')}.`
        : 'I still need a bit more information before we can create the floor plan.';

      return {
        content: JSON.stringify({ todoList: [] }, null, 2),
        usage,
        structuredPlan: { todoList: [] },
        structuredPlanEmitted: false,
      } satisfies PlanWorkflowOutput;
    }

    if (!structuredPlan || !structuredPlan.todoList || structuredPlan.todoList.length === 0) {
      return {
        content: JSON.stringify({ todoList: [] }, null, 2),
        usage,
        structuredPlan: { todoList: [] },
        structuredPlanEmitted: false,
      } satisfies PlanWorkflowOutput;
    }

    const sanitizedTodoList = structuredPlan.todoList.map((item, index) => {
      const parsed = SanitizedTodoItemSchema.safeParse({
        id: item.id || `todo-${(index + 1).toString().padStart(2, '0')}`,
        description: item.description,
        priority: item.priority ?? 'medium',
        category: item.category ?? 'design',
      });

      if (!parsed.success) {
        return {
          id: `todo-${(index + 1).toString().padStart(2, '0')}`,
          description: item.description ?? `Task ${index + 1}`,
          priority: 'medium' as const,
          category: 'design' as const,
        } satisfies z.infer<typeof SanitizedTodoItemSchema>;
      }

      return parsed.data;
    });

    const payload = {
      todoList: sanitizedTodoList,
    } satisfies {
      todoList: z.infer<typeof SanitizedTodoItemSchema>[];
    };

    if (streamController) {
      streamJSONEvent(streamController, {
        type: 'plan-todo-list',
        payload,
      });
    }

    const jsonContent = JSON.stringify(payload, null, 2);

    return {
      content: jsonContent,
      usage,
      structuredPlan: { todoList: sanitizedTodoList },
      structuredPlanEmitted: structuredPlanEmitted || true,
    } satisfies PlanWorkflowOutput;
  },
});

export const planCreationWorkflow = createWorkflow({
  id: 'planCreationWorkflow',
  description:
    'Collects requirements, generates a structured plan, and emits ordered canvas instructions without executing tools directly.',
  inputSchema: PlanWorkflowInputSchema,
  outputSchema: PlanWorkflowOutputSchema,
})
  .then(gatherRequirements)
  .then(generatePlanStructure)
  .then(buildCanvasInstructions)
  .commit();
