/**
 * Context Export Service
 *
 * Unified export of docs, agents, and skills to AI tool directories.
 * Orchestrates ExportRulesService, SyncService, and SkillExportService.
 */

import * as path from 'path';
import {
  BaseDependencies,
  OperationResult,
  createEmptyResult,
} from '../shared';
import { ExportRulesService } from './exportRulesService';
import { SkillExportService } from './skillExportService';
import { CommandExportService } from './commandExportService';
import { SyncService } from '../sync';
import type { PresetName } from '../sync/types';

export type ContextExportServiceDependencies = BaseDependencies;

export interface ContextExportOptions {
  /** Target preset (e.g., 'claude', 'cursor', 'all') */
  preset?: string;
  /** Skip docs export */
  skipDocs?: boolean;
  /** Skip agents export */
  skipAgents?: boolean;
  /** Skip skills export */
  skipSkills?: boolean;
  /** Skip commands export */
  skipCommands?: boolean;
  /** Index mode for docs: 'readme' exports only README.md files, 'all' exports all matching files */
  docsIndexMode?: 'readme' | 'all';
  /** Sync mode for agents: 'symlink' (default) or 'markdown' */
  agentMode?: 'symlink' | 'markdown';
  /** Include built-in skills */
  includeBuiltInSkills?: boolean;
  /** Force overwrite existing files */
  force?: boolean;
  /** Preview changes without writing */
  dryRun?: boolean;
  /** Verbose output */
  verbose?: boolean;
}

export interface ContextExportResult extends OperationResult {
  docsExported: number;
  agentsExported: number;
  skillsExported: number;
  commandsExported: number;
  targets: string[];
}

export class ContextExportService {
  constructor(private deps: ContextExportServiceDependencies) {}

  private normalizePresetName(preset?: string): string {
    const p = (preset || 'default').toLowerCase().trim();

    // Common aliases (user-facing names vs internal ids)
    if (p === 'githubcopilot' || p === 'github-copilot' || p === 'copilot') return 'github';
    if (p === 'claudecode' || p === 'claude-code') return 'claude';

    return p;
  }

  /**
   * Apply component defaults for a given target preset.
   *
   * This is intentionally opinionated: it reflects "sync everything" expectations
   * for each tool (what should be exported by default when a preset is chosen).
   *
   * Explicit skip flags always win.
   */
  private applyPresetComponentDefaults(
    preset: string,
    options: ContextExportOptions
  ): ContextExportOptions {
    // Only apply when user picked a specific tool preset (not default/all).
    if (preset === 'default' || preset === 'all') return options;

    const policy: Record<string, Required<Pick<ContextExportOptions, 'skipDocs' | 'skipAgents' | 'skipSkills' | 'skipCommands'>>> = {
      // codex: only commands + skills
      codex: { skipDocs: true, skipAgents: true, skipSkills: false, skipCommands: false },
      // antigravity: only commands + skills
      antigravity: { skipDocs: true, skipAgents: true, skipSkills: false, skipCommands: false },
      // github copilot: only agents + skills
      github: { skipDocs: true, skipAgents: false, skipSkills: false, skipCommands: true },
      // claude code: rules + agents + skills + commands
      claude: { skipDocs: false, skipAgents: false, skipSkills: false, skipCommands: false },
      // cursor: agents + skills + commands (no rules by default)
      cursor: { skipDocs: true, skipAgents: false, skipSkills: false, skipCommands: false },
    };

    const defaults = policy[preset];
    if (!defaults) return options;

    return {
      ...options,
      skipDocs: options.skipDocs ?? defaults.skipDocs,
      skipAgents: options.skipAgents ?? defaults.skipAgents,
      skipSkills: options.skipSkills ?? defaults.skipSkills,
      skipCommands: options.skipCommands ?? defaults.skipCommands,
    };
  }

  private readonly defaultTargets = {
    // "rules/docs" (from .context/docs)
    rules: ['claude'],
    // agent prompts (from .context/agents)
    agents: ['github', 'claude', 'cursor'],
    // skills (from .context/skills)
    skills: ['codex', 'antigravity', 'github', 'claude', 'cursor'],
    // slash commands/prompts (from .context/commands)
    commands: ['codex', 'antigravity', 'claude', 'cursor'],
  } as const;

  /**
   * Run unified export operation
   */
  async run(repoPath: string, options: ContextExportOptions = {}): Promise<ContextExportResult> {
    const absolutePath = path.resolve(repoPath);
    const fs = await import('fs-extra');

    const result: ContextExportResult = {
      ...createEmptyResult(),
      docsExported: 0,
      agentsExported: 0,
      skillsExported: 0,
      commandsExported: 0,
      targets: [],
    };

    const preset = this.normalizePresetName(options.preset);
    options = this.applyPresetComponentDefaults(preset, options);
    const useDefaultPolicy = preset === 'default';
    const errors: Array<{ type: string; error: string }> = [];

    // Export docs - only if .context/docs exists
    const docsPath = path.join(absolutePath, '.context/docs');
    if (!options.skipDocs && await fs.pathExists(docsPath)) {
      try {
        this.deps.ui.startSpinner('Exporting docs...');
        const docsService = new ExportRulesService(this.deps);
        const docsResult = await docsService.run(absolutePath, {
          preset: useDefaultPolicy ? undefined : preset,
          targets: useDefaultPolicy ? [...this.defaultTargets.rules] : undefined,
          indexMode: options.docsIndexMode || 'readme',
          force: options.force,
          dryRun: options.dryRun,
          verbose: options.verbose,
        });
        result.docsExported = docsResult.filesCreated;
        result.targets.push(...docsResult.targets);
        this.deps.ui.stopSpinner();
      } catch (error) {
        errors.push({ type: 'docs', error: error instanceof Error ? error.message : String(error) });
        this.deps.ui.stopSpinner();
      }
    } else if (!options.skipDocs) {
      // Docs directory doesn't exist - skip silently
    }

    // Export agents - only if .context/agents exists
    const agentsPath = path.join(absolutePath, '.context/agents');
    if (!options.skipAgents && await fs.pathExists(agentsPath)) {
      try {
        this.deps.ui.startSpinner('Exporting agents...');
        const syncService = new SyncService(this.deps);
        await syncService.run({
          source: agentsPath,
          preset: useDefaultPolicy ? undefined : preset as PresetName,
          target: useDefaultPolicy ? [...this.defaultTargets.agents] : undefined,
          mode: options.agentMode || 'symlink',
          force: options.force || false,
          dryRun: options.dryRun || false,
          verbose: options.verbose || false,
        });
        // SyncService doesn't return count, so we mark as 1 if successful
        result.agentsExported = 1;
        this.deps.ui.stopSpinner();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (!errorMsg.includes('sourceMissing') && !errorMsg.includes('no agents')) {
          errors.push({ type: 'agents', error: errorMsg });
        }
        this.deps.ui.stopSpinner();
      }
    } else if (!options.skipAgents) {
      // Agents directory doesn't exist - skip silently
    }

    // Export skills - only if .context/skills exists
    const skillsPath = path.join(absolutePath, '.context/skills');
    if (!options.skipSkills && await fs.pathExists(skillsPath)) {
      try {
        this.deps.ui.startSpinner('Exporting skills...');
        const skillsService = new SkillExportService(this.deps);
        const skillsResult = await skillsService.run(absolutePath, {
          preset: useDefaultPolicy ? undefined : preset,
          targets: useDefaultPolicy ? [...this.defaultTargets.skills] : undefined,
          includeBuiltIn: options.includeBuiltInSkills ?? true,
          force: options.force,
          dryRun: options.dryRun,
          verbose: options.verbose,
        });
        result.skillsExported = skillsResult.filesCreated;
        result.targets.push(...skillsResult.targets);
        this.deps.ui.stopSpinner();
      } catch (error) {
        errors.push({ type: 'skills', error: error instanceof Error ? error.message : String(error) });
        this.deps.ui.stopSpinner();
      }
    } else if (!options.skipSkills) {
      // Skills directory doesn't exist - skip silently
    }

    // Export commands - only if .context/commands exists
    const commandsPath = path.join(absolutePath, '.context/commands');
    if (!options.skipCommands && await fs.pathExists(commandsPath)) {
      try {
        this.deps.ui.startSpinner('Exporting commands...');
        const commandsService = new CommandExportService(this.deps);
        const commandsResult = await commandsService.run(absolutePath, {
          preset: useDefaultPolicy ? undefined : preset,
          targets: useDefaultPolicy ? [...this.defaultTargets.commands] : undefined,
          force: options.force,
          dryRun: options.dryRun,
          verbose: options.verbose,
        });
        result.commandsExported = commandsResult.filesCreated;
        result.targets.push(...commandsResult.targets);
        this.deps.ui.stopSpinner();
      } catch (error) {
        errors.push({ type: 'commands', error: error instanceof Error ? error.message : String(error) });
        this.deps.ui.stopSpinner();
      }
    } else if (!options.skipCommands) {
      // Commands directory doesn't exist - skip silently
    }

    // Update error count
    result.filesFailed = errors.length;
    for (const err of errors) {
      result.errors.push({ file: err.type, error: err.error });
    }

    // Calculate total created
    result.filesCreated = result.docsExported + result.agentsExported + result.skillsExported + result.commandsExported;

    // Display summary
    if (!options.dryRun && result.filesCreated > 0) {
      this.deps.ui.displaySuccess(
        `Context exported: ${result.docsExported} docs, ${result.agentsExported} agents, ${result.skillsExported} skills, ${result.commandsExported} commands`
      );
    }

    return result;
  }
}
