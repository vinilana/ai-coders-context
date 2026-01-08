import inquirer from 'inquirer';
import type { TranslateFn } from '../i18n';
import type { InteractiveMode, AnalysisOptions } from './types';

// Re-export types
export * from './types';

// Re-export modules
export { detectSmartDefaults, getConfiguredProviders, hasAnyProviderConfigured } from './smartDefaults';
export { promptLLMConfig } from './llmPrompts';
export { displayConfigSummary } from './configSummary';

/**
 * Prompts user to choose between quick and advanced mode
 */
export async function promptInteractiveMode(t: TranslateFn): Promise<InteractiveMode> {
  const { mode } = await inquirer.prompt<{ mode: InteractiveMode }>([
    {
      type: 'list',
      name: 'mode',
      message: t('prompts.mode.select'),
      choices: [
        { name: t('prompts.mode.quick'), value: 'quick' },
        { name: t('prompts.mode.advanced'), value: 'advanced' }
      ],
      default: 'quick'
    }
  ]);
  return mode;
}

/**
 * Prompts for analysis options (semantic, languages, LSP)
 */
export async function promptAnalysisOptions(
  t: TranslateFn,
  defaults: { languages?: string[]; useLsp?: boolean } = {}
): Promise<AnalysisOptions> {
  const { useSemantic } = await inquirer.prompt<{ useSemantic: boolean }>([
    {
      type: 'confirm',
      name: 'useSemantic',
      message: t('prompts.fill.semantic'),
      default: true
    }
  ]);

  let languages: string[] | undefined;
  let useLsp = false;

  if (useSemantic) {
    const defaultLanguages = defaults.languages || ['typescript', 'javascript', 'python'];
    const { selectedLanguages } = await inquirer.prompt<{ selectedLanguages: string[] }>([
      {
        type: 'checkbox',
        name: 'selectedLanguages',
        message: t('prompts.fill.languages'),
        choices: [
          { name: 'TypeScript', value: 'typescript', checked: defaultLanguages.includes('typescript') },
          { name: 'JavaScript', value: 'javascript', checked: defaultLanguages.includes('javascript') },
          { name: 'Python', value: 'python', checked: defaultLanguages.includes('python') }
        ]
      }
    ]);
    languages = selectedLanguages.length > 0 ? selectedLanguages : undefined;

    const { enableLsp } = await inquirer.prompt<{ enableLsp: boolean }>([
      {
        type: 'confirm',
        name: 'enableLsp',
        message: t('prompts.fill.useLsp'),
        default: defaults.useLsp ?? false
      }
    ]);
    useLsp = enableLsp;
  }

  const { verbose } = await inquirer.prompt<{ verbose: boolean }>([
    {
      type: 'confirm',
      name: 'verbose',
      message: t('prompts.common.verbose'),
      default: false
    }
  ]);

  return {
    semantic: useSemantic,
    languages,
    useLsp,
    verbose
  };
}

/**
 * Prompts for confirmation before proceeding
 */
export async function promptConfirmProceed(t: TranslateFn): Promise<boolean> {
  const { proceed } = await inquirer.prompt<{ proceed: boolean }>([
    {
      type: 'confirm',
      name: 'proceed',
      message: t('prompts.summary.proceed'),
      default: true
    }
  ]);
  return proceed;
}
