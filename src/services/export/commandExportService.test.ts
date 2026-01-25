import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';

import { CommandGenerator } from '../../generators/commands';
import { CommandExportService } from './commandExportService';

const mockDeps = {
  ui: {
    displayOutput: () => {},
    displaySuccess: () => {},
    displayError: () => {},
    displayInfo: () => {},
    displayWarning: () => {},
    displayWelcome: () => {},
    displayPrevcExplanation: () => {},
    displayStep: () => {},
    displayBox: () => {},
    startSpinner: () => {},
    stopSpinner: () => {},
    updateSpinner: () => {},
    prompt: async () => '',
    confirm: async () => true,
  },
  t: (k: string) => k,
  version: 'test',
};

describe('CommandExportService', () => {
  let repoDir: string;

  beforeEach(async () => {
    repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-context-export-commands-'));
    const generator = new CommandGenerator();
    await generator.generate(path.join(repoDir, '.context'));
  });

  afterEach(async () => {
    if (repoDir) {
      await fs.remove(repoDir);
    }
  });

  it('exports commands to GitHub Copilot prompt files', async () => {
    const service = new CommandExportService(mockDeps as any);
    await service.run(repoDir, { preset: 'github', force: true });

    const promptFile = path.join(repoDir, '.github', 'skills', 'context-sync.prompt.md');
    expect(await fs.pathExists(promptFile)).toBe(true);

    const content = await fs.readFile(promptFile, 'utf-8');
    expect(content).toContain('description:');
    expect(content).toContain('# /context-sync');
  });

  it('exports commands to Cursor command folders', async () => {
    const service = new CommandExportService(mockDeps as any);
    await service.run(repoDir, { preset: 'cursor', force: true });

    const cmdFile = path.join(repoDir, '.cursor', 'commands', 'mcp-context-init.md');
    expect(await fs.pathExists(cmdFile)).toBe(true);
  });

  it('exports commands to Claude Code command files', async () => {
    const service = new CommandExportService(mockDeps as any);
    await service.run(repoDir, { preset: 'claude', force: true });

    const cmdFile = path.join(repoDir, '.claude', 'commands', 'mcp-context-init.md');
    expect(await fs.pathExists(cmdFile)).toBe(true);
  });
});
