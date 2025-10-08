import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';

import { AgentGenerator } from './agentGenerator';
import { AGENT_TYPES } from './agentTypes';
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
        path: path.join(rootPath, 'docs'),
        relativePath: 'docs',
        extension: '',
        size: 0,
        type: 'directory'
      },
      {
        path: path.join(rootPath, 'agents'),
        relativePath: 'agents',
        extension: '',
        size: 0,
        type: 'directory'
      }
    ],
    totalFiles: 1,
    totalSize: 128,
    topLevelDirectoryStats: [
      {
        name: 'src',
        fileCount: 1,
        totalSize: 128
      },
      {
        name: 'docs',
        fileCount: 0,
        totalSize: 0
      },
      {
        name: 'agents',
        fileCount: 0,
        totalSize: 0
      }
    ]
  };
}

describe('AgentGenerator', () => {
  let tempDir: string;
  let outputDir: string;
  const generator = new AgentGenerator();

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-context-agents-'));
    outputDir = path.join(tempDir, '.context');
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.remove(tempDir);
    }
  });

  it('generates selected agent playbooks and index', async () => {
    const repoStructure = createRepoStructure(path.join(tempDir, 'repo'));
    const selectedAgents = ['code-reviewer', 'test-writer'];

    const created = await generator.generateAgentPrompts(
      repoStructure,
      outputDir,
      selectedAgents
    );

    expect(created).toBe(selectedAgents.length + 1);

    const agentsDir = path.join(outputDir, 'agents');
    const files = (await fs.readdir(agentsDir)).sort();
    expect(files).toEqual(['code-reviewer.json', 'index.json', 'test-writer.json']);

    const playbook = JSON.parse(
      await fs.readFile(path.join(agentsDir, 'code-reviewer.json'), 'utf8')
    );
    expect(playbook.id).toBe('code-reviewer');
    expect(playbook.name).toBe('Code Reviewer Agent Playbook');
    expect(playbook.mission).toContain('TODO');
    expect(playbook.resources.some((resource: { path: string }) => resource.path === '../context.json')).toBe(true);
    expect(playbook.resources.some((resource: { path: string }) => resource.path === '../test-plan.json')).toBe(true);
    expect(playbook.touchpoints.length).toBeGreaterThan(0);
    expect(playbook.generatedAt).toBeDefined();

    const indexDocument = JSON.parse(await fs.readFile(path.join(agentsDir, 'index.json'), 'utf8'));
    expect(indexDocument.agents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'code-reviewer', playbookPath: './code-reviewer.json' }),
        expect.objectContaining({ id: 'test-writer', playbookPath: './test-writer.json' })
      ])
    );
    expect(
      indexDocument.recommendedSources.some((source: string) => source.includes('../context.json'))
    ).toBe(true);
    expect(indexDocument.generatedAt).toBeDefined();
  });

  it('falls back to all agent types when selection is invalid', async () => {
    const repoStructure = createRepoStructure(path.join(tempDir, 'repo'));

    const created = await generator.generateAgentPrompts(
      repoStructure,
      outputDir,
      ['not-a-real-agent']
    );

    expect(created).toBe(AGENT_TYPES.length + 1);

    const agentsDir = path.join(outputDir, 'agents');
    const files = await fs.readdir(agentsDir);
    expect(files).toContain('index.json');
    AGENT_TYPES.forEach(agent => {
      expect(files).toContain(`${agent}.json`);
    });
  });
});
