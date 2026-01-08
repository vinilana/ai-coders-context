# MCP Setup Guide for AI Coding Tools

This guide covers how to configure `@ai-coders/context` as an MCP (Model Context Protocol) server for various AI coding tools. MCP enables AI assistants to access code analysis tools, semantic context, and scaffolding capabilities.

## Table of Contents

- [Claude Code](#claude-code)
- [Gemini CLI](#gemini-cli)
- [Cursor AI](#cursor-ai)
- [VS Code (GitHub Copilot)](#vs-code-github-copilot)
- [OpenAI Codex CLI](#openai-codex-cli)
- [TRAE AI](#trae-ai)
- [Antigravity](#antigravity)
- [Available MCP Tools](#available-mcp-tools)

---

## Claude Code

Claude Code uses MCP servers configured in `~/.claude/settings.json`.

**Configuration:**

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

**References:**
- [Claude Code MCP Documentation](https://docs.anthropic.com/claude-code/docs/mcp)

---

## Gemini CLI

Gemini CLI supports MCP servers via `~/.gemini/settings.json` or project-level `.gemini/settings.json`.

### Option 1: Manual Configuration

**~/.gemini/settings.json:**

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

### Option 2: Using CLI Command

```bash
gemini mcp add ai-context -- npx @ai-coders/context mcp -r /path/to/your/repo
```

### Configuration Options

| Option | Description |
|--------|-------------|
| `command` | The command to execute (required) |
| `args` | Arguments to pass to the command |
| `trust` | Set `true` to auto-approve tool calls in trusted workspaces |

**References:**
- [Gemini CLI MCP Documentation](https://geminicli.com/docs/tools/mcp-server/)
- [Gemini CLI Configuration](https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/configuration.md)

---

## Cursor AI

Cursor supports MCP servers via project-level `.cursor/mcp.json` or global `~/.cursor/mcp.json`.

### Project-Level Configuration

Create `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "ai-context": {
      "command": "npx",
      "args": ["@ai-coders/context", "mcp", "-r", "."]
    }
  }
}
```

### Global Configuration

Create `~/.cursor/mcp.json` for all projects:

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

### Using Environment Variables

```json
{
  "mcpServers": {
    "ai-context": {
      "command": "npx",
      "args": ["@ai-coders/context", "mcp", "-r", "."],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

### Enabling MCP in Cursor

1. Open **Settings** > **Cursor Settings**
2. Find **MCP Servers** in the sidebar
3. Enable MCP and verify a green dot appears next to your server
4. Available tools will be listed under "Available Tools"

**References:**
- [Cursor MCP Documentation](https://docs.cursor.com/context/model-context-protocol)
- [Cursor MCP Directory](https://cursor.directory/mcp)

---

## VS Code (GitHub Copilot)

VS Code supports MCP servers for GitHub Copilot starting with VS Code 1.102+.

### Configuration via Settings

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Search for **"MCP: Add Server"**
3. Select **"Command (stdio)"** as the transport type
4. Enter the configuration details

### Manual Configuration

Add to your VS Code `settings.json`:

```json
{
  "mcp": {
    "servers": {
      "ai-context": {
        "command": "npx",
        "args": ["@ai-coders/context", "mcp", "-r", "${workspaceFolder}"]
      }
    }
  }
}
```

### Workspace Configuration

Create `.vscode/mcp.json` in your project:

```json
{
  "servers": {
    "ai-context": {
      "command": "npx",
      "args": ["@ai-coders/context", "mcp", "-r", "."]
    }
  }
}
```

### Verifying Installation

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run **"MCP: List Servers"**
3. Verify `ai-context` appears in the list

### Using MCP Tools in Copilot Chat

- Open Copilot Chat
- Select **Add Context** > **MCP Resources**
- Choose from available tools

**References:**
- [VS Code MCP Documentation](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [VS Code MCP Developer Guide](https://code.visualstudio.com/api/extension-guides/ai/mcp)

---

## OpenAI Codex CLI

Codex CLI uses TOML configuration in `~/.codex/config.toml`. This configuration is shared between the CLI and VS Code extension.

### Configuration

**~/.codex/config.toml:**

```toml
[mcp_servers.ai-context]
command = "npx"
args = ["@ai-coders/context", "mcp", "-r", "/path/to/your/repo"]

# Optional settings
startup_timeout_sec = 15
tool_timeout_sec = 120
enabled = true
```

### Using CLI Commands

```bash
# Add an MCP server
codex mcp add ai-context -- npx @ai-coders/context mcp -r /path/to/your/repo

# List configured servers
codex mcp list

# Remove a server
codex mcp remove ai-context
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `command` | (required) | Command to start the server |
| `args` | `[]` | Arguments for the command |
| `startup_timeout_sec` | `10` | Timeout for server startup |
| `tool_timeout_sec` | `60` | Timeout for tool execution |
| `enabled` | `true` | Set `false` to disable without removing |

**References:**
- [Codex CLI MCP Documentation](https://developers.openai.com/codex/mcp/)
- [Codex CLI Configuration](https://github.com/openai/codex/blob/main/docs/config.md)

---

## TRAE AI

TRAE (by ByteDance) supports MCP servers via `.mcp.json` configuration files.

### Project-Level Configuration

Create `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "ai-context": {
      "command": "npx",
      "args": ["@ai-coders/context", "mcp", "-r", "."]
    }
  }
}
```

### Global Configuration

Create `~/.trae/mcp.json` for all projects:

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

### Adding via UI

1. Click the **Settings** icon in the top right corner
2. Select **MCP** from the menu
3. Click **"Add MCP Servers"**
4. Enter the configuration details

### Using MCP in TRAE

After configuration, switch from the regular "Builder" to **"Builder with MCP"** agent to access the MCP tools.

### MCP Marketplace

TRAE includes a built-in MCP marketplace for discovering and installing servers with one click.

**References:**
- [TRAE MCP Documentation](https://docs.trae.ai/ide/model-context-protocol)

---

## Antigravity

Google Antigravity supports MCP servers via its built-in MCP Store and custom configuration.

### Using the MCP Store

1. Click on **Agent session**
2. Select the **"..."** dropdown at the top of the editor's side panel
3. Select **MCP Servers** to open the MCP Store
4. Browse and install servers with one click

### Custom MCP Server Configuration

1. Open **MCP Store** from the side panel dropdown
2. Click **"Manage MCP Servers"** at the top
3. Click **"View raw config"**
4. Edit `mcp_config.json`:

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

### Using Environment Variables

For sensitive data like API keys, use environment variables:

```json
{
  "mcpServers": {
    "ai-context": {
      "command": "npx",
      "args": ["@ai-coders/context", "mcp", "-r", "."],
      "env": {
        "API_KEY": "${MY_API_KEY}"
      }
    }
  }
}
```

Set environment variables in `~/.zshrc` or `~/.bashrc`:

```bash
export MY_API_KEY="your-key-here"
```

### Debugging

Check MCP server logs:

```bash
tail -f ~/.config/antigravity/logs/mcp-*.log
```

**References:**
- [Antigravity MCP Documentation](https://antigravity.google/docs/mcp)
- [Antigravity Custom MCP Guide](https://medium.com/google-developer-experts/google-antigravity-custom-mcp-server-integration-to-improve-vibe-coding-f92ddbc1c22d)

---

## Available MCP Tools

Once configured, the following tools are available to your AI assistant:

| Tool | Description |
|------|-------------|
| `readFile` | Read file contents from the filesystem |
| `listFiles` | List files matching a glob pattern |
| `analyzeSymbols` | Extract code symbols (classes, functions, interfaces) using Tree-sitter |
| `getFileStructure` | Get the directory structure of a repository |
| `searchCode` | Search for code patterns using regex |
| `buildSemanticContext` | Build optimized semantic context for LLM prompts |
| `checkScaffolding` | Check if `.context` scaffolding exists |
| `initializeContext` | Initialize `.context` scaffolding (create template files) |
| `fillScaffolding` | Analyze codebase and generate content for templates |
| `scaffoldPlan` | Create a plan template in `.context/plans/` |

## Available MCP Resources

| Resource | Description |
|----------|-------------|
| `context://codebase/{contextType}` | Semantic context (documentation, playbook, plan, compact) |
| `file://{path}` | Read file contents |

---

## Troubleshooting

### Server Not Starting

1. Verify `npx` is available in your PATH
2. Test manually: `npx @ai-coders/context mcp -r /path/to/repo`
3. Check for Node.js 20+ requirement

### Tools Not Appearing

1. Restart your AI tool after configuration changes
2. Verify the configuration file syntax (JSON/TOML)
3. Check server logs if available

### Permission Issues

Ensure the repository path is accessible and you have read permissions.

### Verbose Mode

Enable verbose logging for debugging:

```json
{
  "mcpServers": {
    "ai-context": {
      "command": "npx",
      "args": ["@ai-coders/context", "mcp", "-r", ".", "-v"]
    }
  }
}
```
