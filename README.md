# @ai-coders/context

[![npm version](https://badge.fury.io/js/@ai-coders%2Fcontext.svg)](https://www.npmjs.com/package/@ai-coders/context)
[![CI](https://github.com/vinilana/ai-coders-context/actions/workflows/ci.yml/badge.svg)](https://github.com/vinilana/ai-coders-context/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> ⚠️ **Beta Release**: This tool is in early development (v0.x). APIs and features may change.

A powerful CLI tool that analyzes your codebase and generates comprehensive documentation and AI agent prompts using LLM APIs (OpenRouter).

## Features

- 🔍 **Repository Analysis**: Maps and analyzes your entire codebase structure
- 📚 **Documentation Generation**: Creates comprehensive documentation for all files
- 🤖 **AI Agent Prompts**: Generates specialized prompts for different development tasks
- 🌐 **Multi-Provider Support**: Works with OpenRouter, OpenAI, Anthropic, Gemini, and Grok
- 💰 **Cost Tracking**: Real-time token usage and billing estimation
- ⚙️ **Configurable**: Flexible options for customization and filtering

## Installation

### Using npx (recommended)

```bash
# Run directly without installation
npx @ai-coders/context generate /path/to/your/repo
```

### Global installation

```bash
npm install -g @ai-coders/context
```

### Local development

```bash
git clone https://github.com/vinilana/ai-coders-context.git
cd ai-coders-context
npm install
npm run build
npm link
```

## Setup

### Choose Your LLM Provider

The tool supports multiple providers. Choose one:

#### OpenRouter (Recommended - Default)
- Get an API key from [OpenRouter](https://openrouter.ai/)
- Access to 100+ models from different providers
```bash
export OPENROUTER_API_KEY=your_api_key_here
```

#### OpenAI
- Get an API key from [OpenAI](https://platform.openai.com/)
- Direct access to GPT models
```bash
export OPENAI_API_KEY=your_api_key_here
```

#### Anthropic
- Get an API key from [Anthropic](https://console.anthropic.com/)
- Direct access to Claude models
```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

#### Google AI (Gemini)
- Get an API key from [Google AI Studio](https://makersuite.google.com/)
- Access to Gemini models
```bash
export GOOGLE_AI_API_KEY=your_api_key_here
```

#### Grok (X.AI)
- Get an API key from [X.AI](https://x.ai/)
- Access to Grok models
```bash
export GROK_API_KEY=your_api_key_here
```

### Environment File
Create a `.env` file for easy configuration:
```bash
cp .env.example .env
# Edit .env with your preferred API key
```

## Usage

### Generate Documentation and Agent Prompts

```bash
# Using npx (no installation needed)
npx @ai-coders/context generate /path/to/your/repo

# Or if installed globally
ai-context generate /path/to/your/repo
```

### Provider-Specific Usage

```bash
# OpenRouter (default) - access to 100+ models
npx @ai-coders/context generate /path/to/repo

# OpenAI - use GPT models directly
npx @ai-coders/context generate /path/to/repo -p openai -m gpt-4

# Anthropic - use Claude models directly
npx @ai-coders/context generate /path/to/repo -p anthropic -m claude-3-sonnet-20240229

# Google AI - use Gemini models
npx @ai-coders/context generate /path/to/repo -p gemini -m gemini-pro

# Grok - use X.AI models
npx @ai-coders/context generate /path/to/repo -p grok -m grok-beta
```

### Basic Options

```bash
# Specify output directory
npx @ai-coders/context generate /path/to/repo -o ./output

# Verbose output with cost tracking
npx @ai-coders/context generate /path/to/repo -v

# Generate only documentation
npx @ai-coders/context generate /path/to/repo --docs-only

# Generate only agent prompts
npx @ai-coders/context generate /path/to/repo --agents-only
```

### Advanced Filtering

```bash
# Exclude specific patterns
npx @ai-coders/context generate /path/to/repo --exclude "*.test.js" "temp/**"

# Include only specific patterns
npx @ai-coders/context generate /path/to/repo --include "src/**" "lib/**"
```

### Repository Analysis

```bash
# Analyze repository structure without generating content
npx @ai-coders/context analyze /path/to/repo
```

## Output Structure

The tool generates two main directories:

```
ai-context-output/
├── docs/           # Generated documentation
│   ├── README.md   # Project overview
│   ├── STRUCTURE.md # Repository structure
│   └── ...         # File-specific documentation
└── agents/         # AI agent prompts
    ├── README.md   # Agent index
    ├── code-reviewer.md
    ├── bug-fixer.md
    ├── feature-developer.md
    └── ...         # Specialized agent prompts
```

## Available Agent Types

- **Code Reviewer**: Reviews code for quality and best practices
- **Bug Fixer**: Analyzes and fixes bugs
- **Feature Developer**: Implements new features
- **Refactoring Specialist**: Improves code structure
- **Test Writer**: Creates comprehensive tests
- **Documentation Writer**: Maintains documentation
- **Performance Optimizer**: Optimizes code performance
- **Security Auditor**: Identifies security issues

## Supported Models

The tool supports any model available through OpenRouter:

- `google/gemini-2.0-pro` (default, fast and cost-effective)
- `anthropic/claude-3-sonnet` (balanced performance)
- `anthropic/claude-3-opus` (highest quality)
- `openai/gpt-4` (OpenAI's GPT-4)
- `openai/gpt-3.5-turbo` (OpenAI's GPT-3.5)
- And many more...

## Configuration

### Environment Variables

- `OPENROUTER_API_KEY`: Your OpenRouter API key (required)
- `OPENROUTER_MODEL`: Default model to use (optional)
- `OPENROUTER_BASE_URL`: Custom base URL (optional)

### CLI Options

```bash
Options:
  -o, --output <dir>         Output directory (default: "./ai-copilot-output")
  -k, --api-key <key>        OpenRouter API key
  -m, --model <model>        LLM model to use (default: "google/gemini-2.0-pro")
  --exclude <patterns...>    Patterns to exclude from analysis
  --include <patterns...>    Patterns to include in analysis
  --docs-only               Generate only documentation
  --agents-only             Generate only agent prompts
  -v, --verbose             Verbose output
  -h, --help                Display help
```

## Examples

### Basic Usage

```bash
# Generate everything for a React project
npx @ai-coders/context generate ./my-react-app

# Generate with custom output location
npx @ai-coders/context generate ./my-react-app -o ./project-docs
```

### Advanced Usage

```bash
# Exclude test files and node_modules, use GPT-4
npx @ai-coders/context generate ./my-project \
  --exclude "**/*.test.*" "node_modules/**" "dist/**" \
  --model "openai/gpt-4" \
  --verbose

# Only generate documentation for source files
npx @ai-coders/context generate ./my-project \
  --include "src/**" "lib/**" \
  --docs-only
```

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Run tests
npm test
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

- 🐛 [Report bugs](https://github.com/vinilana/ai-coders-context/issues)
- 💡 [Request features](https://github.com/vinilana/ai-coders-context/issues)
- 📖 [Documentation](https://github.com/vinilana/ai-coders-context/wiki)