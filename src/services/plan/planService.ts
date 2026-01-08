import * as path from 'path';
import * as fs from 'fs-extra';

import { colors, symbols, typography } from '../../utils/theme';
import type { CLIInterface } from '../../utils/cliUI';
import type { TranslateFn } from '../../utils/i18n';
import { PlanGenerator } from '../../generators/plans/planGenerator';
import { GeneratorUtils } from '../../generators/shared';
import { resolvePlanPrompt } from '../../utils/promptLoader';
import { resolveLlmConfig } from '../shared/llmConfig';
import { FileMapper } from '../../utils/fileMapper';
import { LLMClientFactory } from '../llmClientFactory';
import { PlanAgent } from '../ai/agents/planAgent';
import type { LLMConfig, RepoStructure } from '../../types';

interface PlanScaffoldOptions {
  title?: string;
  summary?: string;
  force?: boolean;
  verbose?: boolean;
}

export interface PlanFillFlags {
  output?: string;
  repo?: string;
  prompt?: string;
  include?: string[];
  exclude?: string[];
  dryRun?: boolean;
  provider?: LLMConfig['provider'];
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  /** Enable/disable LSP analysis (ON by default for plan, use --no-lsp to disable) */
  lsp?: boolean;
}

interface PlanServiceDependencies {
  ui: CLIInterface;
  t: TranslateFn;
  version: string;
  defaultModel: string;
  planGenerator?: PlanGenerator;
  fileMapperFactory?: (exclude: string[] | undefined) => FileMapper;
  llmClientFactory?: typeof LLMClientFactory;
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

export class PlanService {
  private readonly ui: CLIInterface;
  private readonly t: TranslateFn;
  private readonly version: string;
  private readonly defaultModel: string;
  private readonly planGenerator: PlanGenerator;
  private readonly fileMapperFactory: (exclude: string[] | undefined) => FileMapper;
  private readonly llmClientFactory: typeof LLMClientFactory;

  constructor(dependencies: PlanServiceDependencies) {
    this.ui = dependencies.ui;
    this.t = dependencies.t;
    this.version = dependencies.version;
    this.defaultModel = dependencies.defaultModel;
    this.planGenerator = dependencies.planGenerator ?? new PlanGenerator();
    this.fileMapperFactory = dependencies.fileMapperFactory ?? ((exclude?: string[]) => new FileMapper(exclude ?? []));
    this.llmClientFactory = dependencies.llmClientFactory ?? LLMClientFactory;
  }

  async scaffoldPlanIfNeeded(planName: string, outputDir: string, options: PlanScaffoldOptions): Promise<void> {
    const resolvedOutput = path.resolve(outputDir);
    const plansDir = path.join(resolvedOutput, 'plans');

    const normalizedInput = planName.replace(/\.md$/i, '');
    const slug = GeneratorUtils.slugify(normalizedInput);
    if (!slug) {
      throw new Error(this.t('errors.plan.invalidName'));
    }

    const planPath = path.join(plansDir, `${slug}.md`);
    const planExists = await fs.pathExists(planPath);

    if (planExists && !options.force) {
      return;
    }

    const result = await this.planGenerator.generatePlan({
      planName,
      outputDir: resolvedOutput,
      title: options.title,
      summary: options.summary,
      selectedAgentTypes: undefined,
      selectedDocKeys: undefined,
      force: Boolean(options.force),
      verbose: Boolean(options.verbose)
    });

    const relativePath = result.relativePath;
    const message = planExists && options.force
      ? this.t('messages.plan.regenerated', { path: relativePath })
      : this.t('messages.plan.created', { path: relativePath });
    this.ui.displayInfo(this.t('info.plan.scaffolded.title'), message);
  }

  async fillPlan(planName: string, rawOptions: PlanFillFlags): Promise<void> {
    const outputDir = path.resolve(rawOptions.output || './.context');
    const plansDir = path.join(outputDir, 'plans');
    await this.ensureDirectoryExists(plansDir, this.t('errors.plan.missingPlansDir'));

    const planPath = await this.resolvePlanPath(planName, plansDir);

    const docsDir = path.join(outputDir, 'docs');
    const agentsDir = path.join(outputDir, 'agents');
    await this.ensureDirectoryExists(docsDir, this.t('errors.fill.missingDocsScaffold'));
    await this.ensureDirectoryExists(agentsDir, this.t('errors.fill.missingAgentsScaffold'));

    const repoPath = path.resolve(rawOptions.repo || process.cwd());
    if (!(await fs.pathExists(repoPath))) {
      throw new Error(this.t('errors.common.repoMissing', { path: repoPath }));
    }

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

    const planPrompt = await resolvePlanPrompt(
      rawOptions.prompt,
      missingPath => this.t('errors.fill.promptMissing', { path: missingPath })
    );

    const planContent = await fs.readFile(planPath, 'utf-8');
    const docsIndexPath = path.join(docsDir, 'README.md');
    const agentsIndexPath = path.join(agentsDir, 'README.md');
    const docsIndex = (await fs.pathExists(docsIndexPath)) ? await fs.readFile(docsIndexPath, 'utf-8') : undefined;
    const agentsIndex = (await fs.pathExists(agentsIndexPath)) ? await fs.readFile(agentsIndexPath, 'utf-8') : undefined;

    const referencedDocs = await this.loadReferencedMarkdown(docsDir, this.extractPlanReferences(planContent, 'docs'));
    const referencedAgents = await this.loadReferencedMarkdown(agentsDir, this.extractPlanReferences(planContent, 'agents'));

    this.displayPromptSource(planPrompt.path, planPrompt.source);

    this.ui.displayWelcome(this.version);
    this.ui.displayProjectInfo(repoPath, outputDir, `plan-fill:${llmConfig.provider}`);

    const fileMapper = this.fileMapperFactory(rawOptions.exclude);
    this.ui.displayStep(1, 3, this.t('steps.plan.summary'));
    this.ui.startSpinner(this.t('spinner.planFill.analyzingRepo'));
    const repoStructure = await fileMapper.mapRepository(repoPath, rawOptions.include);
    this.ui.updateSpinner(this.t('spinner.planFill.summaryReady'), 'success');

    // Create the PlanAgent with callbacks for real-time display
    const planAgent = new PlanAgent({
      apiKey: llmConfig.apiKey,
      model: llmConfig.model,
      provider: llmConfig.provider,
      baseUrl: llmConfig.baseUrl
    });

    const callbacks = this.ui.createAgentCallbacks();

    const planRelativePath = path.relative(outputDir, planPath);
    const results: Array<{ file: string; status: 'updated' | 'skipped' | 'failed'; message?: string }> = [];

    this.ui.displayStep(2, 3, this.t('steps.plan.update', { path: planRelativePath, model: llmConfig.model }));
    console.log(''); // Add spacing before agent output

    // LSP is ON by default for plan (use --no-lsp to disable)
    const useLSP = rawOptions.lsp !== false;

    try {
      const agentResult = await planAgent.updatePlan({
        repoPath,
        planName: path.basename(planPath, '.md'),
        existingPlanContent: planContent,
        docsIndex,
        agentsIndex,
        referencedDocs,
        referencedAgents,
        callbacks,
        useLSP
      });

      const updatedContent = agentResult.text;

      if (!updatedContent || !updatedContent.trim()) {
        console.log(''); // Spacing after agent output
        this.ui.displayWarning(this.t('spinner.planFill.noContent'));
        results.push({ file: planRelativePath, status: 'skipped', message: this.t('messages.fill.emptyResponse') });
      } else if (rawOptions.dryRun) {
        console.log(''); // Spacing after agent output
        this.ui.displayInfo(this.t('spinner.planFill.dryRun'), '');
        console.log(colors.secondaryDim(`\n${this.t('messages.fill.previewStart')}`));
        console.log(updatedContent.trim());
        console.log(colors.secondaryDim(`${this.t('messages.fill.previewEnd')}\n`));
        results.push({ file: planRelativePath, status: 'skipped', message: 'dry-run' });
      } else {
        await fs.writeFile(planPath, this.ensureTrailingNewline(updatedContent));
        console.log(''); // Spacing after agent output
        this.ui.displaySuccess(this.t('spinner.planFill.updated', { path: planRelativePath }));
        results.push({ file: planRelativePath, status: 'updated' });
      }
    } catch (error) {
      console.log(''); // Spacing after agent output
      this.ui.displayError(this.t('spinner.planFill.failed'), error as Error);
      results.push({
        file: planRelativePath,
        status: 'failed',
        message: error instanceof Error ? error.message : String(error)
      });
    }

    this.ui.displayStep(3, 3, this.t('steps.plan.summaryResults'));
    this.printLlmSummarySimple(results, Boolean(rawOptions.dryRun), llmConfig.model);
    this.ui.displaySuccess(this.t('success.plan.filled'));
  }

  private async resolvePlanPath(planName: string, plansDir: string): Promise<string> {
    const normalizedInput = planName.replace(/\.md$/i, '');
    const slug = GeneratorUtils.slugify(normalizedInput);
    if (!slug) {
      throw new Error(this.t('errors.plan.invalidName'));
    }

    const candidateFiles = new Set<string>();
    candidateFiles.add(path.join(plansDir, `${slug}.md`));
    if (planName.toLowerCase().endsWith('.md')) {
      candidateFiles.add(path.join(plansDir, planName));
    }

    for (const candidate of candidateFiles) {
      if (await fs.pathExists(candidate)) {
        return candidate;
      }
    }

    const expected = Array.from(candidateFiles).map(file => path.relative(process.cwd(), file)).join(' or ');
    throw new Error(this.t('errors.plan.notFound', { expected }));
  }

  private async ensureDirectoryExists(dir: string, message: string): Promise<void> {
    const exists = await fs.pathExists(dir);
    if (!exists) {
      throw new Error(message);
    }
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

  private buildPlanUserPrompt(context: PlanPromptContext): string {
    const guidance = [
      '- Preserve the YAML front matter and `agent-update` wrapper already in the plan.',
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
        'Agent index (agents/README.md):',
        '<agents-index>',
        context.agentsIndex,
        '</agents-index>'
      );
    }

    if (context.docs.length > 0) {
      const docSections = context.docs
        .map(doc => `Path: ${doc.path}\n<doc>\n${doc.content}\n</doc>`)
        .join('\n\n');
      sections.push('', 'Referenced documentation:', docSections);
    }

    if (context.agents.length > 0) {
      const agentSections = context.agents
        .map(agent => `Path: ${agent.path}\n<agent>\n${agent.content}\n</agent>`)
        .join('\n\n');
      sections.push('', 'Referenced agents:', agentSections);
    }

    return sections.join('\n');
  }

  private async loadReferencedMarkdown(baseDir: string, references: Set<string>): Promise<Array<{ path: string; content: string }>> {
    const results: Array<{ path: string; content: string }> = [];
    const seen = new Set<string>();

    for (const reference of references) {
      const normalized = reference.replace(/^\.\/+/, '');
      if (seen.has(normalized)) {
        continue;
      }

      const fullPath = path.join(baseDir, normalized);
      if (!(await fs.pathExists(fullPath))) {
        continue;
      }

      const content = await fs.readFile(fullPath, 'utf-8');
      results.push({ path: normalized, content });
      seen.add(normalized);
    }

    return results;
  }

  private extractPlanReferences(content: string, type: 'docs' | 'agents'): Set<string> {
    const regex = new RegExp(`\[.+?\]\(\.{2}\/${type}/([^\)]+)\)`, 'g');
    const matches = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      matches.add(match[1]);
    }

    return matches;
  }

  private ensureTrailingNewline(content: string): string {
    return content.endsWith('\n') ? content : `${content}\n`;
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

  private printLlmSummarySimple(
    results: Array<{ file: string; status: 'updated' | 'skipped' | 'failed'; message?: string }>,
    dryRun: boolean,
    model: string
  ): void {
    const updated = results.filter(result => result.status === 'updated').length;
    const skipped = results.filter(result => result.status === 'skipped').length;
    const failed = results.filter(result => result.status === 'failed');

    console.log('');
    console.log(typography.separator());
    console.log(typography.header('Plan Fill Summary'));
    console.log('');
    console.log(typography.labeledValue('Updated', updated.toString()));
    console.log(typography.labeledValue('Skipped', `${skipped}${dryRun ? ' (dry run)' : ''}`));
    console.log(typography.labeledValue('Failed', failed.length.toString()));
    console.log(typography.labeledValue('Model', model));

    if (failed.length > 0) {
      console.log('');
      failed.forEach(item => {
        console.log(`  ${colors.error(symbols.error)} ${colors.primary(item.file)}`);
        if (item.message) {
          console.log(`    ${colors.secondaryDim(item.message)}`);
        }
      });
    }
    console.log('');
  }
}
