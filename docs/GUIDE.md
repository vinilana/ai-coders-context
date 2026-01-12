# AI Coders Context - User Guide

A comprehensive guide on how to use `@ai-coders/context` for AI-assisted software development.

## Table of Contents

- [Overview](#overview)
- [When to Use](#when-to-use)
- [Getting Started](#getting-started)
- [Core Features](#core-features)
- [PREVC Workflow](#prevc-workflow)
- [Agent Orchestration](#agent-orchestration)
- [MCP Integration](#mcp-integration)
- [Best Practices](#best-practices)

---

## Overview

`@ai-coders/context` is a context engineering tool that helps AI coding assistants understand your codebase better. It creates structured documentation, generates agent playbooks, and provides a workflow system for organized development.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Context Generation** | Creates `.context/` folder with docs and agent playbooks |
| **PREVC Workflow** | 5-phase structured development workflow |
| **Agent Orchestration** | Maps tasks to specialized AI agents |
| **MCP Server** | Integrates with Claude, Cursor, Windsurf, and more |

---

## When to Use

### Use This Tool When...

| Scenario | Command |
|----------|---------|
| Starting a new project | `npx @ai-coders/context init .` |
| Onboarding AI to your codebase | `npx @ai-coders/context fill .` |
| Documentation is outdated | `npx @ai-coders/context update` |
| Planning a new feature | `npx @ai-coders/context plan feature-name` |
| Starting structured development | `npx @ai-coders/context workflow init` |
| Need AI assistance in IDE | Configure MCP server |

### Decision Matrix

```
Need AI to understand my code?
├── Yes → Run `init` + `fill`
└── No  → Skip

Starting new feature/project?
├── Simple task → Use QUICK scale
├── Regular feature → Use MEDIUM scale
└── Large project → Use LARGE/ENTERPRISE scale

Using Claude/Cursor/Windsurf?
├── Yes → Configure MCP server
└── No  → Use CLI commands
```

---

## Getting Started

### Quick Start (Interactive)

```bash
npx @ai-coders/context
```

This launches the interactive wizard that guides you through all options.

### Quick Start (Automation)

```bash
# 1. Initialize context structure
npx @ai-coders/context init .

# 2. Fill with AI-generated content
npx @ai-coders/context fill .

# 3. Start a workflow (optional)
npx @ai-coders/context workflow init "my-feature"
```

### Project Structure After Init

```
your-project/
├── .context/
│   ├── docs/
│   │   ├── README.md           # Documentation index
│   │   ├── architecture.md     # System architecture
│   │   ├── data-flow.md        # Data flow documentation
│   │   └── glossary.md         # Domain terms
│   ├── agents/
│   │   ├── README.md           # Agent playbooks index
│   │   ├── code-reviewer.md    # Code review guidelines
│   │   ├── feature-developer.md # Feature development guide
│   │   └── ...                 # Other agent playbooks
│   └── workflow/
│       └── status.yaml         # PREVC workflow status
└── ...
```

---

## Core Features

### 1. Context Initialization

Creates the `.context/` structure with templates:

```bash
npx @ai-coders/context init .
```

**Options:**
- `--docs` - Only create documentation templates
- `--agents` - Only create agent playbooks
- `--both` - Create both (default)

### 2. Content Generation

Fills templates with AI-analyzed content:

```bash
npx @ai-coders/context fill .
```

**Requires:** API key from OpenRouter, OpenAI, Anthropic, or Google.

### 3. Update Detection

Checks for outdated documentation:

```bash
npx @ai-coders/context update
```

### 4. Plan Creation

Creates structured work plans:

```bash
npx @ai-coders/context plan "authentication-system"
```

Creates `.context/plans/authentication-system.md` with:
- Objectives
- Tasks breakdown
- Dependencies
- Acceptance criteria

---

## PREVC Workflow

A structured 5-phase development workflow that scales with your project.

### The 5 Phases

| Phase | Name | Focus | Roles |
|-------|------|-------|-------|
| **P** | Planning | Requirements, specifications | Planner, Designer |
| **R** | Review | Architecture, technical decisions | Architect |
| **E** | Execution | Implementation, coding | Developer |
| **V** | Validation | Testing, QA, code review | QA, Reviewer |
| **C** | Confirmation | Documentation, deployment | Documentor |

### Scale-Adaptive Routing

The workflow adapts to your project size:

| Scale | Phases | When to Use |
|-------|--------|-------------|
| **QUICK** | E → V | Bug fixes, small tweaks |
| **SMALL** | P → E → V | Simple features, minor additions |
| **MEDIUM** | P → R → E → V | Regular features |
| **LARGE** | P → R → E → V → C | Full products, major features |

### Workflow Commands

```bash
# Initialize a new workflow
npx @ai-coders/context workflow init "feature-name"

# Check current status
npx @ai-coders/context workflow status

# Advance to next phase
npx @ai-coders/context workflow advance

# Interactive workflow management
npx @ai-coders/context workflow
```

### Workflow Status File

Located at `.context/workflow/status.yaml`:

```yaml
project:
  name: "feature-authentication"
  scale: MEDIUM
  started: "2026-01-11T10:00:00Z"
  current_phase: E

phases:
  P:
    status: completed
    outputs:
      - path: ".context/workflow/docs/prd.md"
  R:
    status: completed
  E:
    status: in_progress
    role: desenvolvedor
  V:
    status: pending
  C:
    status: skipped
```

### Phase Transitions

```
Planning (P)
    │
    ▼ outputs: PRD, Tech Spec
Review (R)
    │
    ▼ outputs: Architecture, ADRs
Execution (E)
    │
    ▼ outputs: Code, Unit Tests
Validation (V)
    │
    ▼ outputs: Test Report, Approval
Confirmation (C)
    │
    ▼ outputs: Documentation, Changelog
```

---

## Agent Orchestration

The orchestration system maps tasks to specialized AI agents.

### Available Agents

| Agent | Specialty | Best For |
|-------|-----------|----------|
| `architect-specialist` | System design | Architecture decisions |
| `feature-developer` | New features | Implementing functionality |
| `bug-fixer` | Bug resolution | Fixing issues |
| `test-writer` | Testing | Writing test suites |
| `code-reviewer` | Code quality | Review and feedback |
| `security-auditor` | Security | Vulnerability detection |
| `performance-optimizer` | Performance | Speed optimization |
| `documentation-writer` | Documentation | Technical writing |
| `backend-specialist` | Server-side | APIs, services |
| `frontend-specialist` | Client-side | UI/UX implementation |
| `database-specialist` | Data layer | Schema, queries |
| `devops-specialist` | Operations | CI/CD, deployment |
| `mobile-specialist` | Mobile apps | iOS/Android development |
| `refactoring-specialist` | Code quality | Restructuring code |

### Agent-to-Phase Mapping

| Phase | Primary Agents |
|-------|----------------|
| **P** | architect-specialist, documentation-writer |
| **R** | architect-specialist, code-reviewer, security-auditor |
| **E** | feature-developer, backend-specialist, frontend-specialist |
| **V** | test-writer, code-reviewer, security-auditor |
| **C** | documentation-writer, devops-specialist |

### Task-Based Selection

The orchestrator selects agents based on task keywords:

```
"fix authentication bug" → bug-fixer, security-auditor
"implement payment API" → feature-developer, backend-specialist
"optimize database queries" → performance-optimizer, database-specialist
"add unit tests" → test-writer
```

---

## MCP Integration

Connect with AI coding assistants via Model Context Protocol.

### Setup for Different Tools

#### Claude Code (CLI)

```bash
claude mcp add ai-context -- npx @ai-coders/context mcp
```

#### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

#### Cursor AI

Create `.cursor/mcp.json` in your project:

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

#### Local Development

For developing/testing locally:

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

#### Context Tools

| Tool | Description |
|------|-------------|
| `buildSemanticContext` | Build optimized context for prompts |
| `initializeContext` | Create `.context` scaffolding |
| `fillScaffolding` | Generate documentation content |
| `analyzeSymbols` | Analyze code symbols |
| `searchCode` | Search patterns across files |
| `getFileStructure` | Get directory structure |

#### Workflow Tools

| Tool | Description |
|------|-------------|
| `workflowInit` | Initialize PREVC workflow |
| `workflowStatus` | Get current status |
| `workflowAdvance` | Move to next phase |
| `workflowHandoff` | Transfer between roles |
| `workflowCollaborate` | Multi-agent collaboration |
| `workflowCreateDoc` | Generate phase documents |

#### Orchestration Tools

| Tool | Description |
|------|-------------|
| `orchestrateAgents` | Select agents for task/phase/role |
| `getAgentSequence` | Get agent handoff order |
| `getAgentDocs` | Get docs for an agent |
| `getPhaseDocs` | Get docs for a phase |
| `listAgentTypes` | List all agent types |

---

## Best Practices

### 1. Start with Context

Always initialize context before asking AI for help:

```bash
npx @ai-coders/context init . && npx @ai-coders/context fill .
```

### 2. Choose the Right Scale

| Project Type | Scale | Example |
|--------------|-------|---------|
| Hotfix | QUICK | "Fix typo in login" |
| Small feature | SMALL | "Add password reset" |
| Regular feature | MEDIUM | "Implement user dashboard" |
| Major feature | LARGE | "Build payment system" |
| New product | ENTERPRISE | "Create microservices platform" |

### 3. Keep Documentation Updated

Run periodically:

```bash
npx @ai-coders/context update
```

### 4. Use Plans for Complex Work

Before starting complex features:

```bash
npx @ai-coders/context plan "feature-name"
```

### 5. Follow Phase Outputs

Each phase should produce specific outputs:

| Phase | Expected Outputs |
|-------|------------------|
| P | PRD, Tech Spec, Requirements |
| R | Architecture doc, ADRs |
| E | Code, Unit tests |
| V | Test report, Review approval |
| C | Documentation, Changelog |

### 6. Leverage Agent Specialization

Match tasks to appropriate agents:

- Architecture decisions → `architect-specialist`
- Bug fixes → `bug-fixer`
- New features → `feature-developer`
- Security concerns → `security-auditor`

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "No API key found" | Set `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GOOGLE_API_KEY` |
| "Context folder not found" | Run `npx @ai-coders/context init .` |
| "Workflow not initialized" | Run `npx @ai-coders/context workflow init "name"` |
| MCP tools not appearing | Restart your IDE after configuring MCP |

### Getting Help

- [GitHub Issues](https://github.com/vinilana/ai-coders-context/issues)
- Run `npx @ai-coders/context --help` for CLI options

---

## Quick Reference

```bash
# Interactive mode
npx @ai-coders/context

# Initialize
npx @ai-coders/context init .

# Fill with AI
npx @ai-coders/context fill .

# Update outdated docs
npx @ai-coders/context update

# Create plan
npx @ai-coders/context plan "feature-name"

# Workflow management
npx @ai-coders/context workflow init "name"
npx @ai-coders/context workflow status
npx @ai-coders/context workflow advance

# Start MCP server
npx @ai-coders/context mcp
```
