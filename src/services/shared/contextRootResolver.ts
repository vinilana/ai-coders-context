/**
 * Context Root Resolver
 *
 * Robust detection of the .context folder with support for:
 * - Upward traversal through directory hierarchy
 * - Git root detection as fallback
 * - Package.json configuration
 * - Monorepo support (both shared and per-package .context)
 * - Comprehensive validation of .context structure
 *
 * Algorithm:
 * 1. If path ends in .context, use it directly
 * 2. Check if path has .context subdirectory
 * 3. Check package.json for ai-context.path configuration
 * 4. Traverse upward (max 10 levels) looking for .context
 * 5. Find .git root and check for .context there
 * 6. Fall back to process.cwd()
 * 7. Validate discovered .context structure
 */

import * as path from 'path';
import * as fs from 'fs-extra';

/**
 * Validation result for .context structure
 */
export interface ContextValidation {
  isValid: boolean;
  hasDocs: boolean;
  hasAgents: boolean;
  hasWorkflow: boolean;
  hasPlans: boolean;
  hasRules: boolean;
  missingDirectories: string[];
}

/**
 * Detailed resolution result
 */
export interface ContextResolutionResult {
  /** Absolute path to .context directory */
  contextPath: string;
  /** Absolute path to project root */
  projectRoot: string;
  /** How the context was found */
  foundBy:
    | 'parameter'
    | 'direct-subdir'
    | 'package-json'
    | 'upward-traversal'
    | 'git-root'
    | 'cwd-fallback';
  /** Whether .context directory exists */
  exists: boolean;
  /** Whether .context has valid structure */
  isValid: boolean;
  /** Validation details */
  validation: ContextValidation;
  /** Optional warning message */
  warning?: string;
}

/**
 * Options for context resolution
 */
export interface ContextResolutionOptions {
  /** Starting directory for resolution (defaults to cwd) */
  startPath?: string;
  /** Directory name to search for (defaults to '.context') */
  contextDirName?: string;
  /** Validate .context structure (defaults to true) */
  validate?: boolean;
  /** Maximum directory levels to traverse upward (defaults to 10) */
  maxTraversal?: number;
  /** Check package.json for configuration (defaults to true) */
  checkPackageJson?: boolean;
  /** Timeout in milliseconds for operations (defaults to 5000ms) */
  timeoutMs?: number;
}

/**
 * Find git root directory starting from given path
 * Returns null if no .git found
 *
 * Error handling: Silently skips directory access errors and continues traversal.
 * This handles permission issues gracefully.
 */
export async function findGitRoot(startPath: string): Promise<string | null> {
  let current = path.resolve(startPath);
  const root = path.parse(current).root;

  // Traverse up to 20 levels looking for .git
  for (let i = 0; i < 20; i++) {
    const gitPath = path.join(current, '.git');
    try {
      if (await fs.pathExists(gitPath)) {
        return current;
      }
    } catch (error) {
      // Skip directories with permission errors and continue traversal
      // This is intentional - we want to find .git even if some dirs are inaccessible
    }

    if (current === root) {
      break;
    }
    current = path.dirname(current);
  }

  return null;
}

/**
 * Read ai-context configuration from package.json
 * Returns configured path or null if not found
 */
export async function readContextPathFromPackageJson(
  projectRoot: string
): Promise<string | null> {
  try {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (!(await fs.pathExists(packageJsonPath))) {
      return null;
    }

    const packageJson = await fs.readJSON(packageJsonPath);
    const contextPath = (packageJson['ai-context'] as Record<string, unknown>)
      ?.path;

    if (typeof contextPath === 'string') {
      // Resolve relative path from package.json location
      return path.resolve(projectRoot, contextPath);
    }
  } catch {
    // Silently ignore parse errors
  }

  return null;
}

/**
 * Validate .context directory structure
 */
export async function validateContextStructure(
  contextPath: string
): Promise<ContextValidation> {
  const dirs = [
    { name: 'docs', key: 'hasDocs' },
    { name: 'agents', key: 'hasAgents' },
    { name: 'workflow', key: 'hasWorkflow' },
    { name: 'plans', key: 'hasPlans' },
    { name: 'rules', key: 'hasRules' },
  ];

  const validation: ContextValidation = {
    isValid: true,
    hasDocs: false,
    hasAgents: false,
    hasWorkflow: false,
    hasPlans: false,
    hasRules: false,
    missingDirectories: [],
  };

  for (const dir of dirs) {
    const dirPath = path.join(contextPath, dir.name);
    const exists = await fs.pathExists(dirPath);

    if (exists) {
      const isDir = await isDirectory(dirPath);
      if (isDir) {
        (validation[dir.key as keyof ContextValidation] as boolean) = true;
      } else {
        validation.isValid = false;
        validation.missingDirectories.push(
          `${dir.name} exists but is not a directory`
        );
      }
    } else {
      validation.missingDirectories.push(dir.name);
    }
  }

  // Valid if at least has docs or agents
  if (!validation.hasDocs && !validation.hasAgents) {
    validation.isValid = false;
  }

  return validation;
}

/**
 * Check if path is a directory
 */
async function isDirectory(targetPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(targetPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Wrap a promise with a timeout
 * Rejects if operation takes longer than specified timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(
      () =>
        reject(
          new Error(
            `${operationName} timed out after ${timeoutMs}ms. Filesystem may be slow or unresponsive.`
          )
        ),
      timeoutMs
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

/**
 * Create an initial resolution result with empty validation
 * (Helper to reduce DRY violations)
 */
function createEmptyResolutionResult(
  contextPath: string,
  projectRoot: string,
  foundBy: ContextResolutionResult['foundBy'],
  exists: boolean
): ContextResolutionResult {
  return {
    contextPath,
    projectRoot,
    foundBy,
    exists,
    isValid: false,
    validation: {
      isValid: false,
      hasDocs: false,
      hasAgents: false,
      hasWorkflow: false,
      hasPlans: false,
      hasRules: false,
      missingDirectories: [],
    },
  };
}

/**
 * Validate and finalize a resolution result
 * (Helper to reduce code duplication)
 */
async function finalizeResolutionResult(
  result: ContextResolutionResult,
  validate: boolean
): Promise<ContextResolutionResult> {
  if (result.exists && validate) {
    result.validation = await validateContextStructure(result.contextPath);
    result.isValid = result.validation.isValid;
    if (!result.isValid) {
      result.warning = `Invalid .context structure at ${result.contextPath}. Missing: ${result.validation.missingDirectories.join(', ')}`;
    }
  }
  return result;
}

/**
 * Resolve .context root with comprehensive fallback strategy
 */
export async function resolveContextRoot(
  options: ContextResolutionOptions = {}
): Promise<ContextResolutionResult> {
  const {
    startPath = process.cwd(),
    contextDirName = '.context',
    validate = true,
    maxTraversal = 10,
    checkPackageJson = true,
    timeoutMs = 5000,
  } = options;

  // Resolve symlinks and normalize the starting path
  let resolvedStart: string;
  try {
    resolvedStart = await fs.realpath(startPath);
  } catch {
    resolvedStart = path.resolve(startPath);
  }

  // Step 1: If startPath ends with .context, use it directly
  if (path.basename(resolvedStart) === contextDirName) {
    const exists = await fs.pathExists(resolvedStart);
    const result = createEmptyResolutionResult(
      resolvedStart,
      path.dirname(resolvedStart),
      'parameter',
      exists
    );
    return finalizeResolutionResult(result, validate);
  }

  // Step 2: Check if startPath has .context subdirectory
  const directChild = path.join(resolvedStart, contextDirName);
  if (await fs.pathExists(directChild)) {
    if (await isDirectory(directChild)) {
      const result = createEmptyResolutionResult(
        directChild,
        resolvedStart,
        'direct-subdir',
        true
      );
      return finalizeResolutionResult(result, validate);
    }
  }

  // Step 3: Check package.json for ai-context.path configuration
  if (checkPackageJson) {
    const configuredPath = await readContextPathFromPackageJson(resolvedStart);
    if (configuredPath && (await fs.pathExists(configuredPath))) {
      if (await isDirectory(configuredPath)) {
        const result = createEmptyResolutionResult(
          configuredPath,
          resolvedStart,
          'package-json',
          true
        );
        const finalResult = await finalizeResolutionResult(result, validate);
        if (finalResult.warning) {
          finalResult.warning = finalResult.warning.replace(
            'Invalid .context',
            'Invalid .context (from package.json)'
          );
        }
        return finalResult;
      }
    }
  }

  // Step 4: Traverse upward looking for .context (with timeout protection)
  try {
    const upwardTraversalResult = await withTimeout(
      (async () => {
        let current = resolvedStart;
        const root = path.parse(current).root;

        for (let i = 0; i < maxTraversal; i++) {
          const candidatePath = path.join(current, contextDirName);

          if (await fs.pathExists(candidatePath)) {
            if (await isDirectory(candidatePath)) {
              const result = createEmptyResolutionResult(
                candidatePath,
                current,
                'upward-traversal',
                true
              );
              return await finalizeResolutionResult(result, validate);
            }
          }

          // Stop at filesystem root
          if (current === root) {
            break;
          }

          current = path.dirname(current);
        }

        return null;
      })(),
      timeoutMs,
      'Upward traversal for .context'
    );

    if (upwardTraversalResult) {
      return upwardTraversalResult;
    }
  } catch (error) {
    // Timeout or error during traversal - log warning but continue to next strategy
    // This is not critical as we have fallback strategies
  }

  // Step 5: Find git root and check for .context there
  const gitRoot = await findGitRoot(resolvedStart);
  if (gitRoot && gitRoot !== resolvedStart) {
    const gitContextPath = path.join(gitRoot, contextDirName);

    if (await fs.pathExists(gitContextPath)) {
      if (await isDirectory(gitContextPath)) {
        const result = createEmptyResolutionResult(
          gitContextPath,
          gitRoot,
          'git-root',
          true
        );
        return finalizeResolutionResult(result, validate);
      }
    }
  }

  // Step 6: Fallback to process.cwd()
  const fallbackPath = path.join(process.cwd(), contextDirName);
  const fallbackExists = await fs.pathExists(fallbackPath);
  const result = createEmptyResolutionResult(
    fallbackPath,
    process.cwd(),
    'cwd-fallback',
    fallbackExists
  );

  if (fallbackExists && validate) {
    result.validation = await validateContextStructure(fallbackPath);
    result.isValid = result.validation.isValid;
    if (!result.isValid) {
      result.warning = `Invalid .context structure at ${fallbackPath} (cwd fallback). Missing: ${result.validation.missingDirectories.join(', ')}`;
    }
  } else if (!fallbackExists) {
    result.warning = `No .context directory found. Expected at: ${fallbackPath}`;
  }

  return result;
}

/**
 * Get the context path for a repository (simple helper for backwards compatibility)
 * Returns the .context path if valid, otherwise returns expected path
 */
export async function getContextPath(
  repoPath: string = process.cwd()
): Promise<string> {
  const result = await resolveContextRoot({
    startPath: repoPath,
    validate: false,
  });
  return result.contextPath;
}

/**
 * Get the project root for a repository
 * This is useful for determining the root of the project/monorepo
 */
export async function getProjectRoot(
  repoPath: string = process.cwd()
): Promise<string> {
  // Try to find git root first
  const gitRoot = await findGitRoot(repoPath);
  if (gitRoot) {
    return gitRoot;
  }

  // Fall back to the provided path
  return path.resolve(repoPath);
}

/**
 * Unified factory options interface for services using robust context detection
 * Standardizes how services should be instantiated with context resolution
 */
export interface ContextAwareFactoryOptions {
  /** Starting path for context resolution (defaults to cwd) */
  startPath?: string;
  /** Validate .context structure (defaults to false) */
  validate?: boolean;
  /** Additional options specific to the service */
  [key: string]: unknown;
}

/**
 * Unified error handler for context resolution failures
 * Provides consistent error handling across all services
 */
export function handleContextResolutionError(
  error: unknown,
  context: string
): Error {
  if (error instanceof Error) {
    return new Error(`${context}: ${error.message}`);
  }
  return new Error(`${context}: ${String(error)}`);
}
