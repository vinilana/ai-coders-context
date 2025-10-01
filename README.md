# @ai-coders/context

[![npm version](https://badge.fury.io/js/@ai-coders%2Fcontext.svg)](https://www.npmjs.com/package/@ai-coders/context)
[![CI](https://github.com/vinilana/ai-coders-context/actions/workflows/ci.yml/badge.svg)](https://github.com/vinilana/ai-coders-context/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<img width="663" height="192" alt="image" src="https://github.com/user-attachments/assets/4b07f61d-6800-420a-ae91-6e952cbc790d" />


A lightweight CLI that scaffolds living documentation and AI-agent playbooks for any repository—no LLMs or API keys required. The generated structure gives teams a consistent starting point for knowledge sharing while keeping everything under version control.

## ⚙️ Requirements

- Node.js 20+ (we currently test on 20, 22, 23, and 24)

## ✨ What You Get

- 📚 `docs/` folder with a documentation index plus ready-to-edit guides (overview, architecture, workflow, testing)
- 🤖 `agents/` folder containing playbooks for common engineering agents and a handy index
- 🔁 Repeatable scaffolding that you can re-run as the project evolves
- 🧭 Repository-aware templates that highlight top-level directories for quick orientation
- 🧠 AI-ready front matter and `agent-update` markers so assistants know exactly what to refresh

## 📦 Installation

Use `npx` to run the CLI without installing globally:

```bash
npx @ai-coders/context
```

Or add it to your dev dependencies:

```bash
npm install --save-dev @ai-coders/context
```

## 🚀 Quick Start

```bash
# Launch the interactive wizard
npx @ai-coders/context


# Scaffold docs and agents into ./.context
npx @ai-coders/context init ./my-repo

# Only generate docs
npx @ai-coders/context init ./my-repo docs

# Only generate agent playbooks, with a custom output directory
npx @ai-coders/context init ./my-repo agents --output ./knowledge-base

# Fill docs and agents with the repo context (preview the first 3 updates)
npx @ai-coders/context fill ./my-repo --output ./.context --limit 3

# Draft a collaboration plan seeded with agent and doc touchpoints
npx @ai-coders/context plan release-readiness --output ./.context

# Let the LLM enrich an existing plan with the latest context
npx @ai-coders/context plan release-readiness --output ./.context --fill --dry-run
```

> ℹ️ The CLI pings npm for fresh releases at startup. Set `AI_CONTEXT_DISABLE_UPDATE_CHECK=true` to skip the check.

After running the command, inspect the generated structure:

```
.context/
├── agents/
│   ├── README.md
│   ├── code-reviewer.md
│   └── ...
└── docs/
    ├── README.md
    ├── architecture.md
    └── ...
```

Customize the Markdown files to reflect your project’s specifics and commit them alongside the code.

## 🧠 Guided Updates for AI Assistants

Need help filling in the scaffold? Use [`prompts/update_scaffold_prompt.md`](./prompts/update_scaffold_prompt.md) as the canonical instruction set for any LLM or CLI agent. It walks through:

- Gathering repository context and locating `agent-update`/`agent-fill` markers.
- Updating documentation sections while satisfying the YAML front matter criteria.
- Aligning agent playbooks with the refreshed docs and recording evidence for maintainers.

Share that prompt verbatim with your assistant to keep updates consistent across teams.

### Available Doc Guides & Agent Types

The scaffold includes the following guides and playbooks out of the box:

- Docs: `project-overview`, `architecture`, `development-workflow`, `testing-strategy`, `glossary`, `data-flow`, `security`, `tooling`
- Agents: `code-reviewer`, `bug-fixer`, `feature-developer`, `refactoring-specialist`, `test-writer`, `documentation-writer`, `performance-optimizer`, `security-auditor`, `backend-specialist`, `frontend-specialist`, `architect-specialist`

### AI Marker Reference

- `<!-- agent-update:start:section-id --> … <!-- agent-update:end -->` wrap the sections that AI assistants should rewrite with up-to-date project knowledge.
- `<!-- agent-fill:slot-id --> … <!-- /agent-fill -->` highlight inline placeholders that must be replaced with concrete details before removing the wrapper.
- `<!-- agent-readonly:context -->` flags guidance that should remain as-is; treat the adjacent content as instructions rather than editable prose.

When contributing, focus edits inside `agent-update` regions or `agent-fill` placeholders and leave `agent-readonly` guidance untouched unless you have explicit maintainer approval.

## 🛠 Commands

### `init`
Scaffold documentation and/or agent playbooks.

```
Usage: ai-context init <repo-path> [type]

Arguments:
  repo-path               Path to the repository you want to scan
  type                    "docs", "agents", or "both" (default)

Options:
  -o, --output <dir>      Output directory (default: ./.context)
  --exclude <patterns...> Glob patterns to skip during the scan
  --include <patterns...> Glob patterns to explicitly include
  -v, --verbose           Print detailed progress information
  -h, --help              Display help for command
```

### `fill`
Use an LLM to refresh scaffolded docs and agent playbooks automatically.

```
Usage: ai-context fill <repo-path>

Options:
  -o, --output <dir>      Scaffold directory containing docs/ and agents/ (default: ./.context)
  -k, --api-key <key>     API key for the selected LLM provider
  -m, --model <model>     LLM model to use (default: x-ai/grok-4-fast)
  -p, --provider <name>   Provider (openrouter only)
      --base-url <url>    Custom base URL for OpenRouter
      --prompt <file>     Instruction prompt to follow (optional; uses bundled instructions when omitted)
      --limit <number>    Maximum number of files to update in one run
  -h, --help              Display help for command
```

Under the hood, the command loads the prompt above, iterates over every Markdown file in `.context/docs` and `.context/agents`, and asks the LLM to produce the fully updated content.

### `plan`
Create a collaboration plan that links documentation guides and agent playbooks, or fill an existing plan with LLM assistance.

```
Usage: ai-context plan <plan-name>

Options:
  -o, --output <dir>      Scaffold directory containing docs/ and agents/ (default: ./.context)
      --title <title>     Custom title for the plan document
      --summary <text>    Seed the plan with a short summary or goal statement
  -f, --force             Overwrite the plan if it already exists (scaffold mode)
      --fill              Use an LLM to fill or update the plan instead of scaffolding
  -r, --repo <path>       Repository root to summarize for additional context (fill mode)
  -k, --api-key <key>     API key for the selected LLM provider (fill mode)
  -m, --model <model>     LLM model to use (default: x-ai/grok-4-fast)
  -p, --provider <name>   Provider (openrouter only)
      --base-url <url>    Custom base URL for OpenRouter
      --prompt <file>     Instruction prompt to follow (optional; uses bundled instructions when omitted)
      --dry-run           Preview changes without writing files
      --include <patterns...>  Glob patterns to include during repository analysis
      --exclude <patterns...>  Glob patterns to exclude from repository analysis
  -h, --help              Display help for command
```

In scaffold mode the command creates `.context/plans/<plan-name>.md`, keeps a `plans/README.md` index, and reminds contributors to consult the agent handbook before delegating work to an AI assistant. In fill mode it will scaffold the plan automatically if it does not exist, then read the plan plus its referenced docs and agent playbooks, send that context to the LLM, and either preview or write the updated Markdown.

💡 Tip: run `npx @ai-coders/context` with no arguments to enter an interactive mode that guides you through scaffold and LLM-fill options.

Prefer driving the update elsewhere? Just grab [`prompts/update_scaffold_prompt.md`](./prompts/update_scaffold_prompt.md) and run it in your favorite playground or agent host. When you’re ready to automate, drop your API key in `.env` (for example `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`) and let `fill` handle the edits inline.

## 🧰 Local Development

```bash
git clone https://github.com/vinilana/ai-coders-context.git
cd ai-coders-context
npm install
npm run build
npm run test
```

During development you can run the CLI directly against TypeScript sources:

```bash
npm run dev -- ./path/to/repo
```

## 🤝 Contributing

See [`AGENTS.md`](./AGENTS.md) for contributor guidelines, coding standards, and release tips. Pull requests are welcome!

## 📄 License

MIT © Vinícius Lana
