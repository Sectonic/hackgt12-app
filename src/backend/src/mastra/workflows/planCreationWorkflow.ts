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

const RequirementsStepOutputSchema = PlanWorkflowInputSchema.extend({
  requirementStatus: z.enum(['complete', 'collecting']).default('complete'),
  missingFields: z.array(z.string()).optional(),
});

type RequirementsStepOutput = z.infer<typeof RequirementsStepOutputSchema>;

const PlanGenerationStepOutputSchema = RequirementsStepOutputSchema.extend({
  content: z.string(),
  usage: z.any().optional(),
  structuredPlan: StructuredPlanSchema,
  structuredPlanEmitted: z.boolean().optional(),
});

type PlanGenerationStepOutput = z.infer<typeof PlanGenerationStepOutputSchema>;

const gatherRequirements = createStep({
  id: 'gatherRequirements',
  description: 'Collect required base inputs from the user before planning',
  inputSchema: PlanWorkflowInputSchema,
  outputSchema: RequirementsStepOutputSchema,
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
      const questions = missingFields.map(
        (field) => BASE_REQUIREMENT_QUESTIONS[field as keyof typeof BASE_REQUIREMENT_QUESTIONS],
      );

      if (streamController) {
        streamJSONEvent(streamController, {
          type: 'requirements-query',
          payload: {
            missingFields,
            questions,
          },
        });
        streamJSONEvent(streamController, {
          type: 'text-delta',
          text: `I still need a few details before I can begin:
${questions.map((question, idx) => `${idx + 1}. ${question}`).join('\n')}`,
        });
      }

      return {
        ...inputData,
        requirementStatus: 'collecting' as const,
        missingFields,
      } satisfies RequirementsStepOutput;
    }

    return {
      ...inputData,
      requirementStatus: 'complete' as const,
      missingFields: [],
    } satisfies RequirementsStepOutput;
  },
});

const generatePlanStructure = createStep({
  id: 'generatePlanStructure',
  description: 'Gather responses into a structured plan and task list',
  inputSchema: RequirementsStepOutputSchema,
  outputSchema: PlanGenerationStepOutputSchema,
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
      const reminder =
        missingFields && missingFields.length > 0
          ? `I need a bit more information: ${missingFields.join(', ')}.`
          : 'I still need a bit more information before we can create the floor plan.';

      if (streamController) {
        streamJSONEvent(streamController, { type: 'text-delta', text: reminder });
      }

      return {
        ...inputData,
        content: reminder,
        usage: inputData.usage,
        structuredPlan: inputData.structuredPlan,
        structuredPlanEmitted: inputData.structuredPlanEmitted,
      } satisfies PlanGenerationStepOutput;
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

    if (!streamController) {
      const result = await agentCreatePlan.generate(messages, generationOptions);
      const structuredPlan = extractStructuredPlan(result.text) ?? fallbackPlan;

      return {
        ...inputData,
        requirementStatus: 'complete' as const,
        missingFields: [],
        content: result.text,
        usage: result.usage,
        structuredPlan,
        structuredPlanEmitted: false,
      } satisfies PlanGenerationStepOutput;
    }

    const streamResult = await agentCreatePlan.streamVNext(messages, generationOptions);
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
      requirementStatus: 'complete' as const,
      missingFields: [],
      content: responseText,
      usage,
      structuredPlan,
      structuredPlanEmitted,
    } satisfies PlanGenerationStepOutput;
  },
});

const applyPlanToCanvas = createStep({
  id: 'applyPlanToCanvas',
  description: 'Translate plan tasks into concrete floor plan tool calls',
  inputSchema: PlanGenerationStepOutputSchema,
  outputSchema: PlanWorkflowOutputSchema,
  execute: async ({ inputData }) => {
    const {
      requirementStatus,
      structuredPlan,
      structuredPlanEmitted = false,
      streamController,
      content,
      usage,
      temperature,
      maxTokens,
      additionalContext,
      resourceId,
      threadId,
      prompt,
      projectType,
      specialRequirements,
    } = inputData;

    let finalContent = content;
    let finalUsage = usage;
    let finalStructuredPlanEmitted = structuredPlanEmitted;

    if (requirementStatus !== 'complete' || !structuredPlan) {
      return {
        content: finalContent,
        usage: finalUsage,
        structuredPlan,
        structuredPlanEmitted: finalStructuredPlanEmitted,
      } satisfies PlanWorkflowOutput;
    }

    if (!streamController || !structuredPlan.todoList || structuredPlan.todoList.length === 0) {
      return {
        content: finalContent,
        usage: finalUsage,
        structuredPlan,
        structuredPlanEmitted: finalStructuredPlanEmitted,
      } satisfies PlanWorkflowOutput;
    }

    try {
      streamJSONEvent(streamController, {
        type: 'progress_update',
        state: 'in_progress',
        text: 'Creating an initial layout on the canvas…',
      });

      const toolMessages = [
        'Existing plan overview: ' + finalContent,
        'Structured plan JSON: ' + JSON.stringify(structuredPlan),
        'Original prompt: ' + prompt,
        ...(projectType ? [`Project type: ${projectType}`] : []),
        ...(specialRequirements && specialRequirements.length
          ? [`Special requirements: ${specialRequirements.join(', ')}`]
          : []),
      ];

      const toolInstructions = `You are preparing a starter layout for a floor plan editor. You have access to these interactive tools: addWall, addRoom, addObject, updateWall, updateRoom, updateObject, deleteWall, deleteRoom, deleteObject, setTool, setViewport.

Follow this workflow:
1. Review the structured plan tasks and decide which tools to call first.
2. If you are missing critical dimensions or positions, ask the user for that information using short text messages before calling a tool.
3. Emit actual tool calls as soon as you have enough detail. Keep tool arguments simple and default friendly (e.g. start with basic rectangles or reference points around the origin).
4. Provide concise narration as text so the user understands what you are doing.
5. Once you have placed a basic layout, stop calling tools and summarize the next manual steps the user might take.`;

      const runtimeContext = new RuntimeContext();
      runtimeContext.set('streamController', streamController);
      runtimeContext.set('planTodoList', structuredPlan.todoList ?? []);
      runtimeContext.set('additionalContext', additionalContext);

      const toolStream = await agentCreatePlan.streamVNext(toolMessages, {
        instructions: toolInstructions,
        runtimeContext,
        tools: ALL_TOOLS,
        modelSettings: {
          temperature: temperature ?? 0.2,
          maxOutputTokens: maxTokens,
        },
        ...(threadId && resourceId
          ? {
              memory: {
                thread: threadId,
                resource: resourceId,
              },
            }
          : {}),
      });

      for await (const chunk of toolStream.fullStream) {
        if (chunk.type === 'text-delta') {
          streamJSONEvent(streamController, {
            type: 'text-delta',
            text: chunk.payload.text,
          });
          finalContent += chunk.payload.text;
        } else if (chunk.type === 'tool-call' || chunk.type === 'tool-result') {
          streamJSONEvent(streamController, chunk);
        }
      }

      const toolUsage = await toolStream.usage;
      if (toolUsage) {
        finalUsage = { ...(finalUsage ?? {}), toolApplication: toolUsage };
      }

      finalStructuredPlanEmitted = true;
      streamJSONEvent(streamController, {
        type: 'progress_update',
        state: 'complete',
        text: 'Initial layout created. Let me know if you would like refinements!',
      });
    } catch (error) {
      console.error('Plan application error:', error);
      if (streamController) {
        streamJSONEvent(streamController, {
          type: 'progress_update',
          state: 'error',
          text: 'I ran into an issue while applying the plan. Could you provide a bit more detail?',
        });
      }
    }

    return {
      content: finalContent,
      usage: finalUsage,
      structuredPlan,
      structuredPlanEmitted: finalStructuredPlanEmitted,
    } satisfies PlanWorkflowOutput;
  },
});

export const planCreationWorkflow = createWorkflow({
  id: 'planCreationWorkflow',
  description:
    'Collects requirements, generates a structured plan, and applies the plan to the canvas using interactive tools.',
  inputSchema: PlanWorkflowInputSchema,
  outputSchema: PlanWorkflowOutputSchema,
})
  .then(gatherRequirements)
  .then(generatePlanStructure)
  .then(applyPlanToCanvas)
  .commit();
