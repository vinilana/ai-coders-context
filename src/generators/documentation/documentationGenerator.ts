import * as path from 'path';
import { RepoStructure } from '../../types';
import { FileMapper } from '../../utils/fileMapper';
import { BaseLLMClient } from '../../services/baseLLMClient';
import { ModuleGrouper, ModuleGroup } from '../moduleGrouper';
import { GeneratorUtils } from '../shared';
import { DocumentationTemplates } from './documentationTemplates';
import { DocumentationConfig, DocumentationType, DOCUMENTATION_TYPES_ARRAY } from './documentationTypes';

export class DocumentationGenerator {
  private moduleGrouper: ModuleGrouper;
  private templates: DocumentationTemplates;

  constructor(
    private fileMapper: FileMapper,
    private llmClient: BaseLLMClient
  ) {
    this.moduleGrouper = new ModuleGrouper(fileMapper);
    this.templates = new DocumentationTemplates(llmClient, fileMapper);
  }

  async generateDocumentation(
    repoStructure: RepoStructure,
    outputDir: string,
    config: Partial<DocumentationConfig> = {},
    verbose: boolean = false
  ): Promise<void> {
    const fullConfig: DocumentationConfig = {
      focusAreas: [],
      maxContentLength: 2000,
      includeExamples: true,
      enabledTypes: DOCUMENTATION_TYPES_ARRAY,
      ...config
    };

    const docsDir = path.join(outputDir, 'docs');
    await GeneratorUtils.ensureDirectoryAndLog(docsDir, verbose, '📚 Generating documentation in');

    const moduleGroups = this.moduleGrouper.getModuleGroups(repoStructure);

    await this.generateAllDocumentation(repoStructure, moduleGroups, docsDir, fullConfig.enabledTypes || DOCUMENTATION_TYPES_ARRAY, verbose);
    await this.generateMainIndex(docsDir, fullConfig.enabledTypes || DOCUMENTATION_TYPES_ARRAY, verbose);
  }

  private async generateAllDocumentation(
    repoStructure: RepoStructure,
    moduleGroups: ModuleGroup[],
    docsDir: string,
    enabledTypes: DocumentationType[],
    verbose: boolean
  ): Promise<void> {
    GeneratorUtils.logProgress('🧠 Generating high-level conceptual documentation...', verbose);

    const generators: Record<DocumentationType, () => Promise<string>> = {
      'mental-model': () => this.templates.createMentalModel(repoStructure, moduleGroups),
      'architecture-decisions': () => this.templates.createArchitectureDecisions(repoStructure, moduleGroups),
      'code-organization': () => this.templates.createCodeOrganization(repoStructure, moduleGroups),
      'development-patterns': () => this.templates.createDevelopmentPatterns(repoStructure, moduleGroups),
      'ai-guidelines': () => this.templates.createAIGuidelines(repoStructure, moduleGroups),
      'contributing-workflows': () => this.templates.createContributingWorkflows(repoStructure, moduleGroups),
      'domain-context': () => this.templates.createDomainContext(repoStructure, moduleGroups),
      'software-guidelines': () => this.templates.createSoftwareGuidelines(repoStructure, moduleGroups)
    };

    for (const docType of enabledTypes) {
      try {
        const content = await generators[docType]();
        const fileName = `${docType}.md`;
        const filePath = path.join(docsDir, fileName);
        
        await GeneratorUtils.writeFileWithLogging(
          filePath, 
          content, 
          verbose, 
          `Generated ${GeneratorUtils.formatTitle(docType)}`
        );
      } catch (error) {
        GeneratorUtils.logError(`Error generating ${docType}`, error, verbose);
      }
    }
  }

  private async generateMainIndex(
    docsDir: string,
    enabledTypes: DocumentationType[],
    verbose: boolean
  ): Promise<void> {
    const indexContent = this.templates.createDocumentationIndex(enabledTypes);
    const indexPath = path.join(docsDir, 'README.md');
    await GeneratorUtils.writeFileWithLogging(indexPath, indexContent, verbose, 'Generated documentation index');
  }

  // Convenience methods for specific documentation types
  async generateMentalModelOnly(
    repoStructure: RepoStructure,
    outputDir: string,
    verbose: boolean = false
  ): Promise<void> {
    const docsDir = path.join(outputDir, 'docs');
    await GeneratorUtils.ensureDirectoryAndLog(docsDir, verbose, '🧠 Generating mental model documentation');

    const moduleGroups = this.moduleGrouper.getModuleGroups(repoStructure);
    const content = await this.templates.createMentalModel(repoStructure, moduleGroups);
    
    const filePath = path.join(docsDir, 'mental-model.md');
    await GeneratorUtils.writeFileWithLogging(filePath, content, verbose, 'Generated Mental Model');
  }

  async generateAIGuidelinesOnly(
    repoStructure: RepoStructure,
    outputDir: string,
    verbose: boolean = false
  ): Promise<void> {
    const docsDir = path.join(outputDir, 'docs');
    await GeneratorUtils.ensureDirectoryAndLog(docsDir, verbose, '🤖 Generating AI guidelines documentation');

    const moduleGroups = this.moduleGrouper.getModuleGroups(repoStructure);
    const content = await this.templates.createAIGuidelines(repoStructure, moduleGroups);
    
    const filePath = path.join(docsDir, 'ai-guidelines.md');
    await GeneratorUtils.writeFileWithLogging(filePath, content, verbose, 'Generated AI Guidelines');
  }

  async generateArchitectureDecisionsOnly(
    repoStructure: RepoStructure,
    outputDir: string,
    verbose: boolean = false
  ): Promise<void> {
    const docsDir = path.join(outputDir, 'docs');
    await GeneratorUtils.ensureDirectoryAndLog(docsDir, verbose, '🏗️ Generating architecture decisions documentation');

    const moduleGroups = this.moduleGrouper.getModuleGroups(repoStructure);
    const content = await this.templates.createArchitectureDecisions(repoStructure, moduleGroups);
    
    const filePath = path.join(docsDir, 'architecture-decisions.md');
    await GeneratorUtils.writeFileWithLogging(filePath, content, verbose, 'Generated Architecture Decisions');
  }

  async generateSoftwareGuidelinesOnly(
    repoStructure: RepoStructure,
    outputDir: string,
    verbose: boolean = false
  ): Promise<void> {
    const docsDir = path.join(outputDir, 'docs');
    await GeneratorUtils.ensureDirectoryAndLog(docsDir, verbose, '📋 Generating software development guidelines');

    const moduleGroups = this.moduleGrouper.getModuleGroups(repoStructure);
    const content = await this.templates.createSoftwareGuidelines(repoStructure, moduleGroups);
    
    const filePath = path.join(docsDir, 'software-guidelines.md');
    await GeneratorUtils.writeFileWithLogging(filePath, content, verbose, 'Generated Software Development Guidelines');
  }
}