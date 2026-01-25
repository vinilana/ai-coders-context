/**
 * Command Export Service
 *
 * Export slash command prompt templates from .context/commands to AI tool directories.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import {
  BaseDependencies,
  OperationResult,
  createEmptyResult,
  addError,
  ensureDirectory,
  pathExists,
  resolveAbsolutePath,
  getCommandsExportPresets,
} from '../shared';
import { parseFrontMatter } from '../../utils/frontMatter';

export type CommandExportServiceDependencies = BaseDependencies;

export interface CommandExportTarget {
  toolId: string;
  name: string;
  path: string;
  description: string;
}

export interface CommandExportOptions {
  source?: string;
  targets?: string[];
  preset?: string;
  force?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface CommandExportResult extends OperationResult {
  targets: string[];
  commandsExported: string[];
}

interface SourceCommand {
  name: string;
  description?: string;
  content: string;
  sourcePath: string;
}

function isCommandFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith('.md') && lower !== 'readme.md';
}

function buildCommandExportPresets(): Record<string, CommandExportTarget[]> {
  const registryPresets = getCommandsExportPresets();
  const presets: Record<string, CommandExportTarget[]> = {};

  for (const [toolId, targets] of Object.entries(registryPresets)) {
    presets[toolId] = targets.map((t) => ({ toolId, ...t }));
  }

  presets.all = Object.entries(presets)
    .filter(([key]) => key !== 'all')
    .flatMap(([, targets]) => targets);

  return presets;
}

export const COMMAND_EXPORT_PRESETS: Record<string, CommandExportTarget[]> = buildCommandExportPresets();

export class CommandExportService {
  constructor(private deps: CommandExportServiceDependencies) {}

  async run(repoPath: string, options: CommandExportOptions = {}): Promise<CommandExportResult> {
    const absolutePath = path.resolve(repoPath);
    const sourcePath = resolveAbsolutePath(options.source, '.context/commands', absolutePath);

    const result: CommandExportResult = {
      ...createEmptyResult(),
      targets: [],
      commandsExported: [],
    };

    const targets = this.resolveTargets(options);
    if (targets.length === 0) {
      this.deps.ui.displayError('No command export targets specified');
      return result;
    }

    const commands = await this.readSourceCommands(sourcePath);
    if (commands.length === 0) {
      this.deps.ui.displayWarning('No commands found to export');
      return result;
    }

    for (const target of targets) {
      await this.exportToTarget(absolutePath, target, commands, options, result);
    }

    if (!options.dryRun && result.filesCreated > 0) {
      this.deps.ui.displaySuccess(
        `Exported ${result.commandsExported.length} commands to ${result.targets.length} targets`
      );
    }

    return result;
  }

  private resolveTargets(options: CommandExportOptions): CommandExportTarget[] {
    if (options.preset) {
      const preset = COMMAND_EXPORT_PRESETS[options.preset.toLowerCase()];
      if (preset) return preset;
    }

    if (options.targets?.length) {
      const resolved: CommandExportTarget[] = [];

      for (const t of options.targets) {
        const preset = COMMAND_EXPORT_PRESETS[t.toLowerCase()];
        if (preset) {
          resolved.push(...preset);
        } else {
          resolved.push({
            toolId: 'custom',
            name: path.basename(t),
            path: t,
            description: 'Custom target',
          });
        }
      }

      return resolved;
    }

    // Default: export to common targets
    return [
      ...(COMMAND_EXPORT_PRESETS.cursor || []),
      ...(COMMAND_EXPORT_PRESETS.claude || []),
      ...(COMMAND_EXPORT_PRESETS.github || []),
    ];
  }

  private async readSourceCommands(sourcePath: string): Promise<SourceCommand[]> {
    if (!await fs.pathExists(sourcePath)) {
      return [];
    }

    const entries = await fs.readdir(sourcePath);
    const commands: SourceCommand[] = [];

    for (const entry of entries) {
      const full = path.join(sourcePath, entry);
      const stat = await fs.stat(full).catch(() => null);
      if (!stat) continue;

      // New format: .context/commands/<name>.md
      if (stat.isFile() && isCommandFileName(entry)) {
        try {
          const content = await fs.readFile(full, 'utf-8');
          const { frontMatter } = parseFrontMatter(content);
          const fallbackName = path.basename(entry, path.extname(entry));

          const name = (frontMatter?.name || fallbackName).trim();
          const description = (frontMatter?.description || '').trim() || undefined;

          commands.push({ name, description, content, sourcePath: full });
        } catch {
          // Skip unreadable command
        }
        continue;
      }

      // Legacy format: .context/commands/<name>/COMMAND.md
      if (stat.isDirectory()) {
        const legacyFile = path.join(full, 'COMMAND.md');
        if (!await fs.pathExists(legacyFile)) continue;

        try {
          const content = await fs.readFile(legacyFile, 'utf-8');
          const { frontMatter } = parseFrontMatter(content);

          const name = (frontMatter?.name || entry).trim();
          const description = (frontMatter?.description || '').trim() || undefined;

          commands.push({ name, description, content, sourcePath: legacyFile });
        } catch {
          // Skip unreadable command
        }
      }
    }

    return commands.sort((a, b) => a.name.localeCompare(b.name));
  }

  private async exportToTarget(
    repoPath: string,
    target: CommandExportTarget,
    commands: SourceCommand[],
    options: CommandExportOptions,
    result: CommandExportResult
  ): Promise<void> {
    const targetPath = path.join(repoPath, target.path);

    try {
      this.deps.ui.startSpinner(`Exporting commands to ${target.toolId}...`);

      if (options.dryRun) {
        this.deps.ui.updateSpinner(`[DRY-RUN] Would export to ${targetPath}`, 'success');
        result.filesSkipped++;
        return;
      }

      await ensureDirectory(targetPath);

      for (const command of commands) {
        await this.exportCommand(target, targetPath, command, options, result);
      }

      result.targets.push(targetPath);
      this.deps.ui.updateSpinner(`Exported to ${targetPath}`, 'success');
    } catch (error) {
      addError(result, target.name, error);
      this.deps.ui.updateSpinner(`Failed to export to ${target.name}`, 'fail');
    } finally {
      this.deps.ui.stopSpinner();
    }
  }

  private async exportCommand(
    target: CommandExportTarget,
    targetPath: string,
    command: SourceCommand,
    options: CommandExportOptions,
    result: CommandExportResult
  ): Promise<void> {
    const force = Boolean(options.force);

    // Tool-specific formats
    if (target.toolId === 'github') {
      const filePath = path.join(targetPath, `${command.name}.prompt.md`);

      if (await pathExists(filePath) && !force) {
        result.filesSkipped++;
        return;
      }

      const { frontMatter, body } = parseFrontMatter(command.content);
      const description = (frontMatter?.description || command.description || `Prompt: ${command.name}`).trim();

      const normalized = `---\ndescription: ${description}\n---\n\n${body}\n`;
      await fs.writeFile(filePath, normalized, 'utf-8');

      result.filesCreated++;
      if (!result.commandsExported.includes(command.name)) result.commandsExported.push(command.name);
      return;
    }

    if (target.toolId === 'claude') {
      const filePath = path.join(targetPath, `${command.name}.md`);

      if (await pathExists(filePath) && !force) {
        result.filesSkipped++;
        return;
      }

      // Keep original content (frontmatter + body). Claude Code supports .claude/commands/*.md.
      await fs.writeFile(filePath, command.content, 'utf-8');

      result.filesCreated++;
      if (!result.commandsExported.includes(command.name)) result.commandsExported.push(command.name);
      return;
    }

    // Default: file-based command: <commands>/<name>.md
    const commandFile = path.join(targetPath, `${command.name}.md`);

    if (await pathExists(commandFile) && !force) {
      result.filesSkipped++;
      return;
    }

    await fs.writeFile(commandFile, command.content, 'utf-8');

    result.filesCreated++;
    if (!result.commandsExported.includes(command.name)) result.commandsExported.push(command.name);
  }
}
