import { GoogleGenAI } from '@google/genai';
import { LLMConfig } from '../types';
import { BaseLLMClient } from './baseLLMClient';

export class GeminiClient extends BaseLLMClient {
  private client: GoogleGenAI;
  private model: string;

  constructor(config: LLMConfig) {
    super(config.model);
    this.model = config.model;
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const fullPrompt = systemPrompt 
        ? `System: ${systemPrompt}\n\nUser: ${prompt}`
        : prompt;

      const response = await this.client.models.generateContent({
        model: this.model,
        contents: fullPrompt
      });

      const text = response.text || '';

      // Google AI doesn't provide detailed usage stats in the free tier
      // We'll estimate based on content length
      const estimatedPromptTokens = Math.ceil(fullPrompt.length / 4);
      const estimatedCompletionTokens = Math.ceil(text.length / 4);
      
      this.trackUsage({
        prompt_tokens: estimatedPromptTokens,
        completion_tokens: estimatedCompletionTokens,
        total_tokens: estimatedPromptTokens + estimatedCompletionTokens
      }, this.calculateGeminiCost.bind(this));

      return text;
    } catch (error) {
      throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private calculateGeminiCost(promptTokens: number, completionTokens: number): number {
    // Google AI pricing (as of 2024) - per 1M tokens
    const prices: { [key: string]: { input: number; output: number } } = {
      'gemini-pro': { input: 0.5, output: 1.5 },
      'gemini-1.5-pro': { input: 3.5, output: 10.5 },
      'gemini-1.5-flash': { input: 0.075, output: 0.3 },
      'gemini-2.0-flash-exp': { input: 0.075, output: 0.3 },
      'gemini-2.0-flash-001': { input: 0.075, output: 0.3 }
    };

    const pricing = prices[this.model] || prices['gemini-pro']; // fallback
    const inputCost = (promptTokens / 1000000) * pricing.input;
    const outputCost = (completionTokens / 1000000) * pricing.output;
    
    return inputCost + outputCost;
  }

}
