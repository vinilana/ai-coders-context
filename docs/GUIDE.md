# @ai-coders/context — Full Guide

A CLI that scaffolds living documentation and AI-agent playbooks for any repository. The generated structure gives teams a consistent starting point for knowledge sharing while keeping everything under version control.

## What You Get

- 📚 `docs/` folder with documentation guides (overview, architecture, workflow, testing)
- 🤖 `agents/` folder with playbooks for engineering agents
- ⚡ Semantic analysis using Tree-sitter for efficient LLM calls
- 🔌 MCP Server for Claude Code integration
- 🔗 Passthrough mode for external AI agents

## Installation

```bash
# Run directly with npx (recommended)
npx @ai-coders/context

# Or install as dev dependency
npm install --save-dev @ai-coders/context
```

## Interactive Mode

Just run without arguments:

```bash
npx @ai-coders/context
```

The wizard will:
1. Detect your project state
2. Offer appropriate actions (init, fill, update, plan)
3. Guide you through configuration

## Commands

### `init` — Create Documentation Structure

```bash
npx @ai-coders/context init ./my-repo          # Both docs and agents
npx @ai-coders/context init ./my-repo docs     # Only docs
npx @ai-coders/context init ./my-repo agents   # Only agents
```

**Options:**
- `-o, --output <dir>` — Output directory (default: `./.context`)
- `--exclude <patterns...>` — Glob patterns to skip
- `--include <patterns...>` — Glob patterns to include
- `--no-semantic` — Disable semantic analysis
- `-v, --verbose` — Detailed output

### `fill` — Populate with AI

```bash
npx @ai-coders/context fill ./my-repo
npx @ai-coders/context fill ./my-repo --provider anthropic
npx @ai-coders/context fill ./my-repo --limit 3  # Preview first 3
```

**Options:**
- `-k, --api-key <key>` — API key for LLM provider
- `-m, --model <model>` — Model to use
- `-p, --provider <name>` — Provider (openrouter, openai, anthropic, google)
- `--base-url <url>` — Custom API base URL
- `--prompt <file>` — Custom instruction prompt
- `--limit <number>` — Max files to update
- `--no-semantic` — Use tool-based exploration
- `--languages <langs>` — Languages to analyze (e.g., typescript,python)
- `-v, --verbose` — Detailed output

### `update` — Refresh Outdated Docs

```bash
npx @ai-coders/context update              # Analyze and update
npx @ai-coders/context update --dry-run    # Preview only
npx @ai-coders/context update --days 7     # Look back 7 days
```

**Options:**
- `--days <number>` — Days to look back (default: 30)
- `--dry-run` — Show what would be updated
- `--no-git` — Use mtime instead of git
- Same LLM options as `fill`

### `plan` — Create Work Plans

```bash
npx @ai-coders/context plan release-readiness
npx @ai-coders/context plan feature-auth --fill  # Fill with LLM
```

**Options:**
- `--title <title>` — Custom title
- `--summary <text>` — Goal statement
- `-f, --force` — Overwrite existing plan
- `--fill` — Use LLM to populate
- `--dry-run` — Preview changes
- Same LLM options as `fill`

### `mcp` — Claude Code Server

```bash
npx @ai-coders/context mcp -r ./my-project
```

See [MCP.md](./MCP.md) for integration details.

### `serve` — External Agent Server

```bash
npx @ai-coders/context serve -r ./my-project
echo '{"id":"1","method":"capabilities"}' | npx @ai-coders/context serve
```

## Semantic Context Mode

By default, `fill` uses semantic analysis with Tree-sitter:

- **Faster** — Single LLM call instead of multi-step exploration
- **Efficient** — Pre-computed context reduces tokens
- **Consistent** — Same analysis for all files

Disable with `--no-semantic` for more thorough exploration.

### Supported Languages

`typescript`, `javascript`, `python`, `go`, `rust`, `java`, `cpp`, `c_sharp`, `ruby`, `php`

Specify with `--languages`:
```bash
npx @ai-coders/context fill . --languages typescript,python
```

### Optional LSP Enhancement

For deeper analysis, enable LSP integration:

```bash
npx @ai-coders/context fill . --use-lsp
```

LSP provides type inference, interface implementations, and cross-file references. Requires language servers:
- TypeScript/JavaScript: `typescript-language-server`
- Python: `pylsp`

## Doc Guides & Agent Types

**Docs:** project-overview, architecture, development-workflow, testing-strategy, glossary, data-flow, security, tooling

**Agents:** code-reviewer, bug-fixer, feature-developer, refactoring-specialist, test-writer, documentation-writer, performance-optimizer, security-auditor, backend-specialist, frontend-specialist, architect-specialist

## Output Structure

```
.context/
├── agents/
│   ├── README.md
│   ├── code-reviewer.md
│   └── ...
├── docs/
│   ├── README.md
│   ├── architecture.md
│   └── ...
└── plans/
    └── README.md
```

## Environment Variables

```bash
# Provider selection
AI_CONTEXT_PROVIDER=openrouter|openai|anthropic|google

# API Keys
OPENROUTER_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GOOGLE_API_KEY=...

# Model override
OPENROUTER_MODEL=x-ai/grok-4-fast
OPENAI_MODEL=gpt-4o
ANTHROPIC_MODEL=claude-sonnet-4-20250514
GOOGLE_MODEL=gemini-2.0-flash

# CLI settings
AI_CONTEXT_LANG=en|pt-BR
AI_CONTEXT_DISABLE_UPDATE_CHECK=true
```

## Local Development

```bash
git clone https://github.com/vinilana/ai-coders-context.git
cd ai-coders-context
npm install
npm run build
npm run test
npm run dev -- ./path/to/repo  # Run against TypeScript sources
```
