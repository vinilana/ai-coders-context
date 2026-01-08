import type { TranslateFn } from '../../utils/i18n';
import type { LLMConfig, AIProvider } from '../../types';
import { LLMClientFactory } from '../llmClientFactory';

export interface ResolvedLlmConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

export interface ResolveLlmConfigOptions {
  rawOptions: {
    provider?: AIProvider;
    model?: string;
    apiKey?: string;
    baseUrl?: string;
  };
  fallbackModel: string;
  t: TranslateFn;
  factory?: typeof LLMClientFactory;
}

/**
 * Resolves LLM configuration from CLI options, environment variables, and defaults.
 * Supports multiple providers: openrouter, openai, anthropic, google
 */
export async function resolveLlmConfig({
  rawOptions,
  fallbackModel,
  t,
  factory = LLMClientFactory
}: ResolveLlmConfigOptions): Promise<ResolvedLlmConfig> {
  // Determine provider from options, environment, or default
  let provider: AIProvider = rawOptions.provider || 'openrouter';

  // If no provider specified, try to detect from environment
  if (!rawOptions.provider) {
    const detectedProvider = factory.getProviderFromEnv();
    if (detectedProvider) {
      provider = detectedProvider;
    }
  }

  // Get API key from options or environment
  let apiKey = rawOptions.apiKey;
  if (!apiKey) {
    apiKey = factory.getApiKeyFromEnv(provider);
  }

  // Get model from options, environment, or defaults
  let model = rawOptions.model;
  if (!model) {
    // Check for provider-specific model env var
    const modelEnvVar = `${provider.toUpperCase()}_MODEL`;
    model = process.env[modelEnvVar] || factory.getDefaultModel(provider) || fallbackModel;
  }

  // Validate API key exists
  if (!apiKey) {
    const envVars = factory.getProviderEnvVars(provider);
    throw new Error(
      t('errors.fill.apiKeyMissing', {
        provider: provider.toUpperCase(),
        envVars: envVars.join(', ')
      })
    );
  }

  return {
    provider,
    model,
    apiKey,
    baseUrl: rawOptions.baseUrl
  };
}

/**
 * Get all available providers
 */
export function getAvailableProviders(): AIProvider[] {
  return LLMClientFactory.getAvailableProviders();
}

/**
 * Check if a provider has an API key configured
 */
export function isProviderConfigured(provider: AIProvider): boolean {
  return !!LLMClientFactory.getApiKeyFromEnv(provider);
}

/**
 * Get all configured providers
 */
export function getConfiguredProviders(): AIProvider[] {
  return getAvailableProviders().filter(isProviderConfigured);
}
