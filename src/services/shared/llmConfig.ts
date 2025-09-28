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
  const providerEnvMap = factory.getEnvironmentVariables();
  const defaultModels = factory.getDefaultModels();

  let provider = rawOptions.provider;
  let model = rawOptions.model;
  let apiKey = rawOptions.apiKey;

  if (!apiKey) {
    if (provider) {
      for (const envVar of providerEnvMap[provider]) {
        const value = process.env[envVar];
        if (value) {
          apiKey = value;
          break;
        }
      }
    } else {
      outer: for (const [prov, envVars] of Object.entries(providerEnvMap)) {
        for (const envVar of envVars) {
          const value = process.env[envVar];
          if (value) {
            apiKey = value;
            provider = prov as LLMConfig['provider'];
            break outer;
          }
        }
      }
    }
  }

  if (!provider) {
    if (model) {
      provider = factory.detectProviderFromModel(model);
    } else if (apiKey) {
      provider = factory.getProviderFromApiKey(apiKey);
    }
  }

  if (!model) {
    if (provider === 'openrouter' && process.env.OPENROUTER_MODEL) {
      model = process.env.OPENROUTER_MODEL;
    } else if (provider && defaultModels[provider]?.length) {
      model = defaultModels[provider][0];
    } else {
      model = fallbackModel;
      provider = factory.detectProviderFromModel(model);
    }
  }

  if (!provider) {
    provider = factory.detectProviderFromModel(model || fallbackModel);
  }

  if (!apiKey) {
    for (const envVar of providerEnvMap[provider]) {
      const value = process.env[envVar];
      if (value) {
        apiKey = value;
        break;
      }
    }
  }

  if (!apiKey) {
    const envVars = providerEnvMap[provider];
    throw new Error(
      t('errors.fill.apiKeyMissing', {
        provider: provider.toUpperCase(),
        envVars: envVars.join(', ')
      })
    );
  }

  return {
    provider,
    model: model || fallbackModel,
    apiKey,
    baseUrl: rawOptions.baseUrl
  };
}
