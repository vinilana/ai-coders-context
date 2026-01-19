import * as path from 'path';
import * as fs from 'fs-extra';
import { glob } from 'glob';

import { colors, symbols, typography } from '../../utils/theme';

import type { CLIInterface } from '../../utils/cliUI';
import type { TranslateFn } from '../../utils/i18n';
import { LLMClientFactory } from '../llmClientFactory';
import { SkillAgent } from '../ai/agents/skillAgent';
import type { AgentEventCallbacks } from '../ai/agentEvents';
import type { LLMConfig } from '../../types';
import { resolveLlmConfig } from '../shared/llmConfig';
import { createSkillRegistry } from '../../workflow/skills';
import {
  getScaffoldStructure,
  serializeStructureForAI,
} from '../../generators/shared/scaffoldStructures';

export interface SkillFillCommandFlags {
  output?: string;
  skills?: string[];
  force?: boolean;
  verbose?: boolean;
  limit?: number;
  model?: string;
  provider?: LLMConfig['provider'];
  apiKey?: string;
  baseUrl?: string;
  /** Use pre-computed semantic context instead of tool-based exploration */
  semantic?: boolean;
  /** Enable LSP for deeper semantic analysis */
  useLsp?: boolean;
}

interface ResolvedSkillFillOptions {
  repoPath: string;
  outputDir: string;
  skillsDir: string;
  skills?: string[];
  force: boolean;
  verbose: boolean;
  limit?: number;
  provider: LLMConfig['provider'];
  model: string;
  apiKey: string;
  baseUrl?: string;
  useSemanticContext: boolean;
  useLSP: boolean;
}

interface SkillFillServiceDependencies {
  ui: CLIInterface;
  t: TranslateFn;
  version: string;
  defaultModel: string;
  llmClientFactory?: typeof LLMClientFactory;
}

export interface SkillFillResult {
  filled: string[];
  skipped: string[];
  failed: Array<{ skill: string; error: string }>;
  model: string;
}

export class SkillFillService {
  private readonly ui: CLIInterface;
  private readonly t: TranslateFn;
  private readonly version: string;
  private readonly defaultModel: string;
  private readonly llmClientFactory: typeof LLMClientFactory;

  constructor(dependencies: SkillFillServiceDependencies) {
    this.ui = dependencies.ui;
    this.t = dependencies.t;
    this.version = dependencies.version;
    this.defaultModel = dependencies.defaultModel;
    this.llmClientFactory = dependencies.llmClientFactory ?? LLMClientFactory;
  }

  async run(repoPath: string, rawOptions: SkillFillCommandFlags): Promise<SkillFillResult> {
    const resolvedRepo = path.resolve(repoPath);
    const outputDir = path.resolve(rawOptions.output || './.context');
    const skillsDir = path.join(outputDir, 'skills');

    // Skills directory must exist
    const skillsExists = await fs.pathExists(skillsDir);
    if (!skillsExists) {
      throw new Error(this.t('errors.skill.missingScaffold'));
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

    const options: ResolvedSkillFillOptions = {
      repoPath: resolvedRepo,
      outputDir,
      skillsDir,
      skills: rawOptions.skills,
      force: Boolean(rawOptions.force),
      verbose: Boolean(rawOptions.verbose),
      limit: rawOptions.limit,
      provider: llmConfig.provider,
      model: llmConfig.model,
      apiKey: llmConfig.apiKey,
      baseUrl: llmConfig.baseUrl,
      useSemanticContext: rawOptions.semantic !== false,
      useLSP: Boolean(rawOptions.useLsp)
    };

    this.ui.displayWelcome(this.version);
    this.ui.displayProjectInfo(options.repoPath, options.outputDir, `skill-fill:${options.provider}`);

    // Step 1: Discover skills
    this.ui.displayStep(1, 4, this.t('steps.skill.discover'));
    this.ui.startSpinner(this.t('spinner.skill.discovering'));

    const registry = createSkillRegistry(options.repoPath);
    const discovered = await registry.discoverAll();

    // Filter to scaffolded skills only (or specified subset)
    let targetSkills = discovered.all.filter(s => !s.isBuiltIn || fs.existsSync(
      path.join(skillsDir, s.slug, 'SKILL.md')
    ));

    // If specific skills requested, filter further
    if (options.skills && options.skills.length > 0) {
      targetSkills = targetSkills.filter(s => options.skills!.includes(s.slug));
    }

    // Apply limit
    if (options.limit && options.limit > 0) {
      targetSkills = targetSkills.slice(0, options.limit);
    }

    this.ui.updateSpinner(
      this.t('spinner.skill.discovered', { count: targetSkills.length }),
      'success'
    );

    if (targetSkills.length === 0) {
      this.ui.displayWarning(this.t('warnings.skill.noTargets'));
      return {
        filled: [],
        skipped: [],
        failed: [],
        model: options.model
      };
    }

    // Step 2: Load docs and agents context
    this.ui.displayStep(2, 4, this.t('steps.skill.loadContext'));
    this.ui.startSpinner(this.t('spinner.skill.loadingContext'));

    const { docsContext, agentsContext } = await this.loadContextDocs(options.repoPath, options.outputDir);

    this.ui.updateSpinner(
      this.t('spinner.skill.contextLoaded', {
        docsSize: docsContext.length,
        agentsSize: agentsContext.length
      }),
      'success'
    );

    // Step 3: Fill each skill
    this.ui.displayStep(3, 4, this.t('steps.skill.fillSkills', { count: targetSkills.length, model: options.model }));

    const result: SkillFillResult = {
      filled: [],
      skipped: [],
      failed: [],
      model: options.model
    };

    const callbacks = this.ui.createAgentCallbacks();
    const llmConfigForAgent: LLMConfig = {
      apiKey: options.apiKey,
      model: options.model,
      provider: options.provider,
      baseUrl: options.baseUrl
    };

    for (const skill of targetSkills) {
      const skillPath = path.join(skillsDir, skill.slug, 'SKILL.md');
      const skillResult = await this.fillSkill(
        skill.slug,
        skillPath,
        skill.content || '',
        llmConfigForAgent,
        docsContext,
        agentsContext,
        options,
        callbacks
      );

      if (skillResult.status === 'filled') {
        result.filled.push(skill.slug);
      } else if (skillResult.status === 'skipped') {
        result.skipped.push(skill.slug);
      } else {
        result.failed.push({ skill: skill.slug, error: skillResult.error || 'Unknown error' });
      }
    }

    // Step 4: Summary
    this.ui.displayStep(4, 4, this.t('steps.skill.summary'));
    this.printSkillFillSummary(result, options.model);

    return result;
  }

  private async loadContextDocs(
    repoPath: string,
    outputDir: string
  ): Promise<{ docsContext: string; agentsContext: string }> {
    const docsDir = path.join(outputDir, 'docs');
    const agentsDir = path.join(outputDir, 'agents');

    let docsContext = '';
    let agentsContext = '';

    // Load key docs files
    if (await fs.pathExists(docsDir)) {
      const keyDocs = ['README.md', 'architecture.md', 'overview.md', 'development.md'];
      for (const doc of keyDocs) {
        const docPath = path.join(docsDir, doc);
        if (await fs.pathExists(docPath)) {
          const content = await fs.readFile(docPath, 'utf-8');
          if (content.length > 100) { // Only include if has meaningful content
            docsContext += `\n### ${doc}\n${content.slice(0, 2000)}\n`;
          }
        }
      }
    }

    // Load key agent files
    if (await fs.pathExists(agentsDir)) {
      const agentFiles = await glob('*.md', { cwd: agentsDir });
      for (const agentFile of agentFiles.slice(0, 5)) { // Limit to 5 agents
        const agentPath = path.join(agentsDir, agentFile);
        const content = await fs.readFile(agentPath, 'utf-8');
        if (content.length > 100) {
          agentsContext += `\n### ${agentFile}\n${content.slice(0, 1500)}\n`;
        }
      }
    }

    return { docsContext, agentsContext };
  }

  private async fillSkill(
    skillSlug: string,
    skillPath: string,
    existingContent: string,
    llmConfig: LLMConfig,
    docsContext: string,
    agentsContext: string,
    options: ResolvedSkillFillOptions,
    callbacks: AgentEventCallbacks
  ): Promise<{ status: 'filled' | 'skipped' | 'failed'; error?: string }> {
    console.log(''); // Add spacing before agent output

    try {
      // Load scaffold structure for this skill
      const scaffoldStructure = getScaffoldStructure(skillSlug);
      const structureContext = scaffoldStructure
        ? serializeStructureForAI(scaffoldStructure)
        : undefined;

      const skillAgent = new SkillAgent(llmConfig);

      const result = await skillAgent.generateSkill({
        repoPath: options.repoPath,
        skillSlug,
        existingContent,
        docsContext,
        agentsContext,
        useSemanticContext: options.useSemanticContext,
        useLSP: options.useLSP,
        callbacks,
        scaffoldStructure: structureContext,
      });

      if (!result.text || !result.text.trim()) {
        console.log('');
        this.ui.displayWarning(this.t('spinner.skill.noContent', { skill: skillSlug }));
        return { status: 'skipped' };
      }

      // Ensure directory exists
      await fs.ensureDir(path.dirname(skillPath));

      // Write the result
      await fs.writeFile(skillPath, this.ensureTrailingNewline(result.text));

      console.log('');
      this.ui.displaySuccess(this.t('spinner.skill.filled', { skill: skillSlug }));
      return { status: 'filled' };
    } catch (error) {
      console.log('');
      this.ui.displayError(this.t('spinner.skill.failed', { skill: skillSlug }), error as Error);
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private printSkillFillSummary(result: SkillFillResult, model: string): void {
    console.log('');
    console.log(typography.separator());
    console.log(typography.header('Skill Fill Summary'));
    console.log('');
    console.log(typography.labeledValue('Filled', result.filled.length.toString()));
    console.log(typography.labeledValue('Skipped', result.skipped.length.toString()));
    console.log(typography.labeledValue('Failed', result.failed.length.toString()));
    console.log(typography.labeledValue('Model', model));

    if (result.filled.length > 0) {
      console.log('');
      console.log(colors.success(`${symbols.success} Filled skills:`));
      for (const skill of result.filled) {
        console.log(`  ${colors.primary(skill)}`);
      }
    }

    if (result.failed.length > 0) {
      console.log('');
      console.log(colors.error(`${symbols.error} Failed skills:`));
      for (const item of result.failed) {
        console.log(`  ${colors.error(symbols.error)} ${colors.primary(item.skill)}`);
        console.log(`    ${colors.secondaryDim(item.error)}`);
      }
    }
    console.log('');
  }

  private ensureTrailingNewline(content: string): string {
    return content.endsWith('\n') ? content : `${content}\n`;
  }
}
