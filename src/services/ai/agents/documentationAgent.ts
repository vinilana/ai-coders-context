import { generateText, generateObject, stepCountIs } from 'ai';
import type { ToolSet } from 'ai';
import { createProvider } from '../providerFactory';
import { getCodeAnalysisTools } from '../tools';
import { DocumentationOutputSchema } from '../schemas';
import type { LLMConfig } from '../../../types';
import type { DocumentationOutput } from '../schemas';

export interface DocumentationAgentOptions {
  repoPath: string;
  targetFile: string;
  context?: string;
  maxSteps?: number;
  maxOutputTokens?: number;
}

export interface DocumentationAgentResult {
  text: string;
  toolsUsed: string[];
  steps: number;
}

const SYSTEM_PROMPT = `You are a technical documentation expert. Your task is to analyze code and generate comprehensive documentation.

You have access to tools for:
- Reading file contents (readFile)
- Listing files in the repository (listFiles)
- Analyzing code symbols like classes, functions, interfaces (analyzeSymbols)
- Getting repository structure (getFileStructure)
- Searching for code patterns (searchCode)

Use these tools to gather context about the codebase before generating documentation.

When analyzing, focus on:
1. Understanding the file's purpose and main exports
2. Identifying dependencies and relationships
3. Finding usage examples in tests or other files
4. Discovering patterns and conventions

Generate documentation that is:
- Clear and concise
- Practical for developers
- Includes code examples where helpful
- Cross-references related files`;

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
    const { repoPath, targetFile, context, maxSteps = 15, maxOutputTokens = 8000 } = options;

    const userPrompt = `Generate comprehensive documentation for: ${targetFile}

Repository root: ${repoPath}
${context ? `Additional context:\n${context}` : ''}

First, use the available tools to analyze the file and gather context, then generate the documentation.`;

    const { provider, modelId } = this.providerResult;

    const result = await generateText({
      model: provider(modelId),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      tools: this.tools,
      stopWhen: stepCountIs(maxSteps),
      maxOutputTokens
    });

    // Extract tool names used
    const toolsUsed = new Set<string>();
    for (const step of result.steps || []) {
      for (const toolCall of step.toolCalls || []) {
        toolsUsed.add(toolCall.toolName);
      }
    }

    return {
      text: result.text,
      toolsUsed: Array.from(toolsUsed),
      steps: result.steps?.length || 1
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
    const { repoPath, targetFile, context, maxSteps = 10, maxOutputTokens = 8000 } = options;

    const analysisPrompt = `Analyze ${targetFile} in ${repoPath}.
1. Read the file
2. Analyze its symbols
3. Find related files
4. Search for usage patterns
${context ? `\nAdditional context: ${context}` : ''}`;

    const { provider, modelId } = this.providerResult;

    // First gather context using tools
    const analysisResult = await generateText({
      model: provider(modelId),
      system: 'You are a code analyst. Use the tools to analyze the file and its context.',
      prompt: analysisPrompt,
      tools: this.tools,
      stopWhen: stepCountIs(maxSteps),
      maxOutputTokens: Math.floor(maxOutputTokens / 2)
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

    return {
      documentation: documentation.object,
      toolsUsed: Array.from(toolsUsed)
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
