/**
 * Export Rules Service
 *
 * Bidirectional sync: export rules from .context to AI tool directories.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { glob } from 'glob';
import type { CLIInterface } from '../../utils/cliUI';
import type { TranslateFn } from '../../utils/i18n';

export interface ExportRulesServiceDependencies {
  ui: CLIInterface;
  t: TranslateFn;
  version: string;
}

export interface ExportTarget {
  name: string;
  path: string;
  format: 'single' | 'directory';
  filename?: string;
  description: string;
}

export interface ExportOptions {
  source?: string;
  targets?: string[];
  preset?: string;
  force?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface ExportResult {
  exported: number;
  skipped: number;
  failed: number;
  targets: string[];
  errors: Array<{ target: string; error: string }>;
}

/**
 * Export presets for different AI tools
 */
export const EXPORT_PRESETS: Record<string, ExportTarget[]> = {
  cursor: [
    {
      name: 'cursorrules',
      path: '.cursorrules',
      format: 'single',
      description: 'Cursor AI rules file',
    },
    {
      name: 'cursor-rules-dir',
      path: '.cursor/rules',
      format: 'directory',
      description: 'Cursor AI rules directory',
    },
  ],
  claude: [
    {
      name: 'claude-md',
      path: 'CLAUDE.md',
      format: 'single',
      description: 'Claude Code main rules file',
    },
  ],
  github: [
    {
      name: 'copilot-instructions',
      path: '.github/copilot-instructions.md',
      format: 'single',
      description: 'GitHub Copilot instructions',
    },
  ],
  windsurf: [
    {
      name: 'windsurfrules',
      path: '.windsurfrules',
      format: 'single',
      description: 'Windsurf rules file',
    },
  ],
  cline: [
    {
      name: 'clinerules',
      path: '.clinerules',
      format: 'single',
      description: 'Cline rules file',
    },
  ],
  aider: [
    {
      name: 'conventions',
      path: 'CONVENTIONS.md',
      format: 'single',
      description: 'Aider conventions file',
    },
  ],
  codex: [
    {
      name: 'codex-instructions',
      path: '.codex/instructions.md',
      format: 'single',
      description: 'Codex CLI instructions',
    },
  ],
  all: [], // Will be populated dynamically
};

// Populate 'all' preset
EXPORT_PRESETS.all = [
  ...EXPORT_PRESETS.cursor,
  ...EXPORT_PRESETS.claude,
  ...EXPORT_PRESETS.github,
  ...EXPORT_PRESETS.windsurf,
  ...EXPORT_PRESETS.cline,
  ...EXPORT_PRESETS.aider,
  ...EXPORT_PRESETS.codex,
];

export class ExportRulesService {
  private deps: ExportRulesServiceDependencies;

  constructor(deps: ExportRulesServiceDependencies) {
    this.deps = deps;
  }

  /**
   * Export rules to AI tool directories
   */
  async run(repoPath: string, options: ExportOptions = {}): Promise<ExportResult> {
    const absolutePath = path.resolve(repoPath);
    const sourcePath = options.source
      ? path.resolve(absolutePath, options.source)
      : path.join(absolutePath, '.context', 'docs');

    const result: ExportResult = {
      exported: 0,
      skipped: 0,
      failed: 0,
      targets: [],
      errors: [],
    };

    // Determine targets
    const targets = this.resolveTargets(absolutePath, options);

    if (targets.length === 0) {
      this.deps.ui.displayError(this.deps.t('errors.export.noTargets'));
      return result;
    }

    // Read source rules
    const rules = await this.readSourceRules(sourcePath);

    if (rules.length === 0) {
      this.deps.ui.displayError(this.deps.t('errors.export.noRules'));
      return result;
    }

    // Combine rules into single content
    const combinedContent = this.combineRules(rules);

    // Export to each target
    for (const target of targets) {
      try {
        this.deps.ui.startSpinner(
          this.deps.t('spinner.export.exporting', { target: target.name })
        );

        const targetPath = path.join(absolutePath, target.path);

        if (options.dryRun) {
          this.deps.ui.updateSpinner(
            this.deps.t('spinner.export.dryRun', { target: targetPath }),
            'success'
          );
          result.skipped++;
          continue;
        }

        // Check if target exists and force is not set
        if (await fs.pathExists(targetPath) && !options.force) {
          this.deps.ui.updateSpinner(
            this.deps.t('spinner.export.skipped', { target: targetPath }),
            'warn'
          );
          result.skipped++;
          continue;
        }

        // Export based on format
        if (target.format === 'single') {
          await this.exportSingleFile(targetPath, combinedContent, target);
        } else {
          await this.exportToDirectory(targetPath, rules, target);
        }

        result.exported++;
        result.targets.push(targetPath);
        this.deps.ui.updateSpinner(
          this.deps.t('spinner.export.exported', { target: targetPath }),
          'success'
        );
      } catch (error) {
        result.failed++;
        result.errors.push({
          target: target.name,
          error: error instanceof Error ? error.message : String(error),
        });
        this.deps.ui.updateSpinner(
          this.deps.t('spinner.export.failed', { target: target.name }),
          'fail'
        );
      } finally {
        this.deps.ui.stopSpinner();
      }
    }

    // Display summary
    if (result.exported > 0) {
      this.deps.ui.displaySuccess(
        this.deps.t('success.export.completed', { count: result.exported })
      );
    }

    return result;
  }

  /**
   * Resolve export targets from options
   */
  private resolveTargets(repoPath: string, options: ExportOptions): ExportTarget[] {
    if (options.preset) {
      const preset = EXPORT_PRESETS[options.preset.toLowerCase()];
      if (preset) {
        return preset;
      }
    }

    if (options.targets && options.targets.length > 0) {
      return options.targets.map((t) => ({
        name: path.basename(t),
        path: t,
        format: 'single' as const,
        description: 'Custom target',
      }));
    }

    // Default: export to common targets
    return [
      ...EXPORT_PRESETS.cursor.slice(0, 1),
      ...EXPORT_PRESETS.claude,
      ...EXPORT_PRESETS.github,
    ];
  }

  /**
   * Read source rules from .context/docs
   */
  private async readSourceRules(
    sourcePath: string
  ): Promise<Array<{ name: string; content: string; path: string }>> {
    const rules: Array<{ name: string; content: string; path: string }> = [];

    try {
      // Look for rules files
      const patterns = ['**/*rules*.md', '**/*instructions*.md', '**/*conventions*.md', '**/README.md'];

      for (const pattern of patterns) {
        const files = await glob(pattern, {
          cwd: sourcePath,
          absolute: true,
          ignore: ['node_modules/**'],
        });

        for (const file of files) {
          try {
            const content = await fs.readFile(file, 'utf-8');
            rules.push({
              name: path.basename(file, path.extname(file)),
              content,
              path: file,
            });
          } catch {
            // Skip unreadable files
          }
        }
      }
    } catch {
      // Source path doesn't exist or is not accessible
    }

    return rules;
  }

  /**
   * Combine multiple rules into a single content block
   */
  private combineRules(rules: Array<{ name: string; content: string; path: string }>): string {
    const sections: string[] = [];

    sections.push('# Project Rules and Guidelines\n');
    sections.push(`> Auto-generated from .context/docs on ${new Date().toISOString()}\n`);

    for (const rule of rules) {
      sections.push(`\n## ${rule.name}\n`);
      sections.push(rule.content);
    }

    return sections.join('\n');
  }

  /**
   * Export rules to a single file
   */
  private async exportSingleFile(
    targetPath: string,
    content: string,
    target: ExportTarget
  ): Promise<void> {
    await fs.ensureDir(path.dirname(targetPath));
    await fs.writeFile(targetPath, content, 'utf-8');
  }

  /**
   * Export rules to a directory (multiple files)
   */
  private async exportToDirectory(
    targetPath: string,
    rules: Array<{ name: string; content: string; path: string }>,
    target: ExportTarget
  ): Promise<void> {
    await fs.ensureDir(targetPath);

    for (const rule of rules) {
      const filename = `${rule.name}.md`;
      const filePath = path.join(targetPath, filename);
      await fs.writeFile(filePath, rule.content, 'utf-8');
    }
  }

  /**
   * Get available presets
   */
  getAvailablePresets(): string[] {
    return Object.keys(EXPORT_PRESETS);
  }
}
