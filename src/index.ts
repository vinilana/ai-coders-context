#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as dotenv from 'dotenv';
import inquirer from 'inquirer';

import { colors } from './utils/theme';
import { PlanGenerator } from './generators/plans/planGenerator';
import { CLIInterface } from './utils/cliUI';
import { checkForUpdates } from './utils/versionChecker';
import { createTranslator, detectLocale, SUPPORTED_LOCALES, normalizeLocale } from './utils/i18n';
import type { TranslateFn, Locale, TranslationKey } from './utils/i18n';
import { LLMConfig, AIProvider } from './types';
import { InitService } from './services/init/initService';
import { FillService } from './services/fill/fillService';
import { PlanService } from './services/plan/planService';
import { SyncService } from './services/sync/syncService';
import { DEFAULT_MODELS } from './services/ai/providerFactory';
import {
  detectSmartDefaults,
  promptInteractiveMode,
  promptLLMConfig,
  promptAnalysisOptions,
  promptConfirmProceed,
  displayConfigSummary,
  type ConfigSummary
} from './utils/prompts';

dotenv.config();

const initialLocale = detectLocale(process.argv.slice(2), process.env.AI_CONTEXT_LANG);
let currentLocale: Locale = initialLocale;
let translateFn = createTranslator(initialLocale);
const t: TranslateFn = (key, params) => translateFn(key, params);

const localeLabelKeys: Record<Locale, TranslationKey> = {
  en: 'prompts.language.option.en',
  'pt-BR': 'prompts.language.option.pt-BR'
};

const program = new Command();
const ui = new CLIInterface(t);
const VERSION = '0.4.0';
const PACKAGE_NAME = '@ai-coders/context';
const DEFAULT_MODEL = 'x-ai/grok-4-fast';

const initService = new InitService({
  ui,
  t,
  version: VERSION
});

const fillService = new FillService({
  ui,
  t,
  version: VERSION,
  defaultModel: DEFAULT_MODEL
});

const planService = new PlanService({
  ui,
  t,
  version: VERSION,
  defaultModel: DEFAULT_MODEL
});

const syncService = new SyncService({
  ui,
  t,
  version: VERSION
});

program
  .name('ai-context')
  .description(t('cli.description'))
  .version(VERSION);

program.option('-l, --lang <locale>', t('global.options.lang'), initialLocale);

let versionCheckPromise: Promise<void> | null = null;

function scheduleVersionCheck(force: boolean = false): Promise<void> {
  if (!versionCheckPromise || force) {
    versionCheckPromise = checkForUpdates({
      packageName: PACKAGE_NAME,
      currentVersion: VERSION,
      ui,
      t,
      force
    }).catch(() => {});
  }

  return versionCheckPromise;
}

program.hook('preAction', () => {
  void scheduleVersionCheck();
});

program
  .command('init')
  .description(t('commands.init.description'))
  .argument('<repo-path>', t('commands.init.arguments.repoPath'))
  .argument('[type]', t('commands.init.arguments.type'), 'both')
  .option('-o, --output <dir>', t('commands.init.options.output'), './.context')
  .option('--exclude <patterns...>', t('commands.init.options.exclude'))
  .option('--include <patterns...>', t('commands.init.options.include'))
  .option('-v, --verbose', t('commands.init.options.verbose'))
  .option('--no-semantic', t('commands.init.options.noSemantic'))
  .action(async (repoPath: string, type: string, options: any) => {
    try {
      await initService.run(repoPath, type, options);
    } catch (error) {
      ui.displayError(t('errors.init.scaffoldFailed'), error as Error);
      process.exit(1);
    }
  });

program
  .command('fill')
  .description(t('commands.fill.description'))
  .argument('<repo-path>', t('commands.fill.arguments.repoPath'))
  .option('-o, --output <dir>', t('commands.fill.options.output'), './.context')
  .option('-k, --api-key <key>', t('commands.fill.options.apiKey'))
  .option('-m, --model <model>', t('commands.fill.options.model'), DEFAULT_MODEL)
  .option('-p, --provider <provider>', t('commands.fill.options.provider'))
  .option('--base-url <url>', t('commands.fill.options.baseUrl'))
  .option('--prompt <file>', t('commands.fill.options.prompt'))
  .option('--limit <number>', t('commands.fill.options.limit'), (value: string) => parseInt(value, 10))
  .option('--exclude <patterns...>', t('commands.fill.options.exclude'))
  .option('--include <patterns...>', t('commands.fill.options.include'))
  .option('-v, --verbose', t('commands.fill.options.verbose'))
  .option('--no-semantic', t('commands.fill.options.noSemantic'))
  .option('--languages <langs>', t('commands.fill.options.languages'))
  .option('--use-lsp', t('commands.fill.options.useLsp'))
  .action(async (repoPath: string, options: any) => {
    try {
      await fillService.run(repoPath, options);
    } catch (error) {
      ui.displayError(t('errors.fill.failed'), error as Error);
      process.exit(1);
    }
  });

program
  .command('plan')
  .description(t('commands.plan.description'))
  .argument('<plan-name>', t('commands.plan.arguments.planName'))
  .option('-o, --output <dir>', t('commands.plan.options.output'), './.context')
  .option('--title <title>', t('commands.plan.options.title'))
  .option('--summary <text>', t('commands.plan.options.summary'))
  .option('-f, --force', t('commands.plan.options.force'))
  .option('--fill', t('commands.plan.options.fill'))
  .option('-r, --repo <path>', t('commands.plan.options.repo'))
  .option('-k, --api-key <key>', t('commands.plan.options.apiKey'))
  .option('-m, --model <model>', t('commands.plan.options.model'), DEFAULT_MODEL)
  .option('-p, --provider <provider>', t('commands.plan.options.provider'))
  .option('--base-url <url>', t('commands.plan.options.baseUrl'))
  .option('--prompt <file>', t('commands.plan.options.prompt'))
  .option('--dry-run', t('commands.plan.options.dryRun'), false)
  .option('--include <patterns...>', t('commands.plan.options.include'))
  .option('--exclude <patterns...>', t('commands.plan.options.exclude'))
  .option('-v, --verbose', t('commands.plan.options.verbose'))
  .option('--no-semantic', t('commands.plan.options.noSemantic'))
  .option('--no-lsp', t('commands.plan.options.noLsp'))
  .action(async (planName: string, rawOptions: any) => {
    const outputDir = path.resolve(rawOptions.output || './.context');

    if (rawOptions.fill) {
      try {
        await planService.scaffoldPlanIfNeeded(planName, outputDir, {
          title: rawOptions.title,
          summary: rawOptions.summary,
          force: Boolean(rawOptions.force),
          verbose: Boolean(rawOptions.verbose)
        });

        await planService.fillPlan(planName, { ...rawOptions, output: outputDir });
      } catch (error) {
        ui.displayError(t('errors.plan.fillFailed'), error as Error);
        process.exit(1);
      }
      return;
    }

    const generator = new PlanGenerator();

    ui.startSpinner(t('spinner.plan.creating'));

    try {
      const result = await generator.generatePlan({
        planName,
        outputDir,
        title: rawOptions.title,
        summary: rawOptions.summary,
        force: Boolean(rawOptions.force),
        verbose: Boolean(rawOptions.verbose),
        semantic: rawOptions.semantic !== false,
        projectPath: rawOptions.repo ? path.resolve(rawOptions.repo) : path.resolve(rawOptions.output || './.context', '..')
      });

      ui.updateSpinner(t('spinner.plan.created'), 'success');
      ui.displaySuccess(t('success.plan.createdAt', { path: colors.accent(result.relativePath) }));
    } catch (error) {
      ui.updateSpinner(t('spinner.plan.creationFailed'), 'fail');
      ui.displayError(t('errors.plan.creationFailed'), error as Error);
      process.exit(1);
    } finally {
      ui.stopSpinner();
    }
  });

program
  .command('sync-agents')
  .description(t('commands.sync.description'))
  .option('-s, --source <dir>', t('commands.sync.options.source'), './.context/agents')
  .option('-t, --target <paths...>', t('commands.sync.options.target'))
  .option('-m, --mode <type>', t('commands.sync.options.mode'), 'symlink')
  .option('-p, --preset <name>', t('commands.sync.options.preset'))
  .option('--force', t('commands.sync.options.force'))
  .option('--dry-run', t('commands.sync.options.dryRun'))
  .option('-v, --verbose', t('commands.sync.options.verbose'))
  .action(async (options: any) => {
    try {
      await syncService.run(options);
    } catch (error) {
      ui.displayError(t('errors.sync.failed'), error as Error);
      process.exit(1);
    }
  });

export async function runInit(repoPath: string, type: string, rawOptions: any): Promise<void> {
  await initService.run(repoPath, type, rawOptions);
}

export async function runGenerate(repoPath: string, options: any): Promise<void> {
  const type = options?.docsOnly ? 'docs' : options?.agentsOnly ? 'agents' : (options?.type || 'both');

  await initService.run(repoPath, type, {
    output: options?.output ?? options?.outputDir ?? './.context',
    include: options?.include,
    exclude: options?.exclude,
    verbose: options?.verbose,
    docsOnly: options?.docsOnly,
    agentsOnly: options?.agentsOnly
  });
}

export async function runAnalyze(..._args: unknown[]): Promise<void> {
  throw new Error(t('errors.commands.analyzeRemoved'));
}

export async function runUpdate(..._args: unknown[]): Promise<void> {
  throw new Error(t('errors.commands.updateRemoved'));
}

export async function runPreview(..._args: unknown[]): Promise<void> {
  throw new Error(t('errors.commands.previewRemoved'));
}

export async function runGuidelines(..._args: unknown[]): Promise<void> {
  throw new Error(t('errors.commands.guidelinesRemoved'));
}

export async function runLlmFill(repoPath: string, rawOptions: any): Promise<void> {
  await fillService.run(repoPath, rawOptions);
}

async function selectLocale(showWelcome: boolean): Promise<void> {
  const { locale } = await inquirer.prompt<{ locale: Locale }>([
    {
      type: 'list',
      name: 'locale',
      message: t('prompts.language.select'),
      default: currentLocale,
      choices: SUPPORTED_LOCALES.map(option => ({
        value: option,
        name: t(localeLabelKeys[option])
      }))
    }
  ]);

  const normalizedLocale = normalizeLocale(locale);
  currentLocale = normalizedLocale;
  translateFn = createTranslator(normalizedLocale);

  if (showWelcome) {
    ui.displayWelcome(VERSION);
  }
}

type InteractiveAction = 'scaffold' | 'fill' | 'plan' | 'syncAgents' | 'changeLanguage' | 'exit';

async function runInteractive(): Promise<void> {
  await selectLocale(true);

  let exitRequested = false;
  while (!exitRequested) {
    const { action } = await inquirer.prompt<{ action: InteractiveAction }>([
      {
        type: 'list',
        name: 'action',
        message: t('prompts.main.action'),
        choices: [
          { name: t('prompts.main.choice.scaffold'), value: 'scaffold' },
          { name: t('prompts.main.choice.fill'), value: 'fill' },
          { name: t('prompts.main.choice.plan'), value: 'plan' },
          { name: t('prompts.main.choice.syncAgents'), value: 'syncAgents' },
          { name: t('prompts.main.choice.changeLanguage'), value: 'changeLanguage' },
          { name: t('prompts.main.choice.exit'), value: 'exit' }
        ]
      }
    ]);

    if (action === 'changeLanguage') {
      await selectLocale(true);
      continue;
    }

    if (action === 'exit') {
      exitRequested = true;
      break;
    }

    if (action === 'scaffold') {
      await runInteractiveScaffold();
    } else if (action === 'fill') {
      await runInteractiveLlmFill();
    } else if (action === 'plan') {
      await runInteractivePlan();
    } else if (action === 'syncAgents') {
      await runInteractiveSync();
    }

    ui.displayInfo(
      t('info.interactive.returning.title'),
      t('info.interactive.returning.detail')
    );
  }

  ui.displaySuccess(t('success.interactive.goodbye'));
}

async function runInteractiveScaffold(): Promise<void> {
  const { repoPath } = await inquirer.prompt<{ repoPath: string }>([
    {
      type: 'input',
      name: 'repoPath',
      message: t('prompts.scaffold.repoPath'),
      default: process.cwd()
    }
  ]);

  const resolvedRepo = path.resolve(repoPath.trim() || '.');
  const defaultOutput = path.resolve(resolvedRepo, '.context');

  const { outputDir } = await inquirer.prompt<{ outputDir: string }>([
    {
      type: 'input',
      name: 'outputDir',
      message: t('commands.init.options.output'),
      default: defaultOutput
    }
  ]);

  const { scaffoldType } = await inquirer.prompt<{ scaffoldType: 'both' | 'docs' | 'agents' }>([
    {
      type: 'list',
      name: 'scaffoldType',
      message: t('prompts.scaffold.type'),
      choices: [
        { name: t('prompts.scaffold.typeBoth'), value: 'both' },
        { name: t('prompts.scaffold.typeDocs'), value: 'docs' },
        { name: t('prompts.scaffold.typeAgents'), value: 'agents' }
      ],
      default: 'both'
    }
  ]);

  const { verbose } = await inquirer.prompt<{ verbose: boolean }>([
    {
      type: 'confirm',
      name: 'verbose',
      message: t('prompts.common.verbose'),
      default: false
    }
  ]);

  await runInit(resolvedRepo, scaffoldType, {
    output: outputDir,
    verbose,
    semantic: true
  });
}

async function runInteractiveLlmFill(): Promise<void> {
  const defaults = await detectSmartDefaults();
  const interactiveMode = await promptInteractiveMode(t);

  if (interactiveMode === 'quick') {
    // Quick mode: minimal prompts with smart defaults
    const { confirmRepo } = await inquirer.prompt<{ confirmRepo: boolean }>([
      {
        type: 'confirm',
        name: 'confirmRepo',
        message: `${t('prompts.quick.confirmRepo')} (${defaults.repoPath})`,
        default: true
      }
    ]);

    const resolvedRepo = confirmRepo ? defaults.repoPath : (await inquirer.prompt<{ repoPath: string }>([
      { type: 'input', name: 'repoPath', message: t('prompts.fill.repoPath'), default: defaults.repoPath }
    ])).repoPath;

    // Get LLM config (auto-detected or prompt for API key)
    const llmConfig = await promptLLMConfig(t, { defaultModel: DEFAULT_MODEL, skipIfConfigured: true });

    // Build summary
    const summary: ConfigSummary = {
      operation: 'fill',
      repoPath: resolvedRepo,
      outputDir: defaults.outputDir,
      provider: llmConfig.provider,
      model: llmConfig.model,
      apiKeySource: llmConfig.autoDetected ? 'env' : llmConfig.apiKey ? 'provided' : 'none',
      options: {
        Semantic: true,
        Languages: defaults.detectedLanguages.join(', '),
        LSP: false
      }
    };

    displayConfigSummary(summary, t);
    const proceed = await promptConfirmProceed(t);

    if (proceed) {
      await fillService.run(resolvedRepo, {
        output: defaults.outputDir,
        model: llmConfig.model,
        provider: llmConfig.provider,
        apiKey: llmConfig.apiKey,
        verbose: false,
        semantic: true,
        languages: defaults.detectedLanguages,
        useLsp: false
      });
    }
    return;
  }

  // Advanced mode: full configuration
  const { repoPath } = await inquirer.prompt<{ repoPath: string }>([
    {
      type: 'input',
      name: 'repoPath',
      message: t('prompts.fill.repoPath'),
      default: defaults.repoPath
    }
  ]);

  const resolvedRepo = path.resolve(repoPath.trim() || '.');
  const defaultOutput = path.resolve(resolvedRepo, '.context');

  const { outputDir, promptPath: promptPathInput } = await inquirer.prompt<{ outputDir: string; promptPath: string }>([
    {
      type: 'input',
      name: 'outputDir',
      message: t('commands.fill.options.output'),
      default: defaultOutput
    },
    {
      type: 'input',
      name: 'promptPath',
      message: t('prompts.fill.promptPath'),
      default: ''
    }
  ]);

  const promptPath = promptPathInput.trim() ? path.resolve(promptPathInput.trim()) : undefined;

  const { limit } = await inquirer.prompt<{ limit: string }>([
    {
      type: 'input',
      name: 'limit',
      message: t('prompts.fill.limit'),
      filter: (value: string) => value.trim()
    }
  ]);
  const limitValue = limit ? parseInt(limit, 10) : undefined;
  const parsedLimit = Number.isNaN(limitValue) ? undefined : limitValue;

  // Use shared LLM prompt helper
  const llmConfig = await promptLLMConfig(t, { defaultModel: DEFAULT_MODEL, skipIfConfigured: false });

  // Use shared analysis options prompt
  const analysisOptions = await promptAnalysisOptions(t, {
    languages: defaults.detectedLanguages,
    useLsp: false
  });

  // Show summary before execution
  const summary: ConfigSummary = {
    operation: 'fill',
    repoPath: resolvedRepo,
    outputDir,
    provider: llmConfig.provider,
    model: llmConfig.model,
    apiKeySource: llmConfig.autoDetected ? 'env' : llmConfig.apiKey ? 'provided' : 'none',
    options: {
      Semantic: analysisOptions.semantic,
      Languages: analysisOptions.languages?.join(', ') || 'none',
      LSP: analysisOptions.useLsp,
      Verbose: analysisOptions.verbose,
      ...(parsedLimit ? { Limit: String(parsedLimit) } : {})
    }
  };

  displayConfigSummary(summary, t);
  const proceed = await promptConfirmProceed(t);

  if (proceed) {
    await fillService.run(resolvedRepo, {
      output: outputDir,
      prompt: promptPath,
      limit: parsedLimit,
      model: llmConfig.model,
      provider: llmConfig.provider,
      apiKey: llmConfig.apiKey,
      verbose: analysisOptions.verbose,
      semantic: analysisOptions.semantic,
      languages: analysisOptions.languages,
      useLsp: analysisOptions.useLsp
    });
  }
}

async function runInteractivePlan(): Promise<void> {
  const defaults = await detectSmartDefaults();

  // Always ask for plan name first
  const { planName } = await inquirer.prompt<{ planName: string }>([
    {
      type: 'input',
      name: 'planName',
      message: t('prompts.plan.name'),
      default: 'new-plan'
    }
  ]);

  const interactiveMode = await promptInteractiveMode(t);

  if (interactiveMode === 'quick') {
    // Quick mode: choose scaffold or fill with defaults
    const { action } = await inquirer.prompt<{ action: 'scaffold' | 'fill' }>([
      {
        type: 'list',
        name: 'action',
        message: t('prompts.plan.mode'),
        choices: [
          { name: t('prompts.plan.modeScaffold'), value: 'scaffold' },
          { name: t('prompts.plan.modeFill'), value: 'fill' }
        ],
        default: 'scaffold'
      }
    ]);

    if (action === 'scaffold') {
      // Quick scaffold: just create the template
      const generator = new PlanGenerator();
      ui.startSpinner(t('spinner.plan.creating'));

      try {
        const result = await generator.generatePlan({
          planName,
          outputDir: defaults.outputDir,
          verbose: false,
          semantic: true,
          projectPath: defaults.repoPath
        });

        ui.updateSpinner(t('spinner.plan.created'), 'success');
        ui.displaySuccess(t('success.plan.createdAt', { path: colors.accent(result.relativePath) }));
      } catch (error) {
        ui.updateSpinner(t('spinner.plan.creationFailed'), 'fail');
        ui.displayError(t('errors.plan.creationFailed'), error as Error);
      } finally {
        ui.stopSpinner();
      }
      return;
    }

    // Quick fill: use auto-detected LLM config
    const llmConfig = await promptLLMConfig(t, { defaultModel: DEFAULT_MODEL, skipIfConfigured: true });

    const summary: ConfigSummary = {
      operation: 'plan',
      repoPath: defaults.repoPath,
      outputDir: defaults.outputDir,
      provider: llmConfig.provider,
      model: llmConfig.model,
      apiKeySource: llmConfig.autoDetected ? 'env' : llmConfig.apiKey ? 'provided' : 'none',
      options: {
        'Plan Name': planName,
        LSP: true,
        'Dry Run': false
      }
    };

    displayConfigSummary(summary, t);
    const proceed = await promptConfirmProceed(t);

    if (proceed) {
      try {
        await planService.scaffoldPlanIfNeeded(planName, defaults.outputDir, {});
        await planService.fillPlan(planName, {
          output: defaults.outputDir,
          repo: defaults.repoPath,
          dryRun: false,
          provider: llmConfig.provider,
          model: llmConfig.model,
          apiKey: llmConfig.apiKey,
          lsp: true
        });
      } catch (error) {
        ui.displayError(t('errors.plan.fillFailed'), error as Error);
      }
    }
    return;
  }

  // Advanced mode: full configuration
  const defaultOutput = path.resolve(process.cwd(), '.context');
  const { mode } = await inquirer.prompt<{ mode: 'scaffold' | 'fill' }>([
    {
      type: 'list',
      name: 'mode',
      message: t('prompts.plan.mode'),
      choices: [
        { name: t('prompts.plan.modeScaffold'), value: 'scaffold' },
        { name: t('prompts.plan.modeFill'), value: 'fill' }
      ],
      default: 'scaffold'
    }
  ]);

  const { outputDir } = await inquirer.prompt<{ outputDir: string }>([
    {
      type: 'input',
      name: 'outputDir',
      message: t('commands.plan.options.output'),
      default: defaultOutput
    }
  ]);

  if (mode === 'fill') {
    const { summary } = await inquirer.prompt<{ summary: string }>([
      {
        type: 'input',
        name: 'summary',
        message: t('prompts.plan.summary'),
        filter: (value: string) => value.trim()
      }
    ]);

    const { repoPath } = await inquirer.prompt<{ repoPath: string }>([
      {
        type: 'input',
        name: 'repoPath',
        message: t('prompts.plan.repoPath'),
        default: process.cwd()
      }
    ]);

    // Use shared LLM prompt helper
    const llmConfig = await promptLLMConfig(t, { defaultModel: DEFAULT_MODEL, skipIfConfigured: false });

    const { dryRun } = await inquirer.prompt<{ dryRun: boolean }>([
      {
        type: 'confirm',
        name: 'dryRun',
        message: t('prompts.plan.dryRun'),
        default: true
      }
    ]);

    const { useLsp } = await inquirer.prompt<{ useLsp: boolean }>([
      {
        type: 'confirm',
        name: 'useLsp',
        message: t('prompts.plan.useLsp'),
        default: true
      }
    ]);

    // Show summary before execution
    const configSummary: ConfigSummary = {
      operation: 'plan',
      repoPath,
      outputDir,
      provider: llmConfig.provider,
      model: llmConfig.model,
      apiKeySource: llmConfig.autoDetected ? 'env' : llmConfig.apiKey ? 'provided' : 'none',
      options: {
        'Plan Name': planName,
        LSP: useLsp,
        'Dry Run': dryRun
      }
    };

    displayConfigSummary(configSummary, t);
    const proceed = await promptConfirmProceed(t);

    if (proceed) {
      try {
        const resolvedOutput = path.resolve(outputDir.trim() || defaultOutput);
        await planService.scaffoldPlanIfNeeded(planName, resolvedOutput, {
          summary: summary || undefined
        });

        await planService.fillPlan(planName, {
          output: resolvedOutput,
          repo: repoPath,
          dryRun,
          provider: llmConfig.provider,
          model: llmConfig.model,
          apiKey: llmConfig.apiKey,
          lsp: useLsp
        });
      } catch (error) {
        ui.displayError(t('errors.plan.fillFailed'), error as Error);
      }
    }
    return;
  }

  // Scaffold mode
  const { summary } = await inquirer.prompt<{ summary: string }>([
    {
      type: 'input',
      name: 'summary',
      message: t('prompts.plan.summary'),
      filter: (value: string) => value.trim()
    }
  ]);

  const generator = new PlanGenerator();
  ui.startSpinner(t('spinner.plan.creating'));

  try {
    const result = await generator.generatePlan({
      planName,
      outputDir: path.resolve(outputDir.trim() || defaultOutput),
      summary: summary || undefined,
      verbose: false,
      semantic: true,
      projectPath: path.resolve(outputDir.trim() || defaultOutput, '..')
    });

    ui.updateSpinner(t('spinner.plan.created'), 'success');
    ui.displaySuccess(t('success.plan.createdAt', { path: colors.accent(result.relativePath) }));
  } catch (error) {
    ui.updateSpinner(t('spinner.plan.creationFailed'), 'fail');
    ui.displayError(t('errors.plan.creationFailed'), error as Error);
  } finally {
    ui.stopSpinner();
  }
}

async function runInteractiveSync(): Promise<void> {
  const defaults = await detectSmartDefaults();
  const defaultSource = path.resolve(defaults.repoPath, '.context/agents');

  // Simplified: single prompt for target selection with common presets
  const { quickTarget } = await inquirer.prompt<{ quickTarget: string }>([
    {
      type: 'list',
      name: 'quickTarget',
      message: t('prompts.sync.quickTarget'),
      choices: [
        { name: t('prompts.sync.quickTarget.common'), value: 'common' },
        { name: t('prompts.sync.quickTarget.claude'), value: 'claude' },
        { name: t('prompts.sync.quickTarget.all'), value: 'all' },
        { name: t('prompts.sync.quickTarget.custom'), value: 'custom' }
      ],
      default: 'common'
    }
  ]);

  let preset: string | undefined;
  let target: string[] | undefined;
  let sourcePath = defaultSource;

  if (quickTarget === 'custom') {
    // Custom path: ask for source and target
    const answers = await inquirer.prompt<{ sourcePath: string; customPath: string }>([
      {
        type: 'input',
        name: 'sourcePath',
        message: t('prompts.sync.source'),
        default: defaultSource
      },
      {
        type: 'input',
        name: 'customPath',
        message: t('prompts.sync.customPath')
      }
    ]);
    sourcePath = answers.sourcePath;
    target = [answers.customPath];
  } else if (quickTarget === 'common') {
    // Common: Claude + GitHub
    preset = 'all';
    // For 'common', we'll sync to claude and github only
    target = [
      path.resolve(defaults.repoPath, '.claude/agents'),
      path.resolve(defaults.repoPath, '.github/agents')
    ];
    preset = undefined; // Use target instead
  } else {
    preset = quickTarget;
  }

  // Show summary
  const summary: ConfigSummary = {
    operation: 'sync',
    repoPath: sourcePath,
    options: {
      Target: quickTarget === 'custom' ? (target?.[0] || 'custom') : quickTarget,
      Mode: 'symlink'
    }
  };

  displayConfigSummary(summary, t);
  const proceed = await promptConfirmProceed(t);

  if (proceed) {
    try {
      await syncService.run({
        source: sourcePath,
        mode: 'symlink',
        preset: preset as any,
        target,
        force: false,
        dryRun: false
      });
    } catch (error) {
      ui.displayError(t('errors.sync.failed'), error as Error);
    }
  }
}

function filterOutLocaleArgs(args: string[]): string[] {
  const filtered: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (current === '--lang' || current === '--language' || current === '-l') {
      index += 1;
      continue;
    }
    if (current.startsWith('--lang=') || current.startsWith('--language=')) {
      continue;
    }
    filtered.push(current);
  }
  return filtered;
}

async function main(): Promise<void> {
  const userArgs = process.argv.slice(2);
  void scheduleVersionCheck();
  const meaningfulArgs = filterOutLocaleArgs(userArgs);
  if (meaningfulArgs.length === 0) {
    await runInteractive();
    return;
  }

  await program.parseAsync(process.argv);
}

/**
 * Check if an error is from user interrupt (Ctrl+C)
 */
function isUserInterrupt(error: unknown): boolean {
  if (error instanceof Error) {
    // Inquirer's ExitPromptError when user presses Ctrl+C
    if (error.name === 'ExitPromptError') return true;
    // Check message patterns
    if (error.message.includes('force closed')) return true;
    if (error.message.includes('User force closed')) return true;
  }
  return false;
}

/**
 * Handle graceful exit
 */
function handleGracefulExit(): void {
  console.log('');
  ui.displaySuccess(t('success.interactive.goodbye'));
  process.exit(0);
}

// Handle SIGINT (Ctrl+C) at process level
process.on('SIGINT', () => {
  handleGracefulExit();
});

if (require.main === module) {
  main().catch(error => {
    if (isUserInterrupt(error)) {
      handleGracefulExit();
    } else {
      ui.displayError(t('errors.cli.executionFailed'), error as Error);
      process.exit(1);
    }
  });
}
