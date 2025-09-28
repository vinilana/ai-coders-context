import OpenAI from 'openai';
import { LLMConfig } from '../types';
import { BaseLLMClient } from './baseLLMClient';

export class OpenAIClient extends BaseLLMClient {
  private client: OpenAI;
  private model: string;

  constructor(config: LLMConfig) {
    super(config.model);
    this.model = config.model;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl
    });
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
      
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      
      messages.push({ role: 'user', content: prompt });

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: 4000,
        temperature: 0.7
      });

      // Track usage statistics
      this.trackUsage(response.usage, this.calculateOpenAICost.bind(this));

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private calculateOpenAICost(promptTokens: number, completionTokens: number): number {
    // OpenAI pricing (as of 2024)
    const prices: { [key: string]: { input: number; output: number } } = {
      'gpt-4': { input: 30.0, output: 60.0 },
      'gpt-4-turbo': { input: 10.0, output: 30.0 },
      'gpt-4-turbo-preview': { input: 10.0, output: 30.0 },
      'gpt-3.5-turbo': { input: 1.0, output: 2.0 },
      'gpt-3.5-turbo-16k': { input: 3.0, output: 4.0 }
    };

    const pricing = prices[this.model] || prices['gpt-3.5-turbo']; // fallback
    const inputCost = (promptTokens / 1000000) * pricing.input;
    const outputCost = (completionTokens / 1000000) * pricing.output;
    
    return inputCost + outputCost;
  }

}
