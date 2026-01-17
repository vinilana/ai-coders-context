# Context Root Resolver - Integration Guide

## Overview

The Context Root Resolver provides robust, automatic detection of the `.context` folder using a sophisticated multi-strategy fallback approach. This guide documents how to integrate it into your services.

## Quick Start

### For Service Initialization

```typescript
import { resolveContextRoot } from '@services/shared/contextRootResolver';

// In your service factory method
static async create(
  repoPath: string = process.cwd(),
  options?: ServiceOptions
): Promise<MyService> {
  const resolution = await resolveContextRoot({
    startPath: repoPath,
    validate: false,  // Skip validation unless needed
  });

  return new MyService(resolution.projectRoot, options);
}
```

### For Direct Usage

```typescript
import { getContextPath, getProjectRoot } from '@services/shared/contextRootResolver';

// Get .context path
const contextPath = await getContextPath('/any/subdirectory');

// Get project root (follows git root)
const projectRoot = await getProjectRoot('/any/subdirectory');
```

## Detection Strategy (in order)

The resolver tries these strategies in order:

1. **Parameter** - If path ends with `.context`, use it directly
2. **Direct Subdirectory** - Check if path has `.context` subdirectory
3. **Package.json Config** - Check for `ai-context.path` configuration
4. **Upward Traversal** - Search up to 10 directory levels (with timeout)
5. **Git Root Detection** - Use `.git` directory as project boundary
6. **CWD Fallback** - Use `process.cwd()` as final fallback

## Resolution Result

Every resolution returns a detailed `ContextResolutionResult`:

```typescript
interface ContextResolutionResult {
  contextPath: string;        // Absolute path to .context
  projectRoot: string;        // Absolute path to project root
  foundBy: 'parameter' | 'direct-subdir' | 'package-json'
         | 'upward-traversal' | 'git-root' | 'cwd-fallback';
  exists: boolean;            // Whether .context exists
  isValid: boolean;           // Whether .context is valid
  validation: ContextValidation;  // Detailed validation info
  warning?: string;           // Optional warning message
}
```

## Configuration Options

```typescript
interface ContextResolutionOptions {
  startPath?: string;         // Default: process.cwd()
  contextDirName?: string;    // Default: '.context'
  validate?: boolean;         // Default: true
  maxTraversal?: number;      // Default: 10 (directory levels)
  checkPackageJson?: boolean; // Default: true
  timeoutMs?: number;         // Default: 5000ms
}
```

## Usage Patterns

### Pattern 1: Service with Factory Method (Recommended)

```typescript
import { WorkflowService, type WorkflowInitOptions } from '@services/workflow';
import { resolveContextRoot } from '@services/shared/contextRootResolver';

class MyService {
  constructor(private repoPath: string) {}

  static async create(
    repoPath?: string,
    options?: MyServiceOptions
  ): Promise<MyService> {
    // Robust resolution with timeout protection
    const resolution = await resolveContextRoot({
      startPath: repoPath,
      validate: false,
      timeoutMs: 3000,  // Stricter timeout for UI
    });

    if (!resolution.exists) {
      throw new Error(
        `No .context found. Expected at: ${resolution.contextPath}`
      );
    }

    return new MyService(resolution.projectRoot);
  }
}

// Usage
const service = await MyService.create('/any/nested/path');
```

### Pattern 2: Gateway Handler (MCP Pattern)

```typescript
import { resolveContextRoot } from '@services/shared/contextRootResolver';

export async function handleMyGateway(
  params: MyParams,
  options: GatewayOptions
): Promise<MCPToolResponse> {
  // Resolve with fallback options
  let repoPath = params.repoPath || options.repoPath;
  if (!repoPath) {
    const resolution = await resolveContextRoot({ validate: false });
    repoPath = resolution.projectRoot;
  }

  try {
    const service = await MyService.create(repoPath);
    // ... rest of handler
  } catch (error) {
    return createErrorResponse(error);
  }
}
```

### Pattern 3: Direct Monorepo Support

```typescript
// Package.json configuration
{
  "name": "workspace-package",
  "ai-context": {
    "path": "../../.context"  // Shared .context at root
  }
}

// Or per-package .context
{
  "name": "local-package",
  "ai-context": {
    "path": "./.context"  // Local to this package
  }
}

// Both work automatically with resolveContextRoot
```

## Error Handling

### Graceful Degradation

The resolver gracefully handles errors:

```typescript
const result = await resolveContextRoot({
  startPath: '/invalid/path',  // Non-existent path
  validate: true,
});

// Returns with warning and fallback path
if (result.warning) {
  console.warn(result.warning);
}
if (!result.exists) {
  console.log(`Use ${result.contextPath} to create .context`);
}
```

### Timeout Handling

Slow filesystems are handled gracefully:

```typescript
const result = await resolveContextRoot({
  timeoutMs: 2000,  // Strict 2-second limit
  validate: false,
});

// If timeout occurs during upward traversal:
// - Traversal is skipped
// - Falls back to git root or cwd
// - Operation completes successfully
```

### Permission Errors

Access denied on directories is handled gracefully:

```typescript
// Even if some directories are inaccessible,
// resolution continues and finds .context at accessible level
const result = await resolveContextRoot({
  startPath: '/protected/nested/path',
});

// Will still succeed by traversing past permission errors
```

## Validation Details

When `validate: true`, `.context` structure is checked:

```typescript
interface ContextValidation {
  isValid: boolean;              // true if at least docs or agents exist
  hasDocs: boolean;
  hasAgents: boolean;
  hasWorkflow: boolean;
  hasPlans: boolean;
  hasRules: boolean;
  missingDirectories: string[];  // List of missing/invalid dirs
}

// Use validation to distinguish between:
if (!result.exists) {
  // Create .context
} else if (!result.isValid) {
  // Repair .context structure
}
```

## Best Practices

### 1. Use Factory Methods

✅ **Good**
```typescript
const service = await WorkflowService.create(userPath);
```

❌ **Bad**
```typescript
const service = new WorkflowService(userPath);
```

### 2. Set Appropriate Timeouts

```typescript
// For CLI: generous timeout
await resolveContextRoot({ timeoutMs: 10000 });

// For MCP/UI: stricter timeout
await resolveContextRoot({ timeoutMs: 2000 });
```

### 3. Always Check Resolution Warnings

```typescript
const result = await resolveContextRoot();

if (result.warning) {
  logger.warn(`Context resolution: ${result.warning}`);
}

if (!result.isValid) {
  logger.error(`Invalid .context at ${result.contextPath}`);
  // Handle recovery
}
```

### 4. Validate Only When Necessary

```typescript
// For path resolution only
const paths = await resolveContextRoot({ validate: false });

// For operations requiring valid structure
const validated = await resolveContextRoot({ validate: true });
if (!validated.isValid) {
  throw new Error('Invalid .context structure');
}
```

### 5. Handle Monorepo Scenarios

```typescript
// Enable package.json checking for monorepos
const result = await resolveContextRoot({
  startPath: packagePath,
  checkPackageJson: true,  // Look for ai-context config
});
```

## Integration Checklist

- [ ] Service has `static async create()` factory method
- [ ] Factory uses `resolveContextRoot()` for path resolution
- [ ] Constructor remains simple (for testing)
- [ ] Gateway handlers resolve paths before creating services
- [ ] Error handling covers all result conditions
- [ ] Timeout values suit your use case (UI vs CLI)
- [ ] Tests cover upward traversal and git detection
- [ ] Documentation mentions .context requirements
- [ ] Package.json configured for monorepo (if applicable)

## Troubleshooting

### .context Not Found from Subdirectory

Ensure the .context exists in a parent directory:

```bash
# Check structure
find . -name ".context" -type d

# Or manually from subdirectory
cd src/components
node -e "require('@services/shared/contextRootResolver').resolveContextRoot().then(r => console.log(r))"
```

### Validation Failures

Check .context has required directories:

```bash
ls -la .context/
# Should have at least: docs/ and/or agents/
```

### Timeout Occurring

Increase timeout for slow filesystems:

```typescript
await resolveContextRoot({
  timeoutMs: 15000,  // 15 seconds
});
```

### Wrong .context Found

Check resolution order - closer .context directories take precedence:

```typescript
// Force specific path
const result = await resolveContextRoot({
  startPath: path.resolve('/exact/path/.context'),
});
```

## API Reference

### resolveContextRoot(options?)

Main resolver function. Returns complete resolution information.

**Options:**
- `startPath?: string` - Starting directory (default: cwd)
- `validate?: boolean` - Validate structure (default: true)
- `maxTraversal?: number` - Directory levels to search (default: 10)
- `checkPackageJson?: boolean` - Check config (default: true)
- `timeoutMs?: number` - Operation timeout in ms (default: 5000)

**Returns:** `Promise<ContextResolutionResult>`

### getContextPath(repoPath?)

Simple helper to get .context path.

**Returns:** `Promise<string>`

### getProjectRoot(repoPath?)

Get project root (follows .git or falls back to path).

**Returns:** `Promise<string>`

### findGitRoot(startPath)

Locate .git directory.

**Returns:** `Promise<string | null>`

### validateContextStructure(contextPath)

Validate .context directory structure.

**Returns:** `Promise<ContextValidation>`

### readContextPathFromPackageJson(projectRoot)

Read configuration from package.json.

**Returns:** `Promise<string | null>`

## Performance Characteristics

- **Best case** (direct-subdir): ~1-5ms
- **Typical case** (upward traversal): ~5-50ms
- **Worst case** (cwd fallback with timeout): ~timeout ms
- **With validation**: +10-50ms depending on structure

Cache results if calling frequently:

```typescript
let cachedResult: ContextResolutionResult | null = null;

async function getResolution() {
  if (!cachedResult) {
    cachedResult = await resolveContextRoot();
  }
  return cachedResult;
}
```
