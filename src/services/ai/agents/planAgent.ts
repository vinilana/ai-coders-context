import { generateText, generateObject, stepCountIs } from 'ai';
import type { ToolSet } from 'ai';
import { createProvider } from '../providerFactory';
import { getCodeAnalysisTools } from '../tools';
import { DevelopmentPlanSchema } from '../schemas';
import type { LLMConfig } from '../../../types';
import type { DevelopmentPlan } from '../schemas';
import type { AgentEventCallbacks } from '../agentEvents';
import { summarizeToolResult } from '../agentEvents';

export interface PlanAgentOptions {
  repoPath: string;
  planName: string;
  summary?: string;
  existingPlanContent?: string;
  docsIndex?: string;
  agentsIndex?: string;
  referencedDocs?: Array<{ path: string; content: string }>;
  referencedAgents?: Array<{ path: string; content: string }>;
  maxSteps?: number;
  maxOutputTokens?: number;
  callbacks?: AgentEventCallbacks;
}

export interface PlanAgentResult {
  text: string;
  toolsUsed: string[];
  steps: number;
}

const SYSTEM_PROMPT = `You are an expert software development planner. Your task is to create or update development plans that coordinate AI agents and documentation.

You have access to code analysis tools:
- readFile: Read file contents
- listFiles: List files matching patterns
- analyzeSymbols: Extract code symbols (classes, functions, etc.)
- getFileStructure: Get repository structure
- searchCode: Search for code patterns

A good development plan includes:
1. Clear goal and scope definition
2. Agent lineup with specific roles and focus areas
3. Documentation touchpoints that need updates
4. Phased implementation with concrete steps
5. Each step has an owner (agent type), deliverable, and evidence of completion
6. Git commit checkpoints for each phase
7. Success criteria and risk mitigation

Use the tools to:
- Understand the codebase structure
- Identify key files and patterns
- Find existing documentation and agent playbooks
- Discover dependencies and relationships

Then create a detailed, actionable plan.`;

const PLAN_UPDATE_PROMPT = `You are updating an existing development plan with fresh context from the repository.

Preserve:
- YAML front matter
- agent-update wrapper comments
- Overall structure and formatting

Update:
- Replace TODOs with concrete steps
- Ensure agent lineup matches available agents
- Update documentation touchpoints based on actual docs
- Add specific file paths and code references
- Segment work into clear phases with commit checkpoints

Return only the complete updated Markdown plan.`;

export class PlanAgent {
  private config: LLMConfig;
  private providerResult: ReturnType<typeof createProvider>;
  private tools: ToolSet;

  constructor(config: LLMConfig) {
    this.config = config;
    this.providerResult = createProvider(config);
    this.tools = getCodeAnalysisTools();
  }

  /**
   * Generate a new development plan using tools for context gathering
   */
  async generatePlan(options: PlanAgentOptions): Promise<PlanAgentResult> {
    const {
      repoPath,
      planName,
      summary,
      docsIndex,
      agentsIndex,
      referencedDocs,
      referencedAgents,
      maxSteps = 15,
      maxOutputTokens = 8000,
      callbacks
    } = options;

    // Emit agent start event
    callbacks?.onAgentStart?.({ agent: 'plan', target: planName });

    const contextParts: string[] = [
      `Create a development plan named "${planName}" for the repository at: ${repoPath}`,
      summary ? `\nPlan summary/goal: ${summary}` : '',
      '\nUse the tools to analyze the codebase and understand:',
      '1. The project structure and main components',
      '2. Key files and their purposes',
      '3. Existing patterns and conventions',
      '4. Areas that need attention',
      '\nThen generate a comprehensive development plan.'
    ];

    if (docsIndex) {
      contextParts.push('\n\nAvailable documentation (docs/README.md):', docsIndex);
    }

    if (agentsIndex) {
      contextParts.push('\n\nAvailable agents (agents/README.md):', agentsIndex);
    }

    if (referencedDocs && referencedDocs.length > 0) {
      const docSummary = referencedDocs.map((d) => `- ${d.path}`).join('\n');
      contextParts.push('\n\nExisting documentation files:', docSummary);
    }

    if (referencedAgents && referencedAgents.length > 0) {
      const agentSummary = referencedAgents.map((a) => `- ${a.path}`).join('\n');
      contextParts.push('\n\nExisting agent playbooks:', agentSummary);
    }

    const userPrompt = contextParts.filter(Boolean).join('\n');
    const { provider, modelId } = this.providerResult;
    let stepCount = 0;

    const result = await generateText({
      model: provider(modelId),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      tools: this.tools,
      stopWhen: stepCountIs(maxSteps),
      maxOutputTokens,
      onStepFinish: (step) => {
        stepCount++;
        callbacks?.onAgentStep?.({ agent: 'plan', step: stepCount });

        for (const toolCall of step.toolCalls || []) {
          callbacks?.onToolCall?.({
            agent: 'plan',
            toolName: toolCall.toolName,
            args: 'args' in toolCall ? toolCall.args as Record<string, unknown> : undefined
          });

          const toolResult = step.toolResults?.find(
            (r) => 'toolCallId' in r && r.toolCallId === toolCall.toolCallId
          );
          if (toolResult && 'result' in toolResult) {
            callbacks?.onToolResult?.({
              agent: 'plan',
              toolName: toolCall.toolName,
              success: true,
              summary: summarizeToolResult(toolCall.toolName, toolResult.result)
            });
          }
        }
      }
    });

    const toolsUsed = new Set<string>();
    for (const step of result.steps || []) {
      for (const toolCall of step.toolCalls || []) {
        toolsUsed.add(toolCall.toolName);
      }
    }

    const toolsUsedArray = Array.from(toolsUsed);
    const totalSteps = result.steps?.length || 1;

    // Emit agent complete event
    callbacks?.onAgentComplete?.({ agent: 'plan', toolsUsed: toolsUsedArray, steps: totalSteps });

    return {
      text: result.text,
      toolsUsed: toolsUsedArray,
      steps: totalSteps
    };
  }

  /**
   * Update an existing plan with fresh context
   */
  async updatePlan(options: PlanAgentOptions): Promise<PlanAgentResult> {
    const {
      repoPath,
      planName,
      existingPlanContent,
      docsIndex,
      agentsIndex,
      referencedDocs,
      referencedAgents,
      maxSteps = 12,
      maxOutputTokens = 8000,
      callbacks
    } = options;

    if (!existingPlanContent) {
      return this.generatePlan(options);
    }

    // Emit agent start event
    callbacks?.onAgentStart?.({ agent: 'plan', target: planName });

    const contextParts: string[] = [
      `Update the development plan "${planName}" for repository: ${repoPath}`,
      '\nFirst, use tools to gather fresh context about the codebase.',
      '\nCurrent plan content:',
      '<plan>',
      existingPlanContent,
      '</plan>'
    ];

    if (docsIndex) {
      contextParts.push('\n\nDocumentation index:', '<docs-index>', docsIndex, '</docs-index>');
    }

    if (agentsIndex) {
      contextParts.push('\n\nAgent index:', '<agents-index>', agentsIndex, '</agents-index>');
    }

    if (referencedDocs && referencedDocs.length > 0) {
      const docContent = referencedDocs
        .map((d) => `<doc path="${d.path}">\n${d.content}\n</doc>`)
        .join('\n\n');
      contextParts.push('\n\nReferenced documentation:', docContent);
    }

    if (referencedAgents && referencedAgents.length > 0) {
      const agentContent = referencedAgents
        .map((a) => `<agent path="${a.path}">\n${a.content}\n</agent>`)
        .join('\n\n');
      contextParts.push('\n\nReferenced agents:', agentContent);
    }

    const userPrompt = contextParts.join('\n');
    const { provider, modelId } = this.providerResult;
    let stepCount = 0;

    const result = await generateText({
      model: provider(modelId),
      system: PLAN_UPDATE_PROMPT,
      prompt: userPrompt,
      tools: this.tools,
      stopWhen: stepCountIs(maxSteps),
      maxOutputTokens,
      onStepFinish: (step) => {
        stepCount++;
        callbacks?.onAgentStep?.({ agent: 'plan', step: stepCount });

        for (const toolCall of step.toolCalls || []) {
          callbacks?.onToolCall?.({
            agent: 'plan',
            toolName: toolCall.toolName,
            args: 'args' in toolCall ? toolCall.args as Record<string, unknown> : undefined
          });

          const toolResult = step.toolResults?.find(
            (r) => 'toolCallId' in r && r.toolCallId === toolCall.toolCallId
          );
          if (toolResult && 'result' in toolResult) {
            callbacks?.onToolResult?.({
              agent: 'plan',
              toolName: toolCall.toolName,
              success: true,
              summary: summarizeToolResult(toolCall.toolName, toolResult.result)
            });
          }
        }
      }
    });

    const toolsUsed = new Set<string>();
    for (const step of result.steps || []) {
      for (const toolCall of step.toolCalls || []) {
        toolsUsed.add(toolCall.toolName);
      }
    }

    const toolsUsedArray = Array.from(toolsUsed);
    const totalSteps = result.steps?.length || 1;

    // Emit agent complete event
    callbacks?.onAgentComplete?.({ agent: 'plan', toolsUsed: toolsUsedArray, steps: totalSteps });

    return {
      text: result.text,
      toolsUsed: toolsUsedArray,
      steps: totalSteps
    };
  }

  /**
   * Generate a structured development plan
   */
  async generateStructuredPlan(
    options: PlanAgentOptions
  ): Promise<{
    plan: DevelopmentPlan;
    toolsUsed: string[];
  }> {
    const {
      repoPath,
      planName,
      summary,
      docsIndex,
      agentsIndex,
      maxSteps = 10,
      maxOutputTokens = 8000,
      callbacks
    } = options;

    // Emit agent start event
    callbacks?.onAgentStart?.({ agent: 'plan', target: planName });

    const analysisPrompt = `Analyze the repository at ${repoPath} for creating a development plan "${planName}".
${summary ? `Goal: ${summary}` : ''}

Gather information about:
1. Project structure and key directories
2. Main source files and their purposes
3. Existing tests and testing patterns
4. Configuration files
5. Dependencies and integrations

${docsIndex ? `\nAvailable docs:\n${docsIndex}` : ''}
${agentsIndex ? `\nAvailable agents:\n${agentsIndex}` : ''}`;

    const { provider, modelId } = this.providerResult;
    let stepCount = 0;

    // First gather context using tools
    const analysisResult = await generateText({
      model: provider(modelId),
      system: 'Analyze the codebase to understand its structure for development planning.',
      prompt: analysisPrompt,
      tools: this.tools,
      stopWhen: stepCountIs(maxSteps),
      maxOutputTokens: Math.floor(maxOutputTokens / 2),
      onStepFinish: (step) => {
        stepCount++;
        callbacks?.onAgentStep?.({ agent: 'plan', step: stepCount });

        for (const toolCall of step.toolCalls || []) {
          callbacks?.onToolCall?.({
            agent: 'plan',
            toolName: toolCall.toolName,
            args: 'args' in toolCall ? toolCall.args as Record<string, unknown> : undefined
          });

          const toolResult = step.toolResults?.find(
            (r) => 'toolCallId' in r && r.toolCallId === toolCall.toolCallId
          );
          if (toolResult && 'result' in toolResult) {
            callbacks?.onToolResult?.({
              agent: 'plan',
              toolName: toolCall.toolName,
              success: true,
              summary: summarizeToolResult(toolCall.toolName, toolResult.result)
            });
          }
        }
      }
    });

    const toolsUsed = new Set<string>();
    for (const step of analysisResult.steps || []) {
      for (const toolCall of step.toolCalls || []) {
        toolsUsed.add(toolCall.toolName);
      }
    }

    // Then generate structured plan
    const plan = await generateObject({
      model: provider(modelId),
      schema: DevelopmentPlanSchema,
      system: 'Generate a structured development plan based on the codebase analysis.',
      prompt: `Based on this analysis:\n${analysisResult.text}\n\nCreate a structured development plan for: ${planName}${summary ? `\nGoal: ${summary}` : ''}`,
      maxOutputTokens: Math.floor(maxOutputTokens / 2)
    });

    const toolsUsedArray = Array.from(toolsUsed);

    // Emit agent complete event
    callbacks?.onAgentComplete?.({ agent: 'plan', toolsUsed: toolsUsedArray, steps: stepCount });

    return {
      plan: plan.object,
      toolsUsed: toolsUsedArray
    };
  }

  /**
   * Get the current configuration
   */
  getConfig(): { provider: string; model: string } {
    return {
      provider: this.config.provider,
      model: this.providerResult.modelId
    };
  }
}
