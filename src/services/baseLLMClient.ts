import { UsageStats } from '../types';

export abstract class BaseLLMClient {
  protected usageStats: UsageStats;

  constructor(model: string) {
    this.usageStats = {
      totalCalls: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      model
    };
  }

  abstract generateText(prompt: string, systemPrompt?: string): Promise<string>;

  abstract generateDocumentation(
    codeContent: string,
    filePath: string,
    context: string
  ): Promise<string>;

  abstract generateAgentPrompt(
    repoStructure: string,
    fileContext: string,
    agentType: string
  ): Promise<string>;

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
      estimatedCost: 0,
      model
    };
  }

  protected trackUsage(usage: any, calculateCostFn: (promptTokens: number, completionTokens: number) => number): void {
    if (usage) {
      this.usageStats.totalCalls++;
      this.usageStats.totalPromptTokens += usage.prompt_tokens || usage.input_tokens || 0;
      this.usageStats.totalCompletionTokens += usage.completion_tokens || usage.output_tokens || 0;
      this.usageStats.totalTokens += usage.total_tokens || (usage.prompt_tokens + usage.completion_tokens) || 0;
      
      const requestCost = calculateCostFn(
        usage.prompt_tokens || usage.input_tokens || 0,
        usage.completion_tokens || usage.output_tokens || 0
      );
      this.usageStats.estimatedCost += requestCost;
    }
  }
}