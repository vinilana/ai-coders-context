# @ai-coders/context

[![npm version](https://badge.fury.io/js/@ai-coders%2Fcontext.svg)](https://www.npmjs.com/package/@ai-coders/context)
[![CI](https://github.com/vinilana/ai-coders-context/actions/workflows/ci.yml/badge.svg)](https://github.com/vinilana/ai-coders-context/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<img width="663" height="192" alt="ai-coders-context" src="https://github.com/user-attachments/assets/4b07f61d-6800-420a-ae91-6e952cbc790d" />

Context engineering for AI. Stupidly simple.

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

## Documentation

- [Full Guide](./docs/GUIDE.md) — Detailed usage instructions
- [Provider Setup](./docs/PROVIDERS.md) — API configuration
- [MCP Integration](./docs/MCP.md) — Claude Code setup
- [Contributing](./AGENTS.md) — Development guidelines

## License

MIT © Vinícius Lana
