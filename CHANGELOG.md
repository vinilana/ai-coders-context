# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
- `src/services/ai/tools/*.ts` - Code analysis tools (readFile, listFiles, analyzeSymbols, etc.)
- `src/services/ai/agents/*.ts` - Specialized agents (DocumentationAgent, PlaybookAgent, PlanAgent)
- `src/services/ai/agentEvents.ts` - Agent event callback types
- `src/services/semantic/contextBuilder.ts` - SemanticContextBuilder for pre-computed context

#### Environment Variables
```bash
# Provider API keys
OPENROUTER_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GOOGLE_API_KEY=...

# Model overrides
OPENROUTER_MODEL=x-ai/grok-4-fast
OPENAI_MODEL=gpt-4o
ANTHROPIC_MODEL=claude-sonnet-4-20250514
GOOGLE_MODEL=gemini-2.0-flash
```

## [0.4.0] - Previous Release

Initial release with scaffolding capabilities, `init`, `fill`, and `plan` commands.
