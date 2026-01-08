import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';

import { runInit } from './index';

async function createFixtureRepo(): Promise<{ repoPath: string; cleanup: () => Promise<void> }> {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-context-runinit-'));
  const repoPath = path.join(tempRoot, 'repo');
  await fs.ensureDir(repoPath);
  await fs.ensureDir(path.join(repoPath, 'src'));
  await fs.ensureDir(path.join(repoPath, 'tests'));
  await fs.writeFile(path.join(repoPath, 'src', 'index.ts'), "export const hello = 'world';\n");
  await fs.writeFile(path.join(repoPath, 'package.json'), '{"name":"fixture","version":"0.0.0"}\n');
  await fs.writeFile(path.join(repoPath, 'README.md'), '# Fixture Repo\n');

  return {
    repoPath,
    cleanup: () => fs.remove(tempRoot)
  };
}

describe('runInit integration', () => {
  let cleanup: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
      cleanup = undefined;
    }
  });

  it('scaffolds documentation and agents when both are requested', async () => {
    const fixture = await createFixtureRepo();
    cleanup = fixture.cleanup;
    const outputDir = path.join(fixture.repoPath, '..', '.context-all');

    await runInit(fixture.repoPath, 'both', { output: outputDir });

    const docsDir = path.join(outputDir, 'docs');
    const agentsDir = path.join(outputDir, 'agents');

    expect(await fs.pathExists(docsDir)).toBe(true);
    expect(await fs.pathExists(agentsDir)).toBe(true);

    const docsIndex = await fs.readFile(path.join(docsDir, 'README.md'), 'utf8');
    expect(docsIndex).toContain('# Documentation Index');
    expect(docsIndex).toContain('Repository Snapshot');

    const agentIndex = await fs.readFile(path.join(agentsDir, 'README.md'), 'utf8');
    expect(agentIndex).toContain('# Agent Handbook');
    expect(agentIndex).toContain('[Documentation Writer]');

    const generatedAgents = await fs.readdir(agentsDir);
    expect(generatedAgents).toContain('code-reviewer.md');
  });

  it('supports docs-only scaffolding without creating agent assets', async () => {
    const fixture = await createFixtureRepo();
    cleanup = fixture.cleanup;
    const outputDir = path.join(fixture.repoPath, '..', '.context-docs');

    await runInit(fixture.repoPath, 'docs', { output: outputDir });

    const docsDir = path.join(outputDir, 'docs');
    const agentsDir = path.join(outputDir, 'agents');

    expect(await fs.pathExists(docsDir)).toBe(true);
    expect(await fs.pathExists(path.join(docsDir, 'project-overview.md'))).toBe(true);
    expect(await fs.pathExists(agentsDir)).toBe(false);
  });
});
