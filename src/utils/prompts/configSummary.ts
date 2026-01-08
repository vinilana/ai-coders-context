import { colors, typography, symbols } from '../theme';
import type { TranslateFn } from '../i18n';
import type { ConfigSummary } from './types';

/**
 * Displays a configuration summary before execution
 */
export function displayConfigSummary(summary: ConfigSummary, t: TranslateFn): void {
  console.log('');
  console.log(typography.separator());
  console.log(typography.header(t('prompts.summary.title')));
  console.log('');

  // Operation type
  const operationLabels: Record<string, string> = {
    fill: t('prompts.main.choice.fill'),
    plan: t('prompts.main.choice.plan'),
    sync: t('prompts.main.choice.syncAgents')
  };
  console.log(typography.labeledValue(t('ui.projectConfiguration.mode'), operationLabels[summary.operation] || summary.operation));

  // Paths
  if (summary.repoPath) {
    console.log(typography.labeledValue(t('ui.projectConfiguration.repository'), summary.repoPath));
  }
  if (summary.outputDir) {
    console.log(typography.labeledValue(t('ui.projectConfiguration.output'), summary.outputDir));
  }

  // LLM configuration
  if (summary.provider) {
    console.log('');
    console.log(colors.secondary('  LLM:'));
    console.log(typography.labeledValue('    Provider', summary.provider));
    if (summary.model) {
      console.log(typography.labeledValue('    Model', summary.model));
    }
    if (summary.apiKeySource) {
      const keyStatus =
        summary.apiKeySource === 'env'
          ? colors.success(`${symbols.success} ${t('prompts.llm.autoDetected')}`)
          : summary.apiKeySource === 'provided'
            ? colors.success(`${symbols.success} Provided`)
            : colors.warning(`${symbols.warning} Not configured`);
      console.log(`    ${colors.secondary('API Key'.padEnd(12))} ${keyStatus}`);
    }
  }

  // Additional options
  if (summary.options && Object.keys(summary.options).length > 0) {
    console.log('');
    console.log(colors.secondary('  Options:'));
    for (const [key, value] of Object.entries(summary.options)) {
      const displayValue =
        typeof value === 'boolean'
          ? value
            ? colors.success('Yes')
            : colors.secondaryDim('No')
          : Array.isArray(value)
            ? value.join(', ')
            : String(value);
      console.log(`    ${colors.secondaryDim(key.padEnd(12))} ${displayValue}`);
    }
  }

  console.log('');
  console.log(typography.separator());
  console.log('');
}
