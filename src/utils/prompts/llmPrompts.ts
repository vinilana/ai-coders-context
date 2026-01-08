import inquirer from 'inquirer';
import type { TranslateFn } from '../i18n';
import type { AIProvider } from '../../types';
import type { LLMPromptResult } from './types';
import { DEFAULT_MODELS, getApiKeyFromEnv, detectProviderFromEnv } from '../../services/ai/providerFactory';

/**
 * Prompts for LLM configuration (provider, model, API key)
 * Shared between fill and plan flows to eliminate duplication
 */
export async function promptLLMConfig(
  t: TranslateFn,
  options: {
    defaultModel?: string;
    skipIfConfigured?: boolean;
  } = {}
): Promise<LLMPromptResult> {
  const { defaultModel, skipIfConfigured = true } = options;

  // Check if provider is auto-detected from environment
  const detectedProvider = detectProviderFromEnv();
  const detectedApiKey = detectedProvider ? getApiKeyFromEnv(detectedProvider) : undefined;

  // If configured and skipIfConfigured is true, return auto-detected config
  if (skipIfConfigured && detectedProvider && detectedApiKey) {
    return {
      provider: detectedProvider,
      model: defaultModel || DEFAULT_MODELS[detectedProvider],
      apiKey: detectedApiKey,
      autoDetected: true
    };
  }

  // Ask if user wants to configure LLM
  const { specifyModel } = await inquirer.prompt<{ specifyModel: boolean }>([
    {
      type: 'confirm',
      name: 'specifyModel',
      message: t('prompts.fill.overrideModel'),
      default: false
    }
  ]);

  let provider: AIProvider = detectedProvider || 'openrouter';
  let model: string = defaultModel || DEFAULT_MODELS[provider];
  let apiKey: string | undefined = detectedApiKey;

  if (specifyModel) {
    // Provider selection
    const providerAnswer = await inquirer.prompt<{ provider: AIProvider }>([
      {
        type: 'list',
        name: 'provider',
        message: t('prompts.fill.provider'),
        choices: [
          { name: t('prompts.fill.provider.openrouter'), value: 'openrouter' },
          { name: t('prompts.fill.provider.openai'), value: 'openai' },
          { name: t('prompts.fill.provider.anthropic'), value: 'anthropic' },
          { name: t('prompts.fill.provider.google'), value: 'google' }
        ],
        default: provider
      }
    ]);
    provider = providerAnswer.provider;

    // Model input
    const modelAnswer = await inquirer.prompt<{ model: string }>([
      {
        type: 'input',
        name: 'model',
        message: t('prompts.fill.model'),
        default: DEFAULT_MODELS[provider]
      }
    ]);
    model = modelAnswer.model.trim();
  }

  // API key prompt if not configured
  if (!apiKey) {
    const { provideApiKey } = await inquirer.prompt<{ provideApiKey: boolean }>([
      {
        type: 'confirm',
        name: 'provideApiKey',
        message: t('prompts.fill.provideApiKey'),
        default: true
      }
    ]);

    if (provideApiKey) {
      const apiKeyAnswer = await inquirer.prompt<{ apiKey: string }>([
        {
          type: 'password',
          name: 'apiKey',
          message: t('prompts.fill.apiKey'),
          mask: '*'
        }
      ]);
      apiKey = apiKeyAnswer.apiKey.trim();
    }
  }

  return {
    provider,
    model,
    apiKey,
    autoDetected: false
  };
}
