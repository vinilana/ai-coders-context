import { generateText, generateObject, stepCountIs } from 'ai';
import type { ToolSet } from 'ai';
import { createProvider } from '../providerFactory';
import { getCodeAnalysisTools } from '../tools';
import { DevelopmentPlanSchema } from '../schemas';
import type { LLMConfig } from '../../../types';
import type { DevelopmentPlan } from '../schemas';
import type { AgentEventCallbacks } from '../agentEvents';
import { summarizeToolResult } from '../agentEvents';
import { SemanticContextBuilder } from '../../semantic';
import { sanitizeAIResponse } from '../../../utils/contentSanitizer';
import { getPlanAgentPrompt, PLAN_UPDATE_PROMPT } from '../prompts';

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
  /** Use pre-computed semantic context instead of tool-based exploration (more token efficient) */
  useSemanticContext?: boolean;
  /** Enable LSP for deeper semantic analysis (type info, references, implementations) */
  useLSP?: boolean;
}

export interface PlanAgentResult {
  text: string;
  toolsUsed: string[];
  steps: number;
}

// Use shared system prompts from prompts module
const SYSTEM_PROMPT = getPlanAgentPrompt();
// PLAN_UPDATE_PROMPT is imported from '../prompts'

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
      text: sanitizeAIResponse(result.text, { preserveFrontMatter: true, preserveComments: true }),
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
      callbacks,
      useSemanticContext = true,
      useLSP = false
    } = options;

    if (!existingPlanContent) {
      return this.generatePlan(options);
    }

    // Emit agent start event
    callbacks?.onAgentStart?.({ agent: 'plan', target: planName });

    // Use semantic context mode for token efficiency
    if (useSemanticContext) {
      return this.updatePlanWithSemanticContext(
        repoPath,
        planName,
        existingPlanContent,
        docsIndex,
        agentsIndex,
        referencedDocs,
        referencedAgents,
        maxOutputTokens,
        callbacks,
        useLSP
      );
    }

    // Tool-based mode for thorough analysis
    return this.updatePlanWithTools(
      repoPath,
      planName,
      existingPlanContent,
      docsIndex,
      agentsIndex,
      referencedDocs,
      referencedAgents,
      maxSteps,
      maxOutputTokens,
      callbacks
    );
  }

  /**
   * Update plan using pre-computed semantic context (more token efficient)
   */
  private async updatePlanWithSemanticContext(
    repoPath: string,
    planName: string,
    existingPlanContent: string,
    docsIndex: string | undefined,
    agentsIndex: string | undefined,
    referencedDocs: Array<{ path: string; content: string }> | undefined,
    referencedAgents: Array<{ path: string; content: string }> | undefined,
    maxOutputTokens: number,
    callbacks?: AgentEventCallbacks,
    useLSP: boolean = false
  ): Promise<PlanAgentResult> {
    const toolName = useLSP ? 'semanticAnalysis+LSP' : 'semanticAnalysis';

    callbacks?.onToolCall?.({
      agent: 'plan',
      toolName,
      args: { repoPath, planName, useLSP }
    });

    // Create context builder with LSP option
    const contextBuilder = new SemanticContextBuilder({ useLSP });

    // Pre-compute semantic context
    const semanticContext = await contextBuilder.buildPlanContext(repoPath, planName);

    // Cleanup LSP servers if enabled
    await contextBuilder.shutdown();

    callbacks?.onToolResult?.({
      agent: 'plan',
      toolName,
      success: true,
      summary: `Analyzed codebase for plan${useLSP ? ' with LSP' : ''}: ${semanticContext.length} chars of context`
    });

    const contextParts: string[] = [
      `Update the development plan "${planName}" for repository: ${repoPath}`,
      '',
      semanticContext,
      '',
      'Current plan content:',
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

    const result = await generateText({
      model: provider(modelId),
      system: PLAN_UPDATE_PROMPT,
      prompt: userPrompt,
      maxOutputTokens
    });

    // Emit agent complete event
    callbacks?.onAgentComplete?.({ agent: 'plan', toolsUsed: [toolName], steps: 1 });

    return {
      text: sanitizeAIResponse(result.text, { preserveFrontMatter: true, preserveComments: true }),
      toolsUsed: [toolName],
      steps: 1
    };
  }

  /**
   * Update plan using multi-step tool-based exploration (more thorough)
   */
  private async updatePlanWithTools(
    repoPath: string,
    planName: string,
    existingPlanContent: string,
    docsIndex: string | undefined,
    agentsIndex: string | undefined,
    referencedDocs: Array<{ path: string; content: string }> | undefined,
    referencedAgents: Array<{ path: string; content: string }> | undefined,
    maxSteps: number,
    maxOutputTokens: number,
    callbacks?: AgentEventCallbacks
  ): Promise<PlanAgentResult> {
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
      text: sanitizeAIResponse(result.text, { preserveFrontMatter: true, preserveComments: true }),
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
