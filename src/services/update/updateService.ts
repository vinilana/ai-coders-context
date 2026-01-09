import * as path from 'path';
import * as fs from 'fs-extra';
import { glob } from 'glob';
import { execSync } from 'child_process';

import { colors, symbols } from '../../utils/theme';
import type { CLIInterface } from '../../utils/cliUI';
import type { TranslateFn } from '../../utils/i18n';
import type { LLMConfig } from '../../types';

export interface UpdateCommandFlags {
  output?: string;
  verbose?: boolean;
  model?: string;
  provider?: LLMConfig['provider'];
  apiKey?: string;
  baseUrl?: string;
  dryRun?: boolean;
  /** Use git diff to detect changes (falls back to mtime if not available) */
  useGit?: boolean;
  /** Number of days to look back for changes */
  days?: number;
}

export interface ModifiedFile {
  path: string;
  relativePath: string;
  modifiedAt: Date;
}

export interface AffectedDoc {
  path: string;
  relativePath: string;
  references: string[];
}

export interface UpdateAnalysis {
  modifiedCodeFiles: ModifiedFile[];
  affectedDocs: AffectedDoc[];
  daysBehind: number;
  lastCodeChange: Date | null;
  lastDocChange: Date | null;
}

interface UpdateServiceDependencies {
  ui: CLIInterface;
  t: TranslateFn;
}

export class UpdateService {
  private readonly ui: CLIInterface;
  private readonly t: TranslateFn;

  constructor(dependencies: UpdateServiceDependencies) {
    this.ui = dependencies.ui;
    this.t = dependencies.t;
  }

  /**
   * Analyze what needs to be updated
   */
  async analyze(repoPath: string, options: UpdateCommandFlags = {}): Promise<UpdateAnalysis> {
    const resolvedRepo = path.resolve(repoPath);
    const contextDir = path.join(resolvedRepo, options.output || '.context');
    const docsDir = path.join(contextDir, 'docs');

    // Get modified code files
    const modifiedCodeFiles = await this.getModifiedCodeFiles(resolvedRepo, contextDir, options);

    // Get all docs
    const docFiles = await this.getDocFiles(docsDir);

    // Find which docs reference the modified files
    const affectedDocs = await this.findAffectedDocs(docFiles, modifiedCodeFiles);

    // Calculate timing
    const lastCodeChange = modifiedCodeFiles.length > 0
      ? new Date(Math.max(...modifiedCodeFiles.map(f => f.modifiedAt.getTime())))
      : null;

    const lastDocChange = await this.getLastModificationTime(docsDir);

    const daysBehind = lastCodeChange && lastDocChange
      ? Math.floor((lastCodeChange.getTime() - lastDocChange.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      modifiedCodeFiles,
      affectedDocs,
      daysBehind: Math.max(0, daysBehind),
      lastCodeChange,
      lastDocChange
    };
  }

  /**
   * Display analysis results to the user
   */
  displayAnalysis(analysis: UpdateAnalysis): void {
    if (analysis.modifiedCodeFiles.length === 0) {
      console.log(`\n${symbols.success} Documentation is up to date!`);
      return;
    }

    console.log(`\n${colors.primaryBold('Modified code files:')} ${analysis.modifiedCodeFiles.length}`);

    const filesToShow = analysis.modifiedCodeFiles.slice(0, 10);
    for (const file of filesToShow) {
      console.log(colors.secondaryDim(`   ${file.relativePath}`));
    }

    if (analysis.modifiedCodeFiles.length > 10) {
      console.log(colors.secondaryDim(`   ... and ${analysis.modifiedCodeFiles.length - 10} more`));
    }

    if (analysis.affectedDocs.length > 0) {
      console.log(`\n${colors.primaryBold('Docs that may need updating:')} ${analysis.affectedDocs.length}`);

      for (const doc of analysis.affectedDocs) {
        const refs = doc.references.slice(0, 3).join(', ');
        const moreRefs = doc.references.length > 3 ? ` (+${doc.references.length - 3} more)` : '';
        console.log(colors.secondary(`   ${symbols.bullet} ${doc.relativePath}`));
        console.log(colors.secondaryDim(`     mentions: ${refs}${moreRefs}`));
      }
    } else {
      console.log(`\n${colors.secondaryDim('No docs directly reference the modified files.')}`);
      console.log(colors.secondaryDim('Consider running a full update to ensure everything is current.'));
    }

    if (analysis.daysBehind > 0) {
      console.log(`\n${colors.warning(`⚠ Docs are ${analysis.daysBehind} day(s) behind code changes`)}`);
    }
  }

  /**
   * Get list of files that would be updated
   */
  getFilesToUpdate(analysis: UpdateAnalysis): string[] {
    return analysis.affectedDocs.map(doc => doc.path);
  }

  private async getModifiedCodeFiles(
    repoPath: string,
    contextDir: string,
    options: UpdateCommandFlags
  ): Promise<ModifiedFile[]> {
    const useGit = options.useGit !== false && this.isGitRepo(repoPath);
    const days = options.days || 30;

    if (useGit) {
      return this.getModifiedFilesFromGit(repoPath, contextDir, days);
    }

    return this.getModifiedFilesByMtime(repoPath, contextDir, days);
  }

  private isGitRepo(repoPath: string): boolean {
    try {
      execSync('git rev-parse --is-inside-work-tree', { cwd: repoPath, stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  private async getModifiedFilesFromGit(
    repoPath: string,
    contextDir: string,
    days: number
  ): Promise<ModifiedFile[]> {
    try {
      // Get files modified in the last N days
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString().split('T')[0];

      const output = execSync(
        `git log --since="${sinceStr}" --name-only --pretty=format: | sort -u | grep -v "^$"`,
        { cwd: repoPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim();

      if (!output) {
        return [];
      }

      const files = output.split('\n').filter(f => f.trim());
      const result: ModifiedFile[] = [];

      for (const file of files) {
        const fullPath = path.join(repoPath, file);

        // Skip context directory and non-code files
        if (fullPath.startsWith(contextDir)) continue;
        if (!this.isCodeFile(file)) continue;

        try {
          const stat = await fs.stat(fullPath);
          if (stat.isFile()) {
            result.push({
              path: fullPath,
              relativePath: file,
              modifiedAt: stat.mtime
            });
          }
        } catch {
          // File may have been deleted
        }
      }

      return result;
    } catch {
      // Fall back to mtime if git command fails
      return this.getModifiedFilesByMtime(repoPath, contextDir, days);
    }
  }

  private async getModifiedFilesByMtime(
    repoPath: string,
    contextDir: string,
    days: number
  ): Promise<ModifiedFile[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const patterns = [
      '**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx',
      '**/*.py', '**/*.go', '**/*.rs', '**/*.java',
      '**/*.rb', '**/*.php', '**/*.c', '**/*.cpp', '**/*.h'
    ];

    const result: ModifiedFile[] = [];

    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: repoPath,
        ignore: ['**/node_modules/**', '**/.git/**', '.context/**'],
        absolute: true
      });

      for (const file of files) {
        if (file.startsWith(contextDir)) continue;

        try {
          const stat = await fs.stat(file);
          if (stat.mtime >= cutoff) {
            result.push({
              path: file,
              relativePath: path.relative(repoPath, file),
              modifiedAt: stat.mtime
            });
          }
        } catch {
          // Skip files we can't stat
        }
      }
    }

    // Sort by modification time (newest first)
    return result.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  }

  private isCodeFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const codeExtensions = [
      '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
      '.py', '.go', '.rs', '.java', '.rb', '.php',
      '.c', '.cpp', '.h', '.hpp', '.cs', '.swift', '.kt'
    ];
    return codeExtensions.includes(ext);
  }

  private async getDocFiles(docsDir: string): Promise<string[]> {
    if (!await fs.pathExists(docsDir)) {
      return [];
    }

    return glob('**/*.md', {
      cwd: docsDir,
      absolute: true
    });
  }

  private async findAffectedDocs(
    docFiles: string[],
    modifiedFiles: ModifiedFile[]
  ): Promise<AffectedDoc[]> {
    if (modifiedFiles.length === 0) {
      return [];
    }

    // Build search terms from modified files
    const searchTerms = new Set<string>();
    for (const file of modifiedFiles) {
      // Add filename without extension
      const basename = path.basename(file.relativePath, path.extname(file.relativePath));
      searchTerms.add(basename);

      // Add camelCase/PascalCase variations
      // e.g., "authService" from "authService.ts"
      if (basename.includes('-')) {
        // kebab-case to camelCase: "auth-service" -> "authService"
        const camel = basename.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        searchTerms.add(camel);
      }

      // Add directory name if it seems significant
      const dirName = path.basename(path.dirname(file.relativePath));
      if (dirName && dirName !== '.' && dirName !== 'src') {
        searchTerms.add(dirName);
      }
    }

    const affectedDocs: AffectedDoc[] = [];

    for (const docPath of docFiles) {
      try {
        const content = await fs.readFile(docPath, 'utf-8');
        const contentLower = content.toLowerCase();

        const references: string[] = [];
        for (const term of searchTerms) {
          if (contentLower.includes(term.toLowerCase())) {
            references.push(term);
          }
        }

        if (references.length > 0) {
          affectedDocs.push({
            path: docPath,
            relativePath: path.basename(path.dirname(docPath)) + '/' + path.basename(docPath),
            references
          });
        }
      } catch {
        // Skip files we can't read
      }
    }

    return affectedDocs;
  }

  private async getLastModificationTime(dir: string): Promise<Date | null> {
    if (!await fs.pathExists(dir)) {
      return null;
    }

    const files = await glob('**/*.md', { cwd: dir, absolute: true });

    let latest: Date | null = null;
    for (const file of files) {
      try {
        const stat = await fs.stat(file);
        if (!latest || stat.mtime > latest) {
          latest = stat.mtime;
        }
      } catch {
        // Skip
      }
    }

    return latest;
  }
}
