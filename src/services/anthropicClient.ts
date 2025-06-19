import Anthropic from '@anthropic-ai/sdk';
import { LLMConfig } from '../types';
import { BaseLLMClient } from './baseLLMClient';

export class AnthropicClient extends BaseLLMClient {
  private client: Anthropic;
  private model: string;

  constructor(config: LLMConfig) {
    super(config.model);
    this.model = config.model;
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl
    });
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      // Track usage statistics
      this.trackUsage(response.usage, this.calculateAnthropicCost.bind(this));

      return response.content[0]?.type === 'text' ? response.content[0].text : '';
    } catch (error) {
      throw new Error(`Anthropic API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private calculateAnthropicCost(promptTokens: number, completionTokens: number): number {
    // Anthropic pricing (as of 2024)
    const prices: { [key: string]: { input: number; output: number } } = {
      'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
      'claude-3-sonnet-20240229': { input: 3.0, output: 15.0 },
      'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
      'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 }
    };

    const pricing = prices[this.model] || prices['claude-3-haiku-20240307']; // fallback
    const inputCost = (promptTokens / 1000000) * pricing.input;
    const outputCost = (completionTokens / 1000000) * pricing.output;
    
    return inputCost + outputCost;
  }

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
}