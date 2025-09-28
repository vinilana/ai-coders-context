#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import { glob } from 'glob';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import inquirer from 'inquirer';

import { FileMapper } from './utils/fileMapper';
import { DocumentationGenerator } from './generators/documentation/documentationGenerator';
import { AgentGenerator } from './generators/agents/agentGenerator';
import { PlanGenerator } from './generators/plans/planGenerator';
import { GeneratorUtils } from './generators/shared';
import { CLIInterface } from './utils/cliUI';
import { resolvePlanPrompt, resolveScaffoldPrompt } from './utils/promptLoader';
import { checkForUpdates } from './utils/versionChecker';
import { createTranslator, detectLocale, SUPPORTED_LOCALES, normalizeLocale } from './utils/i18n';
import type { TranslateFn, Locale, TranslationKey } from './utils/i18n';
import { LLMClientFactory } from './services/llmClientFactory';
import { LLMConfig, RepoStructure, UsageStats } from './types';
import { DOCUMENT_GUIDES, DOCUMENT_GUIDE_KEYS, getDocFilesByKeys } from './generators/documentation/guideRegistry';
import { AGENT_TYPES } from './generators/agents/agentTypes';

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
      await runInit(repoPath, type, options);
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
      await runInit(repoPath, type, options);
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
      await runLlmFill(repoPath, options);
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
        await scaffoldPlanIfNeeded(planName, outputDir, {
          title: rawOptions.title,
          summary: rawOptions.summary,
          agentSelection,
          docSelection,
          force: Boolean(rawOptions.force),
          verbose: Boolean(rawOptions.verbose)
        });

        await runPlanFill(planName, { ...rawOptions, output: outputDir });
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

interface InitOptions {
  repoPath: string;
  outputDir: string;
  include?: string[];
  exclude?: string[];
  verbose: boolean;
  scaffoldDocs: boolean;
  scaffoldAgents: boolean;
  selectedDocKeys?: string[];
  selectedAgentTypes?: string[];
}

async function runInit(repoPath: string, type: string, rawOptions: any): Promise<void> {
  const resolvedType = resolveScaffoldType(type, rawOptions);
  const docSelection = parseDocSelection(rawOptions.docs);
  const agentSelection = parseAgentSelection(rawOptions.agents);

  if (docSelection.invalid.length > 0) {
    ui.displayWarning(t('warnings.docs.unknown', { values: docSelection.invalid.join(', ') }));
  }

  if (agentSelection.invalid.length > 0) {
    ui.displayWarning(t('warnings.agents.unknown', { values: agentSelection.invalid.join(', ') }));
  }

  const options: InitOptions = {
    repoPath: path.resolve(repoPath),
    outputDir: path.resolve(rawOptions.output || './.context'),
    include: rawOptions.include,
    exclude: rawOptions.exclude || [],
    verbose: rawOptions.verbose || false,
    scaffoldDocs: shouldGenerateDocs(resolvedType, docSelection),
    scaffoldAgents: shouldGenerateAgents(resolvedType, agentSelection),
    selectedDocKeys: docSelection.selected,
    selectedAgentTypes: agentSelection.selected
  };

  if (!options.scaffoldDocs && !options.scaffoldAgents) {
    ui.displayWarning(t('warnings.scaffold.noneSelected'));
    return;
  }

  await ensurePaths(options);

  ui.displayWelcome(VERSION);
  ui.displayProjectInfo(options.repoPath, options.outputDir, resolvedType);

  const fileMapper = new FileMapper(options.exclude);

  ui.displayStep(1, 3, t('steps.init.analyze'));
  ui.startSpinner(t('spinner.repo.scanning'));

  const repoStructure = await fileMapper.mapRepository(options.repoPath, options.include);
  ui.updateSpinner(
    t('spinner.repo.scanComplete', {
      fileCount: repoStructure.totalFiles,
      directoryCount: repoStructure.directories.length
    }),
    'success'
  );

  let docsGenerated = 0;
  let agentsGenerated = 0;
  const docGenerator = new DocumentationGenerator();
  const agentGenerator = new AgentGenerator();

  if (options.scaffoldDocs) {
    ui.displayStep(2, 3, t('steps.init.docs'));
    ui.startSpinner(t('spinner.docs.creating'));
    docsGenerated = await docGenerator.generateDocumentation(
      repoStructure,
      options.outputDir,
      { selectedDocs: options.selectedDocKeys },
      options.verbose
    );
    ui.updateSpinner(t('spinner.docs.created', { count: docsGenerated }), 'success');
  }

  if (options.scaffoldAgents) {
    ui.displayStep(3, options.scaffoldDocs ? 3 : 2, t('steps.init.agents'));
    ui.startSpinner(t('spinner.agents.creating'));
    agentsGenerated = await agentGenerator.generateAgentPrompts(
      repoStructure,
      options.outputDir,
      options.selectedAgentTypes,
      options.verbose
    );
    ui.updateSpinner(t('spinner.agents.created', { count: agentsGenerated }), 'success');
  }

  ui.displayGenerationSummary(docsGenerated, agentsGenerated);
  ui.displaySuccess(t('success.scaffold.ready', { path: chalk.cyan(options.outputDir) }));
}

function resolveScaffoldType(type: string, rawOptions: any): 'docs' | 'agents' | 'both' {
  const normalized = (type || 'both').toLowerCase();
  const allowed = ['docs', 'agents', 'both'];

  if (!allowed.includes(normalized)) {
    throw new Error(t('errors.init.invalidType', { value: type, allowed: allowed.join(', ') }));
  }

  if (rawOptions.docsOnly) {
    return 'docs';
  }
  if (rawOptions.agentsOnly) {
    return 'agents';
  }

  return normalized as 'docs' | 'agents' | 'both';
}

async function ensurePaths(options: InitOptions): Promise<void> {
  const exists = await fs.pathExists(options.repoPath);
  if (!exists) {
    throw new Error(t('errors.common.repoMissing', { path: options.repoPath }));
  }

  await fs.ensureDir(options.outputDir);
}

export async function runGenerate(repoPath: string, options: any): Promise<void> {
  const type = options?.docsOnly ? 'docs' : options?.agentsOnly ? 'agents' : (options?.type || 'both');

  await runInit(repoPath, type, {
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

export { runInit };

interface LlmFillOptions {
  repoPath: string;
  outputDir: string;
  provider: LLMConfig['provider'];
  model: string;
  apiKey: string;
  baseUrl?: string;
  include?: string[];
  exclude?: string[];
  verbose: boolean;
  dryRun: boolean;
  processAll: boolean;
  limit?: number;
  selectedDocKeys?: string[];
  selectedAgentTypes?: string[];
  selectedDocFiles?: Set<string>;
  selectedAgentFiles?: Set<string>;
}

interface ResolvedLlmConfig {
  provider: LLMConfig['provider'];
  model: string;
  apiKey: string;
  baseUrl?: string;
}

async function resolveLlmConfig(
  rawOptions: any,
  defaults: { fallbackModel: string }
): Promise<ResolvedLlmConfig> {
  const providerEnvMap = LLMClientFactory.getEnvironmentVariables();
  const defaultModels = LLMClientFactory.getDefaultModels();

  let provider = rawOptions.provider as LLMConfig['provider'] | undefined;
  let model = rawOptions.model as string | undefined;
  let apiKey = rawOptions.apiKey as string | undefined;

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
      provider = LLMClientFactory.detectProviderFromModel(model);
    } else if (apiKey) {
      provider = LLMClientFactory.getProviderFromApiKey(apiKey);
    }
  }

  if (!model) {
    if (provider === 'openrouter' && process.env.OPENROUTER_MODEL) {
      model = process.env.OPENROUTER_MODEL;
    } else if (provider && defaultModels[provider]?.length) {
      model = defaultModels[provider][0];
    } else {
      model = defaults.fallbackModel;
      provider = LLMClientFactory.detectProviderFromModel(model);
    }
  }

  if (!provider) {
    provider = LLMClientFactory.detectProviderFromModel(model || defaults.fallbackModel);
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
    model: model || defaults.fallbackModel,
    apiKey,
    baseUrl: rawOptions.baseUrl
  };
}

async function runLlmFill(repoPath: string, rawOptions: any): Promise<void> {
  const resolvedRepo = path.resolve(repoPath);
  const outputDir = path.resolve(rawOptions.output || './.context');
  const docsDir = path.join(outputDir, 'docs');
  const agentsDir = path.join(outputDir, 'agents');

  await ensureDirectoryExists(docsDir, t('errors.fill.missingDocsScaffold'));
  await ensureDirectoryExists(agentsDir, t('errors.fill.missingAgentsScaffold'));

  const docSelection = parseDocSelection(rawOptions.docs);
  const agentSelection = parseAgentSelection(rawOptions.agents);

  if (docSelection.invalid.length > 0) {
    ui.displayWarning(t('warnings.docs.unknown', { values: docSelection.invalid.join(', ') }));
  }

  if (agentSelection.invalid.length > 0) {
    ui.displayWarning(t('warnings.agents.unknown', { values: agentSelection.invalid.join(', ') }));
  }

  const { provider, model, apiKey, baseUrl } = await resolveLlmConfig(rawOptions, {
    fallbackModel: DEFAULT_MODEL
  });

  const scaffoldPrompt = await resolveScaffoldPrompt(
    rawOptions.prompt,
    missingPath => t('errors.fill.promptMissing', { path: missingPath })
  );

  const docAllowlist = docSelection.explicitNone
    ? new Set<string>()
    : getDocFilesByKeys(docSelection.selected);
  const agentAllowlist = agentSelection.explicitNone
    ? new Set<string>()
    : getAgentFilesByTypes(agentSelection.selected);

  const options: LlmFillOptions = {
    repoPath: resolvedRepo,
    outputDir,
    provider,
    model,
    apiKey,
    baseUrl,
    include: rawOptions.include,
    exclude: rawOptions.exclude,
    verbose: rawOptions.verbose || false,
    dryRun: rawOptions.dryRun || false,
    processAll: rawOptions.all || false,
    limit: rawOptions.limit,
    selectedDocKeys: docSelection.selected,
    selectedAgentTypes: agentSelection.selected,
    selectedDocFiles: docAllowlist,
    selectedAgentFiles: agentAllowlist
  };

  const scaffoldPromptDisplayPath = scaffoldPrompt.path
    ? path.relative(process.cwd(), scaffoldPrompt.path) || scaffoldPrompt.path
    : undefined;

  if (scaffoldPrompt.source === 'custom' && scaffoldPromptDisplayPath) {
    ui.displayInfo(
      t('info.prompt.title'),
      t('info.prompt.usingCustom', { path: scaffoldPromptDisplayPath })
    );
  } else if (scaffoldPrompt.source === 'package' && scaffoldPromptDisplayPath) {
    ui.displayInfo(
      t('info.prompt.title'),
      t('info.prompt.usingPackage', { path: scaffoldPromptDisplayPath })
    );
  } else {
    ui.displayInfo(t('info.prompt.title'), t('info.prompt.usingBundled'));
  }

  ui.displayWelcome(VERSION);
  ui.displayProjectInfo(options.repoPath, options.outputDir, `fill:${options.provider}`);

  const fileMapper = new FileMapper(options.exclude);
  ui.displayStep(1, 3, t('steps.fill.analyze'));
  ui.startSpinner(t('spinner.repo.scanning'));
  const repoStructure = await fileMapper.mapRepository(options.repoPath, options.include);
  ui.updateSpinner(
    t('spinner.repo.scanComplete', {
      fileCount: repoStructure.totalFiles,
      directoryCount: repoStructure.directories.length
    }),
    'success'
  );

  const systemPrompt = scaffoldPrompt.content;
  const llmClient = LLMClientFactory.createClient({
    apiKey: options.apiKey,
    model: options.model,
    provider: options.provider,
    baseUrl: options.baseUrl
  });

  const targets = await collectTargets(
    docsDir,
    agentsDir,
    options.processAll,
    options.limit,
    options.selectedDocFiles,
    options.selectedAgentFiles
  );
  if (targets.length === 0) {
    ui.displayWarning(t('warnings.fill.noTargets'));
    return;
  }

  const contextSummary = buildContextSummary(repoStructure);
  const results: Array<{ file: string; status: 'updated' | 'skipped' | 'failed'; message?: string }> = [];

  ui.displayStep(2, 3, t('steps.fill.processFiles', { count: targets.length, model: options.model }));

  for (const target of targets) {
    const relativePath = path.relative(options.outputDir, target.fullPath);
    ui.startSpinner(t('spinner.fill.processing', { path: relativePath }));

    try {
      const currentContent = await fs.readFile(target.fullPath, 'utf-8');
      const userPrompt = buildUserPrompt(relativePath, currentContent, contextSummary, target.isAgent);
      const updatedContent = await llmClient.generateText(userPrompt, systemPrompt);

      if (!updatedContent || !updatedContent.trim()) {
        ui.updateSpinner(t('spinner.fill.noContent', { path: relativePath }), 'warn');
        results.push({ file: relativePath, status: 'skipped', message: t('messages.fill.emptyResponse') });
        continue;
      }

      if (options.dryRun) {
        ui.updateSpinner(t('spinner.fill.dryRunPreview', { path: relativePath }), 'info');
        console.log(chalk.gray(`\n${t('messages.fill.previewStart')}`));
        console.log(updatedContent.trim());
        console.log(chalk.gray(`${t('messages.fill.previewEnd')}\n`));
      } else {
        await fs.writeFile(target.fullPath, ensureTrailingNewline(updatedContent));
        ui.updateSpinner(t('spinner.fill.updated', { path: relativePath }), 'success');
      }

      results.push({ file: relativePath, status: options.dryRun ? 'skipped' : 'updated' });
    } catch (error) {
      ui.updateSpinner(t('spinner.fill.failed', { path: relativePath }), 'fail');
      results.push({
        file: relativePath,
        status: 'failed',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  ui.displayStep(3, 3, t('steps.fill.summary'));
  printLlmSummary(llmClient.getUsageStats(), results, options.dryRun);
  ui.displaySuccess(t('success.fill.completed'));
}

interface PlanScaffoldForFillOptions {
  title?: string;
  summary?: string;
  agentSelection?: SelectionParseResult;
  docSelection?: SelectionParseResult;
  force?: boolean;
  verbose?: boolean;
}

async function scaffoldPlanIfNeeded(
  planName: string,
  outputDir: string,
  options: PlanScaffoldForFillOptions
): Promise<void> {
  const resolvedOutput = path.resolve(outputDir);
  const plansDir = path.join(resolvedOutput, 'plans');

  const normalizedInput = planName.replace(/\.md$/i, '');
  const slug = GeneratorUtils.slugify(normalizedInput);
  if (!slug) {
    throw new Error(t('errors.plan.invalidName'));
  }

  const planPath = path.join(plansDir, `${slug}.md`);
  const planExists = await fs.pathExists(planPath);

  if (planExists && !options.force) {
    return;
  }

  const generator = new PlanGenerator();
  const result = await generator.generatePlan({
    planName,
    outputDir: resolvedOutput,
    title: options.title,
    summary: options.summary,
    selectedAgentTypes: options.agentSelection
      ? options.agentSelection.explicitNone
        ? null
        : options.agentSelection.selected
      : undefined,
    selectedDocKeys: options.docSelection
      ? options.docSelection.explicitNone
        ? null
        : options.docSelection.selected
      : undefined,
    force: Boolean(options.force),
    verbose: Boolean(options.verbose)
  });

  const relativePath = result.relativePath;
  const message = planExists && options.force
    ? t('messages.plan.regenerated', { path: relativePath })
    : t('messages.plan.created', { path: relativePath });
  ui.displayInfo(t('info.plan.scaffolded.title'), message);
}

async function runPlanFill(planName: string, rawOptions: any): Promise<void> {
  const outputDir = path.resolve(rawOptions.output || './.context');
  const plansDir = path.join(outputDir, 'plans');
  await ensureDirectoryExists(plansDir, t('errors.plan.missingPlansDir'));

  const normalizedInput = planName.replace(/\.md$/i, '');
  const slug = GeneratorUtils.slugify(normalizedInput);
  if (!slug) {
    throw new Error(t('errors.plan.invalidName'));
  }

  const candidateFiles = new Set<string>();
  candidateFiles.add(path.join(plansDir, `${slug}.md`));
  if (planName.toLowerCase().endsWith('.md')) {
    candidateFiles.add(path.join(plansDir, planName));
  }

  let planPath: string | undefined;
  for (const candidate of candidateFiles) {
    if (await fs.pathExists(candidate)) {
      planPath = candidate;
      break;
    }
  }

  if (!planPath) {
    const expected = Array.from(candidateFiles).map(file => path.relative(process.cwd(), file)).join(' or ');
    throw new Error(t('errors.plan.notFound', { expected }));
  }

  const docsDir = path.join(outputDir, 'docs');
  const agentsDir = path.join(outputDir, 'agents');
  await ensureDirectoryExists(docsDir, t('errors.fill.missingDocsScaffold'));
  await ensureDirectoryExists(agentsDir, t('errors.fill.missingAgentsScaffold'));

  const repoPath = path.resolve(rawOptions.repo || process.cwd());
  if (!(await fs.pathExists(repoPath))) {
    throw new Error(t('errors.common.repoMissing', { path: repoPath }));
  }

  const { provider, model, apiKey, baseUrl } = await resolveLlmConfig(rawOptions, {
    fallbackModel: DEFAULT_MODEL
  });

  const planPrompt = await resolvePlanPrompt(
    rawOptions.prompt,
    missingPath => t('errors.fill.promptMissing', { path: missingPath })
  );

  const planContent = await fs.readFile(planPath, 'utf-8');
  const docsIndexPath = path.join(docsDir, 'README.md');
  const agentsIndexPath = path.join(agentsDir, 'README.md');
  const docsIndex = (await fs.pathExists(docsIndexPath)) ? await fs.readFile(docsIndexPath, 'utf-8') : undefined;
  const agentsIndex = (await fs.pathExists(agentsIndexPath)) ? await fs.readFile(agentsIndexPath, 'utf-8') : undefined;

  const referencedDocs = await loadReferencedMarkdown(docsDir, extractPlanReferences(planContent, 'docs'));
  const referencedAgents = await loadReferencedMarkdown(agentsDir, extractPlanReferences(planContent, 'agents'));

  const planPromptDisplayPath = planPrompt.path
    ? path.relative(process.cwd(), planPrompt.path) || planPrompt.path
    : undefined;

  if (planPrompt.source === 'custom' && planPromptDisplayPath) {
    ui.displayInfo(
      t('info.prompt.title'),
      t('info.prompt.usingCustom', { path: planPromptDisplayPath })
    );
  } else if (planPrompt.source === 'package' && planPromptDisplayPath) {
    ui.displayInfo(
      t('info.prompt.title'),
      t('info.prompt.usingPackage', { path: planPromptDisplayPath })
    );
  } else {
    ui.displayInfo(t('info.prompt.title'), t('info.prompt.usingBundled'));
  }

  ui.displayWelcome(VERSION);
  ui.displayProjectInfo(repoPath, outputDir, `plan-fill:${provider}`);

  const fileMapper = new FileMapper(rawOptions.exclude);
  ui.displayStep(1, 3, t('steps.plan.summary'));
  ui.startSpinner(t('spinner.planFill.analyzingRepo'));
  const repoStructure = await fileMapper.mapRepository(repoPath, rawOptions.include);
  const contextSummary = buildContextSummary(repoStructure);
  ui.updateSpinner(t('spinner.planFill.summaryReady'), 'success');

  const systemPrompt = planPrompt.content;
  const llmClient = LLMClientFactory.createClient({
    apiKey,
    model,
    provider,
    baseUrl
  });

  const planRelativePath = path.relative(outputDir, planPath);
  const results: Array<{ file: string; status: 'updated' | 'skipped' | 'failed'; message?: string }> = [];

  ui.displayStep(2, 3, t('steps.plan.update', { path: planRelativePath, model }));
  ui.startSpinner(t('spinner.planFill.updating', { path: planRelativePath }));

  try {
    const userPrompt = buildPlanUserPrompt({
      relativePath: planRelativePath,
      planContent,
      contextSummary,
      docsIndex,
      agentsIndex,
      docs: referencedDocs,
      agents: referencedAgents
    });

    const updatedContent = await llmClient.generateText(userPrompt, systemPrompt);

    if (!updatedContent || !updatedContent.trim()) {
      ui.updateSpinner(t('spinner.planFill.noContent'), 'warn');
      results.push({ file: planRelativePath, status: 'skipped', message: t('messages.fill.emptyResponse') });
    } else if (rawOptions.dryRun) {
      ui.updateSpinner(t('spinner.planFill.dryRun'), 'info');
      console.log(chalk.gray(`\n${t('messages.fill.previewStart')}`));
      console.log(updatedContent.trim());
      console.log(chalk.gray(`${t('messages.fill.previewEnd')}\n`));
      results.push({ file: planRelativePath, status: 'skipped', message: 'dry-run' });
    } else {
      await fs.writeFile(planPath, ensureTrailingNewline(updatedContent));
      ui.updateSpinner(t('spinner.planFill.updated', { path: planRelativePath }), 'success');
      results.push({ file: planRelativePath, status: 'updated' });
    }
  } catch (error) {
    ui.updateSpinner(t('spinner.planFill.failed'), 'fail');
    results.push({
      file: planRelativePath,
      status: 'failed',
      message: error instanceof Error ? error.message : String(error)
    });
  } finally {
    ui.stopSpinner();
  }

  ui.displayStep(3, 3, t('steps.plan.summaryResults'));
  printLlmSummary(llmClient.getUsageStats(), results, Boolean(rawOptions.dryRun));
  ui.displaySuccess(t('success.plan.filled'));
}

async function ensureDirectoryExists(dir: string, message: string): Promise<void> {
  const exists = await fs.pathExists(dir);
  if (!exists) {
    throw new Error(message);
  }
}

interface TargetFile {
  fullPath: string;
  hasMarkers: boolean;
  isAgent: boolean;
}

async function collectTargets(
  docsDir: string,
  agentsDir: string,
  processAll: boolean,
  limit: number | undefined,
  docAllowlist?: Set<string>,
  agentAllowlist?: Set<string>
): Promise<TargetFile[]> {
  const docFiles = await glob('**/*.md', { cwd: docsDir, absolute: true });
  const agentFiles = await glob('**/*.md', { cwd: agentsDir, absolute: true });
  const candidates = [...docFiles, ...agentFiles];

  const targets: TargetFile[] = [];
  for (const fullPath of candidates) {
    const content = await fs.readFile(fullPath, 'utf-8');
    const hasMarkers = /<!--\s*ai-task:/.test(content) || /<!--\s*ai-slot:/.test(content) || /TODO/.test(content);
    const isAgent = fullPath.includes(`${path.sep}agents${path.sep}`);
    const fileName = path.basename(fullPath);

    if (isAgent) {
      if (agentAllowlist && !agentAllowlist.has(fileName)) {
        continue;
      }
    } else {
      if (docAllowlist && !docAllowlist.has(fileName)) {
        continue;
      }
    }

    const explicitSelection = isAgent ? !!agentAllowlist : !!docAllowlist;
    const shouldInclude =
      processAll ||
      hasMarkers ||
      (explicitSelection && (isAgent ? agentAllowlist!.has(fileName) : docAllowlist!.has(fileName)));

    if (!shouldInclude) {
      continue;
    }

    targets.push({ fullPath, hasMarkers, isAgent });
    if (limit && targets.length >= limit) {
      break;
    }
  }

  return targets;
}

function buildContextSummary(repoStructure: RepoStructure): string {
  const directories = new Set<string>();
  repoStructure.directories.forEach(dir => {
    const [first] = dir.relativePath.split(/[\\/]/).filter(Boolean);
    if (first) {
      directories.add(first);
    }
  });

  const topDirs = Array.from(directories).sort().slice(0, 12);
  const totalSizeMb = (repoStructure.totalSize / (1024 * 1024)).toFixed(2);

  return [
    `Top-level directories: ${topDirs.length ? topDirs.join(', ') : 'n/a'}`,
    `Total files scanned: ${repoStructure.totalFiles}`,
    `Repository size (approx.): ${totalSizeMb} MB`
  ].join('\n');
}

function buildUserPrompt(relativePath: string, currentContent: string, contextSummary: string, isAgent: boolean): string {
  const guidance: string[] = [
    '- Preserve YAML front matter and existing `ai-task` sections.',
    '- Replace TODOs and resolve `ai-slot` placeholders with concrete information.',
    '- Ensure success criteria in the front matter are satisfied.',
    '- Return only the full updated Markdown for this file.'
  ];

  if (isAgent) {
    guidance.push('- Keep agent responsibilities, best practices, and documentation touchpoints aligned with the latest docs.');
  } else {
    guidance.push('- Maintain accurate cross-links between docs and referenced resources.');
  }

  return [
    `Target file: ${relativePath}`,
    'Repository summary:',
    contextSummary,
    '',
    'Guidance:',
    ...guidance,
    '',
    'Current content:',
    '<file>',
    currentContent,
    '</file>'
  ].join('\n');
}

interface PlanPromptContext {
  relativePath: string;
  planContent: string;
  contextSummary: string;
  docsIndex?: string;
  agentsIndex?: string;
  docs: Array<{ path: string; content: string }>;
  agents: Array<{ path: string; content: string }>;
}

function buildPlanUserPrompt(context: PlanPromptContext): string {
  const guidance = [
    '- Preserve the YAML front matter and `ai-task` wrapper already in the plan.',
    '- Replace TODOs with concrete steps that align with the provided documentation and agent playbooks.',
    '- Keep the Agent Lineup and Documentation Touchpoints tables accurate and sorted.',
    '- Ensure the work is segmented into phases, each with numbered steps, named owners, deliverables, evidence expectations, and a concluding Git commit checkpoint.',
    '- Return only the full updated Markdown for this plan.'
  ];

  const sections: string[] = [
    `Target file: ${context.relativePath}`,
    'Repository summary:',
    context.contextSummary,
    '',
    'Guidance:',
    ...guidance,
    '',
    'Current plan:',
    '<plan>',
    context.planContent,
    '</plan>'
  ];

  if (context.docsIndex) {
    sections.push(
      '',
      'Documentation index (docs/README.md):',
      '<docs-index>',
      context.docsIndex,
      '</docs-index>'
    );
  }

  if (context.agentsIndex) {
    sections.push(
      '',
      'Agent handbook (agents/README.md):',
      '<agents-index>',
      context.agentsIndex,
      '</agents-index>'
    );
  }

  context.docs.forEach(doc => {
    sections.push(
      '',
      `Referenced documentation (${doc.path}):`,
      '<doc>',
      doc.content,
      '</doc>'
    );
  });

  context.agents.forEach(agent => {
    sections.push(
      '',
      `Referenced agent playbook (${agent.path}):`,
      '<agent>',
      agent.content,
      '</agent>'
    );
  });

  return sections.join('\n');
}

function extractPlanReferences(content: string, type: 'docs' | 'agents'): string[] {
  const regex = type === 'docs'
    ? /\]\(\.\.\/docs\/([^)#]+)(?:#[^)]*)?\)/g
    : /\]\(\.\.\/agents\/([^)#]+)(?:#[^)]*)?\)/g;

  const references: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const rawPath = match[1].trim();
    if (!rawPath) continue;
    const normalized = rawPath.replace(/^\.\//, '').replace(/#.*$/, '');
    if (!normalized || normalized.includes('..')) continue;
    if (!references.includes(normalized)) {
      references.push(normalized);
    }
  }

  return references;
}

async function loadReferencedMarkdown(
  baseDir: string,
  fileNames: string[]
): Promise<Array<{ path: string; content: string }>> {
  const results: Array<{ path: string; content: string }> = [];
  const seen = new Set<string>();

  for (const name of fileNames) {
    const cleanName = name.replace(/#.*$/, '');
    if (!cleanName || seen.has(cleanName)) {
      continue;
    }

    const normalized = path.normalize(cleanName).replace(/^\.\//, '');
    if (normalized.includes('..')) {
      continue;
    }

    const fullPath = path.join(baseDir, normalized);
    if (!(await fs.pathExists(fullPath))) {
      continue;
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    results.push({ path: normalized, content });
    seen.add(cleanName);
  }

  return results;
}

function ensureTrailingNewline(content: string): string {
  return content.endsWith('\n') ? content : `${content}\n`;
}

function printLlmSummary(usage: UsageStats, results: Array<{ file: string; status: string; message?: string }>, dryRun: boolean): void {
  const updated = results.filter(r => r.status === 'updated').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const failed = results.filter(r => r.status === 'failed');

  console.log('\n' + chalk.bold('📄 LLM Fill Summary'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`${chalk.blue('Updated files:')} ${chalk.white(updated.toString())}`);
  console.log(`${chalk.blue('Skipped files:')} ${chalk.white(skipped.toString())}${dryRun ? chalk.gray(' (dry run)') : ''}`);
  console.log(`${chalk.blue('Failures:')} ${failed.length}`);

  if (usage.totalCalls > 0) {
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`${chalk.blue('LLM calls:')} ${usage.totalCalls}`);
    console.log(`${chalk.blue('Prompt tokens:')} ${usage.totalPromptTokens}`);
    console.log(`${chalk.blue('Completion tokens:')} ${usage.totalCompletionTokens}`);
    console.log(`${chalk.blue('Estimated cost:')} ${usage.estimatedCost.toFixed(4)}`);
    console.log(`${chalk.blue('Model:')} ${usage.model}`);
  }

  if (failed.length > 0) {
    console.log(chalk.gray('─'.repeat(50)));
    failed.forEach(f => {
      console.log(`${chalk.red('✖')} ${chalk.white(f.file)} — ${chalk.gray(f.message || 'Unknown error')}`);
    });
  }
}

interface SelectionParseResult {
  selected?: string[];
  invalid: string[];
  provided: boolean;
  explicitNone: boolean;
}

function parseDocSelection(input: any): SelectionParseResult {
  if (input === undefined) {
    return { selected: undefined, invalid: [], provided: false, explicitNone: false };
  }

  if (Array.isArray(input) && input.length === 0) {
    return { selected: [], invalid: [], provided: true, explicitNone: true };
  }

  const values = toStringArray(input);
  const normalized = values.map(value => value.toLowerCase().replace(/\.md$/, ''));
  const valid = Array.from(new Set(normalized.filter(key => DOCUMENT_GUIDE_KEYS.includes(key))));
  const invalid = normalized.filter(key => !DOCUMENT_GUIDE_KEYS.includes(key));

  if (values.length > 0 && valid.length === 0 && invalid.length > 0) {
    return { selected: undefined, invalid, provided: true, explicitNone: false };
  }

  return { selected: valid.length > 0 ? valid : undefined, invalid, provided: true, explicitNone: false };
}

function parseAgentSelection(input: any): SelectionParseResult {
  if (input === undefined) {
    return { selected: undefined, invalid: [], provided: false, explicitNone: false };
  }

  if (Array.isArray(input) && input.length === 0) {
    return { selected: [], invalid: [], provided: true, explicitNone: true };
  }

  const values = toStringArray(input);
  const normalized = values.map(value => value.toLowerCase().replace(/\.md$/, ''));
  const allowed = new Set(AGENT_TYPES);
  const valid = Array.from(new Set(normalized.filter(value => allowed.has(value as typeof AGENT_TYPES[number]))));
  const invalid = normalized.filter(value => !allowed.has(value as typeof AGENT_TYPES[number]));

  if (values.length > 0 && valid.length === 0 && invalid.length > 0) {
    return { selected: undefined, invalid, provided: true, explicitNone: false };
  }

  return { selected: valid.length > 0 ? valid : undefined, invalid, provided: true, explicitNone: false };
}

function shouldGenerateDocs(resolvedType: 'docs' | 'agents' | 'both', selection: SelectionParseResult): boolean {
  if (selection.explicitNone) {
    return false;
  }

  if (resolvedType === 'agents') {
    return false;
  }

  if (!selection.provided) {
    return resolvedType === 'docs' || resolvedType === 'both';
  }

  if (selection.selected && selection.selected.length === 0) {
    return false;
  }

  return resolvedType === 'docs' || resolvedType === 'both';
}

function shouldGenerateAgents(resolvedType: 'docs' | 'agents' | 'both', selection: SelectionParseResult): boolean {
  if (selection.explicitNone) {
    return false;
  }

  if (resolvedType === 'docs') {
    return false;
  }

  if (!selection.provided) {
    return resolvedType === 'agents' || resolvedType === 'both';
  }

  if (selection.selected && selection.selected.length === 0) {
    return false;
  }

  return resolvedType === 'agents' || resolvedType === 'both';
}

function toStringArray(input: any): string[] {
  if (Array.isArray(input)) {
    return input.map(item => item.toString().trim()).filter(Boolean);
  }
  if (input === null || input === undefined) {
    return [];
  }
  return input
    .toString()
    .split(',')
    .map((part: string) => part.trim())
    .filter(Boolean);
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

function determineScaffoldType(docSelection?: string[], agentSelection?: string[]): 'docs' | 'agents' | 'both' {
  const docsSelected = docSelection === undefined ? true : docSelection.length > 0;
  const agentsSelected = agentSelection === undefined ? true : agentSelection.length > 0;

  if (docsSelected && agentsSelected) return 'both';
  if (docsSelected) return 'docs';
  return 'agents';
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

  await runLlmFill(resolvedRepo, {
    output: outputDir,
    prompt: promptPath,
    docs: selectedDocs,
    agents: selectedAgents,
    dryRun,
    all: processAll,
    limit: parsedLimit,
    model,
    provider,
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
      await scaffoldPlanIfNeeded(planName, resolvedOutput, {
        summary: summary || undefined,
        agentSelection,
        docSelection
      });

      await runPlanFill(planName, {
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

function getAgentFilesByTypes(types?: string[]): Set<string> | undefined {
  if (!types || types.length === 0) {
    return undefined;
  }

  const allowed = new Set(AGENT_TYPES);
  const files = types
    .filter(type => allowed.has(type as typeof AGENT_TYPES[number]))
    .map(type => `${type}.md`);

  return files.length ? new Set(files) : undefined;
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
