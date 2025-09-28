#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import inquirer from 'inquirer';

import { PlanGenerator } from './generators/plans/planGenerator';
import { CLIInterface } from './utils/cliUI';
import { checkForUpdates } from './utils/versionChecker';
import { createTranslator, detectLocale, SUPPORTED_LOCALES, normalizeLocale } from './utils/i18n';
import type { TranslateFn, Locale, TranslationKey } from './utils/i18n';
import { LLMConfig } from './types';
import { DOCUMENT_GUIDES } from './generators/documentation/guideRegistry';
import { AGENT_TYPES } from './generators/agents/agentTypes';
import { InitService } from './services/init/initService';
import { FillService } from './services/fill/fillService';
import { parseDocSelection, parseAgentSelection, determineScaffoldType } from './commands/shared/selection';
import { PlanService } from './services/plan/planService';

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
const VERSION = '0.3.1';
const PACKAGE_NAME = '@ai-coders/context';
const DEFAULT_MODEL = 'x-ai/grok-4-fast:free';

const DOC_CHOICES = DOCUMENT_GUIDES.map(guide => ({
  name: `${guide.title} (${guide.key})`,
  value: guide.key
}));

const AGENT_CHOICES = AGENT_TYPES.map(agent => ({
  name: formatAgentLabel(agent),
  value: agent
}));

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
  .option('--docs <keys...>', t('commands.init.options.docs'))
  .option('--agents <keys...>', t('commands.init.options.agents'))
  .option('--exclude <patterns...>', t('commands.init.options.exclude'))
  .option('--include <patterns...>', t('commands.init.options.include'))
  .option('-v, --verbose', t('commands.init.options.verbose'))
  .action(async (repoPath: string, type: string, options: any) => {
    try {
      await initService.run(repoPath, type, options);
    } catch (error) {
      ui.displayError(t('errors.init.scaffoldFailed'), error as Error);
      process.exit(1);
    }
  });

program
  .command('scaffold')
  .description(t('commands.scaffold.description'))
  .argument('<repo-path>', t('commands.init.arguments.repoPath'))
  .argument('[type]', t('commands.init.arguments.type'), 'both')
  .option('-o, --output <dir>', t('commands.init.options.output'), './.context')
  .option('--docs <keys...>', t('commands.init.options.docs'))
  .option('--agents <keys...>', t('commands.init.options.agents'))
  .option('--exclude <patterns...>', t('commands.init.options.exclude'))
  .option('--include <patterns...>', t('commands.init.options.include'))
  .option('-v, --verbose', t('commands.init.options.verbose'))
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
  .option('--dry-run', t('commands.fill.options.dryRun'), false)
  .option('--all', t('commands.fill.options.all'), false)
  .option('--limit <number>', t('commands.fill.options.limit'), (value: string) => parseInt(value, 10))
  .option('--docs <keys...>', t('commands.fill.options.docs'))
  .option('--agents <keys...>', t('commands.fill.options.agents'))
  .option('--exclude <patterns...>', t('commands.fill.options.exclude'))
  .option('--include <patterns...>', t('commands.fill.options.include'))
  .option('-v, --verbose', t('commands.fill.options.verbose'))
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
  .option('--agents <types...>', t('commands.plan.options.agents'))
  .option('--docs <keys...>', t('commands.plan.options.docs'))
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
  .action(async (planName: string, rawOptions: any) => {
    const agentSelection = parseAgentSelection(rawOptions.agents);
    if (agentSelection.invalid.length > 0) {
      ui.displayWarning(t('warnings.agents.unknown', { values: agentSelection.invalid.join(', ') }));
    }

    const docSelection = parseDocSelection(rawOptions.docs);
    if (docSelection.invalid.length > 0) {
      ui.displayWarning(t('warnings.docs.unknown', { values: docSelection.invalid.join(', ') }));
    }

    const outputDir = path.resolve(rawOptions.output || './.context');

    if (rawOptions.fill) {
      try {
        await planService.scaffoldPlanIfNeeded(planName, outputDir, {
          title: rawOptions.title,
          summary: rawOptions.summary,
          agentSelection,
          docSelection,
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
        selectedAgentTypes: agentSelection.explicitNone ? null : agentSelection.selected,
        selectedDocKeys: docSelection.explicitNone ? null : docSelection.selected,
        force: Boolean(rawOptions.force),
        verbose: Boolean(rawOptions.verbose)
      });

      ui.updateSpinner(t('spinner.plan.created'), 'success');
      ui.displaySuccess(t('success.plan.createdAt', { path: chalk.cyan(result.relativePath) }));
    } catch (error) {
      ui.updateSpinner(t('spinner.plan.creationFailed'), 'fail');
      ui.displayError(t('errors.plan.creationFailed'), error as Error);
      process.exit(1);
    } finally {
      ui.stopSpinner();
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
    docs: options?.docs,
    agents: options?.agents,
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

function formatAgentLabel(value: string): string {
  return value
    .split('-')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
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

type InteractiveAction = 'scaffold' | 'fill' | 'plan' | 'changeLanguage' | 'exit';

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
    } else {
      await runInteractivePlan();
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

  const { includeDocs } = await inquirer.prompt<{ includeDocs: boolean }>([
    {
      type: 'confirm',
      name: 'includeDocs',
      message: t('prompts.scaffold.includeDocs'),
      default: true
    }
  ]);

  let selectedDocs: string[] | undefined;
  if (includeDocs) {
    const { docs } = await inquirer.prompt<{ docs: string[] }>([
      {
        type: 'checkbox',
        name: 'docs',
        message: t('prompts.scaffold.selectDocs'),
        choices: DOC_CHOICES,
        default: DOC_CHOICES.map(choice => choice.value)
      }
    ]);
    selectedDocs = docs;
  } else {
    selectedDocs = [];
  }

  const { includeAgents } = await inquirer.prompt<{ includeAgents: boolean }>([
    {
      type: 'confirm',
      name: 'includeAgents',
      message: t('prompts.scaffold.includeAgents'),
      default: true
    }
  ]);

  let selectedAgents: string[] | undefined;
  if (includeAgents) {
    const { agents } = await inquirer.prompt<{ agents: string[] }>([
      {
        type: 'checkbox',
        name: 'agents',
        message: t('prompts.scaffold.selectAgents'),
        choices: AGENT_CHOICES,
        default: AGENT_CHOICES.map(choice => choice.value)
      }
    ]);
    selectedAgents = agents;
  } else {
    selectedAgents = [];
  }

  if ((selectedDocs?.length ?? 0) === 0 && (selectedAgents?.length ?? 0) === 0) {
    ui.displayWarning(t('warnings.interactive.nothingSelected'));
    return;
  }

  const { verbose } = await inquirer.prompt<{ verbose: boolean }>([
    {
      type: 'confirm',
      name: 'verbose',
      message: t('prompts.common.verbose'),
      default: false
    }
  ]);

  const scaffoldType = determineScaffoldType(selectedDocs, selectedAgents);

  await runInit(resolvedRepo, scaffoldType, {
    output: outputDir,
    docs: selectedDocs,
    agents: selectedAgents,
    verbose
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

  const { dryRun, processAll } = await inquirer.prompt<{ dryRun: boolean; processAll: boolean }>([
    {
      type: 'confirm',
      name: 'dryRun',
      message: t('prompts.fill.dryRun'),
      default: true
    },
    {
      type: 'confirm',
      name: 'processAll',
      message: t('prompts.fill.processAll'),
      default: false
    }
  ]);

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

  const { includeDocs } = await inquirer.prompt<{ includeDocs: boolean }>([
    {
      type: 'confirm',
      name: 'includeDocs',
      message: t('prompts.fill.includeDocs'),
      default: true
    }
  ]);

  let selectedDocs: string[] | undefined;
  if (includeDocs) {
    const { docs } = await inquirer.prompt<{ docs: string[] }>([
      {
        type: 'checkbox',
        name: 'docs',
        message: t('prompts.fill.selectDocs'),
        choices: DOC_CHOICES,
        default: DOC_CHOICES.map(choice => choice.value)
      }
    ]);
    selectedDocs = docs;
  } else {
    selectedDocs = [];
  }

  const { includeAgents } = await inquirer.prompt<{ includeAgents: boolean }>([
    {
      type: 'confirm',
      name: 'includeAgents',
      message: t('prompts.fill.includeAgents'),
      default: true
    }
  ]);

  let selectedAgents: string[] | undefined;
  if (includeAgents) {
    const { agents } = await inquirer.prompt<{ agents: string[] }>([
      {
        type: 'checkbox',
        name: 'agents',
        message: t('prompts.fill.selectAgents'),
        choices: AGENT_CHOICES,
        default: AGENT_CHOICES.map(choice => choice.value)
      }
    ]);
    selectedAgents = agents;
  } else {
    selectedAgents = [];
  }

  if ((selectedDocs?.length ?? 0) === 0 && (selectedAgents?.length ?? 0) === 0) {
    ui.displayWarning(t('warnings.interactive.nothingSelected'));
    return;
  }

  const { specifyModel } = await inquirer.prompt<{ specifyModel: boolean }>([
    {
      type: 'confirm',
      name: 'specifyModel',
      message: t('prompts.fill.overrideModel'),
      default: false
    }
  ]);

  let provider: string | undefined;
  let model: string | undefined;
  if (specifyModel) {
    const providerAnswer = await inquirer.prompt<{ provider: string }>([
      {
        type: 'list',
        name: 'provider',
        message: t('prompts.fill.provider'),
        choices: ['openrouter', 'openai', 'anthropic', 'gemini', 'grok']
      }
    ]);
    provider = providerAnswer.provider;
    const modelAnswer = await inquirer.prompt<{ model: string }>([
      {
        type: 'input',
        name: 'model',
        message: t('prompts.fill.model'),
        default: DEFAULT_MODEL
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

  await fillService.run(resolvedRepo, {
    output: outputDir,
    prompt: promptPath,
    docs: selectedDocs,
    agents: selectedAgents,
    dryRun,
    all: processAll,
    limit: parsedLimit,
    model,
    provider: provider as LLMConfig['provider'] | undefined,
    apiKey,
    verbose
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

    const { includeAgents } = await inquirer.prompt<{ includeAgents: boolean }>([
      {
        type: 'confirm',
        name: 'includeAgents',
        message: t('prompts.plan.includeAgents'),
        default: true
      }
    ]);

    let selectedAgents: string[] = [];
    if (includeAgents) {
      const { agents } = await inquirer.prompt<{ agents: string[] }>([
        {
          type: 'checkbox',
          name: 'agents',
          message: t('prompts.plan.selectAgents'),
          choices: AGENT_CHOICES,
          default: AGENT_CHOICES.map(choice => choice.value)
        }
      ]);
      selectedAgents = agents;
    }

    const { includeDocs } = await inquirer.prompt<{ includeDocs: boolean }>([
      {
        type: 'confirm',
        name: 'includeDocs',
        message: t('prompts.plan.includeDocs'),
        default: true
      }
    ]);

    let selectedDocs: string[] = [];
    if (includeDocs) {
      const { docs } = await inquirer.prompt<{ docs: string[] }>([
        {
          type: 'checkbox',
          name: 'docs',
          message: t('prompts.plan.selectDocs'),
          choices: DOC_CHOICES,
          default: DOC_CHOICES.map(choice => choice.value)
        }
      ]);
      selectedDocs = docs;
    }

    const agentSelection = parseAgentSelection(selectedAgents);
    const docSelection = parseDocSelection(selectedDocs);

    const { repoPath } = await inquirer.prompt<{ repoPath: string }>([
      {
        type: 'input',
        name: 'repoPath',
        message: t('prompts.plan.repoPath'),
        default: process.cwd()
      }
    ]);

    const { dryRun } = await inquirer.prompt<{ dryRun: boolean }>([
      {
        type: 'confirm',
        name: 'dryRun',
        message: t('prompts.plan.dryRun'),
        default: true
      }
    ]);

    try {
      const resolvedOutput = path.resolve(outputDir.trim() || defaultOutput);
      await planService.scaffoldPlanIfNeeded(planName, resolvedOutput, {
        summary: summary || undefined,
        agentSelection,
        docSelection
      });

      await planService.fillPlan(planName, {
        output: resolvedOutput,
        repo: repoPath,
        dryRun
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

  const { includeAgents } = await inquirer.prompt<{ includeAgents: boolean }>([
    {
      type: 'confirm',
      name: 'includeAgents',
      message: t('prompts.plan.includeAgents'),
      default: true
    }
  ]);

  let selectedAgents: string[] | null = null;
  if (includeAgents) {
    const { agents } = await inquirer.prompt<{ agents: string[] }>([
      {
        type: 'checkbox',
        name: 'agents',
        message: t('prompts.plan.selectAgents'),
        choices: AGENT_CHOICES,
        default: AGENT_CHOICES.map(choice => choice.value)
      }
    ]);
    selectedAgents = agents.length > 0 ? agents : null;
  }

  const { includeDocs } = await inquirer.prompt<{ includeDocs: boolean }>([
    {
      type: 'confirm',
      name: 'includeDocs',
      message: t('prompts.plan.includeDocs'),
      default: true
    }
  ]);

  let selectedDocs: string[] | null = null;
  if (includeDocs) {
    const { docs } = await inquirer.prompt<{ docs: string[] }>([
      {
        type: 'checkbox',
        name: 'docs',
        message: t('prompts.plan.selectDocs'),
        choices: DOC_CHOICES,
        default: DOC_CHOICES.map(choice => choice.value)
      }
    ]);
    selectedDocs = docs.length > 0 ? docs : null;
  }

  const generator = new PlanGenerator();
  ui.startSpinner(t('spinner.plan.creating'));

  try {
    const result = await generator.generatePlan({
      planName,
      outputDir: path.resolve(outputDir.trim() || defaultOutput),
      summary: summary || undefined,
      selectedAgentTypes: selectedAgents,
      selectedDocKeys: selectedDocs,
      verbose: false
    });

    ui.updateSpinner(t('spinner.plan.created'), 'success');
    ui.displaySuccess(t('success.plan.createdAt', { path: chalk.cyan(result.relativePath) }));
  } catch (error) {
    ui.updateSpinner(t('spinner.plan.creationFailed'), 'fail');
    ui.displayError(t('errors.plan.creationFailed'), error as Error);
  } finally {
    ui.stopSpinner();
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

if (require.main === module) {
  main().catch(error => {
    ui.displayError(t('errors.cli.executionFailed'), error as Error);
    process.exit(1);
  });
}
