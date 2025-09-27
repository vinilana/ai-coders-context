# @ai-coders/context

[![npm version](https://badge.fury.io/js/@ai-coders%2Fcontext.svg)](https://www.npmjs.com/package/@ai-coders/context)
[![CI](https://github.com/vinilana/ai-coders-context/actions/workflows/ci.yml/badge.svg)](https://github.com/vinilana/ai-coders-context/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight CLI that scaffolds living documentation and AI-agent playbooks for any repository—no LLMs or API keys required. The generated structure gives teams a consistent starting point for knowledge sharing while keeping everything under version control.

## ✨ What You Get

- 📚 `docs/` folder with a documentation index plus ready-to-edit guides (overview, architecture, workflow, testing)
- 🤖 `agents/` folder containing playbooks for common engineering agents and a handy index
- 🔁 Repeatable scaffolding that you can re-run as the project evolves
- 🧭 Repository-aware templates that highlight top-level directories for quick orientation
- 🧠 AI-ready front matter and `ai-task` markers so assistants know exactly what to refresh

## 📦 Installation

Use `npx` to run the CLI without installing globally:

```bash
npx @ai-coders/context init /path/to/repo
```

Or add it to your dev dependencies:

```bash
npm install --save-dev @ai-coders/context
```

## 🚀 Quick Start

```bash
# Scaffold docs and agents into ./.context
npx @ai-coders/context init ./my-repo

# Only generate docs
npx @ai-coders/context init ./my-repo docs

# Only generate agent playbooks, with a custom output directory
npx @ai-coders/context init ./my-repo agents --output ./knowledge-base

# Let an LLM refresh the scaffold (preview the first 3 updates)
npx @ai-coders/context llm-fill ./my-repo --output ./.context --dry-run --limit 3
```

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

- Gathering repository context and locating `ai-task`/`ai-slot` markers.
- Updating documentation sections while satisfying the YAML front matter criteria.
- Aligning agent playbooks with the refreshed docs and recording evidence for maintainers.

Share that prompt verbatim with your assistant to keep updates consistent across teams.

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

### `scaffold`
Alias for `init`. Use whichever verb fits your workflow.

### `llm-fill`
Use an LLM to refresh scaffolded docs and agent playbooks automatically.

```
Usage: ai-context llm-fill <repo-path>

Options:
  -o, --output <dir>      Scaffold directory containing docs/ and agents/ (default: ./.context)
  -k, --api-key <key>     API key for the selected LLM provider
  -m, --model <model>     LLM model to use (default: google/gemini-2.5-flash-preview-05-20)
  -p, --provider <name>   Provider (openrouter, openai, anthropic, gemini, grok)
      --prompt <file>     Instruction prompt to follow (default: prompts/update_scaffold_prompt.md)
      --dry-run           Preview changes without writing files
      --all               Process every Markdown file even if no TODO markers remain
      --limit <number>    Maximum number of files to update in one run
  -h, --help              Display help for command
```

Under the hood, the command loads the prompt above, scans for `ai-task` or `ai-slot` markers, and asks the LLM to produce the fully updated Markdown. Combine it with `--dry-run` to review responses before committing.

Prefer driving the update elsewhere? Just grab [`prompts/update_scaffold_prompt.md`](./prompts/update_scaffold_prompt.md) and run it in your favorite playground or agent host. When you’re ready to automate, drop your API key in `.env` (for example `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`) and let `llm-fill` handle the edits inline.

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
