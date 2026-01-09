# MCP Integration (Claude Code)

This guide covers integrating `@ai-coders/context` with Claude Code using the Model Context Protocol (MCP).

## Quick Setup

Add to your Claude Code settings:

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

Restart Claude Code to activate.

## Available Tools

Once configured, Claude Code can use these tools:

| Tool | Description |
|------|-------------|
| `readFile` | Read file contents from the filesystem |
| `listFiles` | List files matching a glob pattern |
| `analyzeSymbols` | Extract code symbols using Tree-sitter |
| `getFileStructure` | Get directory structure |
| `searchCode` | Search for code patterns using regex |
| `buildSemanticContext` | Build optimized context for LLM prompts |
| `checkScaffolding` | Check if `.context` scaffolding exists |
| `initializeContext` | Initialize `.context` scaffolding |
| `fillScaffolding` | Generate content for template files |
| `scaffoldPlan` | Create a plan template |

## Available Resources

| Resource | Description |
|----------|-------------|
| `context://codebase/{contextType}` | Semantic context (documentation, playbook, plan, compact) |
| `file://{path}` | Read file contents |

## Usage Examples

Ask Claude Code to:

- "Use the ai-context tools to analyze the authentication module"
- "Build a semantic context for the src/services directory"
- "List all TypeScript files and analyze their exports"
- "Check if context scaffolding exists and initialize it"
- "Create a plan for the new feature"

## Verbose Mode

For debugging, enable verbose logging:

```json
{
  "mcpServers": {
    "ai-context": {
      "command": "npx",
      "args": ["@ai-coders/context", "mcp", "-r", "/path/to/repo", "-v"]
    }
  }
}
```

## External AI Agents (Non-MCP)

For agents that don't support MCP, use the passthrough server:

```bash
# Start server
npx @ai-coders/context serve -r ./my-project

# Send commands via stdin
echo '{"id":"1","method":"capabilities"}' | npx @ai-coders/context serve
```

### Request Format

```json
{
  "id": "unique-id",
  "method": "tool.call",
  "params": {
    "tool": "listFiles",
    "args": { "pattern": "**/*.ts" }
  }
}
```

### Response Format

```json
{
  "id": "unique-id",
  "success": true,
  "result": { /* tool output */ }
}
```

### Available Methods

| Method | Description |
|--------|-------------|
| `capabilities` | List server capabilities |
| `tool.list` | List available tools |
| `tool.call` | Execute a tool |
| `context.build` | Build semantic context |
| `agent.run` | Run an agent (requires LLM config) |

### Streaming Notifications

Progress notifications are streamed during execution:

```json
{"type": "progress", "data": {"step": 1, "message": "Analyzing..."}}
{"type": "tool_call", "data": {"toolName": "readFile", "args": {"filePath": "..."}}}
{"type": "tool_result", "data": {"toolName": "readFile", "success": true}}
```

## Tips

1. **Repo path** — Always specify `-r /path/to/repo` for consistent results
2. **Permissions** — Ensure the tool has read access to your codebase
3. **Performance** — Large codebases may take a few seconds for initial analysis
4. **Updates** — Run `npx @ai-coders/context@latest` to get the latest version
