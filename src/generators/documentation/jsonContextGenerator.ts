import * as path from 'path';

import { GeneratorUtils } from '../shared/generatorUtils';
import type {
  AgentReference,
  DocumentationReference,
  FeatureComponentSummary,
  FeatureContext,
  RepositoryContextSummary,
  RepoStructure,
  FileInfo
} from '../../types';
import type { DocumentationTemplateContext, GuideMeta } from './templates/types';
import { AGENT_TYPES } from '../agents/agentTypes';

interface FeatureContextFile {
  fileName: string;
  context: FeatureContext;
}

interface JsonContextGeneratorOptions {
  documentationContext: DocumentationTemplateContext;
  outputDir: string;
  verbose?: boolean;
}

export class JsonContextGenerator {
  async generate(options: JsonContextGeneratorOptions): Promise<void> {
    const { documentationContext, outputDir, verbose = false } = options;
    const generatedAt = GeneratorUtils.createTimestamp();
    const featuresDir = path.join(outputDir, 'features');

    await GeneratorUtils.ensureDirectoryAndLog(featuresDir, verbose, 'Generating feature context in');

    const featureContexts = this.buildFeatureContexts(
      documentationContext,
      generatedAt
    );

    await this.writeRepositorySummary({
      documentationContext,
      features: featureContexts,
      outputDir,
      generatedAt,
      verbose
    });

    for (const feature of featureContexts) {
      const featurePath = path.join(featuresDir, feature.fileName);
      await GeneratorUtils.writeFileWithLogging(
        featurePath,
        this.stringify(feature.context),
        verbose,
        `Created ${feature.fileName}`
      );
    }
  }

  private async writeRepositorySummary(params: {
    documentationContext: DocumentationTemplateContext;
    features: FeatureContextFile[];
    outputDir: string;
    generatedAt: string;
    verbose: boolean;
  }): Promise<void> {
    const { documentationContext, features, outputDir, generatedAt, verbose } = params;
    const { repoStructure, guides } = documentationContext;

    const repositorySummary: RepositoryContextSummary = {
      id: this.createSlug(path.basename(repoStructure.rootPath) || 'repository'),
      name: path.basename(repoStructure.rootPath),
      rootPath: repoStructure.rootPath,
      generatedAt,
      stats: {
        totalFiles: repoStructure.totalFiles,
        totalSize: repoStructure.totalSize,
        sizeHuman: GeneratorUtils.formatBytes(repoStructure.totalSize),
        primaryLanguages: documentationContext.primaryLanguages
      },
      documentation: {
        index: './docs/README.md',
        guides: this.buildDocumentationReferences(guides, './docs')
      },
      agents: {
        index: './agents/README.md',
        playbooks: this.buildAgentReferences('./agents')
      },
      features: features.map(feature => ({
        id: feature.context.id,
        name: feature.context.name,
        contextPath: `./features/${feature.fileName}`
      }))
    };

    const targetPath = path.join(outputDir, 'context.json');
    await GeneratorUtils.writeFileWithLogging(
      targetPath,
      this.stringify(repositorySummary),
      verbose,
      'Created context.json'
    );
  }

  private buildFeatureContexts(
    documentationContext: DocumentationTemplateContext,
    generatedAt: string
  ): FeatureContextFile[] {
    const { repoStructure, directoryStats, guides } = documentationContext;
    const features: FeatureContextFile[] = [];

    directoryStats.forEach(stat => {
      const featureId = this.createSlug(stat.name || 'root');
      const featureName = `${stat.name}/`;
      const filesInFeature = this.getFilesForFeature(repoStructure, stat.name);
      const primaryExtensions = this.calculatePrimaryExtensions(filesInFeature);
      const keyComponents = this.buildFeatureComponents(repoStructure, stat.name, filesInFeature);
      const documentationReferences = this.buildDocumentationReferences(
        this.matchGuidesToFeature(guides, stat.name),
        '../docs'
      );
      const agentReferences = this.buildAgentReferences('../agents');

      const context: FeatureContext = {
        id: featureId,
        name: featureName,
        type: 'directory',
        relativePath: featureName,
        description: `TODO: Summarize how \`${featureName}\` supports the repository\'s CLI scaffolding and context generation flows.`,
        keyComponents,
        stats: {
          fileCount: stat.fileCount,
          totalSize: stat.totalSize,
          sizeHuman: GeneratorUtils.formatBytes(stat.totalSize),
          primaryExtensions
        },
        architecture: {
          patterns: [
            'TODO: Record architectural patterns or conventions enforced within this feature.',
            'Surface layering boundaries, dependency rules, or generator flows relevant to this directory.'
          ],
          notes: [
            'Generated scaffold: replace these notes with maintainers\' guidance once the directory is reviewed.'
          ]
        },
        dataFlows: [
          {
            source: featureName,
            target: 'TODO: Identify dependent modules, services, or outputs.',
            description: 'TODO: Describe how responsibilities in this directory exchange data with the rest of the system.'
          }
        ],
        references: {
          documentation: [
            {
              title: 'Documentation Index',
              path: '../docs/README.md',
              description: 'Navigation hub for generated documentation guides.'
            },
            ...documentationReferences
          ],
          agents: [
            {
              name: 'Agent Handbook',
              path: '../agents/README.md',
              description: 'Index of available AI agent playbooks.'
            },
            ...agentReferences
          ]
        },
        updateChecklist: [
          'Validate that keyComponents reflects the latest directories and critical files.',
          'Document the architectural patterns that govern this area of the codebase.',
          'Link relevant documentation guides and agent playbooks before sharing with collaborators.'
        ],
        recommendedSources: [
          'Review recent commits touching this directory for context.',
          'Cross-check guidance in AGENTS.md and CONTRIBUTING.md.',
          'Confirm details with maintainers or tech leads responsible for this feature.'
        ],
        generatedAt
      };

      features.push({
        fileName: `${featureId || 'feature'}.json`,
        context
      });
    });

    return features;
  }

  private buildDocumentationReferences(guides: GuideMeta[], basePath: string): DocumentationReference[] {
    return guides.map(guide => ({
      title: guide.title,
      path: `${basePath}/${guide.file}`,
      description: guide.primaryInputs
    }));
  }

  private buildAgentReferences(basePath: string): AgentReference[] {
    const preferredAgents: Array<{ type: string; description: string }> = [
      { type: 'documentation-writer', description: 'Maintains documentation scaffolds and Markdown guides.' },
      { type: 'architect-specialist', description: 'Explains architectural decisions and design patterns.' },
      { type: 'feature-developer', description: 'Implements new capabilities across multiple modules.' }
    ];

    const allowedAgents = new Set(AGENT_TYPES);

    return preferredAgents
      .filter(agent => allowedAgents.has(agent.type as typeof AGENT_TYPES[number]))
      .map(agent => ({
        name: this.formatAgentName(agent.type),
        path: `${basePath}/${agent.type}.md`,
        description: agent.description
      }));
  }

  private matchGuidesToFeature(guides: GuideMeta[], featureName: string): GuideMeta[] {
    const normalizedFeature = featureName.toLowerCase();
    return guides.filter(guide => {
      const normalizedKey = guide.key.toLowerCase();
      const normalizedInputs = guide.primaryInputs.toLowerCase();
      return normalizedKey.includes(normalizedFeature) || normalizedInputs.includes(normalizedFeature);
    });
  }

  private buildFeatureComponents(
    repoStructure: RepoStructure,
    featureName: string,
    filesInFeature: FileInfo[]
  ): FeatureComponentSummary[] {
    const componentMap = new Map<string, FeatureComponentSummary>();
    const basePath = `${featureName}/`;
    const directories = repoStructure.directories
      .filter(dir => dir.relativePath.startsWith(`${featureName}/`))
      .map(dir => dir.relativePath);

    directories.forEach(dirPath => {
      if (dirPath === featureName) {
        return;
      }
      const remainder = dirPath.slice(basePath.length);
      const [firstSegment] = remainder.split(/[\\/]/).filter(Boolean);
      if (!firstSegment) {
        return;
      }

      const componentPath = `${basePath}${firstSegment}`;
      if (!componentMap.has(componentPath)) {
        componentMap.set(componentPath, {
          name: firstSegment,
          path: `${componentPath}/`,
          type: 'directory',
          summary: `TODO: Document the responsibilities of \`${componentPath}/\` and how it collaborates with sibling modules.`
        });
      }
    });

    filesInFeature.forEach(file => {
      const remainder = file.relativePath.slice(basePath.length);
      if (!remainder || remainder.includes('/')) {
        return;
      }
      const componentPath = `${basePath}${remainder}`;
      componentMap.set(componentPath, {
        name: remainder,
        path: componentPath,
        type: 'file',
        summary: `TODO: Explain the purpose of \`${componentPath}\` and when contributors should update it.`
      });
    });

    return Array.from(componentMap.values()).sort((a, b) => a.path.localeCompare(b.path));
  }

  private getFilesForFeature(repoStructure: RepoStructure, featureName: string): FileInfo[] {
    return repoStructure.files.filter(file => file.relativePath.startsWith(`${featureName}/`));
  }

  private calculatePrimaryExtensions(files: FileInfo[]): Array<{ extension: string; count: number }> {
    const extensionCounts = new Map<string, number>();
    files.forEach(file => {
      const ext = file.extension || 'no-extension';
      extensionCounts.set(ext, (extensionCounts.get(ext) || 0) + 1);
    });

    return Array.from(extensionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([extension, count]) => ({ extension, count }));
  }

  private formatAgentName(agentType: string): string {
    return agentType
      .split('-')
      .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  private createSlug(value: string): string {
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return normalized || 'feature';
  }

  private stringify(value: unknown): string {
    return `${JSON.stringify(value, null, 2)}\n`;
  }
}
