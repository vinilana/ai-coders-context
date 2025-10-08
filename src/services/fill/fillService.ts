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
import type { BaseLLMClient } from '../baseLLMClient';
import { resolveLlmConfig } from '../shared/llmConfig';

export interface FillCommandFlags {
  output?: string;
  prompt?: string;
  include?: string[];
  exclude?: string[];
  verbose?: boolean;
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
  limit?: number;
  provider: LLMConfig['provider'];
  model: string;
  apiKey: string;
  baseUrl?: string;
  systemPrompt: string;
}

type TargetCategory = 'doc' | 'agent' | 'test-plan';

type TargetFormat = 'markdown' | 'json';

interface TargetFile {
  fullPath: string;
  relativePath: string;
  category: TargetCategory;
  format: TargetFormat;
  content: string;
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

    const options: ResolvedFillOptions = {
      repoPath: resolvedRepo,
      outputDir,
      docsDir,
      agentsDir,
      include: rawOptions.include,
      exclude: rawOptions.exclude,
      verbose: Boolean(rawOptions.verbose),
      limit: rawOptions.limit,
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
    this.printLlmSummary(llmClient.getUsageStats(), results);
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
      const userPrompt = this.buildUserPrompt(target, contextSummary);
      const updatedContent = await llmClient.generateText(userPrompt, options.systemPrompt);

      if (!updatedContent || !updatedContent.trim()) {
        this.ui.updateSpinner(this.t('spinner.fill.noContent', { path: target.relativePath }), 'warn');
        return { file: target.relativePath, status: 'skipped', message: this.t('messages.fill.emptyResponse') };
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
    const targets: TargetFile[] = [];

    const docFiles = await glob('**/*.md', { cwd: options.docsDir, absolute: true, nodir: true });
    const agentFiles = await glob('**/*.{json,md}', {
      cwd: options.agentsDir,
      absolute: true,
      nodir: true
    });

    const pushTarget = async (fullPath: string, category: TargetCategory) => {
      const content = await fs.readFile(fullPath, 'utf-8');
      const relativePath = path.relative(options.outputDir, fullPath);
      const format: TargetFormat = path.extname(fullPath).toLowerCase() === '.json' ? 'json' : 'markdown';

      targets.push({ fullPath, relativePath, category, format, content });
    };

    for (const fullPath of docFiles) {
      await pushTarget(fullPath, 'doc');
      if (options.limit && targets.length >= options.limit) {
        return targets;
      }
    }

    for (const fullPath of agentFiles) {
      await pushTarget(fullPath, 'agent');
      if (options.limit && targets.length >= options.limit) {
        return targets;
      }
    }

    const testPlanPath = path.join(options.outputDir, 'test-plan.json');
    if (!options.limit || targets.length < options.limit) {
      if (await fs.pathExists(testPlanPath)) {
        await pushTarget(testPlanPath, 'test-plan');
      }
    }

    return options.limit ? targets.slice(0, options.limit) : targets;
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

  private buildUserPrompt(target: TargetFile, contextSummary: string): string {
    const guidance: string[] = [];

    if (target.format === 'markdown') {
      guidance.push('- Preserve YAML front matter and existing structural headings.');
      guidance.push('- Replace every TODO prompt with concrete information.');
      guidance.push('- Ensure success criteria in the front matter are satisfied.');
      guidance.push('- Return only the full updated Markdown for this file.');
    } else {
      guidance.push('- Return only the full updated JSON for this file.');
      guidance.push('- Keep the existing schema and key ordering intact while resolving TODO placeholders.');
    }

    if (target.category === 'agent') {
      guidance.push('- Keep agent responsibilities, best practices, and references aligned with the latest documentation.');
      if (target.format === 'json') {
        guidance.push('- Preserve arrays such as responsibilities, checklists, and success metrics; update values rather than removing keys.');
      }
    } else if (target.category === 'doc') {
      guidance.push('- Maintain accurate cross-links between docs and referenced resources.');
    } else if (target.category === 'test-plan') {
      guidance.push('- Maintain the frontend and backend scenario collections, keeping scenarioId values stable.');
      guidance.push('- Update Given/When/Then fields with concrete expectations while preserving JSON structure.');
    }

    return [
      `Target file: ${target.relativePath}`,
      'Repository summary:',
      contextSummary,
      '',
      'Guidance:',
      ...guidance,
      '',
      'Current content:',
      '<file>',
      target.content,
      '</file>'
    ].join('\n');
  }

  private printLlmSummary(
    usage: UsageStats,
    results: Array<{ file: string; status: 'updated' | 'skipped' | 'failed'; message?: string }>
  ): void {
    const updated = results.filter(result => result.status === 'updated').length;
    const skipped = results.filter(result => result.status === 'skipped').length;
    const failed = results.filter(result => result.status === 'failed');

    console.log('\n' + chalk.bold('📄 LLM Fill Summary'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`${chalk.blue('Updated files:')} ${chalk.white(updated.toString())}`);
    console.log(`${chalk.blue('Skipped files:')} ${chalk.white(skipped.toString())}`);
    console.log(`${chalk.blue('Failures:')} ${failed.length}`);

    if (usage.totalCalls > 0) {
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`${chalk.blue('LLM calls:')} ${usage.totalCalls}`);
      console.log(`${chalk.blue('Prompt tokens:')} ${usage.totalPromptTokens}`);
      console.log(`${chalk.blue('Completion tokens:')} ${usage.totalCompletionTokens}`);
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
