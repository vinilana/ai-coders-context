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
    name: "MCP Enhancement"
    prevc: "E"
    status: "pending"
  - id: "phase-3"
    name: "CLI Simplification"
    prevc: "E"
    status: "pending"
  - id: "phase-4"
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
└── AI Infrastructure (lives here)
    ├── Provider configuration (from host AI tool)
    ├── AI Agents (reused from current implementation)
    └── Tool implementations
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
│   └── tools/                       # Move to MCP if needed
│       ├── codeAnalysisTools.ts
│       └── scaffoldingTools.ts
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

### Phase 2 — MCP Enhancement

**Steps:**

1. **Enhance MCP context tool with fill actions**
   - Add `fill` action to generate documentation
   - Add `fillSingle` action for individual files
   - Implement using MCP's conversation context
   - Owner: Feature Developer

2. **Enhance MCP plan tool with AI fill**
   - Add `fill` action to generate plan content
   - Reuse planning logic from current PlanAgent
   - Owner: Feature Developer

3. **Enhance MCP skill tool with AI features**
   - Add `fill` action for skill descriptions
   - Add `create` action for custom skills
   - Owner: Feature Developer

4. **Update MCP tool documentation**
   - Document new actions in tool schemas
   - Update tool descriptions
   - Owner: Feature Developer

**Note:** MCP tools leverage the host AI tool's LLM capabilities through the MCP protocol, so no direct AI SDK integration is needed in the MCP server itself. The AI tool (Claude Code, Cursor, etc.) provides the LLM, and MCP tools provide structured operations.

**Commit Checkpoint:**
```bash
git commit -m "feat(mcp): enhance tools with AI-powered actions"
```

### Phase 3 — CLI Simplification

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
   - Delete `src/services/ai/` directory
   - Delete `src/services/fill/` directory
   - Delete `src/services/update/` directory
   - Delete `src/services/start/` directory
   - Delete `src/services/baseLLMClient.ts`
   - Delete `src/services/llmClientFactory.ts`
   - Delete `src/services/shared/llmConfig.ts`
   - Owner: Feature Developer

4. **Update package.json**
   - Remove AI SDK dependencies
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

### Phase 4 — Validation & Migration

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
