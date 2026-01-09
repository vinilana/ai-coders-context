import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { StateDetector } from './stateDetector';

describe('StateDetector', () => {
  let tempDir: string;
  let detector: StateDetector;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'state-detector-test-'));
    detector = new StateDetector({ projectPath: tempDir });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('detect', () => {
    it('should detect new state when no .context directory exists', async () => {
      const result = await detector.detect();

      expect(result.state).toBe('new');
      expect(result.details.hasContextDir).toBe(false);
    });

    it('should detect unfilled state when docs have unfilled status', async () => {
      const contextDir = path.join(tempDir, '.context');
      const docsDir = path.join(contextDir, 'docs');

      await fs.mkdir(docsDir, { recursive: true });
      await fs.writeFile(
        path.join(docsDir, 'README.md'),
        '---\nstatus: unfilled\n---\n\n# Documentation'
      );

      const result = await detector.detect();

      expect(result.state).toBe('unfilled');
      expect(result.details.hasContextDir).toBe(true);
      expect(result.details.unfilledFiles).toBeGreaterThan(0);
    });

    it('should detect ready state when all docs are filled', async () => {
      const contextDir = path.join(tempDir, '.context');
      const docsDir = path.join(contextDir, 'docs');
      const srcDir = path.join(tempDir, 'src');

      await fs.mkdir(docsDir, { recursive: true });
      await fs.mkdir(srcDir, { recursive: true });

      // Create source file first (older)
      await fs.writeFile(path.join(srcDir, 'index.ts'), 'export const foo = 1;');

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create doc after (newer)
      await fs.writeFile(
        path.join(docsDir, 'README.md'),
        '# Documentation\n\nFilled content without front matter.'
      );

      const result = await detector.detect();

      expect(result.state).toBe('ready');
      expect(result.details.hasContextDir).toBe(true);
      expect(result.details.unfilledFiles).toBe(0);
    });

    it('should detect outdated state when code is newer than docs', async () => {
      const contextDir = path.join(tempDir, '.context');
      const docsDir = path.join(contextDir, 'docs');
      const srcDir = path.join(tempDir, 'src');

      await fs.mkdir(docsDir, { recursive: true });
      await fs.mkdir(srcDir, { recursive: true });

      // Create old doc first
      await fs.writeFile(
        path.join(docsDir, 'README.md'),
        '# Documentation\n\nOld content.'
      );

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create newer source file
      await fs.writeFile(path.join(srcDir, 'index.ts'), 'export const bar = 2;');

      const result = await detector.detect();

      expect(result.state).toBe('outdated');
      expect(result.details.hasContextDir).toBe(true);
      expect(result.details.daysBehind).toBeGreaterThanOrEqual(0);
    });
  });

  describe('with custom context directory', () => {
    it('should use custom output directory', async () => {
      const customOutput = path.join(tempDir, 'custom-context');
      const customDetector = new StateDetector({
        projectPath: tempDir,
        contextDirName: 'custom-context'
      });

      await fs.mkdir(path.join(customOutput, 'docs'), { recursive: true });
      await fs.writeFile(
        path.join(customOutput, 'docs', 'README.md'),
        '# Custom docs'
      );

      const result = await customDetector.detect();

      expect(result.details.hasContextDir).toBe(true);
    });
  });

  describe('describeState', () => {
    it('should describe new state', async () => {
      const result = await detector.detect();
      const description = StateDetector.describeState(result);

      expect(description).toBe('No context documentation found');
    });

    it('should describe unfilled state', async () => {
      const contextDir = path.join(tempDir, '.context');
      const docsDir = path.join(contextDir, 'docs');

      await fs.mkdir(docsDir, { recursive: true });
      await fs.writeFile(
        path.join(docsDir, 'README.md'),
        '---\nstatus: unfilled\n---\n\n# Doc'
      );
      await fs.writeFile(
        path.join(docsDir, 'other.md'),
        '# Filled doc'
      );

      const result = await detector.detect();
      const description = StateDetector.describeState(result);

      expect(description).toContain('files need to be filled');
    });
  });
});
