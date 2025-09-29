import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';

import { DocumentationGenerator } from './documentationGenerator';
import { DOCUMENT_GUIDES } from './guideRegistry';
import type { RepoStructure } from '../../types';

function createRepoStructure(rootPath: string): RepoStructure {
  return {
    rootPath,
    files: [
      {
        path: path.join(rootPath, 'src/index.ts'),
        relativePath: 'src/index.ts',
        extension: '.ts',
        size: 128,
        type: 'file'
      },
      {
        path: path.join(rootPath, 'package.json'),
        relativePath: 'package.json',
        extension: '.json',
        size: 256,
        type: 'file'
      }
    ],
    directories: [
      {
        path: path.join(rootPath, 'src'),
        relativePath: 'src',
        extension: '',
        size: 0,
        type: 'directory'
      },
      {
        path: path.join(rootPath, 'tests'),
        relativePath: 'tests',
        extension: '',
        size: 0,
        type: 'directory'
      }
    ],
    totalFiles: 2,
    totalSize: 384,
    topLevelDirectoryStats: [
      {
        name: 'src',
        fileCount: 1,
        totalSize: 128
      },
      {
        name: 'tests',
        fileCount: 0,
        totalSize: 0
      }
    ]
  };
}

describe('DocumentationGenerator', () => {
  let tempDir: string;
  let outputDir: string;
  const generator = new DocumentationGenerator();

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-context-docs-'));
    outputDir = path.join(tempDir, '.context');
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.remove(tempDir);
    }
  });

  it('generates all guides with agent-update markers by default', async () => {
    const repoStructure = createRepoStructure(path.join(tempDir, 'repo'));

    const created = await generator.generateDocumentation(repoStructure, outputDir);

    expect(created).toBe(DOCUMENT_GUIDES.length + 1);

    const docsDir = path.join(outputDir, 'docs');
    const files = (await fs.readdir(docsDir)).sort();
    const expectedFiles = ['README.md', ...DOCUMENT_GUIDES.map(guide => guide.file)].sort();
    expect(files).toEqual(expectedFiles);

    const indexContent = await fs.readFile(path.join(docsDir, 'README.md'), 'utf8');
    expect(indexContent).toContain('id: docs-index');
    expect(indexContent).toContain('<!-- agent-update:start:docs-index -->');

    const overviewContent = await fs.readFile(path.join(docsDir, 'project-overview.md'), 'utf8');
    expect(overviewContent).toContain('ai_update_goal');
    expect(overviewContent).toContain('<!-- agent-update:start:project-overview -->');
    expect(overviewContent).toContain('Root path:');
  });

  it('respects explicit guide selection', async () => {
    const repoStructure = createRepoStructure(path.join(tempDir, 'repo'));
    const selected = ['project-overview', 'glossary'];

    const created = await generator.generateDocumentation(
      repoStructure,
      outputDir,
      { selectedDocs: selected }
    );

    expect(created).toBe(selected.length + 1);

    const docsDir = path.join(outputDir, 'docs');
    const files = (await fs.readdir(docsDir)).sort();
    expect(files).toEqual(['README.md', 'glossary.md', 'project-overview.md']);
  });
});
