import * as path from 'path';
import { RepoStructure } from '../../types';
import { FileMapper } from '../../utils/fileMapper';
import { BaseLLMClient } from '../../services/baseLLMClient';
import { ModuleGrouper, ModuleGroup } from '../moduleGrouper';
import { GeneratorUtils } from '../shared';
import { GuidelinesTemplates } from './guidelinesTemplates';
import { GuidelinesAnalyzer } from './guidelinesAnalyzer';
import { 
  GuidelineConfig, 
  GuidelineCategory, 
  GUIDELINE_CATEGORIES_ARRAY 
} from './guidelineTypes';

export class GuidelinesGenerator {
  private moduleGrouper: ModuleGrouper;
  private templates: GuidelinesTemplates;
  private analyzer: GuidelinesAnalyzer;

  constructor(
    private fileMapper: FileMapper,
    private llmClient: BaseLLMClient
  ) {
    this.moduleGrouper = new ModuleGrouper(fileMapper);
    this.templates = new GuidelinesTemplates(llmClient, fileMapper);
    this.analyzer = new GuidelinesAnalyzer(fileMapper);
  }

  async generateGuidelines(
    repoStructure: RepoStructure,
    outputDir: string,
    config: Partial<GuidelineConfig> = {},
    verbose: boolean = false
  ): Promise<void> {
    const analysis = await this.analyzer.analyzeCodebase(repoStructure);
    
    const fullConfig: GuidelineConfig = {
      categories: config.categories || analysis.recommendedCategories,
      techStack: analysis.techStack,
      projectType: analysis.projectType,
      complexity: analysis.complexity,
      teamSize: 'medium',
      includeExamples: true,
      includeTools: true,
      ...config
    };

    const guidelinesDir = path.join(outputDir, 'guidelines');
    await GeneratorUtils.ensureDirectoryAndLog(guidelinesDir, verbose, '📋 Generating software development guidelines');

    const moduleGroups = this.moduleGrouper.getModuleGroups(repoStructure);

    // Generate comprehensive guidelines document
    await this.generateComprehensiveGuidelines(repoStructure, moduleGroups, guidelinesDir, fullConfig, verbose);

    // Generate category-specific guidelines
    await this.generateCategorySpecificGuidelines(repoStructure, moduleGroups, guidelinesDir, fullConfig, verbose);

    // Generate guidelines index
    await this.generateGuidelinesIndex(guidelinesDir, fullConfig, analysis, verbose);

    if (verbose) {
      console.log(`✅ Generated guidelines for: ${fullConfig.categories.join(', ')}`);
      console.log(`📊 Analyzed ${analysis.technologies.length} technologies`);
      console.log(`🎯 Project type: ${analysis.projectType}, Complexity: ${analysis.complexity}`);
    }
  }

  async generateComprehensiveGuidelines(
    repoStructure: RepoStructure,
    moduleGroups: ModuleGroup[],
    guidelinesDir: string,
    config: GuidelineConfig,
    verbose: boolean
  ): Promise<void> {
    try {
      const content = await this.templates.generateSoftwareGuidelines(
        repoStructure,
        moduleGroups,
        config
      );

      const filePath = path.join(guidelinesDir, 'comprehensive-guidelines.md');
      await GeneratorUtils.writeFileWithLogging(
        filePath,
        content,
        verbose,
        'Generated Comprehensive Software Guidelines'
      );
    } catch (error) {
      GeneratorUtils.logError('Error generating comprehensive guidelines', error, verbose);
    }
  }

  async generateCategorySpecificGuidelines(
    repoStructure: RepoStructure,
    moduleGroups: ModuleGroup[],
    guidelinesDir: string,
    config: GuidelineConfig,
    verbose: boolean
  ): Promise<void> {
    GeneratorUtils.logProgress('📝 Generating category-specific guidelines...', verbose);

    for (const category of config.categories) {
      try {
        const content = await this.templates.generateCategorySpecificGuidelines(
          category,
          repoStructure,
          moduleGroups,
          config
        );

        const fileName = `${category}-guidelines.md`;
        const filePath = path.join(guidelinesDir, fileName);
        
        await GeneratorUtils.writeFileWithLogging(
          filePath,
          content,
          verbose,
          `Generated ${GeneratorUtils.formatTitle(category)} Guidelines`
        );
      } catch (error) {
        GeneratorUtils.logError(`Error generating ${category} guidelines`, error, verbose);
      }
    }
  }

  async generateGuidelinesIndex(
    guidelinesDir: string,
    config: GuidelineConfig,
    analysis: any,
    verbose: boolean
  ): Promise<void> {
    const indexContent = this.createGuidelinesIndex(config, analysis);
    const indexPath = path.join(guidelinesDir, 'README.md');
    await GeneratorUtils.writeFileWithLogging(indexPath, indexContent, verbose, 'Generated Guidelines Index');
  }

  private createGuidelinesIndex(config: GuidelineConfig, analysis: any): string {
    const categoryDescriptions: Record<GuidelineCategory, string> = {
      'testing': 'Testing strategies, frameworks, and quality assurance practices',
      'frontend': 'UI development, component architecture, and user experience guidelines',
      'backend': 'Server-side development, API design, and service architecture',
      'database': 'Data modeling, query optimization, and database management',
      'security': 'Security best practices, authentication, and vulnerability prevention',
      'performance': 'Performance optimization, monitoring, and efficiency guidelines',
      'code-style': 'Coding standards, formatting, and maintainability practices',
      'git-workflow': 'Version control, branching strategies, and collaboration workflows',
      'deployment': 'CI/CD, release management, and production deployment',
      'monitoring': 'Logging, metrics, alerting, and system observability',
      'documentation': 'Code documentation, API docs, and knowledge management',
      'architecture': 'System design, architectural patterns, and technical decisions'
    };

    const techStackSummary = analysis.technologies
      .filter((t: any) => t.confidence > 0.5)
      .map((t: any) => `${t.name} (${t.category})`)
      .join(', ');

    const sections = config.categories.map(category => {
      const title = GeneratorUtils.formatTitle(category);
      const description = categoryDescriptions[category];
      return `### [${title}](./${category}-guidelines.md)
${description}`;
    }).join('\n\n');

    return `# Software Development Guidelines

## Project Overview
- **Type**: ${config.projectType}
- **Complexity**: ${config.complexity}
- **Technology Stack**: ${techStackSummary}
- **Team Size**: ${config.teamSize}

## Quick Start
1. **Start with [Comprehensive Guidelines](./comprehensive-guidelines.md)** - Overview of all development practices
2. **Review category-specific guidelines** based on your current task
3. **Integrate guidelines into your development workflow**
4. **Use guidelines during code reviews and onboarding**

## Guidelines Categories

${sections}

## How to Use These Guidelines

### For New Team Members
1. Read the comprehensive guidelines first
2. Focus on code-style and git-workflow guidelines
3. Review testing and documentation guidelines
4. Gradually explore other categories as needed

### For Daily Development
- Reference relevant category guidelines for your current task
- Use guidelines during code reviews
- Validate decisions against architectural guidelines
- Follow security guidelines for any security-related changes

### For Code Reviews
- Check adherence to code-style guidelines
- Verify testing guidelines are followed
- Ensure security guidelines are respected
- Validate architectural decisions

### For Project Setup
- Follow deployment guidelines for environment setup
- Implement monitoring guidelines from the start
- Set up automated tools recommended in guidelines
- Establish workflows based on git-workflow guidelines

## Tools and Automation

Based on your technology stack, consider setting up:
${analysis.technologies
  .filter((t: any) => t.confidence > 0.6)
  .map((t: any) => `- **${t.name}**: See ${this.getTechnologyRelevantCategories(t.name, config.categories).join(', ')} guidelines`)
  .join('\n')}

## Continuous Improvement

### Regular Reviews
- **Monthly**: Review and update guidelines based on team feedback
- **Quarterly**: Assess guideline effectiveness and project evolution
- **Major Changes**: Update guidelines when technology stack changes

### Feedback Collection
- Gather team feedback on guideline usefulness
- Track common code review comments to identify guideline gaps
- Monitor project metrics to validate guideline effectiveness

### Evolution
- Adapt guidelines as project complexity grows
- Update technology-specific guidelines when upgrading frameworks
- Refine processes based on team size changes

---

${GeneratorUtils.createGeneratedByFooter('Software Development Guidelines Index', `Categories: ${config.categories.join(', ')}`)}`;
  }

  private getTechnologyRelevantCategories(techName: string, categories: GuidelineCategory[]): string[] {
    const techCategoryMap: Record<string, GuidelineCategory[]> = {
      'React': ['frontend', 'testing', 'performance'],
      'Vue': ['frontend', 'testing', 'performance'],
      'Angular': ['frontend', 'testing', 'performance'],
      'Express': ['backend', 'security', 'performance'],
      'NestJS': ['backend', 'testing', 'architecture'],
      'Jest': ['testing'],
      'Cypress': ['testing'],
      'MongoDB': ['database', 'performance'],
      'PostgreSQL': ['database', 'performance'],
      'Docker': ['deployment', 'monitoring'],
      'TypeScript': ['code-style', 'testing']
    };

    const relevantCategories = techCategoryMap[techName] || [];
    return relevantCategories.filter(cat => categories.includes(cat));
  }

  // Convenience methods for specific guideline generation
  async generateTestingGuidelinesOnly(
    repoStructure: RepoStructure,
    outputDir: string,
    verbose: boolean = false
  ): Promise<void> {
    await this.generateGuidelines(
      repoStructure,
      outputDir,
      { categories: ['testing'] },
      verbose
    );
  }

  async generateFrontendGuidelinesOnly(
    repoStructure: RepoStructure,
    outputDir: string,
    verbose: boolean = false
  ): Promise<void> {
    await this.generateGuidelines(
      repoStructure,
      outputDir,
      { categories: ['frontend', 'performance', 'code-style'] },
      verbose
    );
  }

  async generateBackendGuidelinesOnly(
    repoStructure: RepoStructure,
    outputDir: string,
    verbose: boolean = false
  ): Promise<void> {
    await this.generateGuidelines(
      repoStructure,
      outputDir,
      { categories: ['backend', 'security', 'database', 'monitoring'] },
      verbose
    );
  }

  async generateSecurityGuidelinesOnly(
    repoStructure: RepoStructure,
    outputDir: string,
    verbose: boolean = false
  ): Promise<void> {
    await this.generateGuidelines(
      repoStructure,
      outputDir,
      { categories: ['security'] },
      verbose
    );
  }

  async analyzeCodebaseOnly(
    repoStructure: RepoStructure,
    verbose: boolean = false
  ): Promise<{
    technologies: any[];
    projectType: string;
    complexity: string;
    recommendedCategories: GuidelineCategory[];
  }> {
    if (verbose) {
      GeneratorUtils.logProgress('🔍 Analyzing codebase for guideline recommendations...', verbose);
    }

    const analysis = await this.analyzer.analyzeCodebase(repoStructure);

    if (verbose) {
      console.log(`📊 Found ${analysis.technologies.length} technologies`);
      console.log(`🎯 Project type: ${analysis.projectType}`);
      console.log(`📈 Complexity: ${analysis.complexity}`);
      console.log(`💡 Recommended categories: ${analysis.recommendedCategories.join(', ')}`);
    }

    return analysis;
  }
}