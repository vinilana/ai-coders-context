import { generateText, generateObject, stepCountIs } from 'ai';
import type { ToolSet } from 'ai';
import { createProvider } from '../providerFactory';
import { getCodeAnalysisTools } from '../tools';
import { AgentPlaybookSchema } from '../schemas';
import type { LLMConfig } from '../../../types';
import type { AgentType as GeneratorAgentType } from '../../../generators/agents/agentTypes';
import type { AgentPlaybook } from '../schemas';
import type { AgentEventCallbacks } from '../agentEvents';
import { summarizeToolResult } from '../agentEvents';
import { SemanticContextBuilder } from '../../semantic';
import { sanitizeAIResponse } from '../../../utils/contentSanitizer';
import { getPlaybookAgentPrompt } from '../prompts';

export interface PlaybookAgentOptions {
  repoPath: string;
  agentType: GeneratorAgentType;
  existingContext?: string;
  maxSteps?: number;
  maxOutputTokens?: number;
  callbacks?: AgentEventCallbacks;
  /** Use pre-computed semantic context instead of tool-based exploration (more token efficient) */
  useSemanticContext?: boolean;
  /** Enable LSP for deeper semantic analysis (type info, references, implementations) */
  useLSP?: boolean;
  /** Scaffold structure context for AI generation (v2 scaffold system) */
  scaffoldStructure?: string;
}

export interface PlaybookAgentResult {
  text: string;
  toolsUsed: string[];
  steps: number;
}

// Use shared system prompt from prompts module
const SYSTEM_PROMPT = getPlaybookAgentPrompt();

const AGENT_TYPE_FOCUS: Record<GeneratorAgentType, string[]> = {
  'code-reviewer': ['**/*.ts', '**/*.tsx', '.eslintrc*', 'tsconfig.json'],
  'bug-fixer': ['**/*.ts', '**/*.test.ts', '**/error*', '**/exception*'],
  'feature-developer': ['src/**/*', 'package.json', 'README.md'],
  'refactoring-specialist': ['src/**/*.ts', 'tsconfig.json', '.eslintrc*'],
  'test-writer': ['**/*.test.ts', '**/*.spec.ts', 'jest.config*', 'vitest.config*'],
  'documentation-writer': ['**/*.md', 'docs/**/*', 'README.md', 'src/**/*.ts'],
  'performance-optimizer': ['**/*.ts', 'webpack.config*', 'package.json'],
  'security-auditor': ['**/*.ts', '.env*', 'package.json', '**/auth*', '**/security*'],
  'backend-specialist': ['src/services/**/*', 'src/api/**/*', 'server/**/*'],
  'frontend-specialist': ['src/components/**/*', 'src/pages/**/*', '**/*.tsx', '**/*.css'],
  'architect-specialist': ['src/**/*', 'package.json', 'tsconfig.json', 'docs/**/*'],
  'devops-specialist': ['Dockerfile*', 'docker-compose*', '.github/**/*', 'ci/**/*'],
  'database-specialist': ['**/models/**/*', '**/migrations/**/*', '**/schema*', 'prisma/**/*'],
  'mobile-specialist': ['**/*.tsx', 'app/**/*', 'expo*', 'react-native*']
};

export class PlaybookAgent {
  private config: LLMConfig;
  private providerResult: ReturnType<typeof createProvider>;
  private tools: ToolSet;

  constructor(config: LLMConfig) {
    this.config = config;
    this.providerResult = createProvider(config);
    this.tools = getCodeAnalysisTools();
  }

  /**
   * Generate a playbook using tools for context gathering
   */
  async generatePlaybook(options: PlaybookAgentOptions): Promise<PlaybookAgentResult> {
    const { repoPath, agentType, existingContext, maxSteps = 12, maxOutputTokens = 8000, callbacks, useSemanticContext = true, useLSP = false, scaffoldStructure } = options;

    // Emit agent start event
    callbacks?.onAgentStart?.({ agent: 'playbook', target: agentType });

    // Use semantic context mode for token efficiency
    if (useSemanticContext) {
      return this.generateWithSemanticContext(repoPath, agentType, existingContext, maxOutputTokens, callbacks, useLSP, scaffoldStructure);
    }

    // Tool-based mode for thorough analysis
    return this.generateWithTools(repoPath, agentType, existingContext, maxSteps, maxOutputTokens, callbacks, scaffoldStructure);
  }

  /**
   * Generate playbook using pre-computed semantic context (more token efficient)
   */
  private async generateWithSemanticContext(
    repoPath: string,
    agentType: GeneratorAgentType,
    existingContext: string | undefined,
    maxOutputTokens: number,
    callbacks?: AgentEventCallbacks,
    useLSP: boolean = false,
    scaffoldStructure?: string
  ): Promise<PlaybookAgentResult> {
    const toolName = useLSP ? 'semanticAnalysis+LSP' : 'semanticAnalysis';

    callbacks?.onToolCall?.({
      agent: 'playbook',
      toolName,
      args: { repoPath, agentType, useLSP }
    });

    // Create context builder with LSP option
    const contextBuilder = new SemanticContextBuilder({ useLSP });

    // Pre-compute semantic context
    const semanticContext = await contextBuilder.buildPlaybookContext(repoPath, agentType);

    // Cleanup LSP servers if enabled
    await contextBuilder.shutdown();

    callbacks?.onToolResult?.({
      agent: 'playbook',
      toolName,
      success: true,
      summary: `Analyzed codebase for ${agentType}${useLSP ? ' with LSP' : ''}: ${semanticContext.length} chars of context`
    });

    // Build user prompt with optional scaffold structure context
    const structureSection = scaffoldStructure
      ? `\n## Playbook Structure Requirements\n${scaffoldStructure}\n`
      : '';

    const instructions = scaffoldStructure
      ? `Generate a detailed, actionable playbook following the structure requirements above.
- Generate COMPLETE content following the structure requirements
- Do NOT include YAML frontmatter in the output
- Follow the specified tone (instructional) and target audience (ai-agents)
- Include all REQUIRED sections`
      : `Generate a detailed, actionable playbook with:
1. Clear understanding of what files/areas the agent should focus on
2. Specific workflows and steps for common tasks
3. Best practices derived from the actual codebase
4. Key files and their purposes`;

    const userPrompt = `Generate a comprehensive playbook for a ${agentType} agent.

Repository: ${repoPath}
${structureSection}
## Codebase Context
${semanticContext}

${existingContext ? `## Existing context:\n${existingContext}` : ''}

## Instructions
${instructions}`;

    const { provider, modelId } = this.providerResult;

    const result = await generateText({
      model: provider(modelId),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      maxOutputTokens
    });

    // Emit agent complete event
    callbacks?.onAgentComplete?.({ agent: 'playbook', toolsUsed: [toolName], steps: 1 });

    return {
      text: sanitizeAIResponse(result.text, { preserveFrontMatter: true }),
      toolsUsed: [toolName],
      steps: 1
    };
  }

  /**
   * Generate playbook using multi-step tool-based exploration (more thorough)
   */
  private async generateWithTools(
    repoPath: string,
    agentType: GeneratorAgentType,
    existingContext: string | undefined,
    maxSteps: number,
    maxOutputTokens: number,
    callbacks?: AgentEventCallbacks,
    scaffoldStructure?: string
  ): Promise<PlaybookAgentResult> {
    const focusPatterns = AGENT_TYPE_FOCUS[agentType] || ['src/**/*'];

    // Build user prompt with optional scaffold structure context
    const structureSection = scaffoldStructure
      ? `\n## Playbook Structure Requirements\n${scaffoldStructure}\n`
      : '';

    const instructions = scaffoldStructure
      ? `Use the tools to analyze the codebase, then generate a detailed, actionable playbook following the structure requirements above.
- Generate COMPLETE content following the structure requirements
- Do NOT include YAML frontmatter in the output
- Follow the specified tone and target audience
- Include all REQUIRED sections`
      : `Use the tools to analyze the codebase and identify:
- Relevant files for this agent type
- Patterns and conventions
- Testing strategies (if applicable)
- Key workflows

Then generate a detailed, actionable playbook.`;

    const userPrompt = `Generate a comprehensive playbook for a ${agentType} agent.

Repository: ${repoPath}
Focus patterns: ${focusPatterns.join(', ')}
${structureSection}
${existingContext ? `Existing context:\n${existingContext}` : ''}

${instructions}`;

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
        callbacks?.onAgentStep?.({ agent: 'playbook', step: stepCount });

        for (const toolCall of step.toolCalls || []) {
          callbacks?.onToolCall?.({
            agent: 'playbook',
            toolName: toolCall.toolName,
            args: 'args' in toolCall ? toolCall.args as Record<string, unknown> : undefined
          });

          const toolResult = step.toolResults?.find(
            (r) => 'toolCallId' in r && r.toolCallId === toolCall.toolCallId
          );
          if (toolResult && 'result' in toolResult) {
            callbacks?.onToolResult?.({
              agent: 'playbook',
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
    callbacks?.onAgentComplete?.({ agent: 'playbook', toolsUsed: toolsUsedArray, steps: totalSteps });

    return {
      text: sanitizeAIResponse(result.text, { preserveFrontMatter: true }),
      toolsUsed: toolsUsedArray,
      steps: totalSteps
    };
  }

  /**
   * Generate structured playbook output
   */
  async generateStructuredPlaybook(
    options: PlaybookAgentOptions
  ): Promise<{
    playbook: AgentPlaybook;
    toolsUsed: string[];
  }> {
    const { repoPath, agentType, existingContext, maxSteps = 8, maxOutputTokens = 8000, callbacks } = options;

    // Emit agent start event
    callbacks?.onAgentStart?.({ agent: 'playbook', target: agentType });

    const focusPatterns = AGENT_TYPE_FOCUS[agentType] || ['src/**/*'];

    const analysisPrompt = `For a ${agentType} agent working in ${repoPath}, find:
1. Relevant source files (focus on: ${focusPatterns.join(', ')})
2. Test files and patterns
3. Configuration files
4. Documentation
${existingContext ? `\nExisting context: ${existingContext}` : ''}`;

    const { provider, modelId } = this.providerResult;
    let stepCount = 0;

    // First gather context using tools
    const analysisResult = await generateText({
      model: provider(modelId),
      system: 'Analyze the codebase for the specified agent type.',
      prompt: analysisPrompt,
      tools: this.tools,
      stopWhen: stepCountIs(maxSteps),
      maxOutputTokens: Math.floor(maxOutputTokens / 2),
      onStepFinish: (step) => {
        stepCount++;
        callbacks?.onAgentStep?.({ agent: 'playbook', step: stepCount });

        for (const toolCall of step.toolCalls || []) {
          callbacks?.onToolCall?.({
            agent: 'playbook',
            toolName: toolCall.toolName,
            args: 'args' in toolCall ? toolCall.args as Record<string, unknown> : undefined
          });

          const toolResult = step.toolResults?.find(
            (r) => 'toolCallId' in r && r.toolCallId === toolCall.toolCallId
          );
          if (toolResult && 'result' in toolResult) {
            callbacks?.onToolResult?.({
              agent: 'playbook',
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

    // Then generate structured playbook
    const playbook = await generateObject({
      model: provider(modelId),
      schema: AgentPlaybookSchema,
      system: 'Generate a structured agent playbook based on the analysis.',
      prompt: `Analysis:\n${analysisResult.text}\n\nGenerate a structured playbook for: ${agentType}`,
      maxOutputTokens: Math.floor(maxOutputTokens / 2)
    });

    const toolsUsedArray = Array.from(toolsUsed);

    // Emit agent complete event
    callbacks?.onAgentComplete?.({ agent: 'playbook', toolsUsed: toolsUsedArray, steps: stepCount });

    return {
      playbook: playbook.object,
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
