# Context Root Resolver - Implementation Improvements

This document provides concrete, ready-to-implement improvements for the Context Root Resolver architecture.

---

## 1. Fix DRY Violation: Result Object Creation

**Location:** `src/services/shared/contextRootResolver.ts` (6 occurrences)

**Current Problem:**
Result object initialized identically in 6 different places (lines 218-232, 250-264, 284-298, 323-337, 367-381, 399-414).

**Recommended Implementation:**

```typescript
/**
 * Create a default resolution result with empty validation
 */
function createDefaultResult(
  contextPath: string,
  projectRoot: string,
  foundBy: ContextResolutionResult['foundBy'],
  exists: boolean = true
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

// Usage example:
const result = createDefaultResult(directChild, resolvedStart, 'direct-subdir');
if (validate) {
  result.validation = await validateContextStructure(directChild);
  result.isValid = result.validation.isValid;
  if (!result.isValid) {
    result.warning = `Invalid .context structure at ${directChild}. Missing: ${result.validation.missingDirectories.join(', ')}`;
  }
}
return result;
```

**Benefits:**
- Reduces repeated code by ~70 lines
- Single source of truth for default structure
- Easier to maintain validation initialization
- Clearly separates default creation from custom logic

---

## 2. Fix PlanLinker Factory Inconsistency

**Location:** `src/workflow/plans/planLinker.ts`

**Current Problem:**
Three inconsistent ways to instantiate PlanLinker:
- Constructor (uses simple path.join, doesn't use contextRootResolver)
- Static factory `create()` (async, uses contextRootResolver correctly)
- Function factory `createPlanLinker()` (sync, uses simple path.join)

**Recommended Implementation:**

```typescript
// BEFORE: Inconsistent constructors
constructor(repoPath: string, statusManager?: PrevcStatusManager) {
  this.repoPath = repoPath;
  this.contextPath = path.join(repoPath, '.context');  // <- WRONG!
  this.plansPath = path.join(this.contextPath, 'plans');
  this.workflowPath = path.join(this.contextPath, 'workflow');
  this.agentRegistry = createAgentRegistry(repoPath);
  this.statusManager = statusManager;
}

// AFTER: Private constructor, enforce factory
private constructor(
  contextPath: string,
  projectRoot: string,
  statusManager?: PrevcStatusManager
) {
  this.repoPath = projectRoot;
  this.contextPath = contextPath;
  this.plansPath = path.join(this.contextPath, 'plans');
  this.workflowPath = path.join(this.contextPath, 'workflow');
  this.agentRegistry = createAgentRegistry(projectRoot);
  this.statusManager = statusManager;
}

/**
 * Create a PlanLinker with robust context root detection.
 * Preferred method - uses upward traversal, package.json config, and git detection.
 */
static async create(
  repoPath: string = process.cwd(),
  statusManager?: PrevcStatusManager
): Promise<PlanLinker> {
  const resolution = await resolveContextRoot({
    startPath: repoPath,
    validate: false,
  });
  return new PlanLinker(resolution.contextPath, resolution.projectRoot, statusManager);
}

/**
 * Create a PlanLinker from a known context path.
 * Use this when you already have the context path resolved.
 */
static fromContextPath(
  contextPath: string,
  projectRoot?: string,
  statusManager?: PrevcStatusManager
): PlanLinker {
  return new PlanLinker(contextPath, projectRoot || path.dirname(contextPath), statusManager);
}

// DEPRECATED: Remove or redirect
export function createPlanLinker(repoPath: string, statusManager?: PrevcStatusManager): Promise<PlanLinker> {
  console.warn('createPlanLinker() is deprecated. Use PlanLinker.create() instead.');
  return PlanLinker.create(repoPath, statusManager);
}
```

**Benefits:**
- Single, consistent way to create instances
- Enforces robust resolution strategy
- Private constructor prevents incorrect usage
- Clear migration path with deprecation warning

---

## 3. Improve Error Context in pathHelpers.ts

**Location:** `src/services/shared/pathHelpers.ts` (lines 130-137, 142-148)

**Current Problem:**
`isDirectory()` and `isFile()` swallow all errors, making it impossible to distinguish between "doesn't exist" and "permission denied."

**Recommended Implementation:**

```typescript
export async function isDirectory(targetPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(targetPath);
    return stat.isDirectory();
  } catch (error) {
    // Distinguish between "not found" (expected) and other errors
    if (error instanceof Error && 'code' in error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
        return false; // Path doesn't exist or parent isn't directory
      }
      // Re-throw permission and other errors
      if (error.code === 'EACCES') {
        throw new Error(`Permission denied accessing directory: ${targetPath}`);
      }
    }
    // Unknown error - re-throw with context
    throw new Error(`Failed to check if path is directory: ${targetPath}`, { cause: error });
  }
}

export async function isFile(targetPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(targetPath);
    return stat.isFile();
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
        return false;
      }
      if (error.code === 'EACCES') {
        throw new Error(`Permission denied accessing file: ${targetPath}`);
      }
    }
    throw new Error(`Failed to check if path is file: ${targetPath}`, { cause: error });
  }
}
```

**Benefits:**
- Clearer error reporting
- Can distinguish access issues from non-existent paths
- Easier to debug in production
- Provides context for troubleshooting

---

## 4. Improve ContextValidation Interface

**Location:** `src/services/shared/contextRootResolver.ts` (lines 27-35)

**Current Problem:**
Interface doesn't provide enough information about what's wrong - all failures just set `isValid: false`.

**Recommended Enhancement:**

```typescript
export type ContextComponent = 'docs' | 'agents' | 'workflow' | 'plans' | 'rules';

export interface ComponentValidation {
  component: ContextComponent;
  exists: boolean;
  isDirectory: boolean;
  reason?: string; // 'missing', 'not-a-directory', 'permission-denied', etc.
}

export interface ContextValidation {
  isValid: boolean;
  /** Required components that are present */
  present: ContextComponent[];
  /** Required components that are missing */
  missing: ContextComponent[];
  /** Detailed validation for each component */
  details: Record<ContextComponent, ComponentValidation>;
}

// Updated validation function
export async function validateContextStructure(
  contextPath: string
): Promise<ContextValidation> {
  const components: ContextComponent[] = ['docs', 'agents', 'workflow', 'plans', 'rules'];
  const validation: ContextValidation = {
    isValid: true,
    present: [],
    missing: [],
    details: {} as Record<ContextComponent, ComponentValidation>,
  };

  for (const component of components) {
    const componentPath = path.join(contextPath, component);
    const componentValidation: ComponentValidation = {
      component,
      exists: await fs.pathExists(componentPath),
      isDirectory: false,
      reason: undefined,
    };

    if (componentValidation.exists) {
      try {
        componentValidation.isDirectory = await isDirectory(componentPath);
        if (componentValidation.isDirectory) {
          validation.present.push(component);
        } else {
          validation.isValid = false;
          componentValidation.reason = 'not-a-directory';
        }
      } catch (error) {
        validation.isValid = false;
        componentValidation.reason = 'permission-denied';
      }
    } else {
      validation.missing.push(component);
    }

    validation.details[component] = componentValidation;
  }

  // Valid if at least has docs or agents
  if (!validation.present.includes('docs') && !validation.present.includes('agents')) {
    validation.isValid = false;
  }

  return validation;
}

// Usage:
const result = await resolveContextRoot({ validate: true });
if (!result.isValid) {
  console.log('Missing:', result.validation.missing);  // More specific
  console.log('Details:', result.validation.details['docs']);
}
```

**Benefits:**
- Much better diagnostics
- Can provide specific recovery actions
- Easier to implement conditional logic based on what's missing
- Extensible for custom components

---

## 5. Create ContextManager Unified Class

**Location:** Create new file `src/services/shared/contextManager.ts`

**Problem:**
Multiple services manage their own `contextPath` variable, leading to duplication and inconsistency.

**Recommended Implementation:**

```typescript
/**
 * Unified context manager for all context-related operations
 */
export class ContextManager {
  private constructor(
    private readonly resolution: ContextResolutionResult,
    private readonly paths: ContextPaths
  ) {}

  /**
   * Create a ContextManager with robust resolution
   */
  static async create(repoPath?: string, options?: ContextResolutionOptions): Promise<ContextManager> {
    const resolution = await resolveContextRoot({
      startPath: repoPath || process.cwd(),
      ...options,
    });

    const paths = await resolveContextPathsAsync(resolution.projectRoot, options);

    return new ContextManager(resolution, paths);
  }

  // Resolution information
  get resolution(): Readonly<ContextResolutionResult> {
    return this.resolution;
  }

  get exists(): boolean {
    return this.resolution.exists;
  }

  get isValid(): boolean {
    return this.resolution.isValid;
  }

  get foundBy(): ContextResolutionResult['foundBy'] {
    return this.resolution.foundBy;
  }

  get warning(): string | undefined {
    return this.resolution.warning;
  }

  // Paths
  get contextPath(): string {
    return this.paths.contextPath;
  }

  get projectRoot(): string {
    return this.paths.absolutePath;
  }

  get docsPath(): string {
    return this.paths.docsPath;
  }

  get agentsPath(): string {
    return this.paths.agentsPath;
  }

  get plansPath(): string {
    return this.paths.plansPath;
  }

  get workflowPath(): string {
    return this.paths.workflowPath;
  }

  get rulesPath(): string {
    return this.paths.rulesPath;
  }

  /**
   * Re-validate the context structure
   */
  async revalidate(): Promise<ContextValidation> {
    return validateContextStructure(this.contextPath);
  }

  /**
   * Ensure all required directories exist
   */
  async ensurePaths(): Promise<void> {
    await Promise.all([
      fs.ensureDir(this.docsPath),
      fs.ensureDir(this.agentsPath),
      fs.ensureDir(this.workflowPath),
      fs.ensureDir(this.plansPath),
      fs.ensureDir(this.rulesPath),
    ]);
  }

  /**
   * Get path relative to context root
   */
  getRelativePath(fullPath: string): string {
    return path.relative(this.contextPath, fullPath);
  }

  /**
   * Resolve path within context
   */
  resolvePath(...segments: string[]): string {
    return path.join(this.contextPath, ...segments);
  }
}

// Export factory for easy access
export async function getContextManager(
  repoPath?: string,
  options?: ContextResolutionOptions
): Promise<ContextManager> {
  return ContextManager.create(repoPath, options);
}

export default ContextManager;
```

**Benefits:**
- Centralized context management
- Reduces duplication across services
- Consistent resolution strategy everywhere
- Easy to add context-related operations
- Better encapsulation

**Migration Path:**

```typescript
// BEFORE
class WorkflowService {
  private contextPath: string;

  constructor(repoPath: string) {
    this.contextPath = path.join(repoPath, '.context');
  }
}

// AFTER
class WorkflowService {
  private contextManager: ContextManager;

  static async create(repoPath: string): Promise<WorkflowService> {
    const contextManager = await ContextManager.create(repoPath);
    return new WorkflowService(contextManager);
  }

  private constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
  }

  get contextPath(): string {
    return this.contextManager.contextPath;
  }
}
```

---

## 6. Implement Strategy Pattern (Optional, v0.8+)

**Location:** `src/services/shared/contextRootResolver.ts`

**Recommended for:** Improved extensibility and testability

**Implementation:**

```typescript
/**
 * Strategy for resolving context root
 */
export interface ResolutionStrategy {
  name: string;
  priority: number; // Higher runs first (0-100)
  canResolve(context: ResolutionContext): Promise<boolean>;
  resolve(context: ResolutionContext): Promise<ContextResolutionResult>;
}

/**
 * Shared context for all strategies
 */
export interface ResolutionContext {
  startPath: string;
  resolvedStart: string;
  contextDirName: string;
  options: ContextResolutionOptions;
}

/**
 * Parameter strategy - if path ends with .context
 */
export class ParameterStrategy implements ResolutionStrategy {
  name = 'parameter';
  priority = 100;

  async canResolve(context: ResolutionContext): Promise<boolean> {
    return path.basename(context.resolvedStart) === context.contextDirName;
  }

  async resolve(context: ResolutionContext): Promise<ContextResolutionResult> {
    const result = createDefaultResult(
      context.resolvedStart,
      path.dirname(context.resolvedStart),
      'parameter',
      await fs.pathExists(context.resolvedStart)
    );

    if (result.exists && context.options.validate) {
      result.validation = await validateContextStructure(context.resolvedStart);
      result.isValid = result.validation.isValid;
      if (!result.isValid) {
        result.warning = `Invalid .context structure at ${context.resolvedStart}. Missing: ${result.validation.missingDirectories.join(', ')}`;
      }
    }

    return result;
  }
}

/**
 * Direct subdirectory strategy
 */
export class DirectSubdirStrategy implements ResolutionStrategy {
  name = 'direct-subdir';
  priority = 90;

  async canResolve(context: ResolutionContext): Promise<boolean> {
    const directChild = path.join(context.resolvedStart, context.contextDirName);
    return await isDirectory(directChild);
  }

  async resolve(context: ResolutionContext): Promise<ContextResolutionResult> {
    const directChild = path.join(context.resolvedStart, context.contextDirName);
    const result = createDefaultResult(directChild, context.resolvedStart, 'direct-subdir');

    if (context.options.validate) {
      result.validation = await validateContextStructure(directChild);
      result.isValid = result.validation.isValid;
      if (!result.isValid) {
        result.warning = `Invalid .context structure at ${directChild}. Missing: ${result.validation.missingDirectories.join(', ')}`;
      }
    }

    return result;
  }
}

// ... Additional strategies ...

/**
 * Main resolution function using strategy pattern
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
  } = options;

  let resolvedStart: string;
  try {
    resolvedStart = await fs.realpath(startPath);
  } catch {
    resolvedStart = path.resolve(startPath);
  }

  const context: ResolutionContext = {
    startPath,
    resolvedStart,
    contextDirName,
    options: { ...options, maxTraversal, validate, checkPackageJson },
  };

  const strategies: ResolutionStrategy[] = [
    new ParameterStrategy(),
    new DirectSubdirStrategy(),
    new PackageJsonStrategy(),
    new UpwardTraversalStrategy(maxTraversal),
    new GitRootStrategy(),
    new CwdFallbackStrategy(),
  ];

  // Sort by priority (highest first)
  strategies.sort((a, b) => b.priority - a.priority);

  for (const strategy of strategies) {
    if (await strategy.canResolve(context)) {
      const result = await strategy.resolve(context);
      if (result) return result;
    }
  }

  // Should never reach here (CwdFallback always succeeds)
  throw new Error('Failed to resolve context root');
}
```

**Benefits:**
- Easy to add new resolution strategies
- Each strategy is independently testable
- Clear separation of concerns
- Easy to disable or reorder strategies
- Plugin-ready architecture

---

## 7. Add Filesystem Timeout Protection

**Location:** `src/services/shared/contextRootResolver.ts`

**Problem:** Upward traversal could hang on slow/networked filesystems

**Recommended Implementation:**

```typescript
export interface ContextResolutionOptions {
  startPath?: string;
  contextDirName?: string;
  validate?: boolean;
  maxTraversal?: number;
  checkPackageJson?: boolean;
  fsTimeout?: number; // milliseconds, default 5000
}

/**
 * Wrap fs operation with timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Filesystem operation timeout (${timeoutMs}ms): ${operation}`)),
        timeoutMs
      )
    ),
  ]);
}

// Usage in upward traversal:
const fsTimeout = options.fsTimeout || 5000;

for (let i = 0; i < maxTraversal; i++) {
  const candidatePath = path.join(current, contextDirName);

  try {
    const exists = await withTimeout(
      fs.pathExists(candidatePath),
      fsTimeout,
      `pathExists(${candidatePath})`
    );

    if (exists) {
      const isDir = await withTimeout(
        isDirectory(candidatePath),
        fsTimeout,
        `isDirectory(${candidatePath})`
      );

      if (isDir) {
        // Found it!
        return createResult(candidatePath, current, 'upward-traversal');
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      // Timeout reached, stop searching
      console.warn(`Timeout while searching for ${contextDirName}, stopping traversal`);
      break;
    }
    throw error;
  }

  // ... continue traversal ...
}
```

**Benefits:**
- Prevents hanging on network filesystems
- Configurable timeout per resolution
- Graceful degradation
- Better user experience

---

## 8. Add Caching to PlanLinker

**Location:** `src/workflow/plans/planLinker.ts`

**Problem:** Same plan files read multiple times in a session

**Recommended Implementation:**

```typescript
export class PlanLinker {
  // ... existing code ...

  private planContentCache = new Map<string, { content: string; timestamp: number }>();
  private readonly CACHE_TTL = 5000; // 5 second TTL

  /**
   * Read plan file with caching
   */
  private async readPlanFileWithCache(planPath: string): Promise<string> {
    const cached = this.planContentCache.get(planPath);
    const now = Date.now();

    // Return cached if still valid
    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return cached.content;
    }

    // Read from disk
    const content = await fs.readFile(planPath, 'utf-8');

    // Cache with timestamp
    this.planContentCache.set(planPath, { content, timestamp: now });

    return content;
  }

  /**
   * Invalidate cache for a plan
   */
  private invalidatePlanCache(planPath: string): void {
    this.planContentCache.delete(planPath);
  }

  // Update existing methods to use cache
  async getLinkedPlan(planSlug: string): Promise<LinkedPlan | null> {
    const plans = await this.getLinkedPlans();
    const ref = [...plans.active, ...plans.completed].find(p => p.slug === planSlug);

    if (!ref) {
      return null;
    }

    const planPath = path.join(this.contextPath, ref.path);
    if (!await fs.pathExists(planPath)) {
      return null;
    }

    const content = await this.readPlanFileWithCache(planPath);
    return this.parsePlanToLinked(content, ref);
  }

  // Invalidate cache when updating
  async updatePlanStep(...): Promise<boolean> {
    // ... existing logic ...

    // Invalidate cache before saving
    const planPath = path.join(this.plansPath, `${planSlug}.md`);
    this.invalidatePlanCache(planPath);

    // ... rest of method ...
  }

  /**
   * Clear all caches (e.g., when resetting workflow)
   */
  clearCache(): void {
    this.planContentCache.clear();
  }
}
```

**Benefits:**
- Reduces file I/O
- Faster plan operations
- TTL prevents stale data
- Automatic cache invalidation on updates
- Simple to implement and maintain

---

## Implementation Roadmap

**Immediate (v0.7.1):**
1. Extract result object creation helper (Low effort, high impact)
2. Fix PlanLinker factory inconsistency (Medium effort, high impact)

**Short-term (v0.8):**
1. Add unit tests for contextRootResolver
2. Improve error handling in pathHelpers.ts
3. Enhance ContextValidation interface

**Medium-term (v0.9):**
1. Create ContextManager unified class
2. Implement strategy pattern (optional)
3. Add filesystem timeout protection

**Long-term (v1.0):**
1. Plugin architecture for custom strategies
2. Performance monitoring/metrics
3. Comprehensive documentation updates

---

