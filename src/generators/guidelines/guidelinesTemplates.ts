import { RepoStructure } from '../../types';
import { BaseLLMClient } from '../../services/baseLLMClient';
import { ModuleGroup } from '../moduleGrouper';
import { GeneratorUtils } from '../shared';
import { 
  GuidelineCategory, 
  GuidelineConfig, 
  DetectedTechnology,
  GuidelineSection 
} from './guidelineTypes';
import { GuidelinesAnalyzer } from './guidelinesAnalyzer';

export class GuidelinesTemplates {
  private analyzer: GuidelinesAnalyzer;

  constructor(
    private llmClient: BaseLLMClient,
    fileMapper?: any
  ) {
    this.analyzer = new GuidelinesAnalyzer(fileMapper);
  }

  async generateSoftwareGuidelines(
    repoStructure: RepoStructure,
    moduleGroups: ModuleGroup[],
    config: Partial<GuidelineConfig> = {}
  ): Promise<string> {
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

    const context = this.buildGuidelinesContext(repoStructure, moduleGroups, analysis, fullConfig);
    
    const content = await this.llmClient.generateText(
      this.createGuidelinesPrompt(fullConfig),
      context
    );

    return this.formatGuidelinesDocument(content, fullConfig, analysis);
  }

  async generateCategorySpecificGuidelines(
    category: GuidelineCategory,
    repoStructure: RepoStructure,
    moduleGroups: ModuleGroup[],
    config: Partial<GuidelineConfig> = {}
  ): Promise<string> {
    const analysis = await this.analyzer.analyzeCodebase(repoStructure);
    
    const fullConfig: GuidelineConfig = {
      categories: [category],
      techStack: analysis.techStack,
      projectType: analysis.projectType,
      complexity: analysis.complexity,
      teamSize: 'medium',
      includeExamples: true,
      includeTools: true,
      ...config
    };

    const context = this.buildCategoryContext(category, repoStructure, moduleGroups, analysis, fullConfig);
    
    const content = await this.llmClient.generateText(
      this.createCategorySpecificPrompt(category, fullConfig),
      context
    );

    return this.formatCategoryDocument(category, content, fullConfig, analysis);
  }

  private createGuidelinesPrompt(config: GuidelineConfig): string {
    return `Create comprehensive software development guidelines for this ${config.projectType} project.

Generate guidelines for the following categories: ${config.categories.join(', ')}

Requirements:
- **Specificity**: Make guidelines specific to the detected technology stack and project patterns
- **Actionability**: Provide clear, actionable rules that developers can follow
- **Context-Awareness**: Base guidelines on the actual codebase structure and conventions
- **Practical Examples**: Include concrete examples using the project's technology stack
- **Team Size**: Consider guidelines appropriate for a ${config.teamSize} team
- **Complexity**: Adapt guidelines for a ${config.complexity} complexity project

For each category, provide:
1. **Overview**: Brief explanation of why this category matters for this project
2. **Core Principles**: 3-5 fundamental principles to follow
3. **Specific Rules**: Detailed, actionable guidelines with rationale
4. **Examples**: Code examples using the detected technologies
5. **Tools & Automation**: Recommended tools and automation for this category
6. **Common Pitfalls**: What to avoid and why
7. **Quality Gates**: How to measure adherence to these guidelines

Structure the guidelines to be:
- Easy to onboard new team members
- Enforceable through tooling where possible
- Adaptable as the project evolves
- Consistent with industry best practices for the detected tech stack

Focus on practical, day-to-day development guidance rather than theoretical concepts.`;
  }

  private createCategorySpecificPrompt(category: GuidelineCategory, config: GuidelineConfig): string {
    const categoryDescriptions: Record<GuidelineCategory, string> = {
      'testing': 'testing strategies, test types, coverage, and quality assurance',
      'frontend': 'UI/UX development, component architecture, state management, and performance',
      'backend': 'API design, service architecture, data processing, and scalability',
      'database': 'data modeling, query optimization, migrations, and data integrity',
      'security': 'authentication, authorization, data protection, and vulnerability prevention',
      'performance': 'optimization strategies, monitoring, and performance budgets',
      'code-style': 'coding standards, formatting, naming conventions, and maintainability',
      'git-workflow': 'version control, branching strategies, and collaboration workflows',
      'deployment': 'CI/CD, release management, and production deployment strategies',
      'monitoring': 'logging, metrics, alerting, and observability',
      'documentation': 'code documentation, API docs, and knowledge management',
      'architecture': 'system design, architectural patterns, and technical decisions'
    };

    return `Create detailed software development guidelines specifically for ${categoryDescriptions[category]} in this ${config.projectType} project.

Focus on: ${category.toUpperCase()} Guidelines

Requirements:
- **Deep Dive**: Provide comprehensive coverage of ${category} practices
- **Technology-Specific**: Tailor guidelines to the detected technology stack
- **Practical Rules**: Include specific, actionable guidelines with clear rationale
- **Implementation Details**: Show how to implement these guidelines in this project
- **Tool Integration**: Recommend specific tools and configurations
- **Quality Metrics**: Define measurable success criteria
- **Common Scenarios**: Address typical challenges in ${category} for this project type

Structure:
1. **Introduction**: Why ${category} matters for this specific project
2. **Fundamental Principles**: Core concepts and philosophies
3. **Detailed Guidelines**: Comprehensive rules with examples
4. **Implementation Strategy**: How to adopt these guidelines
5. **Tools & Automation**: Specific tool recommendations and configurations
6. **Quality Assurance**: How to measure and maintain quality
7. **Troubleshooting**: Common issues and solutions
8. **Evolution**: How to adapt guidelines as the project grows

Make it a definitive guide that team members can reference daily for ${category}-related decisions.`;
  }

  private formatGuidelinesDocument(
    content: string,
    config: GuidelineConfig,
    analysis: { technologies: DetectedTechnology[]; projectType: string; complexity: string }
  ): string {
    const techStackSummary = analysis.technologies
      .filter(t => t.confidence > 0.5)
      .map(t => `${t.name} (${t.category})`)
      .join(', ');

    return `# Software Development Guidelines

## Project Overview
- **Type**: ${config.projectType}
- **Complexity**: ${config.complexity}
- **Technology Stack**: ${techStackSummary}
- **Team Size**: ${config.teamSize}

## Scope
These guidelines cover: ${config.categories.map(c => c.replace('-', ' ')).join(', ')}

---

${content}

## Guidelines Maintenance

### Updating Guidelines
- Review quarterly or when major technology changes occur
- Update based on team feedback and project evolution
- Validate guidelines against actual project needs

### Enforcement
- Integrate guidelines into code review process
- Use automated tools where possible for consistency
- Provide training and documentation for new team members

### Metrics
- Track adherence through code review feedback
- Monitor quality metrics related to each guideline category
- Gather team feedback on guideline effectiveness

---

${GeneratorUtils.createGeneratedByFooter('Software Development Guidelines', `Categories: ${config.categories.join(', ')}`)}`;
  }

  private formatCategoryDocument(
    category: GuidelineCategory,
    content: string,
    config: GuidelineConfig,
    analysis: { technologies: DetectedTechnology[]; projectType: string; complexity: string }
  ): string {
    const categoryTitle = GeneratorUtils.formatTitle(category);
    
    return `# ${categoryTitle} Guidelines

## Context
- **Project Type**: ${config.projectType}
- **Complexity**: ${config.complexity}
- **Relevant Technologies**: ${analysis.technologies
      .filter(t => this.isTechnologyRelevantToCategory(t, category))
      .map(t => t.name)
      .join(', ') || 'General practices'}

---

${content}

## Implementation Checklist

### Immediate Actions
- [ ] Review current ${category} practices against these guidelines
- [ ] Identify gaps and create improvement plan
- [ ] Set up recommended tools and automation

### Ongoing Practices
- [ ] Incorporate guidelines into daily development workflow
- [ ] Include ${category} review in code review process
- [ ] Monitor and measure adherence to guidelines

### Continuous Improvement
- [ ] Regularly review and update guidelines
- [ ] Gather team feedback on guideline effectiveness
- [ ] Adapt guidelines based on project evolution

---

${GeneratorUtils.createGeneratedByFooter(`${categoryTitle} Guidelines`)}`;
  }

  private buildGuidelinesContext(
    repoStructure: RepoStructure,
    moduleGroups: ModuleGroup[],
    analysis: any,
    config: GuidelineConfig
  ): string {
    const topExtensions = GeneratorUtils.getTopFileExtensions(repoStructure, 5);
    
    return `Project Analysis:
- Root Path: ${repoStructure.rootPath}
- Total Files: ${repoStructure.totalFiles}
- Project Type: ${analysis.projectType}
- Complexity: ${analysis.complexity}
- Primary Languages: ${topExtensions.map(([ext, count]) => `${ext} (${count} files)`).join(', ')}

Detected Technologies:
${analysis.technologies.map((t: DetectedTechnology) => 
  `- ${t.name} (${t.category}): ${(t.confidence * 100).toFixed(0)}% confidence`
).join('\n')}

Module Structure:
${moduleGroups.slice(0, 10).map(m => 
  `- ${m.name}: ${m.description} (${m.files.length} files)`
).join('\n')}

Key Directories:
${[...new Set(repoStructure.files.map(f => f.relativePath.split('/')[0]))]
  .filter(dir => !dir.includes('.'))
  .slice(0, 10)
  .map(dir => `- ${dir}/`)
  .join('\n')}

Configuration Files:
${repoStructure.files
  .filter(f => ['package.json', 'tsconfig.json', '.env', 'jest.config.js', 'webpack.config.js'].some(config => f.relativePath.includes(config)))
  .map(f => `- ${f.relativePath}`)
  .join('\n')}

Guideline Categories to Cover: ${config.categories.join(', ')}`;
  }

  private buildCategoryContext(
    category: GuidelineCategory,
    repoStructure: RepoStructure,
    moduleGroups: ModuleGroup[],
    analysis: any,
    config: GuidelineConfig
  ): string {
    const baseContext = this.buildGuidelinesContext(repoStructure, moduleGroups, analysis, config);
    
    // Add category-specific context
    let categorySpecificContext = '';
    
    if (category === 'testing') {
      categorySpecificContext = this.getTestingContext(repoStructure, analysis);
    } else if (category === 'frontend') {
      categorySpecificContext = this.getFrontendContext(repoStructure, analysis);
    } else if (category === 'backend') {
      categorySpecificContext = this.getBackendContext(repoStructure, analysis);
    } else if (category === 'database') {
      categorySpecificContext = this.getDatabaseContext(repoStructure, analysis);
    }

    return `${baseContext}

Category-Specific Context for ${category.toUpperCase()}:
${categorySpecificContext}`;
  }

  private getTestingContext(repoStructure: RepoStructure, analysis: any): string {
    const testFiles = repoStructure.files.filter(f => 
      f.relativePath.includes('test') || 
      f.relativePath.includes('spec') ||
      f.relativePath.includes('__tests__')
    );

    return `Testing Context:
- Test Files Found: ${testFiles.length}
- Testing Frameworks Detected: ${analysis.technologies
      .filter((t: DetectedTechnology) => ['Jest', 'Cypress', 'Vitest', 'Mocha'].includes(t.name))
      .map((t: DetectedTechnology) => t.name)
      .join(', ') || 'None detected'}
- Test File Patterns: ${testFiles.slice(0, 5).map(f => f.relativePath).join(', ')}`;
  }

  private getFrontendContext(repoStructure: RepoStructure, analysis: any): string {
    const frontendTech = analysis.technologies.filter((t: DetectedTechnology) => 
      ['React', 'Vue', 'Angular', 'Next.js'].includes(t.name)
    );

    return `Frontend Context:
- Frontend Frameworks: ${frontendTech.map((t: DetectedTechnology) => t.name).join(', ') || 'None detected'}
- Component Files: ${repoStructure.files.filter(f => 
      f.relativePath.includes('component') || 
      f.relativePath.endsWith('.jsx') || 
      f.relativePath.endsWith('.vue')
    ).length}
- Asset Files: ${repoStructure.files.filter(f => 
      f.relativePath.includes('assets') || 
      f.relativePath.includes('public') ||
      f.relativePath.includes('static')
    ).length}`;
  }

  private getBackendContext(repoStructure: RepoStructure, analysis: any): string {
    const backendTech = analysis.technologies.filter((t: DetectedTechnology) => 
      ['Express', 'Fastify', 'NestJS'].includes(t.name)
    );

    return `Backend Context:
- Backend Frameworks: ${backendTech.map((t: DetectedTechnology) => t.name).join(', ') || 'None detected'}
- API Files: ${repoStructure.files.filter(f => 
      f.relativePath.includes('api') || 
      f.relativePath.includes('route') ||
      f.relativePath.includes('controller')
    ).length}
- Service Files: ${repoStructure.files.filter(f => 
      f.relativePath.includes('service') || 
      f.relativePath.includes('handler')
    ).length}`;
  }

  private getDatabaseContext(repoStructure: RepoStructure, analysis: any): string {
    const dbTech = analysis.technologies.filter((t: DetectedTechnology) => 
      t.category === 'database'
    );

    return `Database Context:
- Database Technologies: ${dbTech.map((t: DetectedTechnology) => t.name).join(', ') || 'None detected'}
- Migration Files: ${repoStructure.files.filter(f => 
      f.relativePath.includes('migration') || 
      f.relativePath.includes('schema')
    ).length}
- Model Files: ${repoStructure.files.filter(f => 
      f.relativePath.includes('model') || 
      f.relativePath.includes('entity')
    ).length}`;
  }

  private isTechnologyRelevantToCategory(tech: DetectedTechnology, category: GuidelineCategory): boolean {
    const relevanceMap: Record<GuidelineCategory, string[]> = {
      'testing': ['Jest', 'Cypress', 'Vitest', 'Mocha'],
      'frontend': ['React', 'Vue', 'Angular', 'Next.js'],
      'backend': ['Express', 'Fastify', 'NestJS'],
      'database': ['MongoDB', 'PostgreSQL', 'Redis'],
      'security': ['all'],
      'performance': ['all'],
      'code-style': ['TypeScript', 'JavaScript'],
      'git-workflow': ['all'],
      'deployment': ['Docker', 'Kubernetes'],
      'monitoring': ['all'],
      'documentation': ['all'],
      'architecture': ['all']
    };

    const relevantTechs = relevanceMap[category];
    return relevantTechs.includes('all') || relevantTechs.includes(tech.name);
  }
}