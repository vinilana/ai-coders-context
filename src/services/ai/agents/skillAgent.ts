import { generateText, stepCountIs } from 'ai';
import type { ToolSet } from 'ai';
import { createProvider } from '../providerFactory';
import { getCodeAnalysisTools } from '../tools';
import type { LLMConfig } from '../../../types';
import type { AgentEventCallbacks } from '../agentEvents';
import { summarizeToolResult } from '../agentEvents';
import { SemanticContextBuilder } from '../../semantic';
import { sanitizeAIResponse } from '../../../utils/contentSanitizer';
import { getSkillAgentPrompt } from '../prompts';

export interface SkillAgentOptions {
  repoPath: string;
  skillSlug: string;
  existingContent?: string;
  /** Concatenated docs context for personalization */
  docsContext?: string;
  /** Concatenated agents context for personalization */
  agentsContext?: string;
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

export interface SkillAgentResult {
  text: string;
  toolsUsed: string[];
  steps: number;
}

// Use shared system prompt from prompts module
const SYSTEM_PROMPT = getSkillAgentPrompt();

const SKILL_TYPE_FOCUS: Record<string, string[]> = {
  'commit-message': ['**/.git*', 'CHANGELOG*', 'package.json', 'src/**/*.ts'],
  'pr-review': ['**/*.ts', '**/*.test.ts', '.github/workflows/*'],
  'code-review': ['src/**/*.ts', '.eslintrc*', 'tsconfig.json'],
  'test-generation': ['**/*.test.ts', '**/*.spec.ts', 'jest.config*', 'vitest.config*'],
  'documentation': ['**/*.md', 'docs/**/*', 'README.md'],
  'refactoring': ['src/**/*.ts', 'tsconfig.json'],
  'bug-investigation': ['**/*.ts', '**/error*', '**/logs/*'],
  'feature-breakdown': ['src/**/*', 'package.json', 'docs/**/*'],
  'api-design': ['**/api/**/*', '**/routes/*', 'openapi*', 'swagger*'],
  'security-audit': ['**/*.ts', '.env*', '**/auth*', '**/security*'],
};

export class SkillAgent {
  private config: LLMConfig;
  private providerResult: ReturnType<typeof createProvider>;
  private tools: ToolSet;

  constructor(config: LLMConfig) {
    this.config = config;
    this.providerResult = createProvider(config);
    this.tools = getCodeAnalysisTools();
  }

  /**
   * Generate a personalized skill using semantic context or tools
   */
  async generateSkill(options: SkillAgentOptions): Promise<SkillAgentResult> {
    const {
      repoPath,
      skillSlug,
      existingContent,
      docsContext,
      agentsContext,
      maxSteps = 12,
      maxOutputTokens = 8000,
      callbacks,
      useSemanticContext = true,
      useLSP = false,
      scaffoldStructure
    } = options;

    // Emit agent start event
    callbacks?.onAgentStart?.({ agent: 'skill', target: skillSlug });

    // Use semantic context mode for token efficiency
    if (useSemanticContext) {
      return this.generateWithSemanticContext(
        repoPath,
        skillSlug,
        existingContent,
        docsContext,
        agentsContext,
        maxOutputTokens,
        callbacks,
        useLSP,
        scaffoldStructure
      );
    }

    // Tool-based mode for thorough analysis
    return this.generateWithTools(
      repoPath,
      skillSlug,
      existingContent,
      docsContext,
      agentsContext,
      maxSteps,
      maxOutputTokens,
      callbacks,
      scaffoldStructure
    );
  }

  /**
   * Generate skill using pre-computed semantic context (more token efficient)
   */
  private async generateWithSemanticContext(
    repoPath: string,
    skillSlug: string,
    existingContent: string | undefined,
    docsContext: string | undefined,
    agentsContext: string | undefined,
    maxOutputTokens: number,
    callbacks?: AgentEventCallbacks,
    useLSP: boolean = false,
    scaffoldStructure?: string
  ): Promise<SkillAgentResult> {
    const toolName = useLSP ? 'semanticAnalysis+LSP' : 'semanticAnalysis';

    callbacks?.onToolCall?.({
      agent: 'skill',
      toolName,
      args: { repoPath, skillSlug, useLSP }
    });

    // Create context builder with LSP option
    const contextBuilder = new SemanticContextBuilder({ useLSP });

    // Pre-compute semantic context with docs and agents context
    const semanticContext = await contextBuilder.buildSkillContext(
      repoPath,
      skillSlug,
      docsContext,
      agentsContext
    );

    // Cleanup LSP servers if enabled
    await contextBuilder.shutdown();

    callbacks?.onToolResult?.({
      agent: 'skill',
      toolName,
      success: true,
      summary: `Analyzed codebase for ${skillSlug}${useLSP ? ' with LSP' : ''}: ${semanticContext.length} chars of context`
    });

    // Build user prompt with optional scaffold structure context
    const structureSection = scaffoldStructure
      ? `\n## Skill Structure Requirements\n${scaffoldStructure}\n`
      : '';

    const instructions = scaffoldStructure
      ? `Generate a detailed skill playbook following the structure requirements above.
- Generate COMPLETE content following the structure requirements
- Do NOT include YAML frontmatter in the output (it will be preserved separately)
- Follow the specified tone (instructional) and target audience (ai-agents)
- Include all REQUIRED sections
- Personalize with project-specific examples and references`
      : `Generate a detailed skill playbook that:
1. Is personalized for THIS specific codebase
2. Uses project-specific examples and references
3. Includes workflows tailored to the project structure
4. References actual files, patterns, and tools used in the project
5. Preserves the YAML frontmatter format`;

    const userPrompt = `Generate a personalized skill playbook for "${skillSlug}".

Repository: ${repoPath}
${structureSection}
## Codebase Context
${semanticContext}

${existingContent ? `## Current skill content (to enhance):\n${existingContent}` : ''}

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
    callbacks?.onAgentComplete?.({ agent: 'skill', toolsUsed: [toolName], steps: 1 });

    return {
      text: sanitizeAIResponse(result.text, { preserveFrontMatter: true }),
      toolsUsed: [toolName],
      steps: 1
    };
  }

  /**
   * Generate skill using multi-step tool-based exploration (more thorough)
   */
  private async generateWithTools(
    repoPath: string,
    skillSlug: string,
    existingContent: string | undefined,
    docsContext: string | undefined,
    agentsContext: string | undefined,
    maxSteps: number,
    maxOutputTokens: number,
    callbacks?: AgentEventCallbacks,
    scaffoldStructure?: string
  ): Promise<SkillAgentResult> {
    const focusPatterns = SKILL_TYPE_FOCUS[skillSlug] || ['src/**/*'];

    // Build user prompt with optional scaffold structure context
    const structureSection = scaffoldStructure
      ? `\n## Skill Structure Requirements\n${scaffoldStructure}\n`
      : '';

    const instructions = scaffoldStructure
      ? `Use the tools to analyze the codebase and identify:
- Project structure and conventions
- Testing patterns and frameworks
- Configuration files and their settings
- Patterns relevant to this skill type

Then generate a personalized skill playbook following the structure requirements above.
- Generate COMPLETE content following the structure requirements
- Do NOT include YAML frontmatter in the output (it will be preserved separately)
- Follow the specified tone (instructional) and target audience (ai-agents)
- Include all REQUIRED sections
- Personalize with project-specific examples and references`
      : `Use the tools to analyze the codebase and identify:
- Project structure and conventions
- Testing patterns and frameworks
- Configuration files and their settings
- Patterns relevant to this skill type

Then generate a personalized skill playbook that:
1. Uses project-specific examples
2. References actual file paths and patterns
3. Adapts instructions to the project's technology stack
4. Preserves the YAML frontmatter format`;

    const userPrompt = `Generate a personalized skill playbook for "${skillSlug}".

Repository: ${repoPath}
Focus patterns: ${focusPatterns.join(', ')}
${structureSection}
${docsContext ? `Project Documentation:\n${docsContext}\n` : ''}
${agentsContext ? `Agent Playbooks:\n${agentsContext}\n` : ''}
${existingContent ? `Current skill content (to enhance):\n${existingContent}` : ''}

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
        callbacks?.onAgentStep?.({ agent: 'skill', step: stepCount });

        for (const toolCall of step.toolCalls || []) {
          callbacks?.onToolCall?.({
            agent: 'skill',
            toolName: toolCall.toolName,
            args: 'args' in toolCall ? toolCall.args as Record<string, unknown> : undefined
          });

          const toolResult = step.toolResults?.find(
            (r) => 'toolCallId' in r && r.toolCallId === toolCall.toolCallId
          );
          if (toolResult && 'result' in toolResult) {
            callbacks?.onToolResult?.({
              agent: 'skill',
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
    callbacks?.onAgentComplete?.({ agent: 'skill', toolsUsed: toolsUsedArray, steps: totalSteps });

    return {
      text: sanitizeAIResponse(result.text, { preserveFrontMatter: true }),
      toolsUsed: toolsUsedArray,
      steps: totalSteps
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
