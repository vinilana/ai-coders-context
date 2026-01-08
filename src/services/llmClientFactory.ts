import type { LLMConfig, AIProvider } from '../types';
import { BaseLLMClient } from './baseLLMClient';
import { AISdkClient } from './ai/aiSdkClient';
import {
  DEFAULT_MODELS,
  PROVIDER_ENV_VARS,
  detectProviderFromEnv,
  getApiKeyFromEnv
} from './ai/providerFactory';
import { getCodeAnalysisTools } from './ai/tools';

export class LLMClientFactory {
  /**
   * Creates an AI SDK client with the specified configuration
   */
  static createClient(config: LLMConfig): BaseLLMClient {
    const client = new AISdkClient(config);
    // Pre-configure with code analysis tools
    client.setTools(getCodeAnalysisTools());
    return client;
  }

  /**
   * Creates an AISdkClient with full capabilities (tools, structured output)
   */
  static createAISdkClient(config: LLMConfig): AISdkClient {
    const client = new AISdkClient(config);
    client.setTools(getCodeAnalysisTools());
    return client;
  }

  /**
   * Gets the default model for a provider
   */
  static getDefaultModel(provider?: AIProvider): string {
    return DEFAULT_MODELS[provider || 'openrouter'];
  }

  /**
   * Gets all default models by provider
   */
  static getDefaultModels(): Record<AIProvider, string> {
    return { ...DEFAULT_MODELS };
  }

  /**
   * Gets all environment variables checked for API keys
   */
  static getEnvironmentVariables(): string[] {
    return Object.values(PROVIDER_ENV_VARS).flat();
  }

  /**
   * Gets environment variable names for a specific provider
   */
  static getProviderEnvVars(provider: AIProvider): string[] {
    return PROVIDER_ENV_VARS[provider];
  }

  /**
   * Detects the provider from available environment variables
   */
  static getProviderFromEnv(): AIProvider | null {
    return detectProviderFromEnv();
  }

  /**
   * Gets the API key for a provider from environment variables
   */
  static getApiKeyFromEnv(provider: AIProvider): string | undefined {
    return getApiKeyFromEnv(provider);
  }

  /**
   * Gets all available providers
   */
  static getAvailableProviders(): AIProvider[] {
    return ['openrouter', 'openai', 'anthropic', 'google'];
  }
}
