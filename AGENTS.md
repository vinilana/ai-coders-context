# Repository Guidelines

## Project Structure & Module Organization
`src/index.ts` owns the Commander CLI and now scaffolds documentation and agent playbooks without hitting any LLM endpoints. Generators live under `src/generators`, utilities (CLI helpers, file mapping, git support) stay in `src/utils`, and type contracts in `src/types.ts`. Built artefacts land in `dist/` after `npm run build`, while generated assets are saved to `./.context`. Treat `docs/README.md` as the navigation hub for documentation deliverables and `agents/README.md` as the index for agent playbooks.

## Build, Test, and Development Commands
Install dependencies with `npm install`. Run `npm run dev` for an interactive TypeScript session via `tsx`, and `npm run build` to emit the executable CommonJS bundle in `dist/`. Execute the suite with `npm run test`; append `-- --watch` for iterative loops. Publish helpers (`npm run release`, `release:minor`, `release:major`) still bump the package version and push to npm—use them only from a clean main branch.

## Coding Style & Naming Conventions
The project relies on strict TypeScript; keep new files inside `src` and leave compiler checks enabled. Follow the prevailing two-space indentation, single quotes, and trailing commas for multi-line literals. Prefer named exports for modules, using PascalCase for classes, camelCase for variables and functions, and SCREAMING_SNAKE_CASE for constants. When you add scaffolding examples, cross-link them in `docs/README.md` and `agents/README.md` so contributors can discover the updates quickly.

## Testing Guidelines
Place Jest specs alongside the files they cover with the `*.test.ts` suffix. Validate CLI behaviours against the compiled binary (`dist/index.js`) to mirror how end-users invoke the tool. Run `npm run build && npm run test` before sending a PR, and include `npm run test -- --coverage` when you touch critical flows or generators.

## LLM-assisted Updates
Use `ai-context fill <repo>` to apply the shared prompt (`prompts/update_scaffold_prompt.md`) across the scaffold. Use a small `--limit` while validating new instructions. Always review the generated Markdown before committing.

## Commit & Pull Request Guidelines
Stick to Conventional Commits (`feat(scaffolding): ...`, `fix(cli): ...`, `chore:`). Keep messages imperative and scope names aligned with folder structure. In pull requests, describe the user impact, link related issues, and attach sample output from the new scaffolds (`docs/README.md`, `agents/README.md`) whenever behaviour changes. Confirm CI status and call out any manual follow-up for reviewers.

## Environment & Release Tips
No API keys are required for scaffolding; remove stale tokens from local `.env` files. Ensure `dist/` reflects the latest build before publishing and double-check that `package.json`'s version matches the intended release tag. If you modify the scaffold templates, refresh `docs/README.md` and `agents/README.md` in your commit so downstream teams receive the latest references.
## AI Context References
- Documentation index: `.context/docs/README.md`
- Agent playbooks: `.context/agents/README.md`

