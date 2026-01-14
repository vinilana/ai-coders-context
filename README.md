# @ai-coders/context

[![npm version](https://badge.fury.io/js/@ai-coders%2Fcontext.svg)](https://www.npmjs.com/package/@ai-coders/context)
[![CI](https://github.com/vinilana/ai-coders-context/actions/workflows/ci.yml/badge.svg)](https://github.com/vinilana/ai-coders-context/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)


Context engineering for AI should be stupidly simple.

## Usage

```bash
npx @ai-coders/context
```

That's it. The wizard detects what needs to be done.

## What it does

1. **Creates documentation** — Structured docs from your codebase
2. **Generates playbooks** — Guides for AI agents (Claude, GPT, etc.)
3. **Keeps it updated** — Detects code changes and suggests updates

## Quick Start

```bash
npx @ai-coders/context start "my-feature"  # One command does it all
```

This single command:
1. Detects your tech stack (TypeScript, Python, etc.)
2. Creates documentation structure
3. Fills docs with AI (if API key available)
4. Starts a PREVC workflow with appropriate scale

## For automation

```bash
npx @ai-coders/context init .              # Create structure
npx @ai-coders/context fill .              # Fill with AI
npx @ai-coders/context update              # Update outdated docs
npx @ai-coders/context plan name           # Create work plan
npx @ai-coders/context workflow            # Manage PREVC workflow
npx @ai-coders/context report              # Visual progress dashboard
npx @ai-coders/context export-rules        # Export rules to AI tools
```

## PREVC Workflow System

A structured workflow for software development with 5 phases:

| Phase | Name | Description |
|-------|------|-------------|
| **P** | Planning | Discovery, requirements, specifications |
| **R** | Review | Architecture, technical decisions, design |
| **E** | Execution | Implementation, development |
| **V** | Validation | Tests, QA, code review |
| **C** | Confirmation | Deploy, documentation, handoff |

### Workflow Commands

```bash
npx @ai-coders/context workflow init "feature-name"  # Start new workflow
npx @ai-coders/context workflow status               # View current status
npx @ai-coders/context workflow advance              # Move to next phase
```

### Workflow Templates

Use templates to quickly start common workflows:

```bash
npx @ai-coders/context start "fix-login" --template hotfix   # Quick fix (E → V)
npx @ai-coders/context start "add-auth" --template feature   # Feature (P → R → E → V)
npx @ai-coders/context start "v2.0" --template mvp           # Full (P → R → E → V → C)
```

### Visual Dashboard

```bash
npx @ai-coders/context report
```

```
╭──────────────────────────────────────────────────╮
│                   my-feature                     │
│                    [MEDIUM]                      │
├──────────────────────────────────────────────────┤
│       ████████████████████░░░░░░░░░░░░░░░        │
│       Progress: 40% (2/5 phases)                 │
├──────────────────────────────────────────────────┤
│         ✓ P → ✓ R → ● E → ○ V → ○ C              │
│                     ↑ Current: Execution         │
╰──────────────────────────────────────────────────╯
```

### Export Rules (Bidirectional Sync)

Export your `.context/docs` rules to AI tool directories:

```bash
npx @ai-coders/context export-rules --preset all       # Export to all tools
npx @ai-coders/context export-rules --preset cursor    # Export to .cursorrules
npx @ai-coders/context export-rules --preset claude    # Export to CLAUDE.md
```

### Scale-Adaptive Routing

The system automatically detects project scale and adjusts the workflow:

| Scale | Phases | Use Case |
|-------|--------|----------|
| QUICK | E → V | Bug fixes, small tweaks |
| SMALL | P → E → V | Simple features |
| MEDIUM | P → R → E → V | Regular features |
| LARGE | P → R → E → V → C | Full products |
| ENTERPRISE | All + extras | Systems with compliance |

## Requirements

- Node.js 20+
- API key from a supported provider (for AI features)

## Supported Providers

| Provider | Environment Variable |
|----------|---------------------|
| OpenRouter | `OPENROUTER_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Google | `GOOGLE_API_KEY` |

## MCP Server Setup

This package includes an MCP (Model Context Protocol) server that provides AI coding assistants with powerful tools to analyze and document your codebase.

### Claude Code (CLI)

Add the MCP server using the Claude CLI:

```bash
claude mcp add ai-context -- npx @ai-coders/context mcp
```

Or configure manually in `~/.claude.json`:

```json
{
  "mcpServers": {
    "ai-context": {
      "command": "npx",
      "args": ["@ai-coders/context", "mcp"]
    }
  }
}
```

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "ai-context": {
      "command": "npx",
      "args": ["@ai-coders/context", "mcp"]
    }
  }
}
```

### Cursor AI

Create `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "ai-context": {
      "command": "npx",
      "args": ["@ai-coders/context", "mcp"]
    }
  }
}
```

### Windsurf

Add to your Windsurf MCP config (`~/.codeium/windsurf/mcp_config.json`):

```json
{
  "mcpServers": {
    "ai-context": {
      "command": "npx",
      "args": ["@ai-coders/context", "mcp"]
    }
  }
}
```

### Zed Editor

Add to your Zed settings (`~/.config/zed/settings.json`):

```json
{
  "context_servers": {
    "ai-context": {
      "command": {
        "path": "npx",
        "args": ["@ai-coders/context", "mcp"]
      }
    }
  }
}
```

### Cline (VS Code Extension)

Configure in Cline settings (VS Code → Settings → Cline → MCP Servers):

```json
{
  "mcpServers": {
    "ai-context": {
      "command": "npx",
      "args": ["@ai-coders/context", "mcp"]
    }
  }
}
```

### Codex CLI

Add to your Codex CLI config (`~/.codex/config.toml`):

```toml
[mcp_servers.ai-context]
command = "npx"
args = ["--yes", "@ai-coders/context@latest", "mcp"]
```

### Local Development

For local development, point directly to the built distribution:

```json
{
  "mcpServers": {
    "ai-context-dev": {
      "command": "node",
      "args": ["/path/to/ai-coders-context/dist/index.js", "mcp"]
    }
  }
}
```

### Available MCP Tools

Once configured, your AI assistant will have access to:

#### Context Tools

| Tool | Description |
|------|-------------|
| `buildSemanticContext` | Build optimized context for LLM prompts |
| `initializeContext` | Create `.context` scaffolding |
| `fillScaffolding` | Generate documentation content |
| `analyzeSymbols` | Analyze code symbols (classes, functions, etc.) |
| `searchCode` | Search for patterns across files |
| `getFileStructure` | Get repository directory structure |
| `scaffoldPlan` | Create work plans |

#### Workflow Tools

| Tool | Description |
|------|-------------|
| `workflowInit` | Initialize a PREVC workflow with scale detection |
| `workflowStatus` | Get current workflow status |
| `workflowAdvance` | Advance to the next phase |
| `workflowHandoff` | Handoff between roles with artifacts |
| `workflowCollaborate` | Start multi-agent collaboration session |
| `workflowCreateDoc` | Generate phase-specific documents |

#### Orchestration Tools

| Tool | Description |
|------|-------------|
| `orchestrateAgents` | Select agents by task, phase, or role |
| `getAgentSequence` | Get recommended agent handoff sequence |
| `getAgentDocs` | Get documentation relevant to an agent |
| `getPhaseDocs` | Get documentation for a PREVC phase |
| `listAgentTypes` | List all 14 available agent types |

#### Plan-Workflow Tools

| Tool | Description |
|------|-------------|
| `linkPlan` | Link a plan file to current workflow |
| `getLinkedPlans` | Get all linked plans for workflow |
| `getPlanDetails` | Get plan details with agent lineup |
| `getPlansForPhase` | Get plans for a PREVC phase |
| `updatePlanPhase` | Update plan phase status |
| `recordDecision` | Record a plan decision |
| `discoverAgents` | Discover all agents (built-in + custom) |
| `getAgentInfo` | Get metadata for a specific agent |

### Agent Types

The orchestration system maps tasks to specialized agents:

| Agent | Focus |
|-------|-------|
| `architect-specialist` | System architecture and patterns |
| `feature-developer` | New feature implementation |
| `bug-fixer` | Bug identification and fixes |
| `test-writer` | Test suites and coverage |
| `code-reviewer` | Code quality and best practices |
| `security-auditor` | Security vulnerabilities |
| `performance-optimizer` | Performance bottlenecks |
| `documentation-writer` | Technical documentation |
| `backend-specialist` | Server-side logic and APIs |
| `frontend-specialist` | User interfaces |
| `database-specialist` | Database solutions |
| `devops-specialist` | CI/CD and deployment |
| `mobile-specialist` | Mobile applications |
| `refactoring-specialist` | Code structure improvements |

## Documentation

- [User Guide](./docs/GUIDE.md) — Complete usage guide
- [Development Guide](./AGENTS.md) — Development guidelines

## License

MIT © Vinícius Lana
