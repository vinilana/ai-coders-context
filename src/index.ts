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
import { CLIInterface } from './utils/cliUI';
import { LLMClientFactory } from './services/llmClientFactory';
import { LLMConfig, RepoStructure, UsageStats } from './types';
import { DOCUMENT_GUIDES, DOCUMENT_GUIDE_KEYS, getDocFilesByKeys } from './generators/documentation/guideRegistry';
import { AGENT_TYPES } from './generators/agents/agentTypes';

dotenv.config();

const program = new Command();
const ui = new CLIInterface();
const VERSION = '0.3.0';
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
  .description('Scaffold documentation and agent playbooks for your repository')
  .version(VERSION);

program
  .command('init')
  .description('Generate docs and agent scaffolding for a repository')
  .argument('<repo-path>', 'Path to the repository to analyze')
  .argument('[type]', 'Scaffold type: "docs", "agents", or "both" (default)', 'both')
  .option('-o, --output <dir>', 'Output directory for generated assets', './.context')
  .option('--docs <keys...>', 'Doc keys to scaffold (default: all)')
  .option('--agents <keys...>', 'Agent types to scaffold (default: all)')
  .option('--exclude <patterns...>', 'Glob patterns to exclude from analysis')
  .option('--include <patterns...>', 'Glob patterns to include during analysis')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (repoPath: string, type: string, options: any) => {
    try {
      await runInit(repoPath, type, options);
    } catch (error) {
      ui.displayError('Failed to scaffold repository assets', error as Error);
      process.exit(1);
    }
  });

program
  .command('scaffold')
  .description('Alias for init')
  .argument('<repo-path>', 'Path to the repository to analyze')
  .argument('[type]', 'Scaffold type: "docs", "agents", or "both" (default)', 'both')
  .option('-o, --output <dir>', 'Output directory for generated assets', './.context')
  .option('--docs <keys...>', 'Doc keys to scaffold (default: all)')
  .option('--agents <keys...>', 'Agent types to scaffold (default: all)')
  .option('--exclude <patterns...>', 'Glob patterns to exclude from analysis')
  .option('--include <patterns...>', 'Glob patterns to include during analysis')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (repoPath: string, type: string, options: any) => {
    try {
      await runInit(repoPath, type, options);
    } catch (error) {
      ui.displayError('Failed to scaffold repository assets', error as Error);
      process.exit(1);
    }
  });

program
  .command('llm-fill')
  .description('Use an LLM to fill or update the generated docs and agent playbooks')
  .argument('<repo-path>', 'Path to the repository root used to build context')
  .option('-o, --output <dir>', 'Scaffold directory containing docs/ and agents/', './.context')
  .option('-k, --api-key <key>', 'API key for the LLM provider')
  .option('-m, --model <model>', 'LLM model to use', DEFAULT_MODEL)
  .option('-p, --provider <provider>', 'LLM provider (openrouter, openai, anthropic, gemini, grok)')
  .option('--base-url <url>', 'Custom base URL for provider APIs')
  .option('--prompt <file>', 'Path to an instruction prompt', path.join(__dirname, '../prompts/update_scaffold_prompt.md'))
  .option('--dry-run', 'Preview updates without writing files', false)
  .option('--all', 'Process every doc/agent file even if no TODO markers are found', false)
  .option('--limit <number>', 'Maximum number of files to process', (value: string) => parseInt(value, 10))
  .option('--docs <keys...>', 'Doc keys to update (default: all)')
  .option('--agents <keys...>', 'Agent types to update (default: all)')
  .option('--exclude <patterns...>', 'Glob patterns to exclude from repository analysis')
  .option('--include <patterns...>', 'Glob patterns to include during analysis')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (repoPath: string, options: any) => {
    try {
      await runLlmFill(repoPath, options);
    } catch (error) {
      ui.displayError('Failed to update documentation with LLM assistance', error as Error);
      process.exit(1);
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
    ui.displayWarning(`Ignoring unknown docs: ${docSelection.invalid.join(', ')}`);
  }

  if (agentSelection.invalid.length > 0) {
    ui.displayWarning(`Ignoring unknown agent types: ${agentSelection.invalid.join(', ')}`);
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
    ui.displayWarning('No documentation or agent playbooks selected. Nothing to scaffold.');
    return;
  }

  await ensurePaths(options);

  ui.displayWelcome(VERSION);
  ui.displayProjectInfo(options.repoPath, options.outputDir, resolvedType);

  const fileMapper = new FileMapper(options.exclude);

  ui.displayStep(1, 3, 'Analyzing repository structure');
  ui.startSpinner('Scanning repository...');

  const repoStructure = await fileMapper.mapRepository(options.repoPath, options.include);
  ui.updateSpinner(`Found ${repoStructure.totalFiles} files across ${repoStructure.directories.length} directories`, 'success');

  let docsGenerated = 0;
  let agentsGenerated = 0;
  const docGenerator = new DocumentationGenerator();
  const agentGenerator = new AgentGenerator();

  if (options.scaffoldDocs) {
    ui.displayStep(2, 3, 'Scaffolding documentation');
    ui.startSpinner('Creating docs directory and templates...');
    docsGenerated = await docGenerator.generateDocumentation(
      repoStructure,
      options.outputDir,
      { selectedDocs: options.selectedDocKeys },
      options.verbose
    );
    ui.updateSpinner(`Documentation scaffold created (${docsGenerated} files)`, 'success');
  }

  if (options.scaffoldAgents) {
    ui.displayStep(3, options.scaffoldDocs ? 3 : 2, 'Scaffolding agent playbooks');
    ui.startSpinner('Creating agent directory and templates...');
    agentsGenerated = await agentGenerator.generateAgentPrompts(
      repoStructure,
      options.outputDir,
      options.selectedAgentTypes,
      options.verbose
    );
    ui.updateSpinner(`Agent scaffold created (${agentsGenerated} files)`, 'success');
  }

  ui.displayGenerationSummary(docsGenerated, agentsGenerated);
  ui.displaySuccess(`Scaffold ready in ${chalk.cyan(options.outputDir)}`);
}

function resolveScaffoldType(type: string, rawOptions: any): 'docs' | 'agents' | 'both' {
  const normalized = (type || 'both').toLowerCase();
  const allowed = ['docs', 'agents', 'both'];

  if (!allowed.includes(normalized)) {
    throw new Error(`Invalid scaffold type "${type}". Expected one of: ${allowed.join(', ')}`);
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
    throw new Error(`Repository path does not exist: ${options.repoPath}`);
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
  throw new Error('The analyze command has been removed in the scaffolding-only version of ai-context.');
}

export async function runUpdate(..._args: unknown[]): Promise<void> {
  throw new Error('The update command is no longer supported. Re-run `ai-context init` to refresh scaffolds.');
}

export async function runPreview(..._args: unknown[]): Promise<void> {
  throw new Error('Preview mode has been retired. Use the generated docs and agent templates directly.');
}

export async function runGuidelines(..._args: unknown[]): Promise<void> {
  throw new Error('Guidelines generation relied on LLMs and is no longer available.');
}

export { runInit };

interface LlmFillOptions {
  repoPath: string;
  outputDir: string;
  promptPath: string;
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

async function runLlmFill(repoPath: string, rawOptions: any): Promise<void> {
  const resolvedRepo = path.resolve(repoPath);
  const outputDir = path.resolve(rawOptions.output || './.context');
  const docsDir = path.join(outputDir, 'docs');
  const agentsDir = path.join(outputDir, 'agents');

  await ensureDirectoryExists(docsDir, 'Documentation scaffold not found. Run `ai-context init` first.');
  await ensureDirectoryExists(agentsDir, 'Agent scaffold not found. Run `ai-context init` first.');

  const promptPath = path.resolve(rawOptions.prompt);
  if (!(await fs.pathExists(promptPath))) {
    throw new Error(`Prompt file not found at ${promptPath}.`);
  }

  const providerEnvMap = LLMClientFactory.getEnvironmentVariables();
  const defaultModels = LLMClientFactory.getDefaultModels();

  let provider = rawOptions.provider as LLMConfig['provider'] | undefined;
  let model = rawOptions.model as string | undefined;
  let apiKey = rawOptions.apiKey as string | undefined;

  const docSelection = parseDocSelection(rawOptions.docs);
  const agentSelection = parseAgentSelection(rawOptions.agents);

  if (docSelection.invalid.length > 0) {
    ui.displayWarning(`Ignoring unknown docs: ${docSelection.invalid.join(', ')}`);
  }

  if (agentSelection.invalid.length > 0) {
    ui.displayWarning(`Ignoring unknown agent types: ${agentSelection.invalid.join(', ')}`);
  }

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
      model = DEFAULT_MODEL;
      provider = LLMClientFactory.detectProviderFromModel(model);
    }
  }

  if (!provider) {
    provider = LLMClientFactory.detectProviderFromModel(model || DEFAULT_MODEL);
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
    throw new Error(`${provider.toUpperCase()} API key is required. Set one of ${envVars.join(', ')} or use --api-key.`);
  }

  const docAllowlist = docSelection.explicitNone
    ? new Set<string>()
    : getDocFilesByKeys(docSelection.selected);
  const agentAllowlist = agentSelection.explicitNone
    ? new Set<string>()
    : getAgentFilesByTypes(agentSelection.selected);

  const options: LlmFillOptions = {
    repoPath: resolvedRepo,
    outputDir,
    promptPath,
    provider,
    model,
    apiKey,
    baseUrl: rawOptions.baseUrl,
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

  ui.displayWelcome(VERSION);
  ui.displayProjectInfo(options.repoPath, options.outputDir, `llm-fill:${options.provider}`);

  const fileMapper = new FileMapper(options.exclude);
  ui.displayStep(1, 3, 'Analyzing repository structure');
  ui.startSpinner('Scanning repository...');
  const repoStructure = await fileMapper.mapRepository(options.repoPath, options.include);
  ui.updateSpinner(`Found ${repoStructure.totalFiles} files across ${repoStructure.directories.length} directories`, 'success');

  const systemPrompt = await fs.readFile(options.promptPath, 'utf-8');
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
    ui.displayWarning('No Markdown files required updates. Use --all or add TODO markers to trigger LLM assistance.');
    return;
  }

  const contextSummary = buildContextSummary(repoStructure);
  const results: Array<{ file: string; status: 'updated' | 'skipped' | 'failed'; message?: string }> = [];

  ui.displayStep(2, 3, `Updating ${targets.length} files with ${options.model}`);

  for (const target of targets) {
    const relativePath = path.relative(options.outputDir, target.fullPath);
    ui.startSpinner(`Processing ${relativePath}...`);

    try {
      const currentContent = await fs.readFile(target.fullPath, 'utf-8');
      const userPrompt = buildUserPrompt(relativePath, currentContent, contextSummary, target.isAgent);
      const updatedContent = await llmClient.generateText(userPrompt, systemPrompt);

      if (!updatedContent || !updatedContent.trim()) {
        ui.updateSpinner(`No content received for ${relativePath}`, 'warn');
        results.push({ file: relativePath, status: 'skipped', message: 'Empty response from LLM' });
        continue;
      }

      if (options.dryRun) {
        ui.updateSpinner(`Dry run - preview for ${relativePath}`, 'info');
        console.log(chalk.gray('\n--- Preview Start ---'));
        console.log(updatedContent.trim());
        console.log(chalk.gray('--- Preview End ---\n'));
      } else {
        await fs.writeFile(target.fullPath, ensureTrailingNewline(updatedContent));
        ui.updateSpinner(`Updated ${relativePath}`, 'success');
      }

      results.push({ file: relativePath, status: options.dryRun ? 'skipped' : 'updated' });
    } catch (error) {
      ui.updateSpinner(`Failed ${relativePath}`, 'fail');
      results.push({
        file: relativePath,
        status: 'failed',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  ui.displayStep(3, 3, 'Summarizing LLM usage');
  printLlmSummary(llmClient.getUsageStats(), results, options.dryRun);
  ui.displaySuccess('LLM-assisted update complete. Review the changes and commit when ready.');
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

async function runInteractive(): Promise<void> {
  const { action } = await inquirer.prompt<{ action: 'scaffold' | 'llm-fill' }>([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Generate documentation/agent scaffolding', value: 'scaffold' },
        { name: 'Use an LLM to update the scaffold', value: 'llm-fill' }
      ]
    }
  ]);

  if (action === 'scaffold') {
    await runInteractiveScaffold();
  } else {
    await runInteractiveLlmFill();
  }
}

async function runInteractiveScaffold(): Promise<void> {
  const { repoPath } = await inquirer.prompt<{ repoPath: string }>([
    {
      type: 'input',
      name: 'repoPath',
      message: 'Repository path to analyze',
      default: process.cwd()
    }
  ]);

  const resolvedRepo = path.resolve(repoPath.trim() || '.');
  const defaultOutput = path.resolve(resolvedRepo, '.context');

  const { outputDir } = await inquirer.prompt<{ outputDir: string }>([
    {
      type: 'input',
      name: 'outputDir',
      message: 'Output directory for generated assets',
      default: defaultOutput
    }
  ]);

  const { includeDocs } = await inquirer.prompt<{ includeDocs: boolean }>([
    {
      type: 'confirm',
      name: 'includeDocs',
      message: 'Generate documentation scaffolding?',
      default: true
    }
  ]);

  let selectedDocs: string[] | undefined;
  if (includeDocs) {
    const { docs } = await inquirer.prompt<{ docs: string[] }>([
      {
        type: 'checkbox',
        name: 'docs',
        message: 'Select documentation guides to scaffold',
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
      message: 'Generate agent playbooks?',
      default: true
    }
  ]);

  let selectedAgents: string[] | undefined;
  if (includeAgents) {
    const { agents } = await inquirer.prompt<{ agents: string[] }>([
      {
        type: 'checkbox',
        name: 'agents',
        message: 'Select agent playbooks to scaffold',
        choices: AGENT_CHOICES,
        default: AGENT_CHOICES.map(choice => choice.value)
      }
    ]);
    selectedAgents = agents;
  } else {
    selectedAgents = [];
  }

  if ((selectedDocs?.length ?? 0) === 0 && (selectedAgents?.length ?? 0) === 0) {
    ui.displayWarning('Nothing selected. Aborting.');
    return;
  }

  const { verbose } = await inquirer.prompt<{ verbose: boolean }>([
    {
      type: 'confirm',
      name: 'verbose',
      message: 'Enable verbose logging?',
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
      message: 'Repository path containing the scaffold',
      default: process.cwd()
    }
  ]);

  const resolvedRepo = path.resolve(repoPath.trim() || '.');
  const defaultOutput = path.resolve(resolvedRepo, '.context');
  const defaultPrompt = path.resolve(process.cwd(), 'prompts/update_scaffold_prompt.md');

  const { outputDir, promptPath } = await inquirer.prompt<{ outputDir: string; promptPath: string }>([
    {
      type: 'input',
      name: 'outputDir',
      message: 'Scaffold directory containing docs/ and agents/',
      default: defaultOutput
    },
    {
      type: 'input',
      name: 'promptPath',
      message: 'Instruction prompt to follow',
      default: defaultPrompt
    }
  ]);

  const { dryRun, processAll } = await inquirer.prompt<{ dryRun: boolean; processAll: boolean }>([
    {
      type: 'confirm',
      name: 'dryRun',
      message: 'Preview changes without writing files?',
      default: true
    },
    {
      type: 'confirm',
      name: 'processAll',
      message: 'Process every Markdown file regardless of markers?',
      default: false
    }
  ]);

  const { limit } = await inquirer.prompt<{ limit: string }>([
    {
      type: 'input',
      name: 'limit',
      message: 'Maximum number of files to update (leave blank for all)',
      filter: (value: string) => value.trim()
    }
  ]);
  const limitValue = limit ? parseInt(limit, 10) : undefined;
  const parsedLimit = Number.isNaN(limitValue) ? undefined : limitValue;

  const { includeDocs } = await inquirer.prompt<{ includeDocs: boolean }>([
    {
      type: 'confirm',
      name: 'includeDocs',
      message: 'Include documentation files?',
      default: true
    }
  ]);

  let selectedDocs: string[] | undefined;
  if (includeDocs) {
    const { docs } = await inquirer.prompt<{ docs: string[] }>([
      {
        type: 'checkbox',
        name: 'docs',
        message: 'Select documentation guides to update',
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
      message: 'Include agent playbooks?',
      default: true
    }
  ]);

  let selectedAgents: string[] | undefined;
  if (includeAgents) {
    const { agents } = await inquirer.prompt<{ agents: string[] }>([
      {
        type: 'checkbox',
        name: 'agents',
        message: 'Select agent playbooks to update',
        choices: AGENT_CHOICES,
        default: AGENT_CHOICES.map(choice => choice.value)
      }
    ]);
    selectedAgents = agents;
  } else {
    selectedAgents = [];
  }

  if ((selectedDocs?.length ?? 0) === 0 && (selectedAgents?.length ?? 0) === 0) {
    ui.displayWarning('Nothing selected. Aborting.');
    return;
  }

  const { specifyModel } = await inquirer.prompt<{ specifyModel: boolean }>([
    {
      type: 'confirm',
      name: 'specifyModel',
      message: 'Override provider/model configuration?',
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
        message: 'Select provider',
        choices: ['openrouter', 'openai', 'anthropic', 'gemini', 'grok']
      }
    ]);
    provider = providerAnswer.provider;
    const modelAnswer = await inquirer.prompt<{ model: string }>([
      {
        type: 'input',
        name: 'model',
        message: 'Model identifier',
        default: DEFAULT_MODEL
      }
    ]);
    model = modelAnswer.model.trim();
  }

  const { provideApiKey } = await inquirer.prompt<{ provideApiKey: boolean }>([
    {
      type: 'confirm',
      name: 'provideApiKey',
      message: 'Provide an API key for this run?',
      default: false
    }
  ]);

  let apiKey: string | undefined;
  if (provideApiKey) {
    const apiKeyAnswer = await inquirer.prompt<{ apiKey: string }>([
      {
        type: 'password',
        name: 'apiKey',
        message: 'API key',
        mask: '*'
      }
    ]);
    apiKey = apiKeyAnswer.apiKey.trim();
  }

  const { verbose } = await inquirer.prompt<{ verbose: boolean }>([
    {
      type: 'confirm',
      name: 'verbose',
      message: 'Enable verbose logging?',
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

async function main(): Promise<void> {
  if (process.argv.length <= 2) {
    await runInteractive();
    return;
  }

  await program.parseAsync(process.argv);
}

main().catch(error => {
  ui.displayError('CLI execution failed', error as Error);
  process.exit(1);
});
