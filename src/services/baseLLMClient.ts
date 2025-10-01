import { UsageStats } from '../types';

export abstract class BaseLLMClient {
  protected usageStats: UsageStats;

  constructor(model: string) {
    this.usageStats = {
      totalCalls: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      model
    };
  }

  abstract generateText(prompt: string, systemPrompt?: string): Promise<string>;

  async generateDocumentation(
    codeContent: string,
    filePath: string,
    context: string
  ): Promise<string> {
    const systemPrompt = `You are a technical documentation expert. Generate clear, comprehensive documentation for the provided code file. Include:
    1. Purpose and overview
    2. Key components/functions
    3. Dependencies and relationships
    4. Usage examples where applicable
    5. Important notes or gotchas
    
    Focus on being practical and helpful for developers working with this codebase.`;

    const prompt = `File: ${filePath}
    
Context: ${context}

Code:
\`\`\`
${codeContent}
\`\`\`

Generate comprehensive documentation for this file.`;

    return this.generateText(prompt, systemPrompt);
  }

  async generateAgentPrompt(
    repoStructure: string,
    fileContext: string,
    agentType: string
  ): Promise<string> {
    const systemPrompt = `You are an expert at creating AI agent prompts for software development. Create a specialized prompt that would help an AI assistant understand and work effectively with this specific codebase.

The prompt should include:
1. Clear understanding of the codebase structure and patterns
2. Key conventions and best practices used in this project  
3. Important files and their purposes
4. Common tasks and workflows
5. Specific guidance for the agent type requested

Make the prompt practical and actionable.`;

    const prompt = `Codebase Structure:
${repoStructure}

File Context:
${fileContext}

Agent Type: ${agentType}

Generate a comprehensive agent prompt that would help an AI assistant work effectively with this codebase for ${agentType} tasks.`;

    return this.generateText(prompt, systemPrompt);
  }

  getUsageStats(): UsageStats {
    return { ...this.usageStats };
  }

  resetUsageStats(): void {
    const model = this.usageStats.model;
    this.usageStats = {
      totalCalls: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      model
    };
  }

  protected trackUsage(usage: any): void {
    if (usage) {
      this.usageStats.totalCalls++;
      this.usageStats.totalPromptTokens += usage.prompt_tokens || usage.input_tokens || 0;
      this.usageStats.totalCompletionTokens += usage.completion_tokens || usage.output_tokens || 0;
      this.usageStats.totalTokens += usage.total_tokens || (usage.prompt_tokens + usage.completion_tokens) || 0;
    }
  }
}
