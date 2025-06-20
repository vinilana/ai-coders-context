import * as fs from 'fs-extra';
import * as path from 'path';
import { FileInfo, RepoStructure } from '../types';
import { FileMapper } from '../utils/fileMapper';
import { BaseLLMClient } from '../services/baseLLMClient';
import { GitService, GitChanges } from '../utils/gitService';
import chalk from 'chalk';

interface ModuleGroup {
  name: string;
  description: string;
  files: FileInfo[];
}

export class IncrementalDocumentationGenerator {
  constructor(
    private fileMapper: FileMapper,
    private llmClient: BaseLLMClient,
    private gitService: GitService
  ) {}

  async updateDocumentation(
    repoStructure: RepoStructure,
    outputDir: string,
    changes: GitChanges,
    verbose: boolean = false
  ): Promise<{ 
    updated: number; 
    removed: number; 
    updatedFiles: string[];
    removedFiles: string[];
    overviewUpdated: boolean;
  }> {
    const docsDir = path.join(outputDir, 'docs');
    await fs.ensureDir(docsDir);

    if (verbose) {
      console.log(chalk.blue(`📚 Updating documentation in: ${docsDir}`));
      this.displayChangeSummary(changes);
    }

    let updated = 0;
    let removed = 0;
    const updatedFiles: string[] = [];
    const removedFiles: string[] = [];
    let overviewUpdated = false;

    // Get all changed files
    const allChangedFiles = [
      ...changes.added,
      ...changes.modified,
      ...changes.deleted,
      ...changes.renamed.map(r => r.from),
      ...changes.renamed.map(r => r.to)
    ];

    // Filter for tracked and relevant files only
    const trackedChangedFiles = this.gitService.filterTrackedFiles(allChangedFiles);
    const relevantChangedFiles = trackedChangedFiles.filter(file => {
      const fullPath = path.join(repoStructure.rootPath, file);
      return this.fileMapper.isTextFile(fullPath);
    });

    if (verbose) {
      const untrackedFiles = allChangedFiles.filter(file => !trackedChangedFiles.includes(file));
      if (untrackedFiles.length > 0) {
        console.log(chalk.gray(`📎 Skipping ${untrackedFiles.length} untracked files`));
      }
    }

    if (relevantChangedFiles.length === 0) {
      if (verbose) {
        console.log(chalk.yellow('📄 No relevant tracked file changes detected'));
      }
      return { 
        updated: 0, 
        removed: 0, 
        updatedFiles: [], 
        removedFiles: [], 
        overviewUpdated: false 
      };
    }

    // Determine which modules are affected by the changes
    const affectedModules = this.getAffectedModules(relevantChangedFiles, repoStructure);
    
    if (verbose) {
      console.log(chalk.yellow(`📦 Updating ${affectedModules.length} affected modules...`));
      affectedModules.forEach(module => {
        console.log(chalk.gray(`  - ${module.name} (${module.files.length} files)`));
      });
    }

    // Update affected modules
    for (const module of affectedModules) {
      try {
        const updatedFile = await this.updateModuleDocumentation(module, repoStructure, docsDir, verbose);
        updatedFiles.push(updatedFile);
        updated++;
      } catch (error) {
        if (verbose) {
          console.log(chalk.red(`❌ Error updating module ${module.name}: ${error}`));
        }
      }
    }

    // Handle deleted files by checking if any modules became empty
    const cleanedUpFiles = await this.cleanupEmptyModules(docsDir, repoStructure, verbose);
    removedFiles.push(...cleanedUpFiles);
    removed += cleanedUpFiles.length;

    // Update overview documents if there were significant changes
    if (updated > 0 || removed > 0) {
      await this.updateOverviewDocuments(repoStructure, docsDir, verbose);
      overviewUpdated = true;
      updatedFiles.push('README.md', 'overview.md');
    }

    return { 
      updated, 
      removed, 
      updatedFiles, 
      removedFiles, 
      overviewUpdated 
    };
  }

  private getAffectedModules(changedFiles: string[], repoStructure: RepoStructure): ModuleGroup[] {
    // Get all modules
    const allModules = this.getModuleGroups(repoStructure);
    
    // Find which modules contain changed files
    const affectedModuleNames = new Set<string>();
    
    changedFiles.forEach(changedFile => {
      const moduleName = this.getModuleNameForFile(changedFile);
      affectedModuleNames.add(moduleName);
    });

    // Return only the affected modules
    return allModules.filter(module => 
      affectedModuleNames.has(this.getModuleKey(module.name))
    );
  }

  private getModuleNameForFile(relativePath: string): string {
    const parts = relativePath.split(path.sep);
    let groupName = 'Root Files';
    
    if (parts.length > 1) {
      groupName = parts[0];
      // Special handling for src files
      if (groupName === 'src' && parts.length > 2) {
        groupName = parts[1];
      }
    }
    
    return groupName;
  }

  private getModuleKey(moduleName: string): string {
    return moduleName.toLowerCase().replace(/\s+/g, '-');
  }

  private getModuleGroups(repoStructure: RepoStructure): ModuleGroup[] {
    const groups: Map<string, FileInfo[]> = new Map();
    
    // Group files by their top-level directory or logical module
    repoStructure.files.forEach(file => {
      if (!this.fileMapper.isTextFile(file.path)) return;
      
      const parts = file.relativePath.split(path.sep);
      let groupName = 'Root Files';
      
      if (parts.length > 1) {
        groupName = parts[0];
        // Special handling for src files
        if (groupName === 'src' && parts.length > 2) {
          groupName = parts[1];
        }
      }
      
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName)!.push(file);
    });

    // Convert to ModuleGroup array with descriptions
    return Array.from(groups.entries()).map(([name, files]) => ({
      name: this.formatModuleName(name),
      description: this.getModuleDescription(name, files),
      files
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  private formatModuleName(name: string): string {
    return name
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private getModuleDescription(name: string, files: FileInfo[]): string {
    const descriptions: { [key: string]: string } = {
      'generators': 'Code generation utilities for documentation and agents',
      'services': 'External service integrations and API clients',
      'utils': 'Utility functions and helper modules',
      'types': 'TypeScript type definitions and interfaces',
      'Root Files': 'Main configuration and entry point files'
    };

    return descriptions[name] || `${this.formatModuleName(name)} module with ${files.length} files`;
  }

  private async updateModuleDocumentation(
    module: ModuleGroup,
    repoStructure: RepoStructure,
    docsDir: string,
    verbose: boolean
  ): Promise<string> {
    const modulesDir = path.join(docsDir, 'modules');
    await fs.ensureDir(modulesDir);

    const fileName = `${this.slugify(module.name)}.md`;
    if (verbose) {
      console.log(chalk.blue(`📄 Updating modules/${fileName}...`));
    }

    const moduleDoc = await this.createModuleDocumentation(module, repoStructure);
    const modulePath = path.join(modulesDir, fileName);
    await fs.writeFile(modulePath, moduleDoc);

    if (verbose) {
      console.log(chalk.green(`✅ Updated modules/${fileName}`));
    }

    return path.relative(docsDir, modulePath);
  }

  private async createModuleDocumentation(
    module: ModuleGroup,
    _repoStructure: RepoStructure
  ): Promise<string> {
    const fileContents: string[] = [];
    
    for (const file of module.files.slice(0, 10)) { // Limit to prevent too large requests
      try {
        const content = await this.fileMapper.readFileContent(file.path);
        fileContents.push(`File: ${file.relativePath}\n${content.substring(0, 1000)}...`);
      } catch (error) {
        fileContents.push(`File: ${file.relativePath}\n[Error reading file: ${error}]`);
      }
    }

    const moduleContext = `Module: ${module.name}
Description: ${module.description}
Files: ${module.files.map(f => f.relativePath).join(', ')}

Sample content from module files:
${fileContents.join('\n\n---\n\n')}`;

    const documentation = await this.llmClient.generateText(
      `Generate comprehensive documentation for this module. Include:
1. Module overview and purpose
2. Key components and their responsibilities
3. Public APIs and interfaces
4. Usage examples
5. Dependencies and relationships

Module context:
${moduleContext}`,
      'You are a technical documentation expert. Create clear, well-structured module documentation.'
    );

    // Add metadata header
    const history = this.gitService.getFileHistory(module.files[0]?.relativePath || '', 1);
    const lastModified = history[0]?.date || new Date().toISOString();

    return `---
module: ${module.name}
files: ${module.files.length}
last_modified: ${lastModified}
generated: ${new Date().toISOString()}
---

# ${module.name}

${documentation}

## Files in this module

${module.files.map(file => `- \`${file.relativePath}\` - ${this.formatBytes(file.size)}`).join('\n')}

---
*Generated by AI Coders Context*
`;
  }

  private async cleanupEmptyModules(
    docsDir: string,
    repoStructure: RepoStructure,
    verbose: boolean
  ): Promise<string[]> {
    const modulesDir = path.join(docsDir, 'modules');
    if (!await fs.pathExists(modulesDir)) return [];

    const existingModuleFiles = await fs.readdir(modulesDir);
    const currentModules = new Set(
      this.getModuleGroups(repoStructure).map(m => `${this.slugify(m.name)}.md`)
    );

    const removedFiles: string[] = [];

    for (const moduleFile of existingModuleFiles) {
      if (!currentModules.has(moduleFile)) {
        const modulePath = path.join(modulesDir, moduleFile);
        await fs.remove(modulePath);
        removedFiles.push(path.join('modules', moduleFile));
        if (verbose) {
          console.log(chalk.red(`🗑️  Removed empty module: ${moduleFile}`));
        }
      }
    }

    return removedFiles;
  }

  private async updateOverviewDocuments(
    repoStructure: RepoStructure,
    docsDir: string,
    verbose: boolean
  ): Promise<void> {
    // Update project overview
    const overviewFileName = 'overview.md';
    if (verbose) {
      console.log(chalk.blue(`📄 Updating ${overviewFileName}...`));
    }
    
    const overview = await this.createEnhancedProjectOverview(repoStructure);
    const overviewPath = path.join(docsDir, overviewFileName);
    await fs.writeFile(overviewPath, overview);

    if (verbose) {
      console.log(chalk.green(`✅ Updated ${overviewFileName}`));
    }

    // Update main README
    const indexFileName = 'README.md';
    if (verbose) {
      console.log(chalk.blue(`📄 Updating ${indexFileName}...`));
    }
    
    const indexContent = this.createDocumentationIndex(repoStructure);
    const indexPath = path.join(docsDir, indexFileName);
    await fs.writeFile(indexPath, indexContent);

    if (verbose) {
      console.log(chalk.green(`✅ Updated ${indexFileName}`));
    }
  }

  private displayChangeSummary(changes: GitChanges): void {
    const total = changes.added.length + changes.modified.length + changes.deleted.length + changes.renamed.length;
    
    console.log(chalk.bold('\n📋 Change Summary:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`${chalk.green('Added:')} ${changes.added.length} files`);
    console.log(`${chalk.yellow('Modified:')} ${changes.modified.length} files`);
    console.log(`${chalk.red('Deleted:')} ${changes.deleted.length} files`);
    console.log(`${chalk.blue('Renamed:')} ${changes.renamed.length} files`);
    console.log(`${chalk.bold('Total:')} ${total} changes`);
    console.log(chalk.gray('─'.repeat(50)) + '\n');
  }

  private async createEnhancedProjectOverview(repoStructure: RepoStructure): Promise<string> {
    const { files, directories, totalFiles, totalSize } = repoStructure;
    const branch = this.gitService.getBranchName();
    const lastCommit = this.gitService.getCurrentCommit().substring(0, 7);
    
    const extensions = new Map<string, number>();
    files.forEach(file => {
      const ext = file.extension || 'no-extension';
      extensions.set(ext, (extensions.get(ext) || 0) + 1);
    });

    const topExtensions = Array.from(extensions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return `# Project Overview

## Git Information
- **Branch**: ${branch}
- **Last Commit**: ${lastCommit}
- **Last Updated**: ${new Date().toISOString()}

## Project Statistics
- **Total Files**: ${totalFiles}
- **Total Directories**: ${directories.length}
- **Total Size**: ${this.formatBytes(totalSize)}

## File Distribution
${topExtensions.map(([ext, count]) => `- **${ext}**: ${count} files (${((count/totalFiles)*100).toFixed(1)}%)`).join('\n')}

---
*Generated by AI Coders Context*
*Incremental update: ${new Date().toISOString()}*
`;
  }

  private createDocumentationIndex(_repoStructure: RepoStructure): string {
    const state = this.gitService.getState();
    const branch = this.gitService.getBranchName();
    
    return `# Documentation Index

This documentation was generated automatically from the codebase.

## Documentation Structure

### [Overview](./overview.md)
High-level project overview, statistics, and git information.

### [Architecture](./architecture.md)
System architecture, design patterns, and technical decisions.

### [Modules](./modules/)
Detailed documentation organized by module and directory structure.

### [API Reference](./api-reference.md)
Complete API documentation for all public interfaces.

### [Configuration](./configuration.md)
Configuration options, environment variables, and setup guides.

## Generation Info
- **Branch**: ${branch}
- **Generated**: ${new Date().toISOString()}
- **Last Processed Commit**: ${state?.lastCommit ? state.lastCommit.substring(0, 7) : 'None'}

---
*Generated by AI Coders Context*
`;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}