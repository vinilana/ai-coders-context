import * as path from 'path';
import { RepoStructure, FileInfo } from '../../types';
import { FileMapper } from '../../utils/fileMapper';
import { ModuleGroup } from '../moduleGrouper';

export interface ArchitecturalPattern {
  name: string;
  description: string;
  evidence: string[];
  confidence: number;
}

export interface CodePattern {
  type: string;
  pattern: string;
  description: string;
  examples: string[];
  frequency: number;
}

export interface DependencyFlow {
  from: string;
  to: string;
  type: 'import' | 'inheritance' | 'composition' | 'usage';
  strength: number;
}

export class CodebaseAnalyzer {
  constructor(private fileMapper: FileMapper) {}

  async analyzeArchitecturalPatterns(repoStructure: RepoStructure, moduleGroups: ModuleGroup[]): Promise<ArchitecturalPattern[]> {
    const patterns: ArchitecturalPattern[] = [];

    // Analyze directory structure for common patterns
    const directories = this.getDirectoryStructure(repoStructure);
    
    // Check for MVC pattern
    if (this.hasMVCStructure(directories)) {
      patterns.push({
        name: 'Model-View-Controller (MVC)',
        description: 'Separation of concerns into models, views, and controllers',
        evidence: this.getMVCEvidence(directories),
        confidence: 0.8
      });
    }

    // Check for layered architecture
    if (this.hasLayeredArchitecture(directories)) {
      patterns.push({
        name: 'Layered Architecture',
        description: 'Organized into distinct layers (services, controllers, models, etc.)',
        evidence: this.getLayeredEvidence(directories),
        confidence: 0.7
      });
    }

    // Check for modular architecture
    if (this.hasModularStructure(moduleGroups)) {
      patterns.push({
        name: 'Modular Architecture',
        description: 'Code organized into distinct, cohesive modules',
        evidence: this.getModularEvidence(moduleGroups),
        confidence: 0.9
      });
    }

    // Check for microservices indicators
    if (this.hasMicroservicesIndicators(repoStructure)) {
      patterns.push({
        name: 'Microservices Architecture',
        description: 'Multiple independent services with clear boundaries',
        evidence: this.getMicroservicesEvidence(repoStructure),
        confidence: 0.6
      });
    }

    return patterns;
  }

  async analyzeCodePatterns(repoStructure: RepoStructure): Promise<CodePattern[]> {
    const patterns: CodePattern[] = [];
    const sampleFiles = repoStructure.files.slice(0, 20); // Analyze sample for patterns

    for (const file of sampleFiles) {
      try {
        const content = await this.fileMapper.readFileContent(file.path);
        
        // Look for common patterns
        patterns.push(...this.detectDesignPatterns(content, file));
        patterns.push(...this.detectNamingPatterns(content, file));
        patterns.push(...this.detectErrorHandlingPatterns(content, file));
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return this.consolidatePatterns(patterns);
  }

  analyzeDependencyFlow(repoStructure: RepoStructure, moduleGroups: ModuleGroup[]): DependencyFlow[] {
    const flows: DependencyFlow[] = [];

    // Analyze module-to-module dependencies
    for (const module of moduleGroups) {
      for (const otherModule of moduleGroups) {
        if (module.name !== otherModule.name) {
          const strength = this.calculateDependencyStrength(module, otherModule);
          if (strength > 0) {
            flows.push({
              from: module.name,
              to: otherModule.name,
              type: 'import',
              strength
            });
          }
        }
      }
    }

    return flows.sort((a, b) => b.strength - a.strength);
  }

  identifyExtensionPoints(repoStructure: RepoStructure): string[] {
    const extensionPoints: string[] = [];
    const directories = this.getDirectoryStructure(repoStructure);

    // Common extension point patterns
    if (directories.includes('plugins')) {
      extensionPoints.push('Plugin system in /plugins directory');
    }
    if (directories.includes('extensions')) {
      extensionPoints.push('Extension system in /extensions directory');
    }
    if (directories.includes('hooks')) {
      extensionPoints.push('Hook system in /hooks directory');
    }
    if (directories.includes('middleware')) {
      extensionPoints.push('Middleware system in /middleware directory');
    }
    if (directories.includes('generators')) {
      extensionPoints.push('Generator system in /generators directory');
    }

    // Look for interface/abstract patterns
    const interfaceFiles = repoStructure.files.filter(f => 
      f.relativePath.includes('interface') || 
      f.relativePath.includes('abstract') ||
      f.relativePath.includes('base')
    );

    if (interfaceFiles.length > 0) {
      extensionPoints.push(`Interface-based extension points: ${interfaceFiles.slice(0, 3).map(f => f.relativePath).join(', ')}`);
    }

    return extensionPoints;
  }

  private getDirectoryStructure(repoStructure: RepoStructure): string[] {
    return [...new Set(
      repoStructure.files
        .map(f => f.relativePath.split('/')[0])
        .filter(dir => !dir.includes('.'))
    )];
  }

  private hasMVCStructure(directories: string[]): boolean {
    const mvcPatterns = ['models', 'views', 'controllers'];
    return mvcPatterns.filter(pattern => 
      directories.some(dir => dir.toLowerCase().includes(pattern))
    ).length >= 2;
  }

  private getMVCEvidence(directories: string[]): string[] {
    const evidence: string[] = [];
    if (directories.some(d => d.toLowerCase().includes('model'))) {
      evidence.push('Models directory found');
    }
    if (directories.some(d => d.toLowerCase().includes('view'))) {
      evidence.push('Views directory found');
    }
    if (directories.some(d => d.toLowerCase().includes('controller'))) {
      evidence.push('Controllers directory found');
    }
    return evidence;
  }

  private hasLayeredArchitecture(directories: string[]): boolean {
    const layers = ['services', 'controllers', 'models', 'repositories', 'utils'];
    return layers.filter(layer => 
      directories.some(dir => dir.toLowerCase().includes(layer))
    ).length >= 3;
  }

  private getLayeredEvidence(directories: string[]): string[] {
    const layers = ['services', 'controllers', 'models', 'repositories', 'utils', 'middleware'];
    return layers
      .filter(layer => directories.some(dir => dir.toLowerCase().includes(layer)))
      .map(layer => `${layer.charAt(0).toUpperCase() + layer.slice(1)} layer found`);
  }

  private hasModularStructure(moduleGroups: ModuleGroup[]): boolean {
    return moduleGroups.length > 2 && 
           moduleGroups.every(m => m.files.length > 1) &&
           moduleGroups.some(m => m.files.length > 3);
  }

  private getModularEvidence(moduleGroups: ModuleGroup[]): string[] {
    return [
      `${moduleGroups.length} distinct modules identified`,
      `Average module size: ${Math.round(moduleGroups.reduce((sum, m) => sum + m.files.length, 0) / moduleGroups.length)} files`,
      `Largest module: ${moduleGroups.reduce((max, m) => m.files.length > max.files.length ? m : max).name}`
    ];
  }

  private hasMicroservicesIndicators(repoStructure: RepoStructure): boolean {
    const indicators = [
      repoStructure.files.some(f => f.relativePath.includes('docker')),
      repoStructure.files.some(f => f.relativePath.includes('k8s') || f.relativePath.includes('kubernetes')),
      repoStructure.files.some(f => f.relativePath.includes('service')),
      repoStructure.files.some(f => f.relativePath.includes('api'))
    ];
    return indicators.filter(Boolean).length >= 2;
  }

  private getMicroservicesEvidence(repoStructure: RepoStructure): string[] {
    const evidence: string[] = [];
    if (repoStructure.files.some(f => f.relativePath.includes('docker'))) {
      evidence.push('Docker configuration found');
    }
    if (repoStructure.files.some(f => f.relativePath.includes('k8s'))) {
      evidence.push('Kubernetes configuration found');
    }
    if (repoStructure.files.some(f => f.relativePath.includes('service'))) {
      evidence.push('Service-oriented file structure');
    }
    return evidence;
  }

  private detectDesignPatterns(content: string, file: FileInfo): CodePattern[] {
    const patterns: CodePattern[] = [];

    // Factory pattern
    if (content.includes('createFactory') || content.includes('Factory') || content.match(/create\w+/g)) {
      patterns.push({
        type: 'Design Pattern',
        pattern: 'Factory Pattern',
        description: 'Object creation through factory methods',
        examples: [file.relativePath],
        frequency: 1
      });
    }

    // Observer pattern
    if (content.includes('addEventListener') || content.includes('subscribe') || content.includes('emit')) {
      patterns.push({
        type: 'Design Pattern',
        pattern: 'Observer Pattern',
        description: 'Event-driven communication between objects',
        examples: [file.relativePath],
        frequency: 1
      });
    }

    // Singleton pattern
    if (content.includes('getInstance') || content.match(/private\s+constructor/)) {
      patterns.push({
        type: 'Design Pattern',
        pattern: 'Singleton Pattern',
        description: 'Single instance object creation',
        examples: [file.relativePath],
        frequency: 1
      });
    }

    return patterns;
  }

  private detectNamingPatterns(content: string, file: FileInfo): CodePattern[] {
    const patterns: CodePattern[] = [];

    // Check for naming conventions
    if (content.match(/\bI[A-Z]\w+/g)) {
      patterns.push({
        type: 'Naming Convention',
        pattern: 'Interface Prefix',
        description: 'Interfaces prefixed with "I"',
        examples: [file.relativePath],
        frequency: 1
      });
    }

    if (content.match(/\b\w+Service\b/g)) {
      patterns.push({
        type: 'Naming Convention',
        pattern: 'Service Suffix',
        description: 'Services suffixed with "Service"',
        examples: [file.relativePath],
        frequency: 1
      });
    }

    return patterns;
  }

  private detectErrorHandlingPatterns(content: string, file: FileInfo): CodePattern[] {
    const patterns: CodePattern[] = [];

    if (content.includes('try') && content.includes('catch')) {
      patterns.push({
        type: 'Error Handling',
        pattern: 'Try-Catch Blocks',
        description: 'Structured error handling with try-catch',
        examples: [file.relativePath],
        frequency: 1
      });
    }

    if (content.includes('throw new') || content.includes('throw Error')) {
      patterns.push({
        type: 'Error Handling',
        pattern: 'Custom Exceptions',
        description: 'Custom error throwing patterns',
        examples: [file.relativePath],
        frequency: 1
      });
    }

    return patterns;
  }

  private consolidatePatterns(patterns: CodePattern[]): CodePattern[] {
    const consolidated = new Map<string, CodePattern>();

    for (const pattern of patterns) {
      const key = `${pattern.type}:${pattern.pattern}`;
      if (consolidated.has(key)) {
        const existing = consolidated.get(key)!;
        existing.frequency += pattern.frequency;
        existing.examples.push(...pattern.examples);
      } else {
        consolidated.set(key, { ...pattern });
      }
    }

    return Array.from(consolidated.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10); // Top 10 patterns
  }

  private calculateDependencyStrength(moduleA: ModuleGroup, moduleB: ModuleGroup): number {
    // Simple heuristic: check if moduleA files reference moduleB
    let strength = 0;
    
    // Check for direct path references
    for (const fileA of moduleA.files) {
      for (const fileB of moduleB.files) {
        const bPath = fileB.relativePath.replace(/\.[^/.]+$/, ''); // Remove extension
        if (fileA.relativePath.includes(bPath) || bPath.includes(fileA.relativePath.replace(/\.[^/.]+$/, ''))) {
          strength += 0.1;
        }
      }
    }

    return Math.min(strength, 1.0); // Cap at 1.0
  }
}