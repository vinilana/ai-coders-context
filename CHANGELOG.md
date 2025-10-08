# Changelog

## [0.5.0] - 2025-01-04
### Added
- Generated `agents/index.json` as the structured roster for playbooks, including responsibilities and guidance metadata.
- Added JSON-aware LLM prompts and tests so `test-plan.json`, `agents/*.json`, and the new index refresh correctly during fill runs.
- Introduced typed contracts for agent index entries and playbooks to support the new JSON output.

### Changed
- Agent playbooks now reference the JSON index and TDD plan, replacing Markdown handbook links throughout docs and plan templates.
- Repository summary and AGENTS.md references updated to target `agents/index.json` and reflect JSON-based workflows.
- CLI version bumped to `0.5.0` to capture the schema and workflow updates.

### Fixed
- Ensured documentation scaffolds and AI context references point to the new JSON resources, preventing stale links in generated guides.
- Updated test suites to validate JSON outputs for agents, plans, and fill operations, guarding against regressions.

[0.5.0]: https://github.com/vinilana/ai-coders-context/releases/tag/v0.5.0
