---
status: draft
generated: 2026-01-18
agents:
  - type: "architect"
    role: "Design separation of concerns between CLI and MCP"
  - type: "feature-developer"
    role: "Implement CLI simplification and MCP enhancements"
  - type: "test-writer"
    role: "Update tests for new architecture"
  - type: "code-reviewer"
    role: "Review breaking changes and migration path"
docs:
  - "project-overview.md"
  - "tooling.md"
phases:
  - id: "phase-1"
    name: "Discovery & Design"
    prevc: "P"
    status: "completed"
  - id: "phase-2"
    name: "Refactor MCP Tools"
    prevc: "E"
    status: "pending"
  - id: "phase-3"
    name: "MCP Enhancements"
    prevc: "E"
    status: "pending"
  - id: "phase-4"
    name: "CLI Simplification"
    prevc: "E"
    status: "pending"
  - id: "phase-5"
    name: "Validation & Migration"
    prevc: "V"
    status: "pending"
---

# CLI Refactor: Remove AI Provider Support

> Remove direct AI provider integration from CLI, delegating all AI-powered functionality to MCP servers while keeping CLI as a utility-focused tool.

## Task Snapshot

- **Primary goal:** Simplify CLI to utility-only commands, moving all AI-powered operations to MCP
- **Success signal:** CLI works without any AI SDK dependencies; all AI features accessible via MCP tools
- **Key references:**
  - [CLI Entry Point](../../src/index.ts) - Commander.js command definitions
  - [MCP Server](../../src/services/mcp/mcpServer.ts) - MCP tool implementations
  - [AI Providers](../../src/services/ai/providerFactory.ts) - Current provider configuration

## Motivation

### Why This Change?

1. **Separation of Concerns**: CLI should be a lightweight utility tool, AI orchestration belongs in MCP
2. **Reduced Complexity**: Remove 4 AI SDK dependencies and provider abstraction layer from CLI
3. **Better UX**: Users don't need to configure API keys for CLI utility commands
4. **MCP-First Architecture**: MCP is the standard for AI tool integration; leverage it fully
5. **Smaller Bundle**: CLI becomes faster to install and run without AI SDKs

### Current State

```
CLI (ai-context)
├── Utility Commands (no AI)
│   ├── init, sync-agents, import-*, export-*, reverse-sync
│   ├── workflow init/status/advance/handoff/collaborate/role
│   ├── serve, mcp, mcp:install
│   ├── skill list, report
│   └── plan (scaffold only, without --fill)
│
├── AI-Powered Commands (require LLM) ← TO BE REMOVED
│   ├── fill
│   ├── plan --fill
│   ├── update
│   ├── start (combines init + fill + workflow)
│   ├── skill fill, skill create, skill export
│   └── quick-sync (AI-enhanced)
│
└── AI Infrastructure ← TO BE REMOVED
    ├── Provider Factory (openrouter, openai, anthropic, google)
    ├── LLM Client Factory
    ├── AI Agents (DocumentationAgent, PlaybookAgent, PlanAgent, SkillAgent)
    └── AI SDK dependencies (@ai-sdk/*, ai package)
```

### Target State

```
CLI (ai-context) - Utility Only
├── Scaffolding Commands
│   ├── init - Create .context/ structure
│   ├── plan - Scaffold plan templates (no fill)
│   └── skill list - List available skills
│
├── Synchronization Commands
│   ├── sync-agents - Sync agent files
│   ├── import-rules, import-agents - Import from external sources
│   ├── export-rules - Export to target directories
│   └── reverse-sync - Import from AI tools
│
├── Workflow Commands
│   ├── workflow init/status/advance
│   ├── workflow handoff/collaborate/role
│   └── report - Generate progress reports
│
├── Server Commands
│   ├── mcp - Start MCP server (AI features here)
│   ├── mcp:install - Install MCP in AI tools
│   └── serve - Passthrough server
│
└── NO AI INFRASTRUCTURE

MCP Server (via ai-context mcp)
├── Existing Tools (enhanced)
│   ├── context - init, check, fill, fillSingle, listToFill, buildSemantic, scaffoldPlan
│   ├── explore - read, list, analyze, search, getStructure
│   ├── plan - plan management with AI fill
│   ├── agent - agent orchestration
│   ├── skill - skill management with AI fill
│   ├── sync - import/export synchronization
│   └── workflow-* - workflow management
│
├── New/Enhanced Actions
│   ├── context.fill - AI-powered documentation filling
│   ├── plan.fill - AI-powered plan generation
│   ├── skill.fill - AI-powered skill descriptions
│   └── skill.create - AI-powered skill creation
│
└── NO AI SDK - Host AI tool provides LLM
    ├── Tools return context/structure (no LLM calls)
    ├── Host AI tool generates content
    └── MCP protocol handles communication
```

## Scope

### Included

- Remove all AI provider options from CLI commands (`--provider`, `--model`, `--api-key`)
- Remove AI-powered commands: `fill`, `update`, `start`, `skill fill`, `skill create`, `skill export`
- Remove AI SDK dependencies: `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/openai`, `ai`
- Remove AI services: `FillService`, `UpdateService`, `StartService`, `SkillFillService`
- Remove AI agents: `DocumentationAgent`, `PlaybookAgent`, `PlanAgent`, `SkillAgent`
- Remove AI infrastructure: `LLMClientFactory`, `BaseLLMClient`, `AISdkClient`, `providerFactory`
- Update MCP server to expose all AI functionality as tools
- Keep `plan` command but remove `--fill` flag (scaffold only)
- Update documentation and help text

### Excluded

- Removing MCP server functionality (this is where AI lives)
- Changing the passthrough/serve protocol (external agents still work)
- Removing workflow commands (these are state machines, no AI)
- Breaking MCP tool contracts

## Architecture

### Files to Remove

```
src/services/
├── ai/                              # ENTIRE DIRECTORY
│   ├── aiSdkClient.ts               # AI SDK wrapper
│   ├── providerFactory.ts           # Provider configuration
│   ├── agentEvents.ts               # Agent event system
│   ├── agents/
│   │   ├── documentationAgent.ts    # Doc generation agent
│   │   ├── playbookAgent.ts         # Playbook generation agent
│   │   ├── planAgent.ts             # Plan generation agent
│   │   └── skillAgent.ts            # Skill generation agent
│   └── tools/                       # REFACTOR: Remove 'ai' imports, keep logic
│       ├── *.ts                     # Convert from tool() to plain functions + Zod
│       └── index.ts                 # Update exports (remove ToolSet type)
├── baseLLMClient.ts                 # Base AI client class
├── llmClientFactory.ts              # Factory for AI clients
├── fill/                            # ENTIRE DIRECTORY
│   └── fillService.ts               # AI-powered filling
├── update/                          # ENTIRE DIRECTORY
│   └── updateService.ts             # AI-powered updates
├── start/                           # ENTIRE DIRECTORY
│   └── startService.ts              # AI-powered start
└── shared/
    └── llmConfig.ts                 # LLM configuration resolver
```

### Files to Modify

```
src/
├── index.ts                         # Remove AI commands and options
├── services/
│   ├── mcp/
│   │   ├── mcpServer.ts             # Enhance with AI operations
│   │   └── gateway/
│   │       ├── context.ts           # Add fill action
│   │       ├── plan.ts              # Add fill action
│   │       └── skill.ts             # Add fill, create actions
│   ├── plan/
│   │   └── planService.ts           # Remove AI, scaffold only
│   └── skill/
│       └── skillService.ts          # Remove AI features
└── package.json                     # Remove AI SDK dependencies
```

### New Files

```
src/services/mcp/
└── ai/                              # AI infrastructure for MCP
    ├── mcpAiClient.ts               # AI client using host tool's LLM
    └── mcpAgents.ts                 # Agents adapted for MCP context
```

### Important: `ai` Package Usage in MCP Tools

The MCP tools in `src/services/ai/tools/` currently use the `ai` package for two purposes:

1. **Tool definition syntax**: `import { tool } from 'ai'` - Uses `tool()` helper for schema definition
2. **Type exports**: `import type { ToolSet } from 'ai'` - TypeScript types

**Key insight:** These tools do NOT make LLM calls directly. They return context/structure for the **host AI tool** (Claude Code, Cursor, etc.) to generate content. The actual AI generation happens on the host side via MCP protocol.

**Decision required:**

| Option | Pros | Cons |
|--------|------|------|
| **A: Keep `ai` for tool definitions** | Minimal changes, proven tool schema format | Still has `ai` dependency |
| **B: Replace with native Zod schemas** | Zero `ai` dependency | Requires refactoring all tools |
| **C: Move tools to MCP-native format** | Cleaner MCP integration | Larger refactor |

**Recommended: Option B** - Refactor tools to use Zod schemas directly without `ai` package wrapper. The `tool()` helper is just convenience syntax around Zod.

### Refactoring MCP Tools (Option B)

Current pattern:
```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const myTool = tool({
  description: '...',
  inputSchema: z.object({ ... }),
  execute: async (input) => { ... }
});
```

New pattern (no `ai` dependency):
```typescript
import { z } from 'zod';

export const myToolSchema = z.object({ ... });
export type MyToolInput = z.infer<typeof myToolSchema>;

export async function executeMyTool(input: MyToolInput) {
  // ... implementation
}
```

The MCP server already wraps these in MCP-native tool format, so removing the `ai` wrapper is straightforward.

### Dependency Changes

**Remove from package.json:**
```json
{
  "@ai-sdk/anthropic": "^3.0.9",
  "@ai-sdk/google": "^3.0.6",
  "@ai-sdk/openai": "^3.0.7",
  "ai": "^6.0.19"
}
```

**Keep:**
```json
{
  "@modelcontextprotocol/sdk": "1.25.2"  // MCP protocol
}
```

## Agent Lineup

| Agent | Role in this plan | Playbook | First responsibility focus |
| --- | --- | --- | --- |
| Architect | Design clean separation | [Architect](../agents/architect.md) | Define MCP tool contracts |
| Feature Developer | Implement changes | [Feature Developer](../agents/feature-developer.md) | Remove AI from CLI |
| Test Writer | Update test suite | [Test Writer](../agents/test-writer.md) | Update tests for new architecture |
| Code Reviewer | Review breaking changes | [Code Reviewer](../agents/code-reviewer.md) | Ensure clean migration |

## Working Phases

### Phase 1 — Discovery & Design ✅

**Completed:**
1. Analyzed current CLI command structure
2. Identified AI-powered vs utility commands
3. Mapped AI infrastructure dependencies
4. Designed target architecture

**Decisions:**
- MCP server will host all AI functionality
- CLI becomes purely utility-focused
- No AI SDK dependencies in CLI
- MCP tools use host AI tool's LLM capabilities

### Phase 2 — Refactor MCP Tools (Remove `ai` Package)

**Goal:** Remove `ai` package dependency from MCP tools while preserving functionality.

**Steps:**

1. **Refactor tool definitions in `src/services/ai/tools/`**
   - Replace `import { tool } from 'ai'` with plain Zod schemas
   - Convert `tool({ inputSchema, execute })` to separate schema + function
   - Files to update:
     - `fillScaffoldingTool.ts`
     - `checkScaffoldingTool.ts`
     - `initializeContextTool.ts`
     - `scaffoldPlanTool.ts`
     - `readFileTool.ts`
     - `listFilesTool.ts`
     - `analyzeSymbolsTool.ts`
     - `getFileStructureTool.ts`
     - `searchCodeTool.ts`
     - `getCodebaseMapTool.ts`
   - Owner: Feature Developer

2. **Update `src/services/ai/tools/index.ts`**
   - Remove `import type { ToolSet } from 'ai'`
   - Remove `getCodeAnalysisTools()` function (no longer needed)
   - Export schemas and execute functions directly
   - Owner: Feature Developer

3. **Update MCP gateway imports**
   - Update `src/services/mcp/gateway/context.ts` to use new exports
   - Update other gateways that import from tools
   - Owner: Feature Developer

4. **Relocate tools directory**
   - Move `src/services/ai/tools/` to `src/services/mcp/tools/`
   - Update all imports
   - Owner: Feature Developer

**Note:** MCP tools return context/structure for the **host AI tool** to generate content. The actual LLM calls happen in Claude Code, Cursor, etc. - not in the MCP server. This is why we can remove the `ai` package entirely.

**Commit Checkpoint:**
```bash
git commit -m "refactor(mcp): remove ai package dependency from tools"
```

### Phase 3 — MCP Enhancements (Optional)

**Steps:**

1. **Verify existing fill actions work without AI SDK**
   - `context.fill` already returns context for host AI to fill
   - `context.fillSingle` already returns structure guidance
   - No changes needed - tools are already "host-AI-powered"
   - Owner: Feature Developer

2. **Update tool descriptions for clarity**
   - Make it clear tools return context, not AI-generated content
   - Update schema descriptions
   - Owner: Feature Developer

**Commit Checkpoint:**
```bash
git commit -m "docs(mcp): clarify tools return context for host AI"
```

### Phase 4 — CLI Simplification

**Commit Checkpoint:**
```bash
git commit -m "feat(mcp): enhance tools with AI-powered actions"
```

### Phase 4 — CLI Simplification

**Steps:**

1. **Remove AI-powered commands from CLI**
   - Remove `fill` command
   - Remove `update` command
   - Remove `start` command
   - Remove `--fill` flag from `plan` command
   - Remove `skill fill`, `skill create`, `skill export` subcommands
   - Owner: Feature Developer

2. **Remove AI provider options**
   - Remove `--provider` global option
   - Remove `--model` global option
   - Remove `--api-key` global option
   - Remove provider selection from interactive menu
   - Owner: Feature Developer

3. **Remove AI services and infrastructure**
   - Delete `src/services/ai/agents/` directory (agents no longer used)
   - Delete `src/services/ai/aiSdkClient.ts`
   - Delete `src/services/ai/providerFactory.ts`
   - Delete `src/services/ai/agentEvents.ts`
   - Delete `src/services/fill/` directory
   - Delete `src/services/update/` directory
   - Delete `src/services/start/` directory
   - Delete `src/services/baseLLMClient.ts`
   - Delete `src/services/llmClientFactory.ts`
   - Delete `src/services/shared/llmConfig.ts`
   - **Keep:** `src/services/mcp/tools/` (refactored in Phase 2)
   - Owner: Feature Developer

4. **Update package.json**
   - Remove AI SDK dependencies: `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/openai`, `ai`
   - Update version (major bump for breaking change)
   - Owner: Feature Developer

5. **Update remaining services**
   - Simplify `PlanService` to scaffold only
   - Remove AI references from `SkillService`
   - Clean up imports across codebase
   - Owner: Feature Developer

6. **Update help text and documentation**
   - Update CLI help messages
   - Update README
   - Add migration guide
   - Owner: Feature Developer

**Commit Checkpoint:**
```bash
git commit -m "feat(cli)!: remove AI provider support, CLI is now utility-only

BREAKING CHANGE: AI-powered commands removed from CLI.
Use MCP tools for AI features: fill, update, plan --fill, skill fill.
Install MCP: ai-context mcp:install <tool>"
```

### Phase 5 — Validation & Migration

**Steps:**

1. **Update test suite**
   - Remove tests for AI-powered commands
   - Remove tests for AI infrastructure
   - Update integration tests
   - Ensure utility commands still work
   - Owner: Test Writer

2. **Create migration guide**
   - Document removed commands
   - Provide MCP alternatives
   - Include configuration migration
   - Owner: Feature Developer

3. **Update MCP installation instructions**
   - Emphasize MCP as the AI interface
   - Update tool-specific guides
   - Owner: Feature Developer

4. **Code review**
   - Review all changes
   - Verify no AI code remains in CLI
   - Verify MCP tools work correctly
   - Owner: Code Reviewer

**Commit Checkpoint:**
```bash
git commit -m "test: update tests for utility-only CLI"
git commit -m "docs: add migration guide for AI features to MCP"
```

## Command Migration Guide

### For Users

| Old CLI Command | New MCP Tool | MCP Action |
| --- | --- | --- |
| `ai-context fill` | `context` tool | `fill` action |
| `ai-context fill --file <path>` | `context` tool | `fillSingle` action |
| `ai-context plan --fill` | `plan` tool | `fill` action |
| `ai-context update` | `context` tool | `update` action |
| `ai-context start` | N/A | Use `init` + MCP `context.fill` |
| `ai-context skill fill` | `skill` tool | `fill` action |
| `ai-context skill create` | `skill` tool | `create` action |
| `ai-context skill export` | `skill` tool | `export` action |

### How to Access AI Features

1. Install MCP server in your AI tool:
   ```bash
   ai-context mcp:install claude
   ai-context mcp:install cursor
   ```

2. Use MCP tools in your AI tool's chat:
   ```
   "Use the context tool to fill documentation"
   "Use the plan tool to generate a plan for <feature>"
   "Use the skill tool to create a new skill"
   ```

## Risk Assessment

### Identified Risks

| Risk | Probability | Impact | Mitigation Strategy |
| --- | --- | --- | --- |
| Users depend on CLI AI commands | High | High | Clear migration guide, major version bump |
| MCP not installed by users | Medium | Medium | Prominent documentation, mcp:install command |
| MCP tools less convenient than CLI | Medium | Medium | Ensure MCP tools are well-documented |
| Breaking existing workflows | Medium | High | Deprecation warnings before removal |

### Dependencies

- **Internal:** MCP server, workflow services, scaffolding services
- **External:** MCP protocol compatibility with AI tools
- **Technical:** Host AI tools must support MCP

### Assumptions

- Users have access to an AI tool that supports MCP (Claude Code, Cursor, etc.)
- MCP tools can provide equivalent functionality to CLI commands
- Host AI tools provide LLM capabilities through MCP

## Rollback Plan

### Rollback Procedures

#### Phase 3 Rollback (if needed)
- Action: `git revert` all phase 3 commits
- Data Impact: None (code changes only)
- Estimated Time: < 1 hour

### Post-Rollback Actions
1. Document issues that caused rollback
2. Revise plan to address issues
3. Consider gradual deprecation instead of removal

## Evidence & Follow-up

**Artifacts to collect:**
- [ ] PR link with implementation
- [ ] Before/after bundle size comparison
- [ ] Migration guide document
- [ ] Updated README
- [ ] MCP tool documentation

**Follow-up:**
- Monitor user feedback on migration
- Consider CLI wrapper commands that invoke MCP (convenience layer)
- Evaluate if any AI features should return to CLI based on feedback
