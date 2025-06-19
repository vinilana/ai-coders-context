import { LLMConfig, OpenRouterConfig } from '../types';
import { BaseLLMClient } from './baseLLMClient';
import { OpenRouterClient } from './openRouterClient';
import { OpenAIClient } from './openaiClient';
import { AnthropicClient } from './anthropicClient';
import { GeminiClient } from './geminiClient';
import { GrokClient } from './grokClient';

export class LLMClientFactory {
  static createClient(config: LLMConfig): BaseLLMClient {
    switch (config.provider) {
      case 'openai':
        return new OpenAIClient(config);
      
      case 'anthropic':
        return new AnthropicClient(config);
      
      case 'gemini':
        return new GeminiClient(config);
      
      case 'grok':
        return new GrokClient(config);
      
      case 'openrouter':
      default:
        // Convert LLMConfig to OpenRouterConfig for backward compatibility
        const openRouterConfig: OpenRouterConfig = {
          apiKey: config.apiKey,
          baseUrl: config.baseUrl || 'https://openrouter.ai/api/v1',
          model: config.model
        };
        return new OpenRouterClient(openRouterConfig);
    }
  }

  static detectProviderFromModel(model: string): LLMConfig['provider'] {
    if (model.startsWith('gpt-')) {
      return 'openai';
    } else if (model.startsWith('claude-')) {
      return 'anthropic';
    } else if (model.includes('gemini')) {
      return 'gemini';
    } else if (model.includes('grok')) {
      return 'grok';
    }
    return 'openrouter'; // default
  }

  static getProviderFromApiKey(apiKey: string): LLMConfig['provider'] {
    if (apiKey.startsWith('sk-') && !apiKey.includes('or-v1')) {
      return 'openai';
    } else if (apiKey.startsWith('sk-ant-')) {
      return 'anthropic';
    } else if (apiKey.startsWith('AIza')) {
      return 'gemini';
    } else if (apiKey.startsWith('xai-')) {
      return 'grok';
    } else if (apiKey.includes('or-v1')) {
      return 'openrouter';
    }
    return 'openrouter'; // default fallback
  }

  static getDefaultModels(): { [key in LLMConfig['provider']]: string[] } {
    return {
      openrouter: [
        'google/gemini-2.0-pro',
        'anthropic/claude-3-sonnet',
        'anthropic/claude-3-opus',
        'openai/gpt-4',
        'openai/gpt-3.5-turbo',
        'google/gemini-pro',
        'meta-llama/llama-3.1-70b-instruct'
      ],
      openai: [
        'gpt-4',
        'gpt-4-turbo',
        'gpt-3.5-turbo'
      ],
      anthropic: [
        'claude-3-haiku-20240307',
        'claude-3-sonnet-20240229',
        'claude-3-opus-20240229',
        'claude-3-5-sonnet-20241022'
      ],
      gemini: [
        'gemini-pro',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-2.0-flash-exp'
      ],
      grok: [
        'grok-beta',
        'grok-vision-beta'
      ]
    };
  }

  static getEnvironmentVariables(): { [key in LLMConfig['provider']]: string[] } {
    return {
      openrouter: ['OPENROUTER_API_KEY'],
      openai: ['OPENAI_API_KEY'],
      anthropic: ['ANTHROPIC_API_KEY'],
      gemini: ['GOOGLE_AI_API_KEY', 'GEMINI_API_KEY'],
      grok: ['GROK_API_KEY', 'XAI_API_KEY']
    };
  }
}