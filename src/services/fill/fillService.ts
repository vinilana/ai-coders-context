import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import { glob } from 'glob';

import type { CLIInterface } from '../../utils/cliUI';
import type { TranslateFn } from '../../utils/i18n';
import { resolveScaffoldPrompt } from '../../utils/promptLoader';
import { FileMapper } from '../../utils/fileMapper';
import { LLMClientFactory } from '../llmClientFactory';
import type { LLMConfig, RepoStructure, UsageStats } from '../../types';
import { parseDocSelection, parseAgentSelection } from '../../commands/shared/selection';
import { getDocFilesByKeys } from '../../generators/documentation/guideRegistry';
import { getAgentFilesByTypes } from '../../commands/shared/agents';
import type { BaseLLMClient } from '../baseLLMClient';
import { resolveLlmConfig } from '../shared/llmConfig';

export interface FillCommandFlags {
  output?: string;
  prompt?: string;
  docs?: string[];
  agents?: string[];
  include?: string[];
  exclude?: string[];
  verbose?: boolean;
  dryRun?: boolean;
  all?: boolean;
  limit?: number;
  model?: string;
  provider?: LLMConfig['provider'];
  apiKey?: string;
  baseUrl?: string;
}

interface ResolvedFillOptions {
  repoPath: string;
  outputDir: string;
  docsDir: string;
  agentsDir: string;
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
  provider: LLMConfig['provider'];
  model: string;
  apiKey: string;
  baseUrl?: string;
  systemPrompt: string;
}

interface TargetFile {
  fullPath: string;
  relativePath: string;
  isAgent: boolean;
  content: string;
  hasMarkers: boolean;
}

interface FillServiceDependencies {
  ui: CLIInterface;
  t: TranslateFn;
  version: string;
  defaultModel: string;
  fileMapperFactory?: (exclude: string[] | undefined) => FileMapper;
  llmClientFactory?: typeof LLMClientFactory;
}

export class FillService {
  private readonly ui: CLIInterface;
  private readonly t: TranslateFn;
  private readonly version: string;
  private readonly defaultModel: string;
  private readonly fileMapperFactory: (exclude: string[] | undefined) => FileMapper;
  private readonly llmClientFactory: typeof LLMClientFactory;

  constructor(dependencies: FillServiceDependencies) {
    this.ui = dependencies.ui;
    this.t = dependencies.t;
    this.version = dependencies.version;
    this.defaultModel = dependencies.defaultModel;
    this.fileMapperFactory = dependencies.fileMapperFactory ?? ((exclude?: string[]) => new FileMapper(exclude ?? []));
    this.llmClientFactory = dependencies.llmClientFactory ?? LLMClientFactory;
  }

  async run(repoPath: string, rawOptions: FillCommandFlags): Promise<void> {
    const docSelection = parseDocSelection(rawOptions.docs);
    const agentSelection = parseAgentSelection(rawOptions.agents);

    if (docSelection.invalid.length > 0) {
      this.ui.displayWarning(this.t('warnings.docs.unknown', { values: docSelection.invalid.join(', ') }));
    }

    if (agentSelection.invalid.length > 0) {
      this.ui.displayWarning(this.t('warnings.agents.unknown', { values: agentSelection.invalid.join(', ') }));
    }

    const resolvedRepo = path.resolve(repoPath);
    const outputDir = path.resolve(rawOptions.output || './.context');
    const docsDir = path.join(outputDir, 'docs');
    const agentsDir = path.join(outputDir, 'agents');

    await this.ensureDirectoryExists(docsDir, this.t('errors.fill.missingDocsScaffold'));
    await this.ensureDirectoryExists(agentsDir, this.t('errors.fill.missingAgentsScaffold'));

    const llmConfig = await resolveLlmConfig({
      rawOptions: {
        provider: rawOptions.provider,
        model: rawOptions.model,
        apiKey: rawOptions.apiKey,
        baseUrl: rawOptions.baseUrl
      },
      fallbackModel: this.defaultModel,
      t: this.t,
      factory: this.llmClientFactory
    });

    const scaffoldPrompt = await resolveScaffoldPrompt(
      rawOptions.prompt,
      missingPath => this.t('errors.fill.promptMissing', { path: missingPath })
    );

    const docAllowlist = docSelection.explicitNone
      ? new Set<string>()
      : getDocFilesByKeys(docSelection.selected);
    const agentAllowlist = agentSelection.explicitNone
      ? new Set<string>()
      : getAgentFilesByTypes(agentSelection.selected);

    const options: ResolvedFillOptions = {
      repoPath: resolvedRepo,
      outputDir,
      docsDir,
      agentsDir,
      include: rawOptions.include,
      exclude: rawOptions.exclude,
      verbose: Boolean(rawOptions.verbose),
      dryRun: Boolean(rawOptions.dryRun),
      processAll: Boolean(rawOptions.all),
      limit: rawOptions.limit,
      selectedDocKeys: docSelection.selected,
      selectedAgentTypes: agentSelection.selected,
      selectedDocFiles: docAllowlist,
      selectedAgentFiles: agentAllowlist,
      provider: llmConfig.provider,
      model: llmConfig.model,
      apiKey: llmConfig.apiKey,
      baseUrl: llmConfig.baseUrl,
      systemPrompt: scaffoldPrompt.content
    };

    this.displayPromptSource(scaffoldPrompt.path, scaffoldPrompt.source);

    this.ui.displayWelcome(this.version);
    this.ui.displayProjectInfo(options.repoPath, options.outputDir, `fill:${options.provider}`);

    const fileMapper = this.fileMapperFactory(options.exclude);
    this.ui.displayStep(1, 3, this.t('steps.fill.analyze'));
    this.ui.startSpinner(this.t('spinner.repo.scanning'));
    const repoStructure = await fileMapper.mapRepository(options.repoPath, options.include);
    this.ui.updateSpinner(
      this.t('spinner.repo.scanComplete', {
        fileCount: repoStructure.totalFiles,
        directoryCount: repoStructure.directories.length
      }),
      'success'
    );

    const targets = await this.collectTargets(options);
    if (targets.length === 0) {
      this.ui.displayWarning(this.t('warnings.fill.noTargets'));
      return;
    }

    const llmClient = this.llmClientFactory.createClient({
      apiKey: options.apiKey,
      model: options.model,
      provider: options.provider,
      baseUrl: options.baseUrl
    });

    const contextSummary = this.buildContextSummary(repoStructure);
    const results: Array<{ file: string; status: 'updated' | 'skipped' | 'failed'; message?: string }> = [];

    this.ui.displayStep(2, 3, this.t('steps.fill.processFiles', { count: targets.length, model: options.model }));

    for (const target of targets) {
      const result = await this.processTarget(target, llmClient, options, contextSummary);
      results.push(result);
    }

    this.ui.displayStep(3, 3, this.t('steps.fill.summary'));
    this.printLlmSummary(llmClient.getUsageStats(), results, options.dryRun);
    this.ui.displaySuccess(this.t('success.fill.completed'));
  }

  private async processTarget(
    target: TargetFile,
    llmClient: BaseLLMClient,
    options: ResolvedFillOptions,
    contextSummary: string
  ): Promise<{ file: string; status: 'updated' | 'skipped' | 'failed'; message?: string }> {
    this.ui.startSpinner(this.t('spinner.fill.processing', { path: target.relativePath }));

    try {
      const userPrompt = this.buildUserPrompt(target.relativePath, target.content, contextSummary, target.isAgent);
      const updatedContent = await llmClient.generateText(userPrompt, options.systemPrompt);

      if (!updatedContent || !updatedContent.trim()) {
        this.ui.updateSpinner(this.t('spinner.fill.noContent', { path: target.relativePath }), 'warn');
        return { file: target.relativePath, status: 'skipped', message: this.t('messages.fill.emptyResponse') };
      }

      if (options.dryRun) {
        this.ui.updateSpinner(this.t('spinner.fill.dryRunPreview', { path: target.relativePath }), 'info');
        console.log(chalk.gray(`\n${this.t('messages.fill.previewStart')}`));
        console.log(updatedContent.trim());
        console.log(chalk.gray(`${this.t('messages.fill.previewEnd')}\n`));
        return { file: target.relativePath, status: 'skipped', message: 'dry-run' };
      }

      await fs.writeFile(target.fullPath, this.ensureTrailingNewline(updatedContent));
      this.ui.updateSpinner(this.t('spinner.fill.updated', { path: target.relativePath }), 'success');
      return { file: target.relativePath, status: 'updated' };
    } catch (error) {
      this.ui.updateSpinner(this.t('spinner.fill.failed', { path: target.relativePath }), 'fail');
      return {
        file: target.relativePath,
        status: 'failed',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async collectTargets(options: ResolvedFillOptions): Promise<TargetFile[]> {
    const docFiles = await glob('**/*.md', { cwd: options.docsDir, absolute: true });
    const agentFiles = await glob('**/*.md', { cwd: options.agentsDir, absolute: true });
    const candidates = [...docFiles, ...agentFiles];

    const targets: TargetFile[] = [];

    for (const fullPath of candidates) {
      const content = await fs.readFile(fullPath, 'utf-8');
      const hasMarkers = /<!--\s*ai-task:/.test(content) || /<!--\s*ai-slot:/.test(content) || /TODO/.test(content);
      const isAgent = fullPath.includes(`${path.sep}agents${path.sep}`);
      const fileName = path.basename(fullPath);

      if (isAgent) {
        if (options.selectedAgentFiles && !options.selectedAgentFiles.has(fileName)) {
          continue;
        }
      } else if (options.selectedDocFiles && !options.selectedDocFiles.has(fileName)) {
        continue;
      }

      const explicitSelection = isAgent ? Boolean(options.selectedAgentFiles) : Boolean(options.selectedDocFiles);
      const shouldInclude =
        options.processAll ||
        hasMarkers ||
        (explicitSelection && (isAgent ? options.selectedAgentFiles!.has(fileName) : options.selectedDocFiles!.has(fileName)));

      if (!shouldInclude) {
        continue;
      }

      const relativePath = path.relative(options.outputDir, fullPath);
      targets.push({ fullPath, relativePath, isAgent, content, hasMarkers });

      if (options.limit && targets.length >= options.limit) {
        break;
      }
    }

    return targets;
  }

  private displayPromptSource(promptPath: string | undefined, source: 'custom' | 'package' | 'builtin'): void {
    if (source === 'custom' && promptPath) {
      this.ui.displayInfo(
        this.t('info.prompt.title'),
        this.t('info.prompt.usingCustom', { path: this.displayablePath(promptPath) })
      );
      return;
    }

    if (source === 'package' && promptPath) {
      this.ui.displayInfo(
        this.t('info.prompt.title'),
        this.t('info.prompt.usingPackage', { path: this.displayablePath(promptPath) })
      );
      return;
    }

    this.ui.displayInfo(this.t('info.prompt.title'), this.t('info.prompt.usingBundled'));
  }

  private displayablePath(promptPath: string): string {
    const relative = path.relative(process.cwd(), promptPath);
    return relative || promptPath;
  }

  private async ensureDirectoryExists(dir: string, message: string): Promise<void> {
    const exists = await fs.pathExists(dir);
    if (!exists) {
      throw new Error(message);
    }
  }

  private buildContextSummary(repoStructure: RepoStructure): string {
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

  private buildUserPrompt(relativePath: string, currentContent: string, contextSummary: string, isAgent: boolean): string {
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

  private printLlmSummary(
    usage: UsageStats,
    results: Array<{ file: string; status: 'updated' | 'skipped' | 'failed'; message?: string }>,
    dryRun: boolean
  ): void {
    const updated = results.filter(result => result.status === 'updated').length;
    const skipped = results.filter(result => result.status === 'skipped').length;
    const failed = results.filter(result => result.status === 'failed');

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
      failed.forEach(item => {
        console.log(`${chalk.red('✖')} ${chalk.white(item.file)} — ${chalk.gray(item.message || 'Unknown error')}`);
      });
    }
  }

  private ensureTrailingNewline(content: string): string {
    return content.endsWith('\n') ? content : `${content}\n`;
  }
}
