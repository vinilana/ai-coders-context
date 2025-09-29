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

  static detectProviderFromModel(model: string): LLMConfig['provider'] {
    void model;
    return 'openrouter';
  }

  static getProviderFromApiKey(apiKey: string): LLMConfig['provider'] {
    void apiKey;
    return 'openrouter';
  }

  static getDefaultModels(): { [key in LLMConfig['provider']]: string[] } {
    return {
      openrouter: [
        'anthropic/claude-3.5-sonnet',
        'anthropic/claude-3-opus',
        'google/gemini-2.0-flash-exp',
        'meta-llama/llama-3.1-70b-instruct'
      ]
    };
  }

  static getEnvironmentVariables(): { [key in LLMConfig['provider']]: string[] } {
    return {
      openrouter: ['OPENROUTER_API_KEY']
    };
  }
}
