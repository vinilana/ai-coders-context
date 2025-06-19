import * as path from 'path';
import { FileInfo, RepoStructure } from '../types';
import { GitService, GitChanges } from '../utils/gitService';
import { FileMapper } from '../utils/fileMapper';
import chalk from 'chalk';

export interface ModuleImpact {
  moduleName: string;
  affectedFiles: string[];
  changeTypes: {
    added: string[];
    modified: string[];
    deleted: string[];
    renamed: Array<{ from: string; to: string }>;
  };
  impactLevel: 'low' | 'medium' | 'high';
  description: string;
}

export interface ChangeAnalysis {
  totalChanges: number;
  trackedChanges: number;
  untrackedChanges: number;
  affectedModules: ModuleImpact[];
  overviewUpdateNeeded: boolean;
  estimatedProcessingTime: string;
  recommendations: string[];
  gitChanges?: GitChanges;
}

export class ChangeAnalyzer {
  constructor(
    private gitService: GitService,
    private fileMapper: FileMapper
  ) {}

  async analyzeChanges(
    repoStructure: RepoStructure,
    changes?: GitChanges
  ): Promise<ChangeAnalysis> {
    // Get changes if not provided
    const gitChanges = changes || this.gitService.getChangedFiles();
    
    // Calculate total unique changes
    const totalChanges = gitChanges.added.length + 
                        gitChanges.modified.length + 
                        gitChanges.deleted.length + 
                        gitChanges.renamed.length; // Count renames as single changes

    // Get all unique changed files for filtering
    const allChangedFiles = [
      ...gitChanges.added,
      ...gitChanges.modified,
      ...gitChanges.deleted,
      ...gitChanges.renamed.map(r => r.to) // Only count the target file for filtering
    ];

    // Filter for tracked files only
    const trackedChangedFiles = this.gitService.filterTrackedFiles(allChangedFiles);
    const relevantChangedFiles = trackedChangedFiles.filter(file => {
      const fullPath = path.join(repoStructure.rootPath, file);
      return this.fileMapper.isTextFile(fullPath);
    });

    // Analyze module impacts
    const moduleImpacts = this.analyzeModuleImpacts(relevantChangedFiles, gitChanges, repoStructure);
    
    // Determine if overview update is needed
    const overviewUpdateNeeded = this.shouldUpdateOverview(moduleImpacts, gitChanges);
    
    // Estimate processing time
    const estimatedTime = this.estimateProcessingTime(moduleImpacts);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(moduleImpacts, gitChanges);

    return {
      totalChanges: totalChanges,
      trackedChanges: trackedChangedFiles.length,
      untrackedChanges: totalChanges - trackedChangedFiles.length,
      affectedModules: moduleImpacts,
      overviewUpdateNeeded,
      estimatedProcessingTime: estimatedTime,
      recommendations,
      gitChanges // Add this for detailed breakdown in verbose mode
    };
  }

  displayAnalysis(analysis: ChangeAnalysis, verbose: boolean = false): void {
    console.log(chalk.bold.blue('\n🔍 Documentation Update Analysis'));
    console.log(chalk.gray('═'.repeat(60)));

    // Summary
    console.log(chalk.bold('\n📊 Change Summary:'));
    console.log(`  Total file changes: ${analysis.totalChanges}`);
    
    // Show breakdown in verbose mode
    if (verbose && analysis.gitChanges) {
      const gc = analysis.gitChanges;
      console.log(`    ${chalk.green('Added:')} ${gc.added.length} files`);
      console.log(`    ${chalk.yellow('Modified:')} ${gc.modified.length} files`);
      console.log(`    ${chalk.red('Deleted:')} ${gc.deleted.length} files`);
      console.log(`    ${chalk.blue('Renamed:')} ${gc.renamed.length} files`);
    }
    
    console.log(`  Tracked changes: ${chalk.green(analysis.trackedChanges)}`);
    if (analysis.untrackedChanges > 0) {
      console.log(`  Untracked changes: ${chalk.gray(analysis.untrackedChanges)} (will be skipped)`);
    }

    // Affected modules
    if (analysis.affectedModules.length > 0) {
      console.log(chalk.bold('\n📦 Affected Modules:'));
      analysis.affectedModules.forEach(module => {
        const impactColor = module.impactLevel === 'high' ? chalk.red : 
                          module.impactLevel === 'medium' ? chalk.yellow : chalk.green;
        
        console.log(`  ${impactColor('●')} ${chalk.bold(module.moduleName)} (${module.impactLevel} impact)`);
        console.log(`    ${chalk.gray(module.description)}`);
        console.log(`    Files affected: ${module.affectedFiles.length}`);
        
        if (verbose) {
          if (module.changeTypes.added.length > 0) {
            console.log(`    ${chalk.green('Added:')} ${module.changeTypes.added.join(', ')}`);
          }
          if (module.changeTypes.modified.length > 0) {
            console.log(`    ${chalk.yellow('Modified:')} ${module.changeTypes.modified.join(', ')}`);
          }
          if (module.changeTypes.deleted.length > 0) {
            console.log(`    ${chalk.red('Deleted:')} ${module.changeTypes.deleted.join(', ')}`);
          }
          if (module.changeTypes.renamed.length > 0) {
            module.changeTypes.renamed.forEach(rename => {
              console.log(`    ${chalk.blue('Renamed:')} ${rename.from} → ${rename.to}`);
            });
          }
        }
        console.log();
      });
    } else {
      console.log(chalk.yellow('\n📦 No modules affected by tracked file changes'));
    }

    // Processing info
    console.log(chalk.bold('⏱️  Estimated Processing Time:'), analysis.estimatedProcessingTime);
    
    if (analysis.overviewUpdateNeeded) {
      console.log(chalk.yellow('📋 Overview documents will be updated'));
    }

    // Recommendations
    if (analysis.recommendations.length > 0) {
      console.log(chalk.bold('\n💡 Recommendations:'));
      analysis.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }

    console.log(chalk.gray('═'.repeat(60)));
  }

  private analyzeModuleImpacts(
    changedFiles: string[],
    gitChanges: GitChanges,
    repoStructure: RepoStructure
  ): ModuleImpact[] {
    const moduleMap = new Map<string, ModuleImpact>();
    const processedFiles = new Set<string>();

    // Helper function to initialize module if needed
    const ensureModule = (moduleName: string) => {
      if (!moduleMap.has(moduleName)) {
        moduleMap.set(moduleName, {
          moduleName: this.formatModuleName(moduleName),
          affectedFiles: [],
          changeTypes: {
            added: [],
            modified: [],
            deleted: [],
            renamed: []
          },
          impactLevel: 'low',
          description: this.getModuleDescription(moduleName, repoStructure)
        });
      }
      return moduleMap.get(moduleName)!;
    };

    // Process added files
    gitChanges.added.forEach(file => {
      if (processedFiles.has(file)) return;
      processedFiles.add(file);
      
      const moduleName = this.getModuleNameForFile(file);
      const moduleImpact = ensureModule(moduleName);
      moduleImpact.affectedFiles.push(file);
      moduleImpact.changeTypes.added.push(file);
    });

    // Process modified files
    gitChanges.modified.forEach(file => {
      if (processedFiles.has(file)) return;
      processedFiles.add(file);
      
      const moduleName = this.getModuleNameForFile(file);
      const moduleImpact = ensureModule(moduleName);
      moduleImpact.affectedFiles.push(file);
      moduleImpact.changeTypes.modified.push(file);
    });

    // Process deleted files
    gitChanges.deleted.forEach(file => {
      if (processedFiles.has(file)) return;
      processedFiles.add(file);
      
      const moduleName = this.getModuleNameForFile(file);
      const moduleImpact = ensureModule(moduleName);
      moduleImpact.affectedFiles.push(file);
      moduleImpact.changeTypes.deleted.push(file);
    });

    // Process renamed files
    gitChanges.renamed.forEach(rename => {
      const fromModule = this.getModuleNameForFile(rename.from);
      const toModule = this.getModuleNameForFile(rename.to);
      
      // Add to source module if different from target
      if (fromModule !== toModule && !processedFiles.has(rename.from)) {
        const fromModuleImpact = ensureModule(fromModule);
        fromModuleImpact.affectedFiles.push(rename.from);
        if (!fromModuleImpact.changeTypes.renamed.some(r => r.from === rename.from)) {
          fromModuleImpact.changeTypes.renamed.push(rename);
        }
      }
      
      // Add to target module
      if (!processedFiles.has(rename.to)) {
        const toModuleImpact = ensureModule(toModule);
        toModuleImpact.affectedFiles.push(rename.to);
        if (!toModuleImpact.changeTypes.renamed.some(r => r.to === rename.to)) {
          toModuleImpact.changeTypes.renamed.push(rename);
        }
      }
      
      processedFiles.add(rename.from);
      processedFiles.add(rename.to);
    });

    // Calculate impact levels
    moduleMap.forEach(impact => {
      impact.impactLevel = this.calculateImpactLevel(impact);
    });

    return Array.from(moduleMap.values()).sort((a, b) => {
      const levelOrder = { high: 3, medium: 2, low: 1 };
      return levelOrder[b.impactLevel] - levelOrder[a.impactLevel];
    });
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

  private formatModuleName(name: string): string {
    return name
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private getModuleDescription(name: string, repoStructure: RepoStructure): string {
    const descriptions: { [key: string]: string } = {
      'generators': 'Code generation utilities for documentation and agents',
      'services': 'External service integrations and API clients',
      'utils': 'Utility functions and helper modules',
      'types': 'TypeScript type definitions and interfaces',
      'Root Files': 'Main configuration and entry point files'
    };

    const moduleFiles = repoStructure.files.filter(file => 
      this.getModuleNameForFile(file.relativePath) === name
    );

    return descriptions[name] || `${this.formatModuleName(name)} module with ${moduleFiles.length} files`;
  }

  private calculateImpactLevel(impact: ModuleImpact): 'low' | 'medium' | 'high' {
    const totalChanges = impact.affectedFiles.length;
    const hasDeletes = impact.changeTypes.deleted.length > 0;
    const hasRenames = impact.changeTypes.renamed.length > 0;
    
    // High impact: many changes, deletes, or renames
    if (totalChanges >= 5 || hasDeletes || hasRenames) {
      return 'high';
    }
    
    // Medium impact: moderate number of changes
    if (totalChanges >= 2) {
      return 'medium';
    }
    
    // Low impact: single file change
    return 'low';
  }

  private shouldUpdateOverview(moduleImpacts: ModuleImpact[], gitChanges: GitChanges): boolean {
    // Update overview if:
    // 1. Any module has high impact
    // 2. Multiple modules are affected
    // 3. There are structural changes (adds/deletes)
    return moduleImpacts.some(m => m.impactLevel === 'high') ||
           moduleImpacts.length > 1 ||
           gitChanges.added.length > 0 ||
           gitChanges.deleted.length > 0;
  }

  private estimateProcessingTime(moduleImpacts: ModuleImpact[]): string {
    // Base time per module (in seconds)
    const baseTimePerModule = 15;
    
    let totalTime = 0;
    moduleImpacts.forEach(impact => {
      let moduleTime = baseTimePerModule;
      
      // Adjust based on impact level
      if (impact.impactLevel === 'high') {
        moduleTime *= 1.5;
      } else if (impact.impactLevel === 'low') {
        moduleTime *= 0.7;
      }
      
      totalTime += moduleTime;
    });

    // Add time for overview updates
    if (this.shouldUpdateOverview(moduleImpacts, { added: [], modified: [], deleted: [], renamed: [] })) {
      totalTime += 10;
    }

    if (totalTime < 30) {
      return '< 30 seconds';
    } else if (totalTime < 60) {
      return '< 1 minute';
    } else if (totalTime < 120) {
      return '1-2 minutes';
    } else {
      return `~${Math.ceil(totalTime / 60)} minutes`;
    }
  }

  private generateRecommendations(moduleImpacts: ModuleImpact[], gitChanges: GitChanges): string[] {
    const recommendations: string[] = [];

    if (moduleImpacts.length === 0) {
      recommendations.push('No documentation updates needed - no relevant tracked file changes detected');
      return recommendations;
    }

    if (moduleImpacts.some(m => m.impactLevel === 'high')) {
      recommendations.push('High-impact changes detected - review generated documentation carefully');
    }

    if (gitChanges.deleted.length > 0) {
      recommendations.push('Files were deleted - ensure corresponding documentation is properly cleaned up');
    }

    if (gitChanges.renamed.length > 0) {
      recommendations.push('Files were renamed - check that documentation references are updated');
    }

    if (moduleImpacts.length > 3) {
      recommendations.push('Many modules affected - consider running in stages or during low-activity periods');
    }

    if (moduleImpacts.some(m => m.moduleName === 'Types')) {
      recommendations.push('Type definitions changed - API reference documentation may need updates');
    }

    return recommendations;
  }
}