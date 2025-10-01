import { LLMConfig, OpenRouterConfig } from '../types';
import { BaseLLMClient } from './baseLLMClient';
import { OpenRouterClient } from './openRouterClient';

export class LLMClientFactory {
  static createClient(config: LLMConfig): BaseLLMClient {
    // Convert LLMConfig to OpenRouterConfig for backward compatibility
    const openRouterConfig: OpenRouterConfig = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://openrouter.ai/api/v1',
      model: config.model
    };
    return new OpenRouterClient(openRouterConfig);
  }

  static getDefaultModel(): string {
    return 'x-ai/grok-4-fast';
  }

  static getEnvironmentVariables(): string[] {
    return ['OPENROUTER_API_KEY'];
  }
}
