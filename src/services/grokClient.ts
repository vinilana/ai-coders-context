import axios, { AxiosInstance } from 'axios';
import { LLMConfig } from '../types';
import { BaseLLMClient } from './baseLLMClient';

export class GrokClient extends BaseLLMClient {
  private client: AxiosInstance;
  private model: string;

  constructor(config: LLMConfig) {
    super(config.model);
    this.model = config.model;
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.x.ai/v1',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const messages = [];
      
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      
      messages.push({ role: 'user', content: prompt });

      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages,
        max_tokens: 4000,
        temperature: 0.7
      });

      // Track usage statistics
      this.trackUsage(response.data.usage, this.calculateGrokCost.bind(this));

      return response.data.choices[0]?.message?.content || '';
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Grok API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }

  private calculateGrokCost(promptTokens: number, completionTokens: number): number {
    // Grok pricing (as of 2024) - per 1M tokens
    const prices: { [key: string]: { input: number; output: number } } = {
      'grok-beta': { input: 5.0, output: 15.0 },
      'grok-vision-beta': { input: 5.0, output: 15.0 }
    };

    const pricing = prices[this.model] || prices['grok-beta']; // fallback
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