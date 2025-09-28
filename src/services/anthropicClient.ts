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

}
