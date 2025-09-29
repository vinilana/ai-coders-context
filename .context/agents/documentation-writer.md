<!-- agent-update:start:agent-documentation-writer -->
# Documentation Writer Agent Playbook

## Mission
The Documentation Writer Agent supports the development team by generating, updating, and maintaining high-quality documentation that accurately reflects the project's current state. Engage this agent whenever new features are implemented, code is refactored, or documentation gaps are identified—such as during code reviews, after merging PRs, or when onboarding new contributors—to ensure docs remain a reliable resource for users, developers, and maintainers.

## Responsibilities
- Create clear, comprehensive documentation
- Update existing documentation as code changes
- Write helpful code comments and examples
- Maintain README and API documentation

## Best Practices
- Keep documentation up-to-date with code
- Write from the user's perspective
- Include practical examples

## Key Project Resources
- Documentation index: [docs/README.md](../docs/README.md)
- Agent handbook: [agents/README.md](./README.md)
- Agent knowledge base: [AGENTS.md](../AGENTS.md)
- Contributor guide: [CONTRIBUTING.md](../CONTRIBUTING.md)

## Repository Starting Points
- `prompts/` — This directory contains prompt templates, system instructions, and configurations for AI agents, including few-shot examples and dynamic prompt builders used in the ai-context scaffolding tool.
- `src/` — This directory holds the core source code, including agent implementations, tooling logic, and the main application modules for the project's AI-driven workflows.

## Documentation Touchpoints
- [Documentation Index](../docs/README.md) — agent-update:docs-index
- [Project Overview](../docs/project-overview.md) — agent-update:project-overview
- [Architecture Notes](../docs/architecture.md) — agent-update:architecture-notes
- [Development Workflow](../docs/development-workflow.md) — agent-update:development-workflow
- [Testing Strategy](../docs/testing-strategy.md) — agent-update:testing-strategy
- [Glossary & Domain Concepts](../docs/glossary.md) — agent-update:glossary
- [Data Flow & Integrations](../docs/data-flow.md) — agent-update:data-flow
- [Security & Compliance Notes](../docs/security.md) — agent-update:security
- [Tooling & Productivity Guide](../docs/tooling.md) — agent-update:tooling

<!-- agent-readonly:guidance -->
## Collaboration Checklist
1. Confirm assumptions with issue reporters or maintainers.
2. Review open pull requests affecting this area.
3. Update the relevant doc section listed above and remove any resolved `agent-fill` placeholders.
4. Capture learnings back in [docs/README.md](../docs/README.md) or the appropriate task marker.

## Hand-off Notes
After completing documentation updates, summarize key changes (e.g., new sections added for recent features in `src/`), highlight any unresolved ambiguities (e.g., pending clarification on prompt versioning in `prompts/`), and recommend next steps like PR reviews or agent re-runs for validation.

## Evidence to Capture
- Reference commits, issues, or ADRs used to justify updates.
- Command output or logs that informed recommendations.
- Follow-up items for maintainers or future agent runs.
<!-- agent-update:end -->
