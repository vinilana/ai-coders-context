import * as fs from 'fs-extra';
import * as path from 'path';
import {  RepoStructure } from '../../types';
import { FileMapper } from '../../utils/fileMapper';
import { BaseLLMClient } from '../../services/baseLLMClient';
import chalk from 'chalk';
import { ModuleGrouper, ModuleGroup } from '../moduleGrouper';
import { DocumentationTemplates } from './documentationTemplates';
import { DocumentationUtils } from './documentationUtils';

export class DocumentationGenerator {
  private moduleGrouper: ModuleGrouper;
  private templates: DocumentationTemplates;

  constructor(
    private fileMapper: FileMapper,
    private llmClient: BaseLLMClient
  ) {
    this.moduleGrouper = new ModuleGrouper(fileMapper);
    this.templates = new DocumentationTemplates(llmClient);
  }

  async generateDocumentation(
    repoStructure: RepoStructure,
    outputDir: string,
    verbose: boolean = false
  ): Promise<void> {
    const docsDir = path.join(outputDir, 'docs');
    await fs.ensureDir(docsDir);

    if (verbose) {
      console.log(chalk.blue(`📚 Generating documentation in: ${docsDir}`));
    }

    // Generate main documentation index
    await this.generateMainIndex(repoStructure, docsDir, verbose);

    // Generate overview documentation
    await this.generateOverview(repoStructure, docsDir, verbose);

    // Generate architecture documentation
    await this.generateArchitectureDoc(repoStructure, docsDir, verbose);

    // Generate module-based documentation
    await this.generateModuleDocumentation(repoStructure, docsDir, verbose);

    // Generate API reference
    await this.generateAPIReference(repoStructure, docsDir, verbose);

    // Generate configuration guide
    await this.generateConfigurationGuide(repoStructure, docsDir, verbose);

    // Generate development guide
    await this.generateDevelopmentGuide(repoStructure, docsDir, verbose);

    // Generate deployment guide
    await this.generateDeploymentGuide(repoStructure, docsDir, verbose);

    // Generate troubleshooting guide
    await this.generateTroubleshootingGuide(repoStructure, docsDir, verbose);
  }

  private async generateMainIndex(
    repoStructure: RepoStructure,
    docsDir: string,
    verbose: boolean
  ): Promise<void> {
    const fileName = 'README.md';
    if (verbose) {
      console.log(chalk.blue(`📄 Creating ${fileName}...`));
    }

    const moduleGroups = this.moduleGrouper.getModuleGroups(repoStructure);
    const indexContent = this.templates.createMainIndex(repoStructure, moduleGroups);

    const indexPath = path.join(docsDir, fileName);
    await fs.writeFile(indexPath, indexContent);

    if (verbose) {
      console.log(chalk.green(`✅ Created ${fileName}`));
    }
  }

  private async generateOverview(
    repoStructure: RepoStructure,
    docsDir: string,
    verbose: boolean
  ): Promise<void> {
    const fileName = 'overview.md';
    if (verbose) {
      console.log(chalk.blue(`📄 Creating ${fileName}...`));
    }

    const overview = this.templates.createEnhancedProjectOverview(repoStructure);
    const overviewPath = path.join(docsDir, fileName);
    await fs.writeFile(overviewPath, overview);

    if (verbose) {
      console.log(chalk.green(`✅ Created ${fileName}`));
    }
  }

  private async generateArchitectureDoc(
    repoStructure: RepoStructure,
    docsDir: string,
    verbose: boolean
  ): Promise<void> {
    const fileName = 'architecture.md';
    if (verbose) {
      console.log(chalk.blue(`📄 Creating ${fileName}...`));
    }

    const moduleGroups = this.moduleGrouper.getModuleGroups(repoStructure);
    const architecture = this.templates.createArchitectureDocumentation(repoStructure, moduleGroups);
    const archPath = path.join(docsDir, fileName);
    await fs.writeFile(archPath, architecture);

    if (verbose) {
      console.log(chalk.green(`✅ Created ${fileName}`));
    }
  }

  private async generateModuleDocumentation(
    repoStructure: RepoStructure,
    docsDir: string,
    verbose: boolean
  ): Promise<void> {
    const modulesDir = path.join(docsDir, 'modules');
    await fs.ensureDir(modulesDir);

    const moduleGroups = this.moduleGrouper.getModuleGroups(repoStructure);

    if (verbose) {
      console.log(chalk.yellow(`📦 Generating documentation for ${moduleGroups.length} modules...`));
    }

    for (const module of moduleGroups) {
      try {
        const moduleDoc = await this.createModuleDocumentation(module, repoStructure);
        const modulePath = path.join(modulesDir, `${DocumentationUtils.slugify(module.name)}.md`);
        await fs.writeFile(modulePath, moduleDoc);

        if (verbose) {
          console.log(chalk.green(`✅ Module documentation generated: ${module.name}`));
        }
      } catch (error) {
        if (verbose) {
          console.log(chalk.red(`❌ Error documenting module ${module.name}: ${error}`));
        }
      }
    }
  }

  private async generateAPIReference(
    repoStructure: RepoStructure,
    docsDir: string,
    verbose: boolean
  ): Promise<void> {
    if (verbose) {
      console.log(chalk.yellow('🔌 Generating API reference...'));
    }

    const moduleGroups = this.moduleGrouper.getModuleGroups(repoStructure);
    const apiRef = this.templates.createAPIReference(repoStructure, moduleGroups);
    const apiPath = path.join(docsDir, 'api-reference.md');
    await fs.writeFile(apiPath, apiRef);

    if (verbose) {
      console.log(chalk.green(`✅ API reference saved: ${apiPath}`));
    }
  }

  private async generateConfigurationGuide(
    repoStructure: RepoStructure,
    docsDir: string,
    verbose: boolean
  ): Promise<void> {
    if (verbose) {
      console.log(chalk.yellow('⚙️ Generating configuration guide...'));
    }

    const configGuide = this.templates.createConfigurationGuide(repoStructure);
    const configPath = path.join(docsDir, 'configuration.md');
    await fs.writeFile(configPath, configGuide);

    if (verbose) {
      console.log(chalk.green(`✅ Configuration guide saved: ${configPath}`));
    }
  }

  private async generateDevelopmentGuide(
    repoStructure: RepoStructure,
    docsDir: string,
    verbose: boolean
  ): Promise<void> {
    const fileName = 'DEVELOPMENT.md';
    if (verbose) {
      console.log(chalk.blue(`📄 Creating ${fileName}...`));
    }

    const moduleGroups = this.moduleGrouper.getModuleGroups(repoStructure);
    const developmentGuide = await this.templates.createDevelopmentGuide(repoStructure, moduleGroups);
    const devPath = path.join(docsDir, fileName);
    await fs.writeFile(devPath, developmentGuide);

    if (verbose) {
      console.log(chalk.green(`✅ Created ${fileName}`));
    }
  }

  private async generateDeploymentGuide(
    repoStructure: RepoStructure,
    docsDir: string,
    verbose: boolean
  ): Promise<void> {
    const fileName = 'DEPLOYMENT.md';
    if (verbose) {
      console.log(chalk.blue(`📄 Creating ${fileName}...`));
    }

    const deploymentGuide = await this.templates.createDeploymentGuide(repoStructure);
    const deployPath = path.join(docsDir, fileName);
    await fs.writeFile(deployPath, deploymentGuide);

    if (verbose) {
      console.log(chalk.green(`✅ Created ${fileName}`));
    }
  }

  private async generateTroubleshootingGuide(
    repoStructure: RepoStructure,
    docsDir: string,
    verbose: boolean
  ): Promise<void> {
    const fileName = 'TROUBLESHOOTING.md';
    if (verbose) {
      console.log(chalk.blue(`📄 Creating ${fileName}...`));
    }

    const moduleGroups = this.moduleGrouper.getModuleGroups(repoStructure);
    const troubleshootingGuide = await this.templates.createTroubleshootingGuide(repoStructure, moduleGroups);
    const troublePath = path.join(docsDir, fileName);
    await fs.writeFile(troublePath, troubleshootingGuide);

    if (verbose) {
      console.log(chalk.green(`✅ Created ${fileName}`));
    }
  }

  private async createModuleDocumentation(
    module: ModuleGroup,
    repoStructure: RepoStructure
  ): Promise<string> {
    const fileContents: string[] = [];
    
    for (const file of module.files.slice(0, 10)) { // Limit to prevent too large requests
      const content = await this.fileMapper.readFileContent(file.path);
      fileContents.push(`File: ${file.relativePath}\n${content.substring(0, 1000)}...`);
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

    return `# ${module.name}

${documentation}

## Files in this module

${module.files.map(file => `- \`${file.relativePath}\` - ${DocumentationUtils.formatBytes(file.size)}`).join('\n')}

---
*Generated by AI Coders Context*
`;
  }
} 