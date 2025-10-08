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
    await fs.ensureDir(path.join(tempDir, 'repo'));
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.remove(tempDir);
    }
  });

  it('generates all guides with update checklists by default', async () => {
    const repoStructure = createRepoStructure(path.join(tempDir, 'repo'));

    const created = await generator.generateDocumentation(repoStructure, outputDir);

    expect(created).toBe(DOCUMENT_GUIDES.length + 1);

    const docsDir = path.join(outputDir, 'docs');
    const files = (await fs.readdir(docsDir)).sort();
    const expectedFiles = ['README.md', ...DOCUMENT_GUIDES.map(guide => guide.file)].sort();
    expect(files).toEqual(expectedFiles);

    const indexContent = await fs.readFile(path.join(docsDir, 'README.md'), 'utf8');
    expect(indexContent).toContain('# Documentation Index');
    expect(indexContent).toContain('## Update Checklist');
    expect(indexContent).toContain('JSON Context Pack');

    const overviewContent = await fs.readFile(path.join(docsDir, 'project-overview.md'), 'utf8');
    expect(overviewContent).toContain('# Project Overview');
    expect(overviewContent).toContain('Root path:');
    expect(overviewContent).toContain('## Update Checklist');

    const repoContextPath = path.join(outputDir, 'context.json');
    expect(await fs.pathExists(repoContextPath)).toBe(true);
    const repositoryContext = JSON.parse(await fs.readFile(repoContextPath, 'utf8'));
    expect(repositoryContext.documentation.index).toBe('./docs/README.md');
    expect(repositoryContext.agents.index).toBe('./agents/README.md');
    expect(repositoryContext.testPlan.path).toBe('./test-plan.json');
    expect(repositoryContext.testPlan.areas.length).toBeGreaterThan(0);

    const testPlanPath = path.join(outputDir, 'test-plan.json');
    expect(await fs.pathExists(testPlanPath)).toBe(true);
    const testPlan = JSON.parse(await fs.readFile(testPlanPath, 'utf8'));
    expect(testPlan.repository.id).toBe(repositoryContext.id);
    expect(Array.isArray(testPlan.areas)).toBe(true);
    expect(testPlan.areas.length).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(testPlan.testDataGuidance.fixtures)).toBe(true);

    const srcArea = testPlan.areas.find((area: { id: string }) => area.id === 'src');
    expect(srcArea).toBeDefined();
    expect(srcArea.coverage.frontend.scenarios[0].scenarioId).toContain('FE-001');
    expect(srcArea.coverage.backend.scenarios[0].scenarioId).toContain('BE-001');
    expect(srcArea.coverage.frontend.scenarios[0].preconditions.length).toBeGreaterThan(0);
    expect(srcArea.coverage.frontend.scenarios[0].expectedResults.length).toBeGreaterThan(0);
    expect(srcArea.coverage.frontend.scenarios[0].relatedFiles).toEqual(expect.arrayContaining(['src/index.ts']));
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

  it('creates AGENTS.md when missing using the default template', async () => {
    const repoStructure = createRepoStructure(path.join(tempDir, 'repo'));

    await generator.generateDocumentation(repoStructure, outputDir);

    const agentsPath = path.join(repoStructure.rootPath, 'AGENTS.md');
    const content = await fs.readFile(agentsPath, 'utf8');

    expect(content).toContain('# AGENTS.md');
    expect(content).toContain('## Dev environment tips');
    expect(content).toContain('`.context/agents/README.md`');
  });

  it('adds AI context references to AGENTS.md when present', async () => {
    const repoPath = path.join(tempDir, 'repo');
    const agentsPath = path.join(repoPath, 'AGENTS.md');
    await fs.outputFile(agentsPath, '# Agent Guide\n\nExisting content.\n');
    const repoStructure = createRepoStructure(repoPath);

    await generator.generateDocumentation(repoStructure, outputDir);

    const updatedAgents = await fs.readFile(agentsPath, 'utf8');
    expect(updatedAgents).toContain('## AI Context References');
    expect(updatedAgents).toContain('`.context/docs/README.md`');
    expect(updatedAgents).toContain('`.context/agents/README.md`');
  });
});
