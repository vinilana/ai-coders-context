import axios, { AxiosInstance } from 'axios';
import { OpenRouterConfig } from '../types';
import { BaseLLMClient } from './baseLLMClient';

export class OpenRouterClient extends BaseLLMClient {
  private client: AxiosInstance;
  private config: OpenRouterConfig;

  constructor(config: OpenRouterConfig) {
    super(config.model);
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ai-coders-context',
        'X-Title': 'AI Coders Context'
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
        model: this.config.model || 'x-ai/grok-4-fast',
        messages,
        max_tokens: 4000,
        temperature: 0.7
      });

      // Track usage statistics
      this.trackUsage(response.data.usage);

      return response.data.choices[0]?.message?.content || '';
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`OpenRouter API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }

}
