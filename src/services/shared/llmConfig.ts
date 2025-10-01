import type { TranslateFn } from '../../utils/i18n';
import type { LLMConfig } from '../../types';
import { LLMClientFactory } from '../llmClientFactory';

export interface ResolvedLlmConfig {
  provider: LLMConfig['provider'];
  model: string;
  apiKey: string;
  baseUrl?: string;
}

export interface ResolveLlmConfigOptions {
  rawOptions: {
    provider?: LLMConfig['provider'];
    model?: string;
    apiKey?: string;
    baseUrl?: string;
  };
  fallbackModel: string;
  t: TranslateFn;
  factory?: typeof LLMClientFactory;
}

export async function resolveLlmConfig({
  rawOptions,
  fallbackModel,
  t,
  factory = LLMClientFactory
}: ResolveLlmConfigOptions): Promise<ResolvedLlmConfig> {
  const envVars = factory.getEnvironmentVariables();
  const provider: LLMConfig['provider'] = 'openrouter';

  // Get API key from options or environment
  let apiKey = rawOptions.apiKey;
  if (!apiKey) {
    for (const envVar of envVars) {
      const value = process.env[envVar];
      if (value) {
        apiKey = value;
        break;
      }
    }
  }

  // Get model from options, environment, or defaults
  let model = rawOptions.model;
  if (!model) {
    model = process.env.OPENROUTER_MODEL || factory.getDefaultModel() || fallbackModel;
  }

  // Validate API key exists
  if (!apiKey) {
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
