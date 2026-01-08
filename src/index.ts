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
  const { repoPath } = await inquirer.prompt<{ repoPath: string }>([
    {
      type: 'input',
      name: 'repoPath',
      message: t('prompts.fill.repoPath'),
      default: process.cwd()
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

  const { specifyModel } = await inquirer.prompt<{ specifyModel: boolean }>([
    {
      type: 'confirm',
      name: 'specifyModel',
      message: t('prompts.fill.overrideModel'),
      default: false
    }
  ]);

  let provider: AIProvider | undefined;
  let model: string | undefined;
  if (specifyModel) {
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
        default: 'openrouter'
      }
    ]);
    provider = providerAnswer.provider;

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

  const { provideApiKey } = await inquirer.prompt<{ provideApiKey: boolean }>([
    {
      type: 'confirm',
      name: 'provideApiKey',
      message: t('prompts.fill.provideApiKey'),
      default: false
    }
  ]);

  let apiKey: string | undefined;
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

  const { verbose } = await inquirer.prompt<{ verbose: boolean }>([
    {
      type: 'confirm',
      name: 'verbose',
      message: t('prompts.common.verbose'),
      default: false
    }
  ]);

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
    const { selectedLanguages } = await inquirer.prompt<{ selectedLanguages: string[] }>([
      {
        type: 'checkbox',
        name: 'selectedLanguages',
        message: t('prompts.fill.languages'),
        choices: [
          { name: 'TypeScript', value: 'typescript', checked: true },
          { name: 'JavaScript', value: 'javascript', checked: true },
          { name: 'Python', value: 'python', checked: true }
        ]
      }
    ]);
    languages = selectedLanguages.length > 0 ? selectedLanguages : undefined;

    const { enableLsp } = await inquirer.prompt<{ enableLsp: boolean }>([
      {
        type: 'confirm',
        name: 'enableLsp',
        message: t('prompts.fill.useLsp'),
        default: false
      }
    ]);
    useLsp = enableLsp;
  }

  await fillService.run(resolvedRepo, {
    output: outputDir,
    prompt: promptPath,
    limit: parsedLimit,
    model,
    provider,
    apiKey,
    verbose,
    semantic: useSemantic,
    languages,
    useLsp
  });
}

async function runInteractivePlan(): Promise<void> {
  const { planName } = await inquirer.prompt<{ planName: string }>([
    {
      type: 'input',
      name: 'planName',
      message: t('prompts.plan.name'),
      default: 'new-plan'
    }
  ]);

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

    const { specifyModel } = await inquirer.prompt<{ specifyModel: boolean }>([
      {
        type: 'confirm',
        name: 'specifyModel',
        message: t('prompts.fill.overrideModel'),
        default: false
      }
    ]);

    let provider: AIProvider | undefined;
    let model: string | undefined;
    let apiKey: string | undefined;

    if (specifyModel) {
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
          default: 'openrouter'
        }
      ]);
      provider = providerAnswer.provider;

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

    const { provideApiKey } = await inquirer.prompt<{ provideApiKey: boolean }>([
      {
        type: 'confirm',
        name: 'provideApiKey',
        message: t('prompts.fill.provideApiKey'),
        default: false
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

    try {
      const resolvedOutput = path.resolve(outputDir.trim() || defaultOutput);
      await planService.scaffoldPlanIfNeeded(planName, resolvedOutput, {
        summary: summary || undefined
      });

      await planService.fillPlan(planName, {
        output: resolvedOutput,
        repo: repoPath,
        dryRun,
        provider,
        model,
        apiKey,
        lsp: useLsp
      });
    } catch (error) {
      ui.displayError(t('errors.plan.fillFailed'), error as Error);
    }

    return;
  }

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
  const defaultSource = path.resolve(process.cwd(), '.context/agents');

  const { sourcePath } = await inquirer.prompt<{ sourcePath: string }>([
    {
      type: 'input',
      name: 'sourcePath',
      message: t('prompts.sync.source'),
      default: defaultSource
    }
  ]);

  const { mode } = await inquirer.prompt<{ mode: 'symlink' | 'markdown' }>([
    {
      type: 'list',
      name: 'mode',
      message: t('prompts.sync.mode'),
      choices: [
        { name: t('prompts.sync.modeSymlink'), value: 'symlink' },
        { name: t('prompts.sync.modeMarkdown'), value: 'markdown' }
      ],
      default: 'symlink'
    }
  ]);

  const { targetType } = await inquirer.prompt<{ targetType: 'preset' | 'custom' }>([
    {
      type: 'list',
      name: 'targetType',
      message: t('prompts.sync.targetType'),
      choices: [
        { name: t('prompts.sync.targetPreset'), value: 'preset' },
        { name: t('prompts.sync.targetCustom'), value: 'custom' }
      ]
    }
  ]);

  let preset: string | undefined;
  let target: string[] | undefined;

  if (targetType === 'preset') {
    const { selectedPreset } = await inquirer.prompt<{ selectedPreset: string }>([
      {
        type: 'list',
        name: 'selectedPreset',
        message: t('prompts.sync.selectPreset'),
        choices: [
          { name: t('prompts.sync.preset.claude'), value: 'claude' },
          { name: t('prompts.sync.preset.github'), value: 'github' },
          { name: t('prompts.sync.preset.cursor'), value: 'cursor' },
          { name: t('prompts.sync.preset.all'), value: 'all' }
        ]
      }
    ]);
    preset = selectedPreset;
  } else {
    const { customPath } = await inquirer.prompt<{ customPath: string }>([
      {
        type: 'input',
        name: 'customPath',
        message: t('prompts.sync.customPath')
      }
    ]);
    target = [customPath];
  }

  const { dryRun } = await inquirer.prompt<{ dryRun: boolean }>([
    {
      type: 'confirm',
      name: 'dryRun',
      message: t('prompts.sync.dryRun'),
      default: true
    }
  ]);

  const { force } = await inquirer.prompt<{ force: boolean }>([
    {
      type: 'confirm',
      name: 'force',
      message: t('prompts.sync.force'),
      default: false
    }
  ]);

  try {
    await syncService.run({
      source: sourcePath,
      mode,
      preset: preset as any,
      target,
      force,
      dryRun
    });
  } catch (error) {
    ui.displayError(t('errors.sync.failed'), error as Error);
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
