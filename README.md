# @ai-coders/context

[![npm version](https://badge.fury.io/js/@ai-coders%2Fcontext.svg)](https://www.npmjs.com/package/@ai-coders/context)
[![CI](https://github.com/vinilana/ai-coders-context/actions/workflows/ci.yml/badge.svg)](https://github.com/vinilana/ai-coders-context/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<img width="663" height="192" alt="image" src="https://github.com/user-attachments/assets/4b07f61d-6800-420a-ae91-6e952cbc790d" />


A lightweight CLI that scaffolds living documentation and AI-agent playbooks for any repository—no LLMs or API keys required. The generated structure gives teams a consistent starting point for knowledge sharing while keeping everything under version control.

## ⚙️ Requirements

- Node.js 20+ (we currently test on 20, 22, 23, and 24)

## ✨ What You Get

- 📚 `docs/` folder with a documentation index plus ready-to-edit guides (overview, architecture, workflow, testing)
- 🤖 `agents/` folder containing playbooks for common engineering agents and a handy index
- 🔁 Repeatable scaffolding that you can re-run as the project evolves
- 🧭 Repository-aware templates that highlight top-level directories for quick orientation
- 🧠 AI-ready templates that assistants can update using the `fill` command
- 🌐 **Multi-provider support** for OpenAI, Anthropic, Google, and OpenRouter
- ⚡ **Semantic context mode** using Tree-sitter for token-efficient LLM calls
- 📊 **Real-time progress** showing agent activity and tool usage
- 🔌 **MCP Server** for seamless Claude Code integration
- 🔗 **Passthrough mode** for external AI agents via stdin/stdout JSON

## 📦 Installation

Use `npx` to run the CLI without installing globally:

```bash
npx @ai-coders/context
```

Or add it to your dev dependencies:

```bash
npm install --save-dev @ai-coders/context
```

## 🚀 Quick Start

```bash
# Launch the interactive wizard
npx @ai-coders/context


# Scaffold docs and agents into ./.context
npx @ai-coders/context init ./my-repo

# Only generate docs
npx @ai-coders/context init ./my-repo docs

# Only generate agent playbooks, with a custom output directory
npx @ai-coders/context init ./my-repo agents --output ./knowledge-base

# Fill docs and agents with the repo context (preview the first 3 updates)
npx @ai-coders/context fill ./my-repo --output ./.context --limit 3

# Use a specific provider (OpenAI, Anthropic, Google, or OpenRouter)
npx @ai-coders/context fill ./my-repo --provider anthropic --model claude-sonnet-4-20250514

# Disable semantic mode for more thorough tool-based exploration
npx @ai-coders/context fill ./my-repo --no-semantic

# Specify languages for semantic analysis
npx @ai-coders/context fill ./my-repo --languages typescript,python,go

# Draft a collaboration plan seeded with agent and doc touchpoints
npx @ai-coders/context plan release-readiness --output ./.context

# Let the LLM enrich an existing plan with the latest context
npx @ai-coders/context plan release-readiness --output ./.context --fill --dry-run
```

> ℹ️ The CLI pings npm for fresh releases at startup. Set `AI_CONTEXT_DISABLE_UPDATE_CHECK=true` to skip the check.

After running the command, inspect the generated structure:

```
.context/
├── agents/
│   ├── README.md
│   ├── code-reviewer.md
│   └── ...
└── docs/
    ├── README.md
    ├── architecture.md
    └── ...
```

Customize the Markdown files to reflect your project's specifics and commit them alongside the code.

## 🌐 Multi-Provider Support

The `fill` and `plan` commands support multiple LLM providers:

| Provider | Models | Environment Variable |
|----------|--------|---------------------|
| OpenRouter | `x-ai/grok-4-fast`, `anthropic/claude-sonnet-4`, etc. | `OPENROUTER_API_KEY` |
| OpenAI | `gpt-4o`, `gpt-4-turbo`, etc. | `OPENAI_API_KEY` |
| Anthropic | `claude-sonnet-4-20250514`, `claude-opus-4-20250514`, etc. | `ANTHROPIC_API_KEY` |
| Google | `gemini-2.0-flash`, `gemini-1.5-pro`, etc. | `GOOGLE_API_KEY` |

The CLI auto-detects available API keys from environment variables. Override with `--provider` and `--model`:

```bash
# Use Anthropic's Claude
ANTHROPIC_API_KEY=sk-... npx @ai-coders/context fill . --provider anthropic

# Use OpenAI's GPT-4
OPENAI_API_KEY=sk-... npx @ai-coders/context fill . --provider openai --model gpt-4o
```

## ⚡ Semantic Context Mode

By default, the `fill` command uses **semantic context mode** which pre-computes codebase analysis using Tree-sitter before calling the LLM. This is:

- **Faster**: Single LLM call instead of multi-step tool exploration
- **Token-efficient**: Pre-computed context instead of back-and-forth tool calls
- **Consistent**: Same analysis applied to all files

To use the more thorough tool-based exploration (where the LLM explores the codebase step by step), use `--no-semantic`:

```bash
npx @ai-coders/context fill . --no-semantic
```

### Language Selection

Specify which programming languages to analyze for semantic context:

```bash
# Analyze only TypeScript and Python
npx @ai-coders/context fill . --languages typescript,python

# Default languages: typescript, javascript, python, go
```

Supported languages: `typescript`, `javascript`, `python`, `go`, `rust`, `java`, `cpp`, `c_sharp`, `ruby`, `php`

## 🧠 Guided Updates for AI Assistants

Need help filling in the scaffold? Use [`prompts/update_scaffold_prompt.md`](./prompts/update_scaffold_prompt.md) as the canonical instruction set for any LLM or CLI agent. Share that prompt verbatim with your assistant to keep updates consistent across teams.

### Available Doc Guides & Agent Types

The scaffold includes the following guides and playbooks out of the box:

- Docs: `project-overview`, `architecture`, `development-workflow`, `testing-strategy`, `glossary`, `data-flow`, `security`, `tooling`
- Agents: `code-reviewer`, `bug-fixer`, `feature-developer`, `refactoring-specialist`, `test-writer`, `documentation-writer`, `performance-optimizer`, `security-auditor`, `backend-specialist`, `frontend-specialist`, `architect-specialist`

## 🛠 Commands

### `init`
Scaffold documentation and/or agent playbooks.

```
Usage: ai-context init <repo-path> [type]

Arguments:
  repo-path               Path to the repository you want to scan
  type                    "docs", "agents", or "both" (default)

Options:
  -o, --output <dir>      Output directory (default: ./.context)
  --exclude <patterns...> Glob patterns to skip during the scan
  --include <patterns...> Glob patterns to explicitly include
  --no-semantic           Disable semantic code analysis
  -v, --verbose           Print detailed progress information
  -h, --help              Display help for command
```

### `fill`
Use an LLM to refresh scaffolded docs and agent playbooks automatically.

```
Usage: ai-context fill <repo-path>

Options:
  -o, --output <dir>      Scaffold directory containing docs/ and agents/ (default: ./.context)
  -k, --api-key <key>     API key for the selected LLM provider
  -m, --model <model>     LLM model to use (default: x-ai/grok-4-fast)
  -p, --provider <name>   Provider: openrouter, openai, anthropic, or google
      --base-url <url>    Custom base URL for provider APIs
      --prompt <file>     Instruction prompt to follow (optional; uses bundled instructions when omitted)
      --limit <number>    Maximum number of files to update in one run
      --no-semantic       Disable semantic context mode (use tool-based exploration)
      --languages <langs> Programming languages to analyze (e.g., typescript,python,go)
      --exclude <patterns...> Glob patterns to exclude from repository analysis
      --include <patterns...> Glob patterns to include during analysis
  -v, --verbose           Print detailed progress information
  -h, --help              Display help for command
```

Under the hood, the command uses specialized agents (DocumentationAgent, PlaybookAgent) that analyze your codebase and generate context-aware documentation. Real-time progress is displayed showing which agent is working and what tools are being used.

### `plan`
Create a collaboration plan that links documentation guides and agent playbooks, or fill an existing plan with LLM assistance.

```
Usage: ai-context plan <plan-name>

Options:
  -o, --output <dir>      Scaffold directory containing docs/ and agents/ (default: ./.context)
      --title <title>     Custom title for the plan document
      --summary <text>    Seed the plan with a short summary or goal statement
  -f, --force             Overwrite the plan if it already exists (scaffold mode)
      --fill              Use an LLM to fill or update the plan instead of scaffolding
  -r, --repo <path>       Repository root to summarize for additional context (fill mode)
  -k, --api-key <key>     API key for the selected LLM provider (fill mode)
  -m, --model <model>     LLM model to use (default: x-ai/grok-4-fast)
  -p, --provider <name>   Provider: openrouter, openai, anthropic, or google
      --base-url <url>    Custom base URL for provider APIs
      --prompt <file>     Instruction prompt to follow (optional; uses bundled instructions when omitted)
      --dry-run           Preview changes without writing files
      --no-semantic       Disable semantic context mode
      --include <patterns...>  Glob patterns to include during repository analysis
      --exclude <patterns...>  Glob patterns to exclude from repository analysis
  -v, --verbose           Print detailed progress information
  -h, --help              Display help for command
```

In scaffold mode the command creates `.context/plans/<plan-name>.md`, keeps a `plans/README.md` index, and reminds contributors to consult the agent handbook before delegating work to an AI assistant. In fill mode it will scaffold the plan automatically if it does not exist, then read the plan plus its referenced docs and agent playbooks, send that context to the LLM, and either preview or write the updated Markdown.

💡 Tip: run `npx @ai-coders/context` with no arguments to enter an interactive mode that guides you through scaffold and LLM-fill options.

Prefer driving the update elsewhere? Just grab [`prompts/update_scaffold_prompt.md`](./prompts/update_scaffold_prompt.md) and run it in your favorite playground or agent host. When you're ready to automate, drop your API key in `.env` (for example `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`) and let `fill` handle the edits inline.

### `mcp`
Start an MCP (Model Context Protocol) server for Claude Code integration. This exposes code analysis tools and semantic context as MCP resources.

```
Usage: ai-context mcp

Options:
  -r, --repo-path <path>  Default repository path for tools
  -v, --verbose           Enable verbose logging to stderr
  -h, --help              Display help for command
```

**Available MCP Tools:**
- `readFile` - Read file contents from the filesystem
- `listFiles` - List files matching a glob pattern
- `analyzeSymbols` - Extract code symbols (classes, functions, interfaces) using Tree-sitter
- `getFileStructure` - Get the directory structure of a repository
- `searchCode` - Search for code patterns using regex
- `buildSemanticContext` - Build optimized semantic context for LLM prompts
- `checkScaffolding` - Check if `.context` scaffolding exists (returns granular status for docs, agents, plans)
- `initializeContext` - Initialize `.context` scaffolding (create docs/agents directories and files)
- `scaffoldPlan` - Create a plan template in `.context/plans/`

**Available MCP Resources:**
- `context://codebase/{contextType}` - Semantic context (documentation, playbook, plan, compact)
- `file://{path}` - Read file contents

### `serve`
Start a passthrough server for external AI agents. Accepts JSON commands via stdin and responds via stdout.

```
Usage: ai-context serve

Options:
  -r, --repo-path <path>  Default repository path for tools
  -f, --format <format>   Output format: json or jsonl (default: jsonl)
  -v, --verbose           Enable verbose logging to stderr
  -h, --help              Display help for command
```

**Available Methods:**
- `capabilities` - List server capabilities
- `tool.list` - List available tools
- `tool.call` - Execute a tool
- `context.build` - Build semantic context
- `agent.run` - Run an agent (requires LLM config)

## 🔌 Claude Code Integration (MCP)

The easiest way to use this package with Claude Code is through the MCP server. Add the following to your Claude Code settings:

**~/.claude/settings.json:**
```json
{
  "mcpServers": {
    "ai-context": {
      "command": "npx",
      "args": ["@ai-coders/context", "mcp", "-r", "/path/to/your/repo"]
    }
  }
}
```

Once configured, Claude Code will have access to all code analysis tools:

```
# Claude Code can now use these tools:
- readFile: Read any file in your repository
- listFiles: Find files by glob patterns
- analyzeSymbols: Extract code structure with Tree-sitter
- searchCode: Search for patterns across the codebase
- buildSemanticContext: Get optimized context for any task
- checkScaffolding: Check if .context scaffolding exists
- initializeContext: Initialize .context scaffolding
- scaffoldPlan: Create plan templates
```

### Example MCP Usage in Claude Code

When working with Claude Code, you can ask it to:

- "Use the ai-context tools to analyze the authentication module"
- "Build a semantic context for the src/services directory"
- "List all TypeScript files in the project and analyze their exports"

## 🔗 External AI Agent Integration (Passthrough)

For AI agents that don't support MCP, use the passthrough server with JSON communication:

```bash
# Start the server
npx @ai-coders/context serve -r ./my-project

# Send commands via stdin
echo '{"id":"1","method":"capabilities"}' | npx @ai-coders/context serve
```

**Example: List files**
```bash
echo '{"id":"1","method":"tool.call","params":{"tool":"listFiles","args":{"pattern":"**/*.ts"}}}' \
  | npx @ai-coders/context serve -r ./my-project
```

**Example: Build semantic context**
```bash
echo '{"id":"1","method":"context.build","params":{"repoPath":"./","contextType":"documentation"}}' \
  | npx @ai-coders/context serve
```

**Response format:**
```json
{
  "id": "1",
  "success": true,
  "result": { /* tool output */ }
}
```

**Notifications (streamed during execution):**
```json
{"type": "progress", "data": {"step": 1, "message": "Analyzing..."}}
{"type": "tool_call", "data": {"toolName": "readFile", "args": {"filePath": "..."}}}
{"type": "tool_result", "data": {"toolName": "readFile", "success": true}}
```

## 🔧 Environment Variables

```bash
# Provider selection (auto-detected from available keys)
AI_CONTEXT_PROVIDER=openrouter|openai|anthropic|google

# API Keys (at least one required for fill/plan --fill)
OPENROUTER_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GOOGLE_API_KEY=...

# Optional model override per provider
OPENROUTER_MODEL=x-ai/grok-4-fast
OPENAI_MODEL=gpt-4o
ANTHROPIC_MODEL=claude-sonnet-4-20250514
GOOGLE_MODEL=gemini-2.0-flash

# CLI settings
AI_CONTEXT_LANG=en|pt-BR
AI_CONTEXT_DISABLE_UPDATE_CHECK=true
```

## 🧰 Local Development

```bash
git clone https://github.com/vinilana/ai-coders-context.git
cd ai-coders-context
npm install
npm run build
npm run test
```

During development you can run the CLI directly against TypeScript sources:

```bash
npm run dev -- ./path/to/repo
```

## 🤝 Contributing

See [`AGENTS.md`](./AGENTS.md) for contributor guidelines, coding standards, and release tips. Pull requests are welcome!

## 📄 License

MIT © Vinícius Lana
