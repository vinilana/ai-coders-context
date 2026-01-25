import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';

import { CommandGenerator } from './commandGenerator';

describe('CommandGenerator', () => {
  let tempDir: string;
  let outputDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-context-commands-'));
    outputDir = path.join(tempDir, '.context');
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.remove(tempDir);
    }
  });

  it('generates default MCP command templates', async () => {
    const generator = new CommandGenerator();
    const result = await generator.generate(outputDir);

    expect(result.commandsDir).toBe(path.join(outputDir, 'commands'));
    expect(result.generated.length).toBeGreaterThan(0);

    const commandFile = path.join(outputDir, 'commands', 'mcp-context-init.md');
    expect(await fs.pathExists(commandFile)).toBe(true);

    const content = await fs.readFile(commandFile, 'utf-8');
    expect(content).toContain('name: mcp-context-init');
    expect(content).toContain('# /mcp-context-init');
  });
});
