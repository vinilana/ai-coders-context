import * as path from 'path';
import { RepoStructure, FileInfo } from '../../types';
import { FileMapper } from '../../utils/fileMapper';
import { 
  GuidelineCategory, 
  DetectedTechnology, 
  GuidelineConfig, 
  TECHNOLOGY_PATTERNS 
} from './guidelineTypes';

export class GuidelinesAnalyzer {
  constructor(private fileMapper: FileMapper) {}

  async analyzeCodebase(repoStructure: RepoStructure): Promise<{
    technologies: DetectedTechnology[];
    projectType: GuidelineConfig['projectType'];
    complexity: GuidelineConfig['complexity'];
    recommendedCategories: GuidelineCategory[];
    techStack: string[];
  }> {
    const technologies = await this.detectTechnologies(repoStructure);
    const projectType = this.determineProjectType(repoStructure, technologies);
    const complexity = this.assessComplexity(repoStructure, technologies);
    const recommendedCategories = this.recommendCategories(technologies, projectType);
    const techStack = technologies.map(t => t.name);

    return {
      technologies,
      projectType,
      complexity,
      recommendedCategories,
      techStack
    };
  }

  async detectTechnologies(repoStructure: RepoStructure): Promise<DetectedTechnology[]> {
    const detectedTech: DetectedTechnology[] = [];

    for (const [techName, pattern] of Object.entries(TECHNOLOGY_PATTERNS)) {
      const detection = await this.detectTechnology(techName, pattern, repoStructure);
      if (detection.confidence > 0.3) { // Only include if confidence > 30%
        detectedTech.push(detection);
      }
    }

    return detectedTech.sort((a, b) => b.confidence - a.confidence);
  }

  private async detectTechnology(
    techName: string, 
    pattern: typeof TECHNOLOGY_PATTERNS[string], 
    repoStructure: RepoStructure
  ): Promise<DetectedTechnology> {
    let confidence = 0;
    const matchingFiles: string[] = [];
    const foundPatterns: string[] = [];

    // Check file patterns
    const fileMatches = this.checkFilePatterns(pattern.files, repoStructure.files);
    if (fileMatches.length > 0) {
      confidence += 0.4;
      matchingFiles.push(...fileMatches);
    }

    // Check dependencies
    if (pattern.dependencies) {
      const depMatches = await this.checkDependencies(pattern.dependencies, repoStructure);
      if (depMatches.length > 0) {
        confidence += 0.5;
        foundPatterns.push(...depMatches);
      }
    }

    // Check code patterns
    if (pattern.patterns) {
      const codeMatches = await this.checkCodePatterns(pattern.patterns, repoStructure, matchingFiles);
      if (codeMatches.length > 0) {
        confidence += 0.3;
        foundPatterns.push(...codeMatches);
      }
    }

    return {
      name: techName,
      category: pattern.category,
      confidence: Math.min(confidence, 1.0),
      files: matchingFiles,
      patterns: foundPatterns
    };
  }

  private checkFilePatterns(patterns: string[], files: FileInfo[]): string[] {
    const matches: string[] = [];
    
    for (const pattern of patterns) {
      for (const file of files) {
        if (this.matchesPattern(file.relativePath, pattern)) {
          matches.push(file.relativePath);
        }
      }
    }
    
    return [...new Set(matches)]; // Remove duplicates
  }

  private async checkDependencies(dependencies: string[], repoStructure: RepoStructure): Promise<string[]> {
    const packageJsonFiles = repoStructure.files.filter(f => 
      f.relativePath.endsWith('package.json')
    );

    const foundDeps: string[] = [];

    for (const pkgFile of packageJsonFiles) {
      try {
        const content = await this.fileMapper.readFileContent(pkgFile.path);
        const pkg = JSON.parse(content);
        
        const allDeps = {
          ...pkg.dependencies,
          ...pkg.devDependencies,
          ...pkg.peerDependencies
        };

        for (const dep of dependencies) {
          for (const depName of Object.keys(allDeps)) {
            if (depName.includes(dep) || dep.includes(depName)) {
              foundDeps.push(depName);
            }
          }
        }
      } catch (error) {
        // Skip invalid package.json files
      }
    }

    return [...new Set(foundDeps)];
  }

  private async checkCodePatterns(patterns: string[], repoStructure: RepoStructure, relevantFiles: string[]): Promise<string[]> {
    const foundPatterns: string[] = [];
    const filesToCheck = relevantFiles.length > 0 
      ? repoStructure.files.filter(f => relevantFiles.includes(f.relativePath))
      : repoStructure.files.slice(0, 20); // Sample files if no relevant files specified

    for (const file of filesToCheck) {
      try {
        const content = await this.fileMapper.readFileContent(file.path);
        
        for (const pattern of patterns) {
          if (content.includes(pattern)) {
            foundPatterns.push(pattern);
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return [...new Set(foundPatterns)];
  }

  private matchesPattern(filePath: string, pattern: string): boolean {
    // Convert glob-like patterns to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(regexPattern, 'i');
    return regex.test(filePath) || filePath.includes(pattern.replace('*', ''));
  }

  private determineProjectType(repoStructure: RepoStructure, technologies: DetectedTechnology[]): GuidelineConfig['projectType'] {
    const hasBackend = technologies.some(t => 
      ['Express', 'Fastify', 'NestJS'].includes(t.name) || 
      t.category === 'database'
    );
    
    const hasFrontend = technologies.some(t => 
      ['React', 'Vue', 'Angular', 'Next.js'].includes(t.name)
    );

    const hasCLI = repoStructure.files.some(f => 
      f.relativePath.includes('bin/') || 
      f.relativePath.includes('cli') ||
      f.relativePath.includes('command')
    );

    const hasLib = repoStructure.files.some(f => 
      f.relativePath === 'index.ts' || 
      f.relativePath === 'lib/index.ts'
    );

    if (hasCLI) return 'cli';
    if (hasLib && !hasFrontend && !hasBackend) return 'library';
    if (hasFrontend && hasBackend) return 'fullstack';
    if (hasFrontend) return 'frontend';
    if (hasBackend) return 'backend';
    
    return 'library'; // Default fallback
  }

  private assessComplexity(repoStructure: RepoStructure, technologies: DetectedTechnology[]): GuidelineConfig['complexity'] {
    const fileCount = repoStructure.totalFiles;
    const techCount = technologies.length;
    const hasMultipleFrameworks = technologies.filter(t => t.category === 'framework').length > 1;
    const hasDatabase = technologies.some(t => t.category === 'database');
    const hasDeployment = technologies.some(t => ['Docker', 'Kubernetes'].includes(t.name));

    let complexityScore = 0;

    // File count scoring
    if (fileCount > 200) complexityScore += 3;
    else if (fileCount > 50) complexityScore += 2;
    else complexityScore += 1;

    // Technology diversity scoring
    if (techCount > 10) complexityScore += 3;
    else if (techCount > 5) complexityScore += 2;
    else complexityScore += 1;

    // Architecture complexity
    if (hasMultipleFrameworks) complexityScore += 2;
    if (hasDatabase) complexityScore += 1;
    if (hasDeployment) complexityScore += 2;

    if (complexityScore >= 8) return 'complex';
    if (complexityScore >= 5) return 'moderate';
    return 'simple';
  }

  private recommendCategories(technologies: DetectedTechnology[], projectType: GuidelineConfig['projectType']): GuidelineCategory[] {
    const categories: Set<GuidelineCategory> = new Set();

    // Always include these basic categories
    categories.add('code-style');
    categories.add('git-workflow');
    categories.add('documentation');

    // Add testing if testing framework detected
    if (technologies.some(t => ['Jest', 'Cypress', 'Vitest'].includes(t.name))) {
      categories.add('testing');
    }

    // Frontend-specific categories
    if (projectType === 'frontend' || projectType === 'fullstack') {
      categories.add('frontend');
      categories.add('performance');
    }

    // Backend-specific categories
    if (projectType === 'backend' || projectType === 'fullstack') {
      categories.add('backend');
      categories.add('security');
      categories.add('monitoring');
    }

    // Database categories
    if (technologies.some(t => t.category === 'database')) {
      categories.add('database');
    }

    // Deployment categories
    if (technologies.some(t => ['Docker', 'Kubernetes'].includes(t.name))) {
      categories.add('deployment');
    }

    // Architecture for complex projects
    if (technologies.length > 5 || projectType === 'fullstack') {
      categories.add('architecture');
    }

    return Array.from(categories);
  }

  async analyzeTestingPatterns(repoStructure: RepoStructure): Promise<{
    testFrameworks: string[];
    testPatterns: string[];
    coverageTools: string[];
    testTypes: string[];
  }> {
    const testFiles = repoStructure.files.filter(f => 
      f.relativePath.includes('test') || 
      f.relativePath.includes('spec') ||
      f.relativePath.includes('__tests__')
    );

    const testFrameworks: string[] = [];
    const testPatterns: string[] = [];
    const coverageTools: string[] = [];
    const testTypes: string[] = [];

    // Detect test frameworks
    for (const file of testFiles.slice(0, 10)) {
      try {
        const content = await this.fileMapper.readFileContent(file.path);
        
        if (content.includes('describe') && content.includes('it')) {
          testFrameworks.push('Jest/Mocha-style');
        }
        if (content.includes('cy.')) {
          testFrameworks.push('Cypress');
          testTypes.push('E2E Testing');
        }
        if (content.includes('render(') && content.includes('screen.')) {
          testFrameworks.push('React Testing Library');
          testTypes.push('Component Testing');
        }
        if (content.includes('mount(') || content.includes('shallow(')) {
          testFrameworks.push('Enzyme');
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return {
      testFrameworks: [...new Set(testFrameworks)],
      testPatterns: [...new Set(testPatterns)],
      coverageTools: [...new Set(coverageTools)],
      testTypes: [...new Set(testTypes)]
    };
  }
}