# MCP Installation Guide

> Installation examples for all MCP clients

`@ai-coders/context` works with all MCP-compatible AI coding assistants. Below are configuration examples for popular clients.

## Key Features

- **39 MCP tools** for context analysis, workflows, orchestration, and skills
- **No API key required** - your AI agent uses its own LLM
- **PREVC workflow** system for structured development
- **14 built-in agents** for specialized tasks
- **10 built-in skills** for on-demand expertise

---

## Quick Reference

| Client | Config Location |
|--------|-----------------|
| Claude Code | `claude mcp add` command |
| Claude Desktop | `claude_desktop_config.json` |
| Cursor | `.cursor/mcp.json` |
| VS Code | `settings.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |
| Cline | MCP Servers settings |
| Codex CLI | `~/.codex/config.toml` |
| Roo Code | MCP configuration file |
| Zed | `settings.json` |
| Kiro | MCP Servers settings |
| Kilo Code | `.kilocode/mcp.json` |
| Augment Code | `settings.json` |
| Gemini CLI | `~/.gemini/settings.json` |
| JetBrains | AI Assistant settings |
| Amazon Q | CLI configuration file |
| Warp | AI settings |
| LM Studio | `mcp.json` |
| Visual Studio 2022 | MCP config |
| BoltAI | Plugins settings |
| Qodo Gen | MCP settings |
| Perplexity | Connectors settings |
| Opencode | Configuration file |
| Trae | MCP settings |
| Copilot Coding Agent | Repository settings |
| Copilot CLI | `~/.copilot/mcp-config.json` |
| Amp | `amp mcp add` command |
| Zencoder | Agent tools |
| Crush | Configuration file |
| Factory | `droid mcp add` command |
| Qwen Coder | `~/.qwen/settings.json` |
| Google Antigravity | MCP config file |
| Smithery | `npx @smithery/cli` |
| Rovo Dev CLI | `acli rovodev mcp` |

---

## Installation by Client

### Claude Code

Run this command in your terminal. See [Claude Code MCP docs](https://docs.anthropic.com/en/docs/claude-code/mcp) for more info.

```bash
claude mcp add ai-context -- npx @ai-coders/context mcp
```

#### With Custom Repository Path

```bash
claude mcp add ai-context -- npx @ai-coders/context mcp --repo-path /path/to/your/project
```

#### With Verbose Logging

```bash
claude mcp add ai-context -- npx @ai-coders/context mcp --verbose
```

---

### Claude Desktop

Open Claude Desktop developer settings and edit your `claude_desktop_config.json` file. See [Claude Desktop MCP docs](https://modelcontextprotocol.io/quickstart/user) for more info.

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

#### With Custom Repository Path

```json
{
  "mcpServers": {
    "ai-context": {
      "command": "npx",
      "args": ["@ai-coders/context", "mcp", "--repo-path", "/path/to/your/project"]
    }
  }
}
```

---

### Cursor

Go to: `Settings` -> `Cursor Settings` -> `MCP` -> `Add new global MCP server`

Paste the following configuration into your Cursor `~/.cursor/mcp.json` file. You may also install in a specific project by creating `.cursor/mcp.json` in your project folder. See [Cursor MCP docs](https://docs.cursor.com/context/model-context-protocol) for more info.

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

---

### VS Code

Add this to your VS Code MCP config file. See [VS Code MCP docs](https://code.visualstudio.com/docs/copilot/chat/mcp-servers) for more info.

```json
"mcp": {
  "servers": {
    "ai-context": {
      "type": "stdio",
      "command": "npx",
      "args": ["@ai-coders/context", "mcp"]
    }
  }
}
```

---

### Windsurf

Add this to your Windsurf MCP config file at `~/.codeium/windsurf/mcp_config.json`. See [Windsurf MCP docs](https://docs.windsurf.com/windsurf/cascade/mcp) for more info.

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

---

### Cline

You can configure the MCP server through Cline's settings:

1. Open **Cline** in VS Code
2. Click the hamburger menu icon to enter the **MCP Servers** section
3. Choose **Installed** tab
4. Click **Configure MCP Servers**
5. Add the configuration:

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

---

### OpenAI Codex CLI

Add this to your Codex configuration at `~/.codex/config.toml`. See [OpenAI Codex](https://github.com/openai/codex) for more information.

```toml
[mcp_servers.ai-context]
command = "npx"
args = ["--yes", "@ai-coders/context@latest", "mcp"]
startup_timeout_ms = 20_000
```

> **Note:** If you see startup timeout errors, try increasing `startup_timeout_ms` to `40_000`.

---

### Roo Code

Add this to your Roo Code MCP configuration file. See [Roo Code MCP docs](https://docs.roocode.com/features/mcp/using-mcp-in-roo) for more info.

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

---

### Zed

It can be installed via Zed Extensions or you can add this to your Zed `settings.json`. See [Zed Context Server docs](https://zed.dev/docs/assistant/context-servers) for more info.

```json
{
  "context_servers": {
    "ai-context": {
      "source": "custom",
      "command": "npx",
      "args": ["@ai-coders/context", "mcp"]
    }
  }
}
```

---

### Kiro

See [Kiro Model Context Protocol Documentation](https://kiro.dev/docs/mcp/configuration/) for details.

1. Navigate `Kiro` > `MCP Servers`
2. Add a new MCP server by clicking the `+ Add` button
3. Paste the configuration:

```json
{
  "mcpServers": {
    "ai-context": {
      "command": "npx",
      "args": ["@ai-coders/context", "mcp"],
      "env": {},
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

4. Click `Save` to apply.

---

### Kilo Code

You can configure the MCP server in **Kilo Code** using either the UI or by editing your project's MCP configuration file.

#### Configure via Kilo Code UI

1. Open **Kilo Code**
2. Click the **Settings** icon in the top-right corner
3. Navigate to **Settings** -> **MCP Servers**
4. Click **Add Server**
5. Choose **Local Server**
6. Enter the command: `npx @ai-coders/context mcp`
7. Click **Save**

#### Manual Configuration

Create `.kilocode/mcp.json`:

```json
{
  "mcpServers": {
    "ai-context": {
      "command": "npx",
      "args": ["@ai-coders/context", "mcp"],
      "disabled": false
    }
  }
}
```

---

### Augment Code

To configure the MCP server in Augment Code:

#### Using the Augment Code UI

1. Click the hamburger menu
2. Select **Settings**
3. Navigate to the **Tools** section
4. Click the **+ Add MCP** button
5. Enter the command: `npx @ai-coders/context mcp`
6. Name the MCP: **ai-context**
7. Click **Add**

#### Manual Configuration

1. Press `Cmd/Ctrl + Shift + P` or go to the hamburger menu
2. Select **Edit Settings**
3. Under Advanced, click **Edit in settings.json**
4. Add the server configuration:

```json
"augment.advanced": {
  "mcpServers": [
    {
      "name": "ai-context",
      "command": "npx",
      "args": ["@ai-coders/context", "mcp"]
    }
  ]
}
```

---

### Gemini CLI

See [Gemini CLI Configuration](https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html) for details.

Open the Gemini CLI settings file at `~/.gemini/settings.json` and add:

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

---

### JetBrains AI Assistant

See [JetBrains AI Assistant Documentation](https://www.jetbrains.com/help/ai-assistant/configure-an-mcp-server.html) for more details.

1. In JetBrains IDEs, go to `Settings` -> `Tools` -> `AI Assistant` -> `Model Context Protocol (MCP)`
2. Click `+ Add`
3. Click on `Command` in the top-left corner and select **As JSON**
4. Add this configuration:

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

5. Click `Apply` to save changes.

---

### Amazon Q Developer CLI

Add this to your Amazon Q Developer CLI configuration file. See [Amazon Q Developer CLI docs](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/command-line-mcp-configuration.html) for more details.

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

---

### Warp

See [Warp Model Context Protocol Documentation](https://docs.warp.dev/knowledge-and-collaboration/mcp#adding-an-mcp-server) for details.

1. Navigate `Settings` > `AI` > `Manage MCP servers`
2. Add a new MCP server by clicking the `+ Add` button
3. Paste the configuration:

```json
{
  "ai-context": {
    "command": "npx",
    "args": ["@ai-coders/context", "mcp"],
    "env": {},
    "working_directory": null,
    "start_on_launch": true
  }
}
```

4. Click `Save`.

---

### LM Studio

See [LM Studio MCP Support](https://lmstudio.ai/blog/lmstudio-v0.3.17) for more information.

1. Navigate to `Program` (right side) > `Install` > `Edit mcp.json`
2. Paste the configuration:

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

3. Click `Save`.

---

### Visual Studio 2022

See [Visual Studio MCP Servers documentation](https://learn.microsoft.com/visualstudio/ide/mcp-servers?view=vs-2022) for details.

```json
{
  "inputs": [],
  "servers": {
    "ai-context": {
      "type": "stdio",
      "command": "npx",
      "args": ["@ai-coders/context", "mcp"]
    }
  }
}
```

---

### BoltAI

Open the "Settings" page, navigate to "Plugins," and enter:

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

See [BoltAI's Documentation](https://docs.boltai.com/docs/plugins/mcp-servers) for more info.

---

### Qodo Gen

See [Qodo Gen docs](https://docs.qodo.ai/qodo-documentation/qodo-gen/qodo-gen-chat/agentic-mode/agentic-tools-mcps) for more details.

1. Open Qodo Gen chat panel in VS Code or IntelliJ
2. Click **Connect more tools**
3. Click **+ Add new MCP**
4. Add the configuration:

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

---

### Perplexity Desktop

See [Local and Remote MCPs for Perplexity](https://www.perplexity.ai/help-center/en/articles/11502712-local-and-remote-mcps-for-perplexity) for more information.

1. Navigate `Perplexity` > `Settings`
2. Select `Connectors`
3. Click `Add Connector`
4. Select `Advanced`
5. Enter Server Name: `ai-context`
6. Paste:

```json
{
  "args": ["@ai-coders/context", "mcp"],
  "command": "npx",
  "env": {}
}
```

7. Click `Save`.

---

### Opencode

Add this to your Opencode configuration file. See [Opencode MCP docs](https://opencode.ai/docs/mcp-servers) for more info.

```json
{
  "mcp": {
    "ai-context": {
      "type": "local",
      "command": ["npx", "@ai-coders/context", "mcp"],
      "enabled": true
    }
  }
}
```

---

### Trae

Use the Add manually feature and fill in the JSON configuration. See [Trae documentation](https://docs.trae.ai/ide/model-context-protocol?_lang=en) for more details.

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

---

### Copilot Coding Agent

Add the following configuration to Repository -> Settings -> Copilot -> Coding agent -> MCP configuration:

```json
{
  "mcpServers": {
    "ai-context": {
      "type": "stdio",
      "command": "npx",
      "args": ["@ai-coders/context", "mcp"]
    }
  }
}
```

See the [official GitHub documentation](https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/agents/copilot-coding-agent/extending-copilot-coding-agent-with-mcp) for more info.

---

### Copilot CLI

Open `~/.copilot/mcp-config.json` and add:

```json
{
  "mcpServers": {
    "ai-context": {
      "type": "local",
      "command": "npx",
      "args": ["@ai-coders/context", "mcp"]
    }
  }
}
```

---

### Amp

Run this command in your terminal. See [Amp MCP docs](https://ampcode.com/manual#mcp) for more info.

```bash
amp mcp add ai-context "npx @ai-coders/context mcp"
```

---

### Zencoder

1. Go to the Zencoder menu (...)
2. Select **Agent tools**
3. Click on **Add custom MCP**
4. Add the name and configuration:

```json
{
  "command": "npx",
  "args": ["@ai-coders/context", "mcp"]
}
```

5. Click **Install**.

---

### Crush

Add this to your Crush configuration file. See [Crush MCP docs](https://github.com/charmbracelet/crush#mcps) for more info.

```json
{
  "$schema": "https://charm.land/crush.json",
  "mcp": {
    "ai-context": {
      "type": "stdio",
      "command": "npx",
      "args": ["@ai-coders/context", "mcp"]
    }
  }
}
```

---

### Factory

Factory's droid supports MCP servers through its CLI. See [Factory MCP docs](https://docs.factory.ai/cli/configuration/mcp) for more info.

```bash
droid mcp add ai-context "npx @ai-coders/context mcp"
```

---

### Qwen Coder

See [Qwen Coder MCP Configuration](https://qwenlm.github.io/qwen-code-docs/en/tools/mcp-server/#how-to-set-up-your-mcp-server) for details.

Open the Qwen Coder settings file at `~/.qwen/settings.json` and add:

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

---

### Google Antigravity

Add this to your Antigravity MCP config file. See [Antigravity MCP docs](https://antigravity.google/docs/mcp) for more info.

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

---

### Smithery

To install via [Smithery](https://smithery.ai/server/@ai-coders/context):

```bash
npx -y @smithery/cli@latest install @ai-coders/context --client <CLIENT_NAME> --key <YOUR_SMITHERY_KEY>
```

You can find your Smithery key on the [Smithery.ai webpage](https://smithery.ai/).

---

### Rovo Dev CLI

Edit your Rovo Dev CLI MCP config:

```bash
acli rovodev mcp
```

Add the configuration:

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

---

### Emdash

[Emdash](https://github.com/generalaction/emdash) is an orchestration layer for running multiple coding agents in parallel.

**What you need to do:**
Configure your coding agent (Codex, Claude Code, Cursor, etc.) to connect to the MCP server. Emdash does not modify your agent's config directly.

See the [Emdash repository](https://github.com/generalaction/emdash) for more information.

---

### Desktop Extension

Install the MCP bundle file and add it to your client. See [MCP bundles docs](https://github.com/anthropics/mcpb#mcp-bundles-mcpb) for more info.

Create an `ai-context.mcpb` file:

```json
{
  "name": "ai-context",
  "description": "AI Coders Context - Context engineering for AI coding assistants",
  "command": "npx",
  "args": ["@ai-coders/context", "mcp"]
}
```

---

## Alternative Runtimes

### Using Bun

```json
{
  "mcpServers": {
    "ai-context": {
      "command": "bunx",
      "args": ["@ai-coders/context", "mcp"]
    }
  }
}
```

### Using Deno

```json
{
  "mcpServers": {
    "ai-context": {
      "command": "deno",
      "args": [
        "run",
        "--allow-env",
        "--allow-net",
        "--allow-read",
        "--allow-write",
        "npm:@ai-coders/context",
        "mcp"
      ]
    }
  }
}
```

### Using Docker

1. Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN npm install -g @ai-coders/context
CMD ["ai-coders-context", "mcp"]
```

2. Build the image:

```bash
docker build -t ai-coders-context-mcp .
```

3. Configure your MCP client:

```json
{
  "mcpServers": {
    "ai-context": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-v", "/your/project:/app", "ai-coders-context-mcp"],
      "transportType": "stdio"
    }
  }
}
```

---

## Platform-Specific Notes

### Windows

The configuration on Windows may require using `cmd` to run npx:

```json
{
  "mcpServers": {
    "ai-context": {
      "command": "cmd",
      "args": ["/c", "npx", "@ai-coders/context", "mcp"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### Linux/macOS

Standard npx command works directly:

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

---

## Local Development Setup

For developing or testing the MCP server locally:

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

---

## Available MCP Tools

Once configured, you'll have access to 39 MCP tools organized into categories:

### Context Analysis (13 tools)

| Tool | Description |
|------|-------------|
| `readFile` | Read file contents |
| `listFiles` | List files matching glob patterns |
| `analyzeSymbols` | Extract classes, interfaces, functions |
| `getFileStructure` | Get repository directory structure |
| `searchCode` | Search code patterns with regex |
| `buildSemanticContext` | Build optimized LLM context |
| `checkScaffolding` | Check `.context` directory status |
| `initializeContext` | Create `.context` scaffolding |
| `scaffoldPlan` | Create work plan templates |
| `fillScaffolding` | Fill scaffolding with AI content |
| `listFilesToFill` | List unfilled scaffold files |
| `fillSingleFile` | Process one scaffold file |
| `getCodebaseMap` | Get structured codebase data |

### PREVC Workflow (6 tools)

| Tool | Description |
|------|-------------|
| `workflowInit` | Initialize PREVC workflow |
| `workflowStatus` | Get current workflow status |
| `workflowAdvance` | Move to next phase |
| `workflowHandoff` | Transfer artifacts between roles |
| `workflowCollaborate` | Start multi-agent collaboration |
| `workflowCreateDoc` | Generate phase-specific documents |

### Extended Workflow (4 tools)

| Tool | Description |
|------|-------------|
| `projectStart` | Unified setup: scaffolding + fill + workflow |
| `projectReport` | Generate visual progress reports |
| `exportRules` | Export context rules to AI tools |
| `detectStack` | Detect project technology stack |

### Plan Integration (8 tools)

| Tool | Description |
|------|-------------|
| `linkPlan` | Link implementation plan to workflow |
| `getLinkedPlans` | Get all plans linked to workflow |
| `getPlanDetails` | Get plan info with PREVC mapping |
| `getPlansForPhase` | Get plans for specific phase |
| `updatePlanPhase` | Update plan phase status |
| `recordDecision` | Record decisions during execution |
| `discoverAgents` | Find all agents (built-in + custom) |
| `getAgentInfo` | Get agent metadata and content |

### Orchestration (5 tools)

| Tool | Description |
|------|-------------|
| `orchestrateAgents` | Select agents by task/phase/role |
| `getAgentSequence` | Get recommended handoff sequence |
| `getAgentDocs` | Get documentation for agent |
| `getPhaseDocs` | Get documentation for phase |
| `listAgentTypes` | List all 14 agent types |

### Skills (6 tools)

| Tool | Description |
|------|-------------|
| `listSkills` | List all available skills |
| `getSkillContent` | Get full SKILL.md content |
| `getSkillsForPhase` | Get skills for PREVC phase |
| `scaffoldSkills` | Generate skill files |
| `fillSkills` | Fill skills with codebase content |
| `exportSkills` | Export skills to Claude/Gemini/Codex |

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| MCP tools not appearing | Restart your IDE after configuration |
| Command not found | Ensure Node.js 20+ is installed |
| Timeout errors | Increase `startup_timeout_ms` in config |
| Permission errors | Check file/directory permissions |

### Verifying Installation

After configuration, you should see `ai-context` tools available in your AI assistant. Try asking your AI to:

- "Use the `getFileStructure` tool to show the project structure"
- "Initialize the context with `initializeContext`"
- "Build semantic context using `buildSemanticContext`"

### Getting Help

- [GitHub Issues](https://github.com/vinilana/ai-coders-context/issues)
- Run `npx @ai-coders/context --help` for CLI options
- Run `npx @ai-coders/context mcp --help` for MCP-specific options
