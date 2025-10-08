import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';

import { FillService } from './fillService';
import { createTranslator } from '../../utils/i18n';
import { BaseLLMClient } from '../baseLLMClient';
import { FileMapper } from '../../utils/fileMapper';
import type { RepoStructure } from '../../types';
import type { CLIInterface } from '../../utils/cliUI';
import { LLMClientFactory } from '../llmClientFactory';

class StubLLMClient extends BaseLLMClient {
  public calls: Array<{ prompt: string; systemPrompt?: string }> = [];

  constructor(model: string) {
    super(model);
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    this.calls.push({ prompt, systemPrompt });
    return 'updated';
  }
}

class StubFileMapper extends FileMapper {
  constructor(private readonly structure: RepoStructure) {
    super();
  }

  async mapRepository(): Promise<RepoStructure> {
    return this.structure;
  }
}

function createStubUi(): CLIInterface {
  return {
    displayWelcome: jest.fn(),
    displayProjectInfo: jest.fn(),
    displayStep: jest.fn(),
    startSpinner: jest.fn(),
    updateSpinner: jest.fn(),
    displayWarning: jest.fn(),
    displaySuccess: jest.fn(),
    displayInfo: jest.fn()
  } as unknown as CLIInterface;
}

describe('FillService', () => {
  it('processes markdown docs, agent JSON playbooks, and test-plan JSON files', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'fill-service-'));
    const repoPath = path.join(tempRoot, 'repo');
    const outputDir = path.join(tempRoot, '.context');

    await fs.ensureDir(path.join(repoPath, 'src'));
    await fs.writeFile(path.join(repoPath, 'src', 'index.ts'), "export const hello = 'world';\n");

    await fs.ensureDir(path.join(outputDir, 'docs'));
    await fs.ensureDir(path.join(outputDir, 'agents'));

    await fs.writeFile(path.join(outputDir, 'docs', 'README.md'), '# Docs\n\nTODO: update\n');
    await fs.writeFile(
      path.join(outputDir, 'agents', 'documentation-writer.json'),
      JSON.stringify({ id: 'documentation-writer', mission: 'TODO' }, null, 2)
    );
    await fs.writeFile(
      path.join(outputDir, 'test-plan.json'),
      JSON.stringify(
        {
          repository: {
            id: 'fixture',
            name: 'Fixture',
            rootPath: repoPath,
            generatedAt: '2025-01-01T00:00:00Z'
          },
          areas: [],
          testDataGuidance: { fixtures: [], mocks: [], datasets: [], notes: [] },
          checklists: { maintenance: [], planning: [] },
          recommendedSources: []
        },
        null,
        2
      )
    );

    const translator = createTranslator('en');
    const ui = createStubUi();

    const repoStructure: RepoStructure = {
      rootPath: repoPath,
      files: [],
      directories: [],
      totalFiles: 1,
      totalSize: 0,
      topLevelDirectoryStats: []
    };

    const fileMapperFactory = jest.fn(() => new StubFileMapper(repoStructure));

    const llmClient = new StubLLMClient('stub-model');
    const createClient = jest.fn(() => llmClient);
    const llmFactory = {
      createClient,
      getDefaultModel: jest.fn(() => 'stub-model'),
      getEnvironmentVariables: jest.fn(() => [])
    } as unknown as typeof LLMClientFactory;

    const fillService = new FillService({
      ui,
      t: translator,
      version: '0.0.0-test',
      defaultModel: 'stub-model',
      fileMapperFactory,
      llmClientFactory: llmFactory
    });

    await fillService.run(repoPath, {
      output: outputDir,
      apiKey: 'test-key',
      model: 'stub-model'
    });

    const prompts = llmClient.calls.map(call => call.prompt);

    expect(prompts.some(prompt => prompt.includes('Target file: docs/README.md'))).toBe(true);
    expect(prompts.some(prompt => prompt.includes('Target file: agents/documentation-writer.json'))).toBe(true);
    const testPlanPrompt = prompts.find(prompt => prompt.includes('Target file: test-plan.json'));
    expect(testPlanPrompt).toBeDefined();
    expect(testPlanPrompt).toContain('Return only the full updated JSON for this file.');
    expect(testPlanPrompt).toContain('Maintain the frontend and backend scenario collections');

    await fs.remove(tempRoot);
  });
});
