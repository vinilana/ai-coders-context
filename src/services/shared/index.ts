/**
 * Shared Service Utilities
 *
 * Common utilities, types, and helpers used across all services.
 */

// Types
export {
  BaseDependencies,
  AIDependencies,
  OperationResult,
  OperationError,
  FileInfo,
  DetectionResult,
  DryRunOptions,
  createEmptyResult,
  mergeResults,
  addError,
} from './types';

// Glob Patterns
export {
  COMMON_IGNORES,
  CODE_EXTENSIONS,
  DOC_EXTENSIONS,
  CONFIG_PATTERNS,
  globFiles,
  globMultiple,
  buildExtensionPattern,
  shouldIgnore,
} from './globPatterns';

// UI Helpers
export {
  withSpinner,
  displayOperationSummary,
  displayProgressBar,
  displayPhaseIndicator,
  createBox,
  SpinnerStatus,
} from './uiHelpers';

// Path Helpers
export {
  ContextPaths,
  resolveContextPaths,
  resolveAbsolutePath,
  ensureDirectory,
  ensureParentDirectory,
  getRelativePath,
  pathExists,
  isDirectory,
  isFile,
  normalizePath,
  deduplicatePaths,
  getExtension,
  getBasename,
  joinPaths,
} from './pathHelpers';
