#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import { glob } from 'glob';
import * as dotenv from 'dotenv';
import chalk from 'chalk';

import { FileMapper } from './utils/fileMapper';
import { DocumentationGenerator } from './generators/documentation/documentationGenerator';
import { AgentGenerator } from './generators/agents/agentGenerator';
import { CLIInterface } from './utils/cliUI';
import { LLMClientFactory } from './services/llmClientFactory';
import { LLMConfig, RepoStructure, UsageStats } from './types';

dotenv.config();

const program = new Command();
const ui = new CLIInterface();
const VERSION = '0.3.0';
const DEFAULT_MODEL = 'x-ai/grok-4-fast:free';

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

program.parseAsync(process.argv);

interface InitOptions {
  repoPath: string;
  outputDir: string;
  include?: string[];
  exclude?: string[];
  verbose: boolean;
  scaffoldDocs: boolean;
  scaffoldAgents: boolean;
}

async function runInit(repoPath: string, type: string, rawOptions: any): Promise<void> {
  const resolvedType = resolveScaffoldType(type, rawOptions);

  const options: InitOptions = {
    repoPath: path.resolve(repoPath),
    outputDir: path.resolve(rawOptions.output || './.context'),
    include: rawOptions.include,
    exclude: rawOptions.exclude || [],
    verbose: rawOptions.verbose || false,
    scaffoldDocs: resolvedType === 'docs' || resolvedType === 'both',
    scaffoldAgents: resolvedType === 'agents' || resolvedType === 'both'
  };

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
    docsGenerated = await docGenerator.generateDocumentation(repoStructure, options.outputDir, {}, options.verbose);
    ui.updateSpinner(`Documentation scaffold created (${docsGenerated} files)`, 'success');
  }

  if (options.scaffoldAgents) {
    ui.displayStep(3, options.scaffoldDocs ? 3 : 2, 'Scaffolding agent playbooks');
    ui.startSpinner('Creating agent directory and templates...');
    agentsGenerated = await agentGenerator.generateAgentPrompts(repoStructure, options.outputDir, options.verbose);
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
    limit: rawOptions.limit
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

  const targets = await collectTargets(docsDir, agentsDir, options.processAll, options.limit);
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
  limit?: number
): Promise<TargetFile[]> {
  const docFiles = await glob('**/*.md', { cwd: docsDir, absolute: true });
  const agentFiles = await glob('**/*.md', { cwd: agentsDir, absolute: true });
  const candidates = [...docFiles, ...agentFiles];

  const targets: TargetFile[] = [];
  for (const fullPath of candidates) {
    const content = await fs.readFile(fullPath, 'utf-8');
    const hasMarkers = /<!--\s*ai-task:/.test(content) || /<!--\s*ai-slot:/.test(content) || /TODO/.test(content);
    const isAgent = fullPath.includes(`${path.sep}agents${path.sep}`);
    if (processAll || hasMarkers || isAgent) {
      targets.push({ fullPath, hasMarkers, isAgent });
    }
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
