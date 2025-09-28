import * as path from 'path';
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

interface DocSection {
  fileName: string;
  content: (context: DocumentationTemplateContext) => string;
}

interface DocumentationGenerationConfig {
  selectedDocs?: string[];
}

export class DocumentationGenerator {
  constructor(..._legacyArgs: unknown[]) {}

  async generateDocumentation(
    repoStructure: RepoStructure,
    outputDir: string,
    config: DocumentationGenerationConfig = {},
    verbose: boolean = false
  ): Promise<number> {
    const docsDir = path.join(outputDir, 'docs');
    await GeneratorUtils.ensureDirectoryAndLog(docsDir, verbose, 'Generating documentation scaffold in');

    const guidesToGenerate = getGuidesByKeys(config.selectedDocs);
    const context = this.buildContext(repoStructure, guidesToGenerate);
    const sections = this.getDocSections(guidesToGenerate);

    let created = 0;
    for (const section of sections) {
      const targetPath = path.join(docsDir, section.fileName);
      const content = section.content(context);
      await GeneratorUtils.writeFileWithLogging(targetPath, content, verbose, `Created ${section.fileName}`);
      created += 1;
    }

    return created;
  }

  private buildContext(
    repoStructure: RepoStructure,
    guides: GuideMeta[]
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
      guides
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
}
