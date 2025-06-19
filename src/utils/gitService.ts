import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';

export interface GitChanges {
  added: string[];
  modified: string[];
  deleted: string[];
  renamed: Array<{ from: string; to: string }>;
}

export interface GitState {
  lastCommit: string;
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
}