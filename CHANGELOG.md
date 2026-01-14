# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-01-14

### Added

- **Quick Sync Service**: Unified synchronization of agents, skills, and documentation
  - New `quick-sync` command for one-click export to all AI tools
  - Component selection: choose agents, skills, docs, or all
  - Target selection: export to specific tools or all at once
  - CLI: `npx @ai-coders/context quick-sync [--components agents,skills,docs] [--targets claude,cursor]`
  - Interactive mode integration with multi-select options

- **getCodebaseMap MCP Tool**: Retrieve structured codebase data
  - Access pre-analyzed codebase information from `.context/docs/codebase-map.json`
  - Sections: `stack`, `structure`, `architecture`, `symbols`, `publicAPI`, `dependencies`, `stats`
  - Token-efficient retrieval with specific section queries
  - Reduces need for repeated codebase analysis

- **Project Type Classification**: Smart filtering for agents and documentation
  - Automatic project type detection (backend, frontend, fullstack, api, library, cli, mobile)
  - Filter agent playbooks based on project type
  - Filter documentation templates based on relevance
  - `scaffoldFilter` service for intelligent scaffolding selection

- **Interactive Mode Enhancements**:
  - Welcome screen with PREVC visual explanation
  - User prompt input on startup
  - Multi-select component options for scaffolding (docs, agents, skills)
  - Target selection with presets for AI tools

- **Front Matter Wrapping**: Enhanced options for generated files
  - Additional front matter options: `wrap`, `template`, `source`
  - Better metadata management for scaffolded files

- **Skills System**: On-demand expertise for AI agents (Claude Code, Gemini CLI, Codex)
  - 10 built-in skills: commit-message, pr-review, code-review, test-generation, documentation, refactoring, bug-investigation, feature-breakdown, api-design, security-audit
  - `SkillRegistry` class for skill discovery and management
  - `SkillGenerator` for scaffolding SKILL.md files
  - `SkillExportService` for exporting to `.claude/skills/`, `.gemini/skills/`, `.codex/skills/`
  - CLI commands: `skill init`, `skill list`, `skill export`, `skill create`, `skill fill`
  - MCP tools: `listSkills`, `getSkillContent`, `getSkillsForPhase`, `scaffoldSkills`, `exportSkills`, `fillSkills`
  - Skills are mapped to PREVC phases for workflow integration

- **Skill Fill Feature**: AI-powered skill personalization
  - `skill fill` CLI command personalizes skills with project-specific content
  - `fillSkills` MCP tool for programmatic skill filling
  - `SkillAgent` - New AI agent for skill personalization (follows PlaybookAgent pattern)
  - `buildSkillContext()` method in SemanticContextBuilder for skill-specific context
  - Uses docs and agents context for richer personalization
  - Semantic analysis mode for token-efficient generation
  - i18n support for English and Portuguese

- **Plan-Workflow Integration**: Link plans to PREVC workflow phases
  - `PlanLinker` class for managing plan-workflow relationships
  - Plans now include PREVC phase mapping in frontmatter
  - Track plan status, decisions, and risks per workflow phase
  - MCP tools: `linkPlan`, `getLinkedPlans`, `getPlanDetails`, `getPlansForPhase`, `updatePlanPhase`, `recordDecision`

- **Agent Lineup in Plans**: Plans now include recommended agents in frontmatter
  - AI agents can discover which agents to use for each plan step
  - `AgentLineupEntry` type with phase mapping
  - Frontmatter parsing extracts agent lineup automatically

- **Custom Agent Discovery**: Support for custom agent playbooks
  - Discover agents from `.context/agents/` directory
  - Support for both built-in and custom agents (e.g., `marketing-agent.md`)
  - MCP tools: `discoverAgents`, `getAgentInfo`

- **Centralized Agent Registry**: Single source of truth for agent management
  - `AgentRegistry` class with caching and metadata retrieval
  - `BUILT_IN_AGENTS` constant with type-safe agent types
  - `isBuiltInAgent()` helper for validation
  - Exported from `workflow/agents` module

- **New MCP Tools for Plan Management**:
  - `linkPlan` - Link a plan file to the current workflow
  - `getLinkedPlans` - Get all linked plans for current workflow
  - `getPlanDetails` - Get detailed information about a linked plan
  - `getPlansForPhase` - Get plans relevant to a PREVC phase
  - `updatePlanPhase` - Update plan phase status
  - `recordDecision` - Record a decision for a plan
  - `discoverAgents` - Discover all available agents (built-in + custom)
  - `getAgentInfo` - Get metadata for a specific agent

### Changed

- **UI/UX Minimalist**: Removed emoticons from all UI components
  - Report service uses text indicators: `[x]`, `[>]`, `[ ]`, `[-]`
  - Menu choices use simple text without emoji prefixes
  - Cleaner, more professional interface

- **PlanLinker Refactored**: Now delegates agent operations to AgentRegistry (SRP)

### Fixed

- **Orphaned Spinners**: Fixed CLI spinners not stopping properly in certain conditions
  - Prevents visual artifacts when operations complete or fail

### Technical Details

#### New Files
- `src/services/quickSync/quickSyncService.ts` - Quick Sync service for unified synchronization
- `src/services/quickSync/index.ts` - Quick Sync module exports
- `src/services/ai/tools/getCodebaseMapTool.ts` - MCP tool for codebase map retrieval
- `src/services/stack/projectTypeClassifier.ts` - Project type classification service
- `src/services/stack/scaffoldFilter.ts` - Intelligent scaffold filtering
- `src/generators/documentation/codebaseMapGenerator.ts` - Codebase map generation
- `src/services/ai/agents/skillAgent.ts` - AI agent for skill personalization
- `src/services/fill/skillFillService.ts` - Service orchestrating skill fill operations
- `src/workflow/plans/types.ts` - Plan-workflow integration types
- `src/workflow/plans/planLinker.ts` - Plan-workflow linking service
- `src/workflow/plans/index.ts` - Plans module exports
- `src/workflow/agents/agentRegistry.ts` - Centralized agent registry
- `src/workflow/agents/index.ts` - Agents module exports

#### Modified Files
- `src/services/semantic/contextBuilder.ts` - Added `buildSkillContext()` method
- `src/services/ai/prompts/sharedPrompts.ts` - Added `getSkillAgentPrompt()`
- `src/services/ai/agentEvents.ts` - Added 'skill' to AgentType
- `src/services/mcp/mcpServer.ts` - Added `fillSkills` MCP tool
- `src/utils/i18n.ts` - Added skill fill translations (EN/PT)

#### New Exports from `workflow` module
```typescript
// Plan Integration
export { PlanLinker, createPlanLinker, PlanReference, LinkedPlan, ... } from './plans';

// Agent Registry
export { BUILT_IN_AGENTS, AgentRegistry, createAgentRegistry, ... } from './agents';
```

## [0.5.2] - 2026-01-09

### Fixed

- **Dotenv configuration handling**: Updated dotenv configuration to respect command-line arguments
  - MCP server now skips loading `.env` file when `--skip-dotenv` flag is passed
  - Prevents environment variable conflicts when running as MCP server
  - Fix MCP to work in Antigravity and Codex

## [0.5.1] - 2026-01-09

### Added

- **Update command**: New `update` command for selective documentation updates
  - Target specific files or sections without regenerating everything
  - Supports `--files` flag to update specific documentation files
  - Preserves manual edits in other files

- **StateDetector service**: Wizard-based project state detection
  - Automatically detects scaffolding completeness (docs, agents, plans)
  - Parses YAML front matter for instant status detection
  - Provides actionable recommendations based on project state

- **YAML front matter utilities**: Instant status detection for generated files
  - `parseFrontMatter()` - Extract metadata from markdown files
  - `updateFrontMatter()` - Update metadata while preserving content
  - `hasFrontMatter()` - Quick check for front matter presence
  - Status tracking: `generated`, `filled`, `customized`

- **Documentation guides**: Extracted detailed guides from README
  - `docs/GUIDE.md` - Comprehensive usage guide
  - `docs/MCP.md` - MCP server setup and configuration
  - `docs/PROVIDERS.md` - Multi-provider configuration guide

- **New MCP tools for incremental scaffolding**: Avoid output size limits
  - `listFilesToFill` - Returns only file paths (~1KB response) for efficient listing
  - `fillSingleFile` - Process one scaffold file at a time (~10KB per file)
  - MCP server now exposes 12 tools (up from 10)

- **Tests for new utilities**:
  - `frontMatter.test.ts` - 12 tests for YAML front matter parsing/updating
  - `stateDetector.test.ts` - 8 tests for project state detection

### Changed

- **Simplified README**: Streamlined to essentials with links to detailed guides
- **Interactive mode improvements**:
  - Menu reordered to prioritize plan creation over docs update
  - Plan creation now asks for goal/summary instead of just name
- **Quick setup fix**: Uses correct `both` value instead of `all` for scaffold type
- **fillScaffolding pagination**: Added `offset` and `limit` parameters (default: 3 files)
  - Prevents output size errors for large projects
  - Returns `pagination.hasMore` to indicate remaining files
- **Centralized tool descriptions**: Single source of truth for MCP and AI SDK
  - New `toolRegistry.ts` with all tool descriptions
  - MCP server uses `getToolDescription()` instead of inline strings
- **Shared agent prompts**: Eliminated redundancy across agents
  - New `prompts/sharedPrompts.ts` with common prompt components
  - `getDocumentationAgentPrompt()`, `getPlaybookAgentPrompt()`, `getPlanAgentPrompt()`
  - Agents now import prompts instead of defining inline

### Removed

- **Direct OpenRouter client**: Removed `OpenRouterClient` class and `OpenRouterConfig` type
  - OpenRouter is now used exclusively through AI SDK via OpenAI-compatible provider
  - Simplifies provider architecture with single unified approach

### Technical Details

#### New Files
- `src/services/state/stateDetector.ts` - StateDetector service
- `src/services/state/stateDetector.test.ts` - StateDetector tests
- `src/services/update/updateService.ts` - Update command service
- `src/utils/frontMatter.ts` - YAML front matter utilities
- `src/utils/frontMatter.test.ts` - Front matter tests
- `src/services/ai/toolRegistry.ts` - Centralized tool descriptions
- `src/services/ai/prompts/sharedPrompts.ts` - Shared agent system prompts
- `src/services/ai/prompts/index.ts` - Prompts barrel export
- `docs/GUIDE.md` - Usage guide
- `docs/MCP.md` - MCP documentation
- `docs/PROVIDERS.md` - Provider configuration

#### Removed Files
- `src/services/openRouterClient.ts` - Legacy direct OpenRouter client

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
