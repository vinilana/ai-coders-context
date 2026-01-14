import * as path from 'path';
import * as fs from 'fs-extra';
import { RepoStructure } from '../../types';
import { GeneratorUtils } from '../shared';
import {
  DocumentationTemplateContext,
  GuideMeta,
  renderIndex,
  renderProjectOverview,
  renderArchitectureNotes,
  renderDevelopmentWorkflow,
  renderTestingStrategy,
  renderGlossary,
  renderDataFlow,
  renderSecurity,
  renderToolingGuide
} from './templates';
import { getGuidesByKeys } from './guideRegistry';
import { CodebaseAnalyzer, SemanticContext } from '../../services/semantic';
import { StackDetector } from '../../services/stack';
import { CodebaseMapGenerator } from './codebaseMapGenerator';

interface DocSection {
  fileName: string;
  content: (context: DocumentationTemplateContext) => string;
}

interface DocumentationGenerationConfig {
  selectedDocs?: string[];
  semantic?: boolean;
  /** Filtered list of docs based on project type classification */
  filteredDocs?: string[];
}

export class DocumentationGenerator {
  private analyzer?: CodebaseAnalyzer;

  constructor(..._legacyArgs: unknown[]) {}

  async generateDocumentation(
    repoStructure: RepoStructure,
    outputDir: string,
    config: DocumentationGenerationConfig = {},
    verbose: boolean = false
  ): Promise<number> {
    const docsDir = path.join(outputDir, 'docs');
    await GeneratorUtils.ensureDirectoryAndLog(docsDir, verbose, 'Generating documentation scaffold in');

    // Perform semantic analysis if enabled
    let semantics: SemanticContext | undefined;
    if (config.semantic) {
      GeneratorUtils.logProgress('Running semantic analysis...', verbose);
      this.analyzer = new CodebaseAnalyzer();
      try {
        semantics = await this.analyzer.analyze(repoStructure.rootPath);
        GeneratorUtils.logProgress(
          `Analyzed ${semantics.stats.totalFiles} files, found ${semantics.stats.totalSymbols} symbols in ${semantics.stats.analysisTimeMs}ms`,
          verbose
        );
      } catch (error) {
        GeneratorUtils.logError('Semantic analysis failed, continuing without it', error, verbose);
      }
    }

    // Generate codebase map JSON if semantic analysis succeeded
    if (semantics) {
      try {
        GeneratorUtils.logProgress('Generating codebase map...', verbose);
        const stackDetector = new StackDetector();
        const stackInfo = await stackDetector.detect(repoStructure.rootPath);

        const mapGenerator = new CodebaseMapGenerator();
        const codebaseMap = mapGenerator.generate(repoStructure, semantics, stackInfo);

        const mapPath = path.join(docsDir, 'codebase-map.json');
        await GeneratorUtils.writeFileWithLogging(
          mapPath,
          JSON.stringify(codebaseMap, null, 2),
          verbose,
          'Created codebase-map.json'
        );
      } catch (error) {
        GeneratorUtils.logError('Codebase map generation failed, continuing without it', error, verbose);
      }
    }

    // Prioritize explicitly selected docs, then filtered by project type
    const docKeys = config.selectedDocs ?? config.filteredDocs;
    const guidesToGenerate = getGuidesByKeys(docKeys);
    const context = this.buildContext(repoStructure, guidesToGenerate, semantics);
    const sections = this.getDocSections(guidesToGenerate);

    let created = 0;
    for (const section of sections) {
      const targetPath = path.join(docsDir, section.fileName);
      const content = section.content(context);
      await GeneratorUtils.writeFileWithLogging(targetPath, content, verbose, `Created ${section.fileName}`);
      created += 1;
    }

    await this.updateAgentGuideReferences(repoStructure, verbose);

    return created;
  }

  private buildContext(
    repoStructure: RepoStructure,
    guides: GuideMeta[],
    semantics?: SemanticContext
  ): DocumentationTemplateContext {
    const topLevelStats = repoStructure.topLevelDirectoryStats ?? [];
    const topLevelDirectories = topLevelStats.length
      ? topLevelStats.map(stat => stat.name)
      : this.deriveTopLevelDirectories(repoStructure);

    const directoryStats = topLevelStats.length
      ? topLevelStats.map(stat => ({ name: stat.name, fileCount: stat.fileCount }))
      : topLevelDirectories.map(name => ({
          name,
          fileCount: repoStructure.files.filter(file => file.relativePath.startsWith(`${name}/`)).length
        }));
    const primaryLanguages = GeneratorUtils.getTopFileExtensions(repoStructure, 5)
      .filter(([ext]) => !!ext)
      .map(([extension, count]) => ({ extension, count }));

    return {
      repoStructure,
      topLevelDirectories,
      primaryLanguages,
      directoryStats,
      guides,
      semantics
    };
  }

  private deriveTopLevelDirectories(repoStructure: RepoStructure): string[] {
    const directorySet = new Set<string>();
    repoStructure.directories.forEach(dir => {
      const [firstSegment] = dir.relativePath.split(/[\\/]/).filter(Boolean);
      if (firstSegment) {
        directorySet.add(firstSegment);
      }
    });
    return Array.from(directorySet).sort();
  }

  private getDocSections(guides: GuideMeta[]): DocSection[] {
    const sections: DocSection[] = [
      {
        fileName: 'README.md',
        content: context => renderIndex(context)
      }
    ];

    const renderMap: Record<string, (context: DocumentationTemplateContext) => string> = {
      'project-overview': renderProjectOverview,
      architecture: renderArchitectureNotes,
      'development-workflow': () => renderDevelopmentWorkflow(),
      'testing-strategy': () => renderTestingStrategy(),
      glossary: renderGlossary,
      'data-flow': renderDataFlow,
      security: () => renderSecurity(),
      tooling: () => renderToolingGuide()
    };

    guides.forEach(guide => {
      const renderer = renderMap[guide.key];
      if (!renderer) {
        return;
      }

      sections.push({
        fileName: guide.file,
        content: renderer
      });
    });

    return sections;
  }

  private async updateAgentGuideReferences(repoStructure: RepoStructure, verbose: boolean): Promise<void> {
    const repoRoot = repoStructure.rootPath;
    const agentGuidePath = path.join(repoRoot, 'AGENTS.md');

    try {
      const exists = await fs.pathExists(agentGuidePath);
      if (!exists) {
        const template = this.createDefaultAgentGuide(repoStructure);
        await fs.writeFile(agentGuidePath, template, 'utf-8');
        GeneratorUtils.logProgress('Created AGENTS.md using the agents.md example starter.', verbose);
        return;
      }

      const content = await fs.readFile(agentGuidePath, 'utf-8');
      const docsReference = '.context/docs/README.md';
      const agentsReference = '.context/agents/README.md';

      if (content.includes(docsReference) && content.includes(agentsReference)) {
        return;
      }

      const referencesBlock = `\n## AI Context References\n- Documentation index: \`${docsReference}\`\n- Agent playbooks: \`${agentsReference}\`\n`;
      const updatedContent = `${content.trimEnd()}${referencesBlock}\n`;

      await fs.writeFile(agentGuidePath, updatedContent, 'utf-8');

      GeneratorUtils.logProgress('Linked AGENTS.md to generated docs and agent indexes.', verbose);
    } catch (error) {
      GeneratorUtils.logError('Failed to update AGENTS.md with documentation references', error, verbose);
    }
  }

  private createDefaultAgentGuide(repoStructure: RepoStructure): string {
    const directories = (repoStructure.topLevelDirectoryStats?.length
      ? repoStructure.topLevelDirectoryStats.map(stat => stat.name)
      : this.deriveTopLevelDirectories(repoStructure)
    ).filter(Boolean);

    const directorySection = directories.length
      ? directories
          .slice(0, 8)
          .map(dir => `- \`${dir}/\` — explain what lives here and when agents should edit it.`)
          .join('\n')
      : '- Document the major directories so agents know where to work.';

    return `# AGENTS.md

## Dev environment tips
- Install dependencies with \`npm install\` before running scaffolds.
- Use \`npm run dev\` for the interactive TypeScript session that powers local experimentation.
- Run \`npm run build\` to refresh the CommonJS bundle in \`dist/\` before shipping changes.
- Store generated artefacts in \`.context/\` so reruns stay deterministic.

## Testing instructions
- Execute \`npm run test\` to run the Jest suite.
- Append \`-- --watch\` while iterating on a failing spec.
- Trigger \`npm run build && npm run test\` before opening a PR to mimic CI.
- Add or update tests alongside any generator or CLI changes.

## PR instructions
- Follow Conventional Commits (for example, \`feat(scaffolding): add doc links\`).
- Cross-link new scaffolds in \`docs/README.md\` and \`agents/README.md\` so future agents can find them.
- Attach sample CLI output or generated markdown when behaviour shifts.
- Confirm the built artefacts in \`dist/\` match the new source changes.

## Repository map
${directorySection}

## AI Context References
- Documentation index: \`.context/docs/README.md\`
- Agent playbooks: \`.context/agents/README.md\`
- Contributor guide: \`CONTRIBUTING.md\`
`;
  }
}
