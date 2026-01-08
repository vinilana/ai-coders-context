# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-01-08

### Added

- **MCP Server**: New `mcp` command for Claude Code integration via Model Context Protocol
  - Exposes 10 code analysis tools: `readFile`, `listFiles`, `analyzeSymbols`, `getFileStructure`, `searchCode`, `buildSemanticContext`, `checkScaffolding`, `initializeContext`, `fillScaffolding`, `scaffoldPlan`
  - Exposes 2 resource templates: `context://codebase/{contextType}` for semantic context, `file://{path}` for file contents
  - Uses stdio transport for seamless Claude Code integration
  - Configure in `~/.claude/settings.json` with `npx @ai-coders/context mcp`

- **MCP Scaffolding Tools**: New tools for AI agents to manage `.context` scaffolding
  - `checkScaffolding` - Check if scaffolding exists with granular status (docs, agents, plans separately)
  - `initializeContext` - Initialize `.context` scaffolding with template files
  - `fillScaffolding` - Analyze codebase and generate content for each template (AI agent writes the suggestedContent to each file)
  - `scaffoldPlan` - Create plan templates in `.context/plans/` with optional semantic analysis

- **Passthrough Server**: New `serve` command for external AI agent integration
  - JSON-RPC style communication via stdin/stdout
  - Supports methods: `capabilities`, `tool.list`, `tool.call`, `context.build`, `agent.run`
  - Real-time notifications for progress, tool calls, and results
  - Protocol types with Zod validation for type safety
  - Enables any AI agent to use code analysis tools without MCP support

- **Agent sync command**: New `sync-agents` command to sync agent playbooks to AI tool directories
  - Syncs from `.context/agents/` (source of truth) to tool-specific directories
  - Built-in presets: `claude` (.claude/agents), `github` (.github/agents), `cursor` (.cursor/agents)
  - Two sync modes: `symlink` (default, uses relative symlinks) and `markdown` (generates reference files)
  - Custom target support via `--target` flag for any AI tool directory
  - `--dry-run` to preview changes, `--force` to overwrite existing files
  - Cross-platform: Windows fallback (file copy) when symlinks require elevated permissions
  - Full i18n support (English and Portuguese)

- **Interactive sync flow**: Added "Sync agents to AI tools" option to interactive mode
  - Prompts for source directory, sync mode, target selection, and options
  - Supports preset selection or custom path input

- **Multi-provider AI support**: Added support for OpenAI, Anthropic, Google, and OpenRouter providers
  - New `--provider` flag for `fill` and `plan` commands
  - Auto-detection of available API keys from environment variables
  - Provider-specific model defaults (e.g., `gpt-5.2` for OpenAI, `claude-sonnet-4.5` for Anthropic)

- **Semantic context mode**: Token-efficient LLM calls using pre-computed Tree-sitter analysis
  - Enabled by default for faster, more consistent documentation generation
  - New `--no-semantic` flag to disable and use tool-based exploration instead
  - New `--languages` flag to specify programming languages for analysis
  - Supports: TypeScript, JavaScript, Python, Go, Rust, Java, C++, C#, Ruby, PHP

- **Real-time agent progress display**: Visual feedback during LLM operations
  - Shows which agent is currently working (DocumentationAgent, PlaybookAgent, PlanAgent)
  - Displays tool calls and their results in real-time
  - Progress indicators for multi-step operations

- **SemanticContextBuilder**: New service for generating optimized context strings
  - `buildDocumentationContext()` - Context for documentation generation
  - `buildPlaybookContext()` - Context for agent playbook generation
  - `buildPlanContext()` - Context for development plan generation
  - Caches analysis results for efficiency

- **LSP integration for semantic analysis**: Optional deep semantic analysis via Language Server Protocol
  - New `--lsp` flag for `fill` command to enable LSP-enhanced analysis
  - Enabled by default for `plan fill` (use `--no-lsp` to disable)
  - Adds type information, implementations, and references to symbol analysis
  - Supports TypeScript, JavaScript, Python, Go, and Rust language servers
  - Graceful fallback when LSP servers are unavailable

- **CodebaseAnalyzer**: New orchestrator for hybrid Tree-sitter + LSP analysis
  - Combines fast syntactic analysis with deep semantic understanding
  - Architecture layer detection (Services, Controllers, Models, Utils, etc.)
  - Design pattern detection (Factory, Repository, Service Layer, Observer, etc.)
  - Entry point and public API identification
  - Dependency graph construction

- **Unit tests for services**: Comprehensive test coverage for core services
  - `PlanService` tests (13 tests) - scaffolding, plan fill, error handling, LSP options
  - `FillService` tests (17 tests) - directory validation, agent processing, options handling
  - `CodebaseAnalyzer` tests (24 tests) - LSP integration, architecture detection, pattern detection

- **Agent event callback system**: Infrastructure for tracking agent progress
  - `onAgentStart`, `onAgentStep`, `onToolCall`, `onToolResult`, `onAgentComplete` callbacks
  - Integrated with CLI UI for real-time display

- **Interactive mode enhancements**:
  - Language selection for semantic analysis (checkbox interface)
  - Semantic mode toggle (defaults to enabled)
  - Provider and model selection

### Changed

- **AI SDK integration**: Replaced axios-based OpenRouter client with Vercel AI SDK
  - Enables tool-based agent workflows with `generateText` and `maxSteps`
  - Structured outputs with Zod schemas
  - Better error handling and streaming support

- **FillService refactored**: Now uses specialized agents instead of basic LLM client
  - `DocumentationAgent` for docs/*.md files
  - `PlaybookAgent` for agents/*.md files
  - Agents support both semantic and tool-based modes

- **PlanService refactored**: Uses `PlanAgent` with tool support
  - Better context gathering for plan generation
  - Support for referenced docs and agents

- **Default behavior**: Semantic context mode is now the default
  - More token-efficient out of the box
  - Use `--no-semantic` for thorough tool-based exploration

### Removed

- **axios dependency**: Replaced with Vercel AI SDK for HTTP requests
- **OpenRouterClient**: Replaced with `AISdkClient` supporting multiple providers

### Technical Details

#### New Dependencies
- `ai` - Vercel AI SDK core
- `@ai-sdk/openai` - OpenAI provider
- `@ai-sdk/anthropic` - Anthropic provider
- `@ai-sdk/google` - Google provider
- `@ai-sdk/openrouter` - OpenRouter provider
- `zod` - Schema validation for structured outputs
- `@modelcontextprotocol/sdk` - MCP server SDK for Claude Code integration

#### New Files
- `src/services/sync/` - Agent sync service module
  - `types.ts` - Type definitions (SyncMode, PresetName, SyncOptions, etc.)
  - `presets.ts` - Built-in target presets (claude, github, cursor)
  - `symlinkHandler.ts` - Cross-platform symlink creation
  - `markdownReferenceHandler.ts` - Markdown reference file generation
  - `syncService.ts` - Main sync orchestrator
  - `index.ts` - Barrel export
- `src/services/ai/aiSdkClient.ts` - Main AI SDK client
- `src/services/ai/providerFactory.ts` - Provider creation factory
- `src/services/ai/schemas.ts` - Zod schemas for tools and outputs
- `src/services/ai/tools/*.ts` - Code analysis tools (readFile, listFiles, analyzeSymbols, checkScaffolding, initializeContext, scaffoldPlan, etc.)
- `src/services/ai/agents/*.ts` - Specialized agents (DocumentationAgent, PlaybookAgent, PlanAgent)
- `src/services/ai/agentEvents.ts` - Agent event callback types
- `src/services/semantic/contextBuilder.ts` - SemanticContextBuilder for pre-computed context
- `src/services/semantic/codebaseAnalyzer.ts` - Main orchestrator for hybrid analysis
- `src/services/semantic/lsp/lspLayer.ts` - LSP client for semantic queries
- `src/services/semantic/treeSitter/treeSitterLayer.ts` - Tree-sitter based parsing
- `src/services/semantic/types.ts` - Shared types for semantic analysis
- `src/services/plan/planService.test.ts` - PlanService unit tests
- `src/services/fill/fillService.test.ts` - FillService unit tests
- `src/services/semantic/codebaseAnalyzer.test.ts` - CodebaseAnalyzer unit tests
- `src/services/mcp/` - MCP server module
  - `mcpServer.ts` - Main MCP server implementation
  - `mcpServer.test.ts` - MCP server tests
  - `index.ts` - Barrel export
- `src/services/passthrough/` - Passthrough server module
  - `protocol.ts` - JSON-RPC protocol types with Zod schemas
  - `protocol.test.ts` - Protocol tests
  - `stdinReader.ts` - stdin JSON reader with event emitter
  - `commandRouter.ts` - Command routing and tool execution
  - `commandRouter.test.ts` - Router tests
  - `index.ts` - Barrel export
- `src/services/serve/` - Serve command service
  - `serveService.ts` - Main serve service implementation
  - `index.ts` - Barrel export

#### Environment Variables
```bash
# Provider API keys
OPENROUTER_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GOOGLE_API_KEY=...

# Model overrides
OPENROUTER_MODEL=x-ai/grok-4.1-fast
OPENAI_MODEL=gpt-5.2
ANTHROPIC_MODEL=claude-sonnet-4.5
GOOGLE_MODEL=gemini-3-flash-preview
```

## [0.4.0] - Previous Release

Initial release with scaffolding capabilities, `init`, `fill`, and `plan` commands.
