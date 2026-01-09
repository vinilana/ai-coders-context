# Provider Configuration

This guide covers setting up API keys and configuring LLM providers.

## Supported Providers

| Provider | Models | Environment Variable |
|----------|--------|---------------------|
| OpenRouter | `x-ai/grok-4-fast`, `anthropic/claude-sonnet-4`, etc. | `OPENROUTER_API_KEY` |
| OpenAI | `gpt-4o`, `gpt-4-turbo`, etc. | `OPENAI_API_KEY` |
| Anthropic | `claude-sonnet-4-20250514`, `claude-opus-4-20250514`, etc. | `ANTHROPIC_API_KEY` |
| Google | `gemini-2.0-flash`, `gemini-1.5-pro`, etc. | `GOOGLE_API_KEY` |

## Auto-Detection

The CLI auto-detects available API keys from environment variables. Set one or more keys, and the first available will be used:

```bash
export OPENROUTER_API_KEY=sk-or-...
export ANTHROPIC_API_KEY=sk-ant-...
```

## Manual Selection

Override with `--provider` and `--model`:

```bash
# Use Anthropic's Claude
ANTHROPIC_API_KEY=sk-ant-... npx @ai-coders/context fill . --provider anthropic

# Use OpenAI's GPT-4
OPENAI_API_KEY=sk-... npx @ai-coders/context fill . --provider openai --model gpt-4o

# Use Google's Gemini
GOOGLE_API_KEY=... npx @ai-coders/context fill . --provider google --model gemini-2.0-flash
```

## Using .env Files

Create a `.env` file in your project root:

```bash
# .env
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=anthropic/claude-sonnet-4

# Or use a specific provider
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

The CLI loads `.env` automatically.

## Model Defaults

Each provider has a default model:

| Provider | Default Model |
|----------|---------------|
| OpenRouter | `x-ai/grok-4-fast` |
| OpenAI | `gpt-4o` |
| Anthropic | `claude-sonnet-4-20250514` |
| Google | `gemini-2.0-flash` |

Override with the model-specific environment variable:

```bash
OPENROUTER_MODEL=meta-llama/llama-3.1-70b-instruct
OPENAI_MODEL=gpt-4-turbo
ANTHROPIC_MODEL=claude-opus-4-20250514
GOOGLE_MODEL=gemini-1.5-pro
```

## Custom Base URLs

For self-hosted or proxy deployments:

```bash
npx @ai-coders/context fill . \
  --provider openai \
  --base-url https://my-proxy.example.com/v1
```

## Provider Selection Priority

When multiple keys are set, the CLI checks in this order:

1. Explicit `--provider` flag
2. `AI_CONTEXT_PROVIDER` environment variable
3. First available key: OpenRouter → OpenAI → Anthropic → Google

## Token Usage

The CLI displays token usage after each operation:

```
✓ Updated architecture.md
  Tokens: 1,234 in / 567 out
```

Monitor your usage to manage API costs.

## Troubleshooting

### "No API key found"

Set at least one API key:
```bash
export OPENROUTER_API_KEY=your-key-here
```

### "Invalid API key"

Verify your key is correct and has the necessary permissions.

### "Rate limit exceeded"

Wait and retry, or use `--limit` to process fewer files per run.

### "Model not found"

Check the model name matches your provider's naming convention.
