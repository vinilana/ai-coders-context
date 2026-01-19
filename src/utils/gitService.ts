import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';

import { colors, symbols, typography } from './theme';

export interface GitChanges {
  added: string[];
  modified: string[];
  deleted: string[];
  renamed: Array<{ from: string; to: string }>;
}

export interface GitState {
  lastCommit: string;
}

export interface CommitResult {
  hash: string;
  shortHash: string;
  filesCommitted: string[];
}

export class GitService {
  private repoPath: string;
  private stateFile: string;

  constructor(repoPath: string) {
    this.repoPath = path.resolve(repoPath);
    this.stateFile = path.join(this.repoPath, 'context-log.json');
  }

  isGitRepository(): boolean {
    try {
      execSync('git rev-parse --git-dir', { 
        cwd: this.repoPath, 
        stdio: 'pipe' 
      });
      return true;
    } catch {
      return false;
    }
  }

  getCurrentCommit(): string {
    try {
      return execSync('git rev-parse HEAD', { 
        cwd: this.repoPath, 
        encoding: 'utf8' 
      }).trim();
    } catch (error) {
      throw new Error(`Failed to get current commit: ${error}`);
    }
  }

  getChangedFiles(since?: string): GitChanges {
    try {
      let sinceRef = since || this.getLastProcessedCommit();
      
      // If no reference point, check if we have commits
      if (!sinceRef) {
        try {
          // Try to get the previous commit
          execSync('git rev-parse HEAD~1', { cwd: this.repoPath, stdio: 'pipe' });
          sinceRef = 'HEAD~1';
        } catch {
          // No previous commit, get all tracked files as "added"
          return this.getAllTrackedFilesAsAdded();
        }
      }

      // Validate the reference commit exists
      if (!this.isValidCommit(sinceRef)) {
        console.warn(`Warning: Reference commit ${sinceRef} no longer exists, falling back to HEAD~1`);
        try {
          execSync('git rev-parse HEAD~1', { cwd: this.repoPath, stdio: 'pipe' });
          sinceRef = 'HEAD~1';
        } catch {
          return this.getAllTrackedFilesAsAdded();
        }
      }
      
      // Get diff with name status
      const diffOutput = execSync(
        `git diff --name-status ${sinceRef}..HEAD`,
        { 
          cwd: this.repoPath, 
          encoding: 'utf8' 
        }
      ).trim();

      const changes: GitChanges = {
        added: [],
        modified: [],
        deleted: [],
        renamed: []
      };

      if (!diffOutput) {
        return changes;
      }

      const lines = diffOutput.split('\n');
      for (const line of lines) {
        const parts = line.split('\t');
        const status = parts[0];
        const filePath = parts[1];

        switch (status.charAt(0)) {
          case 'A':
            changes.added.push(filePath);
            break;
          case 'M':
            changes.modified.push(filePath);
            break;
          case 'D':
            changes.deleted.push(filePath);
            break;
          case 'R':
            const fromFile = parts[1];
            const toFile = parts[2];
            changes.renamed.push({ from: fromFile, to: toFile });
            break;
        }
      }

      return changes;
    } catch (error) {
      throw new Error(`Failed to get changed files: ${error}`);
    }
  }

  getStagedFiles(): string[] {
    try {
      const output = execSync('git diff --cached --name-only', {
        cwd: this.repoPath,
        encoding: 'utf8'
      }).trim();

      return output ? output.split('\n') : [];
    } catch (error) {
      throw new Error(`Failed to get staged files: ${error}`);
    }
  }

  getStagedChanges(): GitChanges {
    try {
      const output = execSync('git diff --cached --name-status', {
        cwd: this.repoPath,
        encoding: 'utf8'
      }).trim();

      const changes: GitChanges = {
        added: [],
        modified: [],
        deleted: [],
        renamed: []
      };

      if (!output) {
        return changes;
      }

      const lines = output.split('\n');
      for (const line of lines) {
        const parts = line.split('\t');
        const status = parts[0];
        const filePath = parts[1];

        switch (status.charAt(0)) {
          case 'A':
            changes.added.push(filePath);
            break;
          case 'M':
            changes.modified.push(filePath);
            break;
          case 'D':
            changes.deleted.push(filePath);
            break;
          case 'R':
            const fromFile = parts[1];
            const toFile = parts[2];
            changes.renamed.push({ from: fromFile, to: toFile });
            break;
        }
      }

      return changes;
    } catch (error) {
      throw new Error(`Failed to get staged changes: ${error}`);
    }
  }

  getUncommittedChanges(): GitChanges {
    try {
      // Get both staged and unstaged changes
      const diffOutput = execSync(
        'git diff --name-status HEAD',
        { 
          cwd: this.repoPath, 
          encoding: 'utf8' 
        }
      ).trim();

      const changes: GitChanges = {
        added: [],
        modified: [],
        deleted: [],
        renamed: []
      };

      if (!diffOutput) {
        return changes;
      }

      const lines = diffOutput.split('\n');
      for (const line of lines) {
        const parts = line.split('\t');
        const status = parts[0];
        const filePath = parts[1];

        switch (status.charAt(0)) {
          case 'A':
            changes.added.push(filePath);
            break;
          case 'M':
            changes.modified.push(filePath);
            break;
          case 'D':
            changes.deleted.push(filePath);
            break;
          case 'R':
            const fromFile = parts[1];
            const toFile = parts[2];
            changes.renamed.push({ from: fromFile, to: toFile });
            break;
        }
      }

      return changes;
    } catch (error) {
      throw new Error(`Failed to get uncommitted changes: ${error}`);
    }
  }

  getBranchName(): string {
    try {
      return execSync('git branch --show-current', {
        cwd: this.repoPath,
        encoding: 'utf8'
      }).trim();
    } catch (error) {
      return 'unknown';
    }
  }

  getLastProcessedCommit(): string | null {
    try {
      if (!fs.existsSync(this.stateFile)) {
        return null;
      }
      const state: GitState = fs.readJsonSync(this.stateFile);
      return state.lastCommit || null;
    } catch {
      return null;
    }
  }

  saveState(commit: string): void {
    try {
      // Validate that the commit exists
      if (!this.isValidCommit(commit)) {
        throw new Error(`Invalid commit hash: ${commit}`);
      }
      
      const state: GitState = {
        lastCommit: commit
      };
      fs.writeJsonSync(this.stateFile, state, { spaces: 2 });
    } catch (error) {
      console.warn(`Warning: Could not save state: ${error}`);
    }
  }

  getState(): GitState | null {
    try {
      if (!fs.existsSync(this.stateFile)) {
        return null;
      }
      return fs.readJsonSync(this.stateFile);
    } catch {
      return null;
    }
  }

  clearState(): void {
    try {
      if (fs.existsSync(this.stateFile)) {
        fs.unlinkSync(this.stateFile);
      }
    } catch (error) {
      console.warn(`Warning: Could not clear state: ${error}`);
    }
  }

  filterRelevantFiles(files: string[], fileMapper: any): string[] {
    return files.filter(file => {
      const fullPath = path.join(this.repoPath, file);
      return fs.existsSync(fullPath) && fileMapper.isTextFile(fullPath);
    });
  }

  isFileTracked(filePath: string): boolean {
    try {
      execSync(`git ls-files --error-unmatch "${filePath}"`, {
        cwd: this.repoPath,
        stdio: 'pipe'
      });
      return true;
    } catch {
      return false;
    }
  }

  getTrackedFiles(): string[] {
    try {
      const output = execSync('git ls-files', {
        cwd: this.repoPath,
        encoding: 'utf8'
      }).trim();

      return output ? output.split('\n') : [];
    } catch (error) {
      throw new Error(`Failed to get tracked files: ${error}`);
    }
  }

  filterTrackedFiles(files: string[]): string[] {
    const trackedFiles = new Set(this.getTrackedFiles());
    return files.filter(file => trackedFiles.has(file));
  }

  getCommitMessage(commit: string): string {
    try {
      return execSync(`git log --format=%B -n 1 ${commit}`, {
        cwd: this.repoPath,
        encoding: 'utf8'
      }).trim();
    } catch {
      return 'Unknown commit';
    }
  }

  getFileHistory(filePath: string, limit: number = 10): Array<{ commit: string; date: string; message: string }> {
    try {
      const output = execSync(
        `git log --format="%H|%ci|%s" -n ${limit} -- "${filePath}"`,
        {
          cwd: this.repoPath,
          encoding: 'utf8'
        }
      ).trim();

      if (!output) return [];

      return output.split('\n').map(line => {
        const [commit, date, message] = line.split('|');
        return { commit, date, message };
      });
    } catch {
      return [];
    }
  }

  private getAllTrackedFilesAsAdded(): GitChanges {
    try {
      const output = execSync('git ls-files', {
        cwd: this.repoPath,
        encoding: 'utf8'
      }).trim();

      const changes: GitChanges = {
        added: output ? output.split('\n') : [],
        modified: [],
        deleted: [],
        renamed: []
      };

      return changes;
    } catch (error) {
      throw new Error(`Failed to get tracked files: ${error}`);
    }
  }

  isValidCommit(commit: string): boolean {
    try {
      execSync(`git rev-parse --verify ${commit}`, {
        cwd: this.repoPath,
        stdio: 'pipe'
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get list of files with unstaged changes (modified but not staged)
   */
  getUnstagedFiles(): string[] {
    try {
      const output = execSync('git diff --name-only', {
        cwd: this.repoPath,
        encoding: 'utf8'
      }).trim();

      return output ? output.split('\n') : [];
    } catch (error) {
      throw new Error(`Failed to get unstaged files: ${error}`);
    }
  }

  /**
   * Stage files matching the given patterns
   * @param patterns Array of file paths or glob patterns
   * @returns Array of files that were staged
   */
  stageFiles(patterns: string[]): string[] {
    if (patterns.length === 0) {
      return [];
    }

    try {
      // Stage files matching the patterns
      for (const pattern of patterns) {
        try {
          execSync(`git add "${pattern}"`, {
            cwd: this.repoPath,
            stdio: 'pipe'
          });
        } catch {
          // Pattern might not match any files, continue
        }
      }

      // Return what was actually staged
      return this.getStagedFiles();
    } catch (error) {
      throw new Error(`Failed to stage files: ${error}`);
    }
  }

  /**
   * Create a git commit with the staged changes
   * @param message Commit message
   * @param coAuthor Optional co-author for the commit (agent name)
   * @returns Commit result with hash and files committed
   */
  commit(message: string, coAuthor?: string): CommitResult {
    const stagedFiles = this.getStagedFiles();

    if (stagedFiles.length === 0) {
      throw new Error('Nothing to commit: no staged files');
    }

    // Build commit message with optional co-author
    let fullMessage = message;
    if (coAuthor) {
      fullMessage += `\n\nCo-Authored-By: ${coAuthor} <noreply@anthropic.com>`;
    }

    try {
      // Create commit using heredoc-style to handle multiline messages
      execSync(`git commit -m "${fullMessage.replace(/"/g, '\\"')}"`, {
        cwd: this.repoPath,
        stdio: 'pipe'
      });

      // Get the commit info
      const commitInfo = this.getCommitInfo('HEAD');
      if (!commitInfo) {
        throw new Error('Failed to get commit info after commit');
      }

      return {
        hash: commitInfo.hash,
        shortHash: commitInfo.shortHash,
        filesCommitted: stagedFiles
      };
    } catch (error) {
      throw new Error(`Failed to create commit: ${error}`);
    }
  }

  /**
   * Check if there are any uncommitted changes (staged or unstaged)
   */
  hasUncommittedChanges(): boolean {
    try {
      const output = execSync('git status --porcelain', {
        cwd: this.repoPath,
        encoding: 'utf8'
      }).trim();

      return output.length > 0;
    } catch {
      return false;
    }
  }

  getCommitsBetween(fromCommit: string, toCommit: string = 'HEAD'): string[] {
    try {
      const output = execSync(`git rev-list --reverse ${fromCommit}..${toCommit}`, {
        cwd: this.repoPath,
        encoding: 'utf8'
      }).trim();

      return output ? output.split('\n') : [];
    } catch (error) {
      throw new Error(`Failed to get commits between ${fromCommit} and ${toCommit}: ${error}`);
    }
  }

  getCommitInfo(commit: string): { hash: string; shortHash: string; message: string; date: string } | null {
    try {
      const output = execSync(`git log --format="%H|%h|%s|%ci" -n 1 ${commit}`, {
        cwd: this.repoPath,
        encoding: 'utf8'
      }).trim();

      const [hash, shortHash, message, date] = output.split('|');
      return { hash, shortHash, message, date };
    } catch {
      return null;
    }
  }

  displayCommitTrackingInfo(verbose: boolean = false): void {
    const lastProcessed = this.getLastProcessedCommit();
    const current = this.getCurrentCommit();

    if (verbose) {
      console.log('');
      console.log(typography.header('Commit Tracking'));
      console.log(typography.separator());

      if (lastProcessed) {
        const lastInfo = this.getCommitInfo(lastProcessed);
        if (lastInfo) {
          console.log(typography.labeledValue('Last documented', `${lastInfo.shortHash} - ${lastInfo.message}`));
          console.log(`                  ${colors.secondaryDim(lastInfo.date)}`);
        } else {
          console.log(typography.labeledValue('Last documented', `${lastProcessed.substring(0, 8)} (commit no longer exists)`));
        }
      } else {
        console.log(typography.labeledValue('Last documented', 'None (first run)'));
      }

      const currentInfo = this.getCommitInfo(current);
      if (currentInfo) {
        console.log(typography.labeledValue('Current commit', `${currentInfo.shortHash} - ${currentInfo.message}`));
        console.log(`                  ${colors.secondaryDim(currentInfo.date)}`);
      }

      if (lastProcessed && lastProcessed !== current) {
        const commitsBetween = this.getCommitsBetween(lastProcessed, current);
        if (commitsBetween.length > 0) {
          console.log(typography.labeledValue('Commits to process', commitsBetween.length.toString()));
        }
      }

      console.log(typography.separator());
    }
  }

  hasContextBeenInitialized(outputDir: string): boolean {
    // Check if state file exists
    const hasStateFile = fs.existsSync(this.stateFile);
    
    // Check if context folder exists and has content
    const contextDir = path.join(outputDir);
    const docsDir = path.join(contextDir, 'docs');
    const hasContextFolder = fs.existsSync(contextDir) && fs.existsSync(docsDir);
    
    // Check if docs folder has any content
    let hasDocumentation = false;
    if (hasContextFolder) {
      try {
        const files = fs.readdirSync(docsDir);
        hasDocumentation = files.length > 0;
      } catch {
        hasDocumentation = false;
      }
    }
    
    return hasStateFile || (hasContextFolder && hasDocumentation);
  }
}