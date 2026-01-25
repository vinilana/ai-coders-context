/**
 * Quick Sync Service
 *
 * Unified sync operation that synchronizes agents, exports skills,
 * and optionally updates documentation in one command.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import type { CLIInterface } from '../../utils/cliUI';
import type { TranslateFn } from '../../utils/i18n';
import { SyncService } from '../sync';
import { SkillExportService, ExportRulesService, CommandExportService } from '../export';
import { StateDetector } from '../state';
import { createSkillRegistry } from '../../workflow/skills';

export interface QuickSyncServiceDependencies {
  ui: CLIInterface;
  t: TranslateFn;
  version: string;
  defaultModel?: string;
}

export interface QuickSyncOptions {
  /** Skip agents sync */
  skipAgents?: boolean;
  /** Skip skills export */
  skipSkills?: boolean;
  /** Skip commands export */
  skipCommands?: boolean;
  /** Skip docs update prompt */
  skipDocs?: boolean;
  /** Force overwrite */
  force?: boolean;
  /** Dry run mode */
  dryRun?: boolean;
  /** Verbose output */
  verbose?: boolean;
  /** Selected agent sync targets (e.g., ['claude', 'github']). If not set, syncs to all. */
  agentTargets?: string[];
  /** Selected skill export targets (e.g., ['claude', 'gemini']). If not set, exports to all. */
  skillTargets?: string[];
  /** Selected doc export targets (e.g., ['cursor', 'claude']). If not set, exports to all. */
  docTargets?: string[];
  /** Selected command export targets (e.g., ['claude', 'cursor']). If not set, exports to all. */
  commandTargets?: string[];
  /** LLM config for docs update */
  llmConfig?: {
    provider?: string;
    model?: string;
    apiKey?: string;
    baseUrl?: string;
  };
}

export interface QuickSyncResult {
  agentsSynced: number;
  skillsExported: number;
  commandsExported: number;
  docsUpdated: boolean;
  errors: string[];
}

export class QuickSyncService {
  private readonly ui: CLIInterface;
  private readonly t: TranslateFn;
  private readonly version: string;
  private readonly defaultModel: string;

  constructor(deps: QuickSyncServiceDependencies) {
    this.ui = deps.ui;
    this.t = deps.t;
    this.version = deps.version;
    this.defaultModel = deps.defaultModel || 'anthropic/claude-sonnet-4';
  }

  /**
   * Run unified sync operation
   */
  async run(repoPath: string, options: QuickSyncOptions = {}): Promise<QuickSyncResult> {
    const absolutePath = path.resolve(repoPath);

    const defaultTargets = {
      agents: ['github', 'claude', 'cursor'],
      skills: ['codex', 'antigravity', 'github', 'claude', 'cursor'],
      commands: ['antigravity', 'claude', 'cursor'],
      rules: ['claude'],
    } as const;

    const result: QuickSyncResult = {
      agentsSynced: 0,
      skillsExported: 0,
      commandsExported: 0,
      docsUpdated: false,
      errors: [],
    };

    // Step 1: Sync agents
    if (!options.skipAgents) {
      try {
        this.ui.startSpinner(this.t('prompts.quickSync.syncing.agents'));

        const agentsPath = path.join(absolutePath, '.context', 'agents');
        if (await fs.pathExists(agentsPath)) {
          const syncService = new SyncService({
            ui: this.ui,
            t: this.t,
            version: this.version,
          });

          // Use selected targets (preset names) or default to 'all' preset
          // SyncService now understands preset names in the target array
          const hasCustomTargets = options.agentTargets && options.agentTargets.length > 0;

          await syncService.run({
            source: agentsPath,
            preset: undefined,
            target: hasCustomTargets ? options.agentTargets : [...defaultTargets.agents],
            force: options.force,
            dryRun: options.dryRun,
            verbose: false,
          });

          // Count synced files
          const files = await fs.readdir(agentsPath);
          result.agentsSynced = files.filter(f => f.endsWith('.md')).length;

          const targetInfo = hasCustomTargets
            ? `to ${options.agentTargets!.join(', ')}`
            : 'to all targets';
          this.ui.updateSpinner(`${result.agentsSynced} agents synced ${targetInfo}`, 'success');
        } else {
          this.ui.updateSpinner('No agents to sync', 'info');
        }
      } catch (error) {
        this.ui.updateSpinner('Failed to sync agents', 'fail');
        result.errors.push(error instanceof Error ? error.message : String(error));
      } finally {
        this.ui.stopSpinner();
      }
    }

    // Step 2: Export skills
    if (!options.skipSkills) {
      try {
        this.ui.startSpinner(this.t('prompts.quickSync.syncing.skills'));

        const skillsPath = path.join(absolutePath, '.context', 'skills');
        if (await fs.pathExists(skillsPath)) {
          const skillExportService = new SkillExportService({
            ui: this.ui,
            t: this.t,
            version: this.version,
          });

          // Use selected targets (preset names) or default to 'all' preset
          // SkillExportService now understands preset names in the targets array
          const hasCustomTargets = options.skillTargets && options.skillTargets.length > 0;

          const exportResult = await skillExportService.run(absolutePath, {
            preset: undefined,
            targets: hasCustomTargets ? options.skillTargets : [...defaultTargets.skills],
            force: options.force,
            dryRun: options.dryRun,
            verbose: false,
            includeBuiltIn: true,
          });

          result.skillsExported = exportResult.skillsExported.length;
          const targetInfo = hasCustomTargets
            ? `to ${options.skillTargets!.join(', ')}`
            : 'to all targets';
          this.ui.updateSpinner(`${result.skillsExported} skills exported ${targetInfo}`, 'success');
        } else {
          this.ui.updateSpinner('No skills to export', 'info');
        }
      } catch (error) {
        this.ui.updateSpinner('Failed to export skills', 'fail');
        result.errors.push(error instanceof Error ? error.message : String(error));
      } finally {
        this.ui.stopSpinner();
      }
    }

    // Step 3: Export commands
    if (!options.skipCommands) {
      try {
        this.ui.startSpinner(this.t('prompts.quickSync.syncing.commands'));

        const commandsPath = path.join(absolutePath, '.context', 'commands');
        if (await fs.pathExists(commandsPath)) {
          const commandExportService = new CommandExportService({
            ui: this.ui,
            t: this.t,
            version: this.version,
          });

          const hasCustomTargets = options.commandTargets && options.commandTargets.length > 0;

          const exportResult = await commandExportService.run(absolutePath, {
            preset: undefined,
            targets: hasCustomTargets ? options.commandTargets : [...defaultTargets.commands],
            force: options.force,
            dryRun: options.dryRun,
            verbose: false,
          });

          result.commandsExported = exportResult.commandsExported.length;
          const targetInfo = hasCustomTargets
            ? `to ${options.commandTargets!.join(', ')}`
            : 'to all targets';
          this.ui.updateSpinner(`${result.commandsExported} commands exported ${targetInfo}`, 'success');
        } else {
          this.ui.updateSpinner('No commands to export', 'info');
        }
      } catch (error) {
        this.ui.updateSpinner('Failed to export commands', 'fail');
        result.errors.push(error instanceof Error ? error.message : String(error));
      } finally {
        this.ui.stopSpinner();
      }
    }

    // Step 3: Export docs/rules
    if (!options.skipDocs) {
      try {
        this.ui.startSpinner(this.t('prompts.quickSync.syncing.rules'));

        const docsPath = path.join(absolutePath, '.context', 'docs');
        if (await fs.pathExists(docsPath)) {
          const exportRulesService = new ExportRulesService({
            ui: this.ui,
            t: this.t,
            version: this.version,
          });

          const hasCustomTargets = options.docTargets && options.docTargets.length > 0;

          await exportRulesService.run(absolutePath, {
            source: docsPath,
            preset: undefined,
            targets: hasCustomTargets ? options.docTargets : [...defaultTargets.rules],
            force: options.force,
            dryRun: options.dryRun,
          });

          const targetInfo = hasCustomTargets
            ? `to ${options.docTargets!.join(', ')}`
            : 'to all targets';
          this.ui.updateSpinner(`Rules exported ${targetInfo}`, 'success');
        } else {
          this.ui.updateSpinner('No docs to export', 'info');
        }
      } catch (error) {
        this.ui.updateSpinner('Failed to export rules', 'fail');
        result.errors.push(error instanceof Error ? error.message : String(error));
      } finally {
        this.ui.stopSpinner();
      }
    }

    // Step 4: Check docs status
    if (!options.skipDocs) {
      try {
        this.ui.startSpinner(this.t('prompts.quickSync.syncing.docs'));

        const detector = new StateDetector({ projectPath: absolutePath });
        const state = await detector.detect();

        if (state.state === 'outdated' && state.details.daysBehind) {
          this.ui.updateSpinner(
            this.t('prompts.quickSync.docsOutdated', { days: state.details.daysBehind }),
            'warn'
          );
          this.ui.stopSpinner();

          // Return info about outdated docs - caller can handle prompting
          result.docsUpdated = false;
        } else {
          this.ui.updateSpinner('Docs up to date', 'success');
          result.docsUpdated = true;
        }
      } catch (error) {
        this.ui.updateSpinner('Failed to check docs', 'fail');
        result.errors.push(error instanceof Error ? error.message : String(error));
      } finally {
        this.ui.stopSpinner();
      }
    }

    return result;
  }

  /**
   * Get quick stats for project
   */
  async getStats(repoPath: string): Promise<{
    docs: number;
    agents: number;
    skills: number;
    commands: number;
    daysOld?: number;
  }> {
    const absolutePath = path.resolve(repoPath);

    let docs = 0;
    let agents = 0;
    let skills = 0;
    let commands = 0;
    let daysOld: number | undefined;

    // Count docs
    const docsPath = path.join(absolutePath, '.context', 'docs');
    if (await fs.pathExists(docsPath)) {
      const files = await fs.readdir(docsPath);
      docs = files.filter(f => f.endsWith('.md')).length;
    }

    // Count agents
    const agentsPath = path.join(absolutePath, '.context', 'agents');
    if (await fs.pathExists(agentsPath)) {
      const files = await fs.readdir(agentsPath);
      agents = files.filter(f => f.endsWith('.md')).length;
    }

    // Count skills
    const skillsPath = path.join(absolutePath, '.context', 'skills');
    if (await fs.pathExists(skillsPath)) {
      try {
        const registry = createSkillRegistry(absolutePath);
        const discovered = await registry.discoverAll();
        skills = discovered.all.length;
      } catch {
        // Fallback to directory count
        const dirs = await fs.readdir(skillsPath);
        skills = dirs.filter(d => !d.startsWith('.') && d !== 'README.md').length;
      }
    }

    // Count commands
    const commandsPath = path.join(absolutePath, '.context', 'commands');
    if (await fs.pathExists(commandsPath)) {
      const entries = await fs.readdir(commandsPath);
      // directories represent commands (README.md is ignored)
      commands = entries.filter((e) => e !== 'README.md').length;
    }

    // Get days old
    const detector = new StateDetector({ projectPath: absolutePath });
    const state = await detector.detect();
    if (state.state === 'outdated') {
      daysOld = state.details.daysBehind;
    }

    return { docs, agents, skills, commands, daysOld };
  }
}

/**
 * Factory function
 */
export function createQuickSyncService(deps: QuickSyncServiceDependencies): QuickSyncService {
  return new QuickSyncService(deps);
}
