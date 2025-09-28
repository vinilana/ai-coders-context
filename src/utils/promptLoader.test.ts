import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';

import {
  resolvePlanPrompt,
  resolveScaffoldPrompt,
  PromptSource
} from './promptLoader';
import {
  UPDATE_PLAN_PROMPT_FALLBACK,
  UPDATE_SCAFFOLD_PROMPT_FALLBACK
} from '../prompts/defaults';

describe('promptLoader', () => {
  const messageFactory = (resolvedPath: string) => `Missing prompt at ${resolvedPath}`;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('resolveScaffoldPrompt', () => {
    it('returns custom prompt content when a custom path is provided', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prompt-loader-'));
      const customPath = path.join(tempDir, 'custom-prompt.md');
      await fs.writeFile(customPath, 'custom override prompt');

      const result = await resolveScaffoldPrompt(customPath, messageFactory);

      expect(result).toEqual({
        content: 'custom override prompt',
        source: 'custom' as PromptSource,
        path: customPath
      });

      await fs.remove(tempDir);
    });

    it('loads the packaged prompt when the repository prompt file is available', async () => {
      const result = await resolveScaffoldPrompt(undefined, messageFactory);

      const packagedPath = path.resolve(__dirname, '../../prompts/update_scaffold_prompt.md');
      const packagedContent = await fs.readFile(packagedPath, 'utf-8');

      expect(result.source).toBe('package');
      expect(result.path).toBe(packagedPath);
      expect(result.content).toBe(packagedContent);
    });

    it('falls back to the built-in prompt when no file exists', async () => {
      const fakeFs = {
        pathExists: jest.fn(async () => false),
        readFile: jest.fn()
      } as unknown as typeof fs;

      const result = await resolveScaffoldPrompt(undefined, messageFactory, fakeFs);

      expect(fakeFs.pathExists).toHaveBeenCalled();
      expect(fakeFs.readFile).not.toHaveBeenCalled();
      expect(result).toEqual({
        content: UPDATE_SCAFFOLD_PROMPT_FALLBACK,
        source: 'builtin'
      });
    });

    it('throws a helpful error when a custom prompt is missing', async () => {
      const nonexistentPath = path.join(os.tmpdir(), 'does-not-exist.md');
      await expect(resolveScaffoldPrompt(nonexistentPath, messageFactory)).rejects.toThrow(
        `Missing prompt at ${path.resolve(nonexistentPath)}`
      );
    });
  });

  describe('resolvePlanPrompt', () => {
    it('falls back to the built-in plan prompt when nothing is found', async () => {
      const fakeFs = {
        pathExists: jest.fn(async () => false),
        readFile: jest.fn()
      } as unknown as typeof fs;

      const result = await resolvePlanPrompt(undefined, messageFactory, fakeFs);

      expect(result).toEqual({
        content: UPDATE_PLAN_PROMPT_FALLBACK,
        source: 'builtin'
      });
    });
  });
});
