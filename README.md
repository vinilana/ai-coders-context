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

## For automation

```bash
npx @ai-coders/context init .     # Create structure
npx @ai-coders/context fill .     # Fill with AI
npx @ai-coders/context update     # Update outdated docs
npx @ai-coders/context plan name  # Create work plan
```

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

### Available MCP Tools

Once configured, your AI assistant will have access to:

| Tool | Description |
|------|-------------|
| `buildSemanticContext` | Build optimized context for LLM prompts |
| `initializeContext` | Create `.context` scaffolding |
| `fillScaffolding` | Generate documentation content |
| `analyzeSymbols` | Analyze code symbols (classes, functions, etc.) |
| `searchCode` | Search for patterns across files |
| `getFileStructure` | Get repository directory structure |
| `scaffoldPlan` | Create work plans |

## Contributing

- [Development Guide](./AGENTS.md) — Development guidelines

## License

MIT © Vinícius Lana
