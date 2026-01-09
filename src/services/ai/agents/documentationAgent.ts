import { generateText, generateObject, stepCountIs } from 'ai';
import type { ToolSet } from 'ai';
import { createProvider } from '../providerFactory';
import { getCodeAnalysisTools } from '../tools';
import { DocumentationOutputSchema } from '../schemas';
import type { LLMConfig } from '../../../types';
import type { DocumentationOutput } from '../schemas';
import type { AgentEventCallbacks } from '../agentEvents';
import { summarizeToolResult } from '../agentEvents';
import { SemanticContextBuilder } from '../../semantic';
import { sanitizeAIResponse } from '../../../utils/contentSanitizer';
import { getDocumentationAgentPrompt } from '../prompts';

export interface DocumentationAgentOptions {
  repoPath: string;
  targetFile: string;
  context?: string;
  maxSteps?: number;
  maxOutputTokens?: number;
  callbacks?: AgentEventCallbacks;
  /** Use pre-computed semantic context instead of tool-based exploration (more token efficient) */
  useSemanticContext?: boolean;
  /** Enable LSP for deeper semantic analysis (type info, references, implementations) */
  useLSP?: boolean;
}

export interface DocumentationAgentResult {
  text: string;
  toolsUsed: string[];
  steps: number;
}

// Use shared system prompt from prompts module
const SYSTEM_PROMPT = getDocumentationAgentPrompt();

export class DocumentationAgent {
  private config: LLMConfig;
  private providerResult: ReturnType<typeof createProvider>;
  private tools: ToolSet;

  constructor(config: LLMConfig) {
    this.config = config;
    this.providerResult = createProvider(config);
    this.tools = getCodeAnalysisTools();
  }

  /**
   * Generate documentation using tools for context gathering
   */
  async generateDocumentation(options: DocumentationAgentOptions): Promise<DocumentationAgentResult> {
    const { repoPath, targetFile, context, maxSteps = 15, maxOutputTokens = 8000, callbacks, useSemanticContext = true, useLSP = false } = options;

    // Emit agent start event
    callbacks?.onAgentStart?.({ agent: 'documentation', target: targetFile });

    // Use semantic context mode for token efficiency
    if (useSemanticContext) {
      return this.generateWithSemanticContext(repoPath, targetFile, context, maxOutputTokens, callbacks, useLSP);
    }

    // Tool-based mode for thorough analysis
    return this.generateWithTools(repoPath, targetFile, context, maxSteps, maxOutputTokens, callbacks);
  }

  /**
   * Generate documentation using pre-computed semantic context (more token efficient)
   */
  private async generateWithSemanticContext(
    repoPath: string,
    targetFile: string,
    context: string | undefined,
    maxOutputTokens: number,
    callbacks?: AgentEventCallbacks,
    useLSP: boolean = false
  ): Promise<DocumentationAgentResult> {
    callbacks?.onToolCall?.({
      agent: 'documentation',
      toolName: useLSP ? 'semanticAnalysis+LSP' : 'semanticAnalysis',
      args: { repoPath, targetFile, useLSP }
    });

    // Create context builder with LSP option
    const contextBuilder = new SemanticContextBuilder({ useLSP });

    // Pre-compute semantic context
    const semanticContext = await contextBuilder.buildDocumentationContext(repoPath, targetFile);

    // Cleanup LSP servers if enabled
    await contextBuilder.shutdown();

    const toolName = useLSP ? 'semanticAnalysis+LSP' : 'semanticAnalysis';
    callbacks?.onToolResult?.({
      agent: 'documentation',
      toolName,
      success: true,
      summary: `Analyzed codebase${useLSP ? ' with LSP' : ''}: ${semanticContext.length} chars of context`
    });

    const userPrompt = `Generate comprehensive documentation for: ${targetFile}

Repository root: ${repoPath}

${semanticContext}

${context ? `Additional context:\n${context}` : ''}

Generate clear, practical documentation that is helpful for developers.`;

    const { provider, modelId } = this.providerResult;

    const result = await generateText({
      model: provider(modelId),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      maxOutputTokens
    });

    // Emit agent complete event
    callbacks?.onAgentComplete?.({ agent: 'documentation', toolsUsed: [toolName], steps: 1 });

    return {
      text: sanitizeAIResponse(result.text, { preserveFrontMatter: true }),
      toolsUsed: [toolName],
      steps: 1
    };
  }

  /**
   * Generate documentation using multi-step tool-based exploration (more thorough)
   */
  private async generateWithTools(
    repoPath: string,
    targetFile: string,
    context: string | undefined,
    maxSteps: number,
    maxOutputTokens: number,
    callbacks?: AgentEventCallbacks
  ): Promise<DocumentationAgentResult> {
    const userPrompt = `Generate comprehensive documentation for: ${targetFile}

Repository root: ${repoPath}
${context ? `Additional context:\n${context}` : ''}

First, use the available tools to analyze the file and gather context, then generate the documentation.`;

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
        callbacks?.onAgentStep?.({ agent: 'documentation', step: stepCount });

        // Report tool calls
        for (const toolCall of step.toolCalls || []) {
          callbacks?.onToolCall?.({
            agent: 'documentation',
            toolName: toolCall.toolName,
            args: 'args' in toolCall ? toolCall.args as Record<string, unknown> : undefined
          });

          // Find the result for this tool call
          const toolResult = step.toolResults?.find(
            (r) => 'toolCallId' in r && r.toolCallId === toolCall.toolCallId
          );
          if (toolResult && 'result' in toolResult) {
            callbacks?.onToolResult?.({
              agent: 'documentation',
              toolName: toolCall.toolName,
              success: true,
              summary: summarizeToolResult(toolCall.toolName, toolResult.result)
            });
          }
        }
      }
    });

    // Extract tool names used
    const toolsUsed = new Set<string>();
    for (const step of result.steps || []) {
      for (const toolCall of step.toolCalls || []) {
        toolsUsed.add(toolCall.toolName);
      }
    }

    const toolsUsedArray = Array.from(toolsUsed);
    const totalSteps = result.steps?.length || 1;

    // Emit agent complete event
    callbacks?.onAgentComplete?.({ agent: 'documentation', toolsUsed: toolsUsedArray, steps: totalSteps });

    return {
      text: sanitizeAIResponse(result.text, { preserveFrontMatter: true }),
      toolsUsed: toolsUsedArray,
      steps: totalSteps
    };
  }

  /**
   * Generate structured documentation output
   */
  async generateStructuredDocumentation(
    options: DocumentationAgentOptions
  ): Promise<{
    documentation: DocumentationOutput;
    toolsUsed: string[];
  }> {
    const { repoPath, targetFile, context, maxSteps = 10, maxOutputTokens = 8000, callbacks } = options;

    // Emit agent start event
    callbacks?.onAgentStart?.({ agent: 'documentation', target: targetFile });

    const analysisPrompt = `Analyze ${targetFile} in ${repoPath}.
1. Read the file
2. Analyze its symbols
3. Find related files
4. Search for usage patterns
${context ? `\nAdditional context: ${context}` : ''}`;

    const { provider, modelId } = this.providerResult;
    let stepCount = 0;

    // First gather context using tools
    const analysisResult = await generateText({
      model: provider(modelId),
      system: 'You are a code analyst. Use the tools to analyze the file and its context.',
      prompt: analysisPrompt,
      tools: this.tools,
      stopWhen: stepCountIs(maxSteps),
      maxOutputTokens: Math.floor(maxOutputTokens / 2),
      onStepFinish: (step) => {
        stepCount++;
        callbacks?.onAgentStep?.({ agent: 'documentation', step: stepCount });

        for (const toolCall of step.toolCalls || []) {
          callbacks?.onToolCall?.({
            agent: 'documentation',
            toolName: toolCall.toolName,
            args: 'args' in toolCall ? toolCall.args as Record<string, unknown> : undefined
          });

          const toolResult = step.toolResults?.find(
            (r) => 'toolCallId' in r && r.toolCallId === toolCall.toolCallId
          );
          if (toolResult && 'result' in toolResult) {
            callbacks?.onToolResult?.({
              agent: 'documentation',
              toolName: toolCall.toolName,
              success: true,
              summary: summarizeToolResult(toolCall.toolName, toolResult.result)
            });
          }
        }
      }
    });

    // Extract tool names used
    const toolsUsed = new Set<string>();
    for (const step of analysisResult.steps || []) {
      for (const toolCall of step.toolCalls || []) {
        toolsUsed.add(toolCall.toolName);
      }
    }

    // Then generate structured output
    const documentation = await generateObject({
      model: provider(modelId),
      schema: DocumentationOutputSchema,
      system: 'Generate structured documentation based on the analysis.',
      prompt: `Based on this analysis:\n${analysisResult.text}\n\nGenerate structured documentation for ${targetFile}`,
      maxOutputTokens: Math.floor(maxOutputTokens / 2)
    });

    const toolsUsedArray = Array.from(toolsUsed);

    // Emit agent complete event
    callbacks?.onAgentComplete?.({ agent: 'documentation', toolsUsed: toolsUsedArray, steps: stepCount });

    return {
      documentation: documentation.object,
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
