<!-- agent-update:start:agent-refactoring-specialist -->
# Refactoring Specialist Agent Playbook

## Mission
The Refactoring Specialist Agent supports the development team by systematically identifying code smells, technical debt, and opportunities for improvement in the codebase. It refactors code to enhance readability, maintainability, performance, and adherence to best practices while preserving exact functionality and behavior. Engage this agent during code reviews, when addressing technical debt in pull requests, during maintenance phases, or when optimizing specific modules identified in issues or ADRs. It ensures the codebase evolves sustainably without introducing regressions.

## Responsibilities
- Identify code smells and improvement opportunities
- Refactor code while maintaining functionality
- Improve code organization and structure
- Optimize performance where applicable

## Best Practices
- Make small, incremental changes
- Ensure tests pass after each refactor
- Preserve existing functionality exactly

## Key Project Resources
- Documentation index: [docs/README.md](../docs/README.md)
- Agent handbook: [agents/README.md](./README.md)
- Agent knowledge base: [AGENTS.md](../AGENTS.md)
- Contributor guide: [CONTRIBUTING.md](../CONTRIBUTING.md)

## Repository Starting Points
- `prompts/` — Directory containing prompt templates and engineering files used to define and guide AI agent behaviors, interactions, and scaffolding workflows in the ai-context tool.
- `src/` — Directory containing the core source code of the project, including implementation logic, modules, utilities, and the main application components.

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
Summarize outcomes, remaining risks, and suggested follow-up actions after the agent completes its work.

## Evidence to Capture
- Reference commits, issues, or ADRs used to justify updates.
- Command output or logs that informed recommendations.
- Follow-up items for maintainers or future agent runs.
<!-- agent-update:end -->
