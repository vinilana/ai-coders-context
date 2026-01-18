# @ai-coders/context

[![npm version](https://badge.fury.io/js/@ai-coders%2Fcontext.svg)](https://www.npmjs.com/package/@ai-coders/context)
[![CI](https://github.com/vinilana/ai-coders-context/actions/workflows/ci.yml/badge.svg)](https://github.com/vinilana/ai-coders-context/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**The Ultimate MCP for AI Agent Orchestration, Context Engineering, and Spec-Driven Development.**
Context engineering for AI now is stupidly simple.

Stop letting LLMs run on autopilot. PREVC is a universal process that improves AI output through 5 simple steps: **Planning, Review, Execution, Validation, and Confirmation**. Context-oriented. Spec-driven. No guesswork.

## The Problem

Every AI coding tool invented its own way to organize context:

```
.cursor/rules/          # Cursor
.claude/                # Claude Code
.windsurf/rules/        # Windsurf
.github/agents/         # Copilot
.cline/                 # Cline
.agent/rules/           # Google Antigravity
.trae/rules/            # Trae AI
AGENTS.md               # Codex
```

Using multiple tools? Enjoy duplicating your rules, agents, and documentation across 8 different formats. Context fragmentation is real.

## The Solution

One `.context/` directory. Works everywhere.

```
.context/
├── docs/           # Your documentation (architecture, patterns, decisions)
├── agents/         # Agent playbooks (code-reviewer, feature-developer, etc.)
├── plans/          # Work plans linked to PREVC workflow
└── skills/         # On-demand expertise (commit-message, pr-review, etc.)
```

Export to any tool.
**Write once. Use anywhere. No boilerplate.**


## Youtube video
[![Watch the video](https://img.youtube.com/vi/p9uV3CeLaKY/0.jpg)](https://www.youtube.com/watch?v=p9uV3CeLaKY)

## Connect with Us

Built by [AI Coders Academy](http://aicoders.academy/) — Learn AI-assisted development and become a more productive developer.

- [AI Coders Academy](http://aicoders.academy/) — Courses and resources for AI-powered coding
- [YouTube Channel](https://www.youtube.com/@aicodersacademy) — Tutorials, demos, and best practices
- [Connect with Vini](https://www.linkedin.com/in/viniciuslanadepaula/) — Creator of @ai-coders/context


## Why PREVC?

LLMs produce better results when they follow a structured process instead of generating code blindly. PREVC ensures:

- **Specifications before code** — AI understands what to build before building it
- **Context awareness** — Each phase has the right documentation and agent
- **Human checkpoints** — Review and validate at each step, not just at the end
- **Reproducible quality** — Same process, consistent results across projects

## Usage

```bash
npx @ai-coders/context
```

That's it. The wizard detects what needs to be done.


PT-BR Tutorial
https://www.youtube.com/watch?v=5BPrfZAModk

## What it does

1. **Creates documentation** — Structured docs from your codebase (architecture, data flow, decisions)
2. **Generates agent playbooks** — 14 specialized AI agents (code-reviewer, bug-fixer, architect, etc.)
3. **Manages workflows** — PREVC process with scale detection and visual dashboards
4. **Provides skills** — On-demand expertise (commit messages, PR reviews, security audits)
5. **Syncs everywhere** — Export to Cursor, Claude, Copilot, Windsurf, Cline, Codex, Antigravity, Trae, and more
6. **Keeps it updated** — Detects code changes and suggests documentation updates

## Quick Start

1. Install the MCP
2. Prompt to the agent:
```bash
init the context
```
3. This will setup the context and fill it according the the codebase
4. With the context ready prompt
```bash
plan [YOUR TASK HERE] using ai-context
```
5. After planned, prompt
```bash
start the workflow
```
6. That's it!

## PREVC Workflow System

A universal 5-phase process designed to improve LLM output quality through structured, spec-driven development:

| Phase | Name | Purpose |
|-------|------|---------|
| **P** | Planning | Define what to build. Gather requirements, write specs, identify scope. No code yet. |
| **R** | Review | Validate the approach. Architecture decisions, technical design, risk assessment. |
| **E** | Execution | Build it. Implementation follows the approved specs and design. |
| **V** | Validation | Verify it works. Tests, QA, code review against original specs. |
| **C** | Confirmation | Ship it. Documentation, deployment, stakeholder handoff. |

### The Problem with Autopilot AI

Most AI coding workflows look like this:
```
User: "Add authentication"
AI: *generates 500 lines of code*
User: "That's not what I wanted..."
```

PREVC fixes this:
```
P: What type of auth? OAuth, JWT, session? What providers?
R: Here's the architecture. Dependencies: X, Y. Risks: Z. Approve?
E: Implementing approved design...
V: All 15 tests pass. Security audit complete.
C: Deployed. Docs updated. Ready for review.
```

## Documentation

- [User Guide](./docs/GUIDE.md) — Complete usage guide


### Scale-Adaptive Routing

The system automatically detects project scale and adjusts the workflow:

| Scale | Phases | Use Case |
|-------|--------|----------|
| QUICK | E → V | Bug fixes, small tweaks |
| SMALL | P → E → V | Simple features |
| MEDIUM | P → R → E → V | Regular features |
| LARGE | P → R → E → V → C | Complex systems, compliance |

## Requirements for the CLI

- Node.js 20+
- API key from a supported provider (for AI features)

**If you are using throught MCP you don't need to setup an API key from a supported provider, your AI agent will use it's own LLM.**


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

### Google Antigravity

Add to your Antigravity MCP config (`~/.gemini/mcp_config.json`):

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

### Trae AI

Add to your Trae AI MCP config (Settings > MCP Servers):

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
| `getCodebaseMap` | Get structured codebase data (stack, symbols, architecture) |
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

#### Skill Tools

| Tool | Description |
|------|-------------|
| `listSkills` | List all available skills (built-in + custom) |
| `getSkillContent` | Get full SKILL.md content by slug |
| `getSkillsForPhase` | Get skills relevant to a PREVC phase |
| `scaffoldSkills` | Generate skill files in .context/skills/ |
| `fillSkills` | Fill skills with AI-generated project-specific content |
| `exportSkills` | Export skills to Claude/Gemini/Codex directories |

#### Utility Tools

| Tool | Description |
|------|-------------|
| `projectStart` | Unified setup: scaffolding + fill + workflow init |
| `projectReport` | Visual progress report for PREVC workflow |
| `exportRules` | Export context rules to AI tool directories |
| `detectStack` | Detect project technology stack |

### Skills (On-Demand Expertise)

Skills are task-specific procedures that AI agents activate when needed:

| Skill | Description | Phases |
|-------|-------------|--------|
| `commit-message` | Generate conventional commits | E, C |
| `pr-review` | Review PRs against standards | R, V |
| `code-review` | Code quality review | R, V |
| `test-generation` | Generate test cases | E, V |
| `documentation` | Generate/update docs | P, C |
| `refactoring` | Safe refactoring steps | E |
| `bug-investigation` | Bug investigation flow | E, V |
| `feature-breakdown` | Break features into tasks | P |
| `api-design` | Design RESTful APIs | P, R |
| `security-audit` | Security review checklist | R, V |

```bash
npx @ai-coders/context skill init           # Initialize skills
npx @ai-coders/context skill fill           # Fill skills with AI (project-specific content)
npx @ai-coders/context skill list           # List available skills
npx @ai-coders/context skill export         # Export to AI tools
npx @ai-coders/context skill create my-skill # Create custom skill
```

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


## License

MIT © Vinícius Lana
