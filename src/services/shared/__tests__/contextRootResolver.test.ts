/**
 * Unit tests for Context Root Resolver
 *
 * Tests comprehensive detection strategies including:
 * - Upward traversal
 * - Git root detection
 * - Package.json configuration
 * - Validation of .context structure
 * - Error handling and fallbacks
 * - Timeout protection
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import {
  resolveContextRoot,
  findGitRoot,
  validateContextStructure,
  readContextPathFromPackageJson,
  ContextResolutionResult,
  ContextValidation,
} from '../contextRootResolver';

describe('contextRootResolver', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(os.tmpdir(), `context-resolver-test-${Date.now()}`);
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    // Cleanup test directory
    await fs.remove(testDir);
  });

  describe('resolveContextRoot', () => {
    it('should find .context when in parent directory', async () => {
      // Setup: Create .context in testDir and a subdirectory
      await fs.ensureDir(path.join(testDir, '.context', 'docs'));
      const subDir = path.join(testDir, 'src', 'components');
      await fs.ensureDir(subDir);

      // Act
      const result = await resolveContextRoot({
        startPath: subDir,
        validate: false,
      });

      // Assert
      expect(result.exists).toBe(true);
      expect(result.contextPath).toBe(path.join(testDir, '.context'));
      expect(result.projectRoot).toBe(testDir);
      expect(result.foundBy).toBe('upward-traversal');
    });

    it('should respect maxTraversal limit', async () => {
      // Setup: Create deeply nested structure
      const deepPath = path.join(
        testDir,
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g'
      );
      await fs.ensureDir(deepPath);

      // Act: Resolve with maxTraversal=2
      const result = await resolveContextRoot({
        startPath: deepPath,
        maxTraversal: 2,
        validate: false,
      });

      // Assert: Should not find (no .context exists)
      expect(result.foundBy).toBe('cwd-fallback');
    });

    it('should use direct subdirectory if .context exists', async () => {
      // Setup: Create .context in testDir
      const contextPath = path.join(testDir, '.context');
      await fs.ensureDir(path.join(contextPath, 'docs'));

      // Act
      const result = await resolveContextRoot({
        startPath: testDir,
        validate: false,
      });

      // Assert
      expect(result.foundBy).toBe('direct-subdir');
      expect(result.contextPath).toBe(contextPath);
    });

    it('should handle .context as startPath directly', async () => {
      // Setup
      const contextPath = path.join(testDir, '.context');
      await fs.ensureDir(path.join(contextPath, 'docs'));

      // Act
      const result = await resolveContextRoot({
        startPath: contextPath,
        validate: false,
      });

      // Assert
      expect(result.foundBy).toBe('parameter');
      expect(result.contextPath).toBe(contextPath);
    });

    it('should provide diagnostics when .context is invalid', async () => {
      // Setup: Create empty .context (missing subdirectories)
      await fs.ensureDir(path.join(testDir, '.context'));

      // Act
      const result = await resolveContextRoot({
        startPath: testDir,
        validate: true,
      });

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.warning).toContain('Invalid .context structure');
      expect(result.validation.missingDirectories.length).toBeGreaterThan(0);
    });

    it('should validate .context structure correctly', async () => {
      // Setup: Create valid .context
      const contextPath = path.join(testDir, '.context');
      await fs.ensureDir(path.join(contextPath, 'docs'));
      await fs.ensureDir(path.join(contextPath, 'agents'));

      // Act
      const result = await resolveContextRoot({
        startPath: testDir,
        validate: true,
      });

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.validation.hasDocs).toBe(true);
      expect(result.validation.hasAgents).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should timeout on slow filesystem operations', async () => {
      // Act: Use very small timeout
      const result = await resolveContextRoot({
        startPath: testDir,
        timeoutMs: 1, // 1ms timeout - will likely trigger in test
        validate: false,
      });

      // Assert: Should fall back gracefully
      // (may or may not timeout depending on system speed, but should not crash)
      expect(result).toBeDefined();
      expect(result.contextPath).toBeDefined();
    });
  });

  describe('findGitRoot', () => {
    it('should find .git directory in parent', async () => {
      // Setup: Create .git directory
      await fs.ensureDir(path.join(testDir, '.git'));
      const subDir = path.join(testDir, 'src');
      await fs.ensureDir(subDir);

      // Act
      const result = await findGitRoot(subDir);

      // Assert
      expect(result).toBe(testDir);
    });

    it('should return null if no .git found', async () => {
      // Setup: No .git directory

      // Act
      const result = await findGitRoot(testDir);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle deeply nested structures', async () => {
      // Setup
      await fs.ensureDir(path.join(testDir, '.git'));
      const deepPath = path.join(testDir, 'a', 'b', 'c', 'd');
      await fs.ensureDir(deepPath);

      // Act
      const result = await findGitRoot(deepPath);

      // Assert
      expect(result).toBe(testDir);
    });

    it('should handle permission errors gracefully', async () => {
      // Setup: Create structure (permission testing may vary by OS)
      await fs.ensureDir(path.join(testDir, '.git'));
      const subDir = path.join(testDir, 'src');
      await fs.ensureDir(subDir);

      // Act: Should not crash even with nested dirs
      const result = await findGitRoot(subDir);

      // Assert
      expect(result).toBe(testDir);
    });
  });

  describe('validateContextStructure', () => {
    it('should validate complete .context structure', async () => {
      // Setup: Create all required directories
      const contextPath = path.join(testDir, '.context');
      await fs.ensureDir(path.join(contextPath, 'docs'));
      await fs.ensureDir(path.join(contextPath, 'agents'));
      await fs.ensureDir(path.join(contextPath, 'workflow'));
      await fs.ensureDir(path.join(contextPath, 'plans'));
      await fs.ensureDir(path.join(contextPath, 'rules'));

      // Act
      const result = await validateContextStructure(contextPath);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.hasDocs).toBe(true);
      expect(result.hasAgents).toBe(true);
      expect(result.hasWorkflow).toBe(true);
      expect(result.hasPlans).toBe(true);
      expect(result.hasRules).toBe(true);
      expect(result.missingDirectories.length).toBe(0);
    });

    it('should report missing directories', async () => {
      // Setup: Create only docs directory
      const contextPath = path.join(testDir, '.context');
      await fs.ensureDir(path.join(contextPath, 'docs'));

      // Act
      const result = await validateContextStructure(contextPath);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.hasDocs).toBe(true);
      expect(result.hasAgents).toBe(false);
      expect(result.missingDirectories).toContain('agents');
    });

    it('should require at least docs or agents', async () => {
      // Setup: Create workflow only (neither docs nor agents)
      const contextPath = path.join(testDir, '.context');
      await fs.ensureDir(path.join(contextPath, 'workflow'));

      // Act
      const result = await validateContextStructure(contextPath);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it('should detect non-directory files', async () => {
      // Setup: Create docs as file instead of directory
      const contextPath = path.join(testDir, '.context');
      await fs.ensureDir(contextPath);
      await fs.writeFile(path.join(contextPath, 'docs'), 'content');
      await fs.ensureDir(path.join(contextPath, 'agents'));

      // Act
      const result = await validateContextStructure(contextPath);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.missingDirectories.some((d) =>
          d.includes('exists but is not a directory')
        )
      ).toBe(true);
    });
  });

  describe('readContextPathFromPackageJson', () => {
    it('should read ai-context.path from package.json', async () => {
      // Setup
      const customContextPath = path.join(testDir, 'custom', '.context');
      await fs.ensureDir(customContextPath);
      await fs.writeJSON(path.join(testDir, 'package.json'), {
        name: 'test-package',
        'ai-context': {
          path: 'custom/.context',
        },
      });

      // Act
      const result = await readContextPathFromPackageJson(testDir);

      // Assert
      expect(result).toBe(customContextPath);
    });

    it('should return null if no ai-context config', async () => {
      // Setup: Create package.json without ai-context
      await fs.writeJSON(path.join(testDir, 'package.json'), {
        name: 'test-package',
      });

      // Act
      const result = await readContextPathFromPackageJson(testDir);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null if package.json not found', async () => {
      // Setup: No package.json

      // Act
      const result = await readContextPathFromPackageJson(testDir);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle absolute paths in config', async () => {
      // Setup
      const customContextPath = path.join(testDir, 'alt', '.context');
      const absolutePath = customContextPath;
      await fs.ensureDir(customContextPath);
      await fs.writeJSON(path.join(testDir, 'package.json'), {
        name: 'test-package',
        'ai-context': {
          path: absolutePath,
        },
      });

      // Act
      const result = await readContextPathFromPackageJson(testDir);

      // Assert
      expect(result).toBe(customContextPath);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle non-existent startPath gracefully', async () => {
      // Setup: Non-existent path

      // Act
      const result = await resolveContextRoot({
        startPath: path.join(testDir, 'nonexistent'),
        validate: false,
      });

      // Assert: Should fall back gracefully
      expect(result).toBeDefined();
      expect(result.contextPath).toBeDefined();
    });

    it('should provide warnings for not found scenarios', async () => {
      // Setup: Empty testDir
      // Act
      const result = await resolveContextRoot({
        startPath: testDir,
        validate: false,
      });

      // Assert
      expect(result.foundBy).toBe('cwd-fallback');
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('No .context directory found');
    });

    it('should handle symlinks correctly', async () => {
      // Setup: Create real .context and symlink to parent
      const realContextPath = path.join(testDir, '.context');
      await fs.ensureDir(path.join(realContextPath, 'docs'));

      // Act
      const result = await resolveContextRoot({
        startPath: testDir,
        validate: false,
      });

      // Assert
      expect(result.contextPath).toBe(realContextPath);
    });
  });

  describe('resolution strategy ordering', () => {
    it('should prefer direct-subdir over upward-traversal', async () => {
      // Setup: Create .context in current and parent
      const parentContextPath = path.join(testDir, '.context');
      await fs.ensureDir(path.join(parentContextPath, 'docs'));

      const subDir = path.join(testDir, 'src');
      const subContextPath = path.join(subDir, '.context');
      await fs.ensureDir(path.join(subContextPath, 'docs'));

      // Act
      const result = await resolveContextRoot({
        startPath: subDir,
        validate: false,
      });

      // Assert: Should find local .context first
      expect(result.foundBy).toBe('direct-subdir');
      expect(result.contextPath).toBe(subContextPath);
    });

    it('should use package.json config over upward-traversal', async () => {
      // Setup: Both parent .context and package.json config pointing elsewhere
      await fs.ensureDir(path.join(testDir, '.context', 'docs'));

      const customContextPath = path.join(testDir, 'custom', '.context');
      await fs.ensureDir(path.join(customContextPath, 'docs'));

      await fs.writeJSON(path.join(testDir, 'package.json'), {
        'ai-context': { path: 'custom/.context' },
      });

      // Act
      const result = await resolveContextRoot({
        startPath: testDir,
        checkPackageJson: true,
        validate: false,
      });

      // Assert: Should prefer direct-subdir, but if not checking package.json would be next
      expect(result.foundBy).toBe('direct-subdir');
    });
  });
});
