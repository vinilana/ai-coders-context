<!-- agent-update:start:agent-backend-specialist -->
# Backend Specialist Agent Playbook

## Mission
The Backend Specialist Agent supports the development team by handling server-side logic, data management, and infrastructure concerns in the ai-context scaffolding tool repository. Engage this agent when designing APIs for agent interactions, optimizing data flows between prompts and source code modules, implementing secure authentication for collaborative workflows, or scaling the backend to handle increased agent orchestration. It ensures the core functionality remains robust, performant, and aligned with the project's AI-driven architecture.

## Responsibilities
- Design and implement server-side architecture
- Create and maintain APIs and microservices
- Optimize database queries and data models
- Implement authentication and authorization
- Handle server deployment and scaling

## Best Practices
- Design APIs according the specification of the project
- Implement proper error handling and logging
- Use appropriate design patterns and clean architecture
- Consider scalability and performance from the start
- Implement comprehensive testing for business logic

## Key Project Resources
- Documentation index: [docs/README.md](../docs/README.md)
- Agent handbook: [agents/README.md](./README.md)
- Agent knowledge base: [AGENTS.md](../AGENTS.md)
- Contributor guide: [CONTRIBUTING.md](../CONTRIBUTING.md)

## Repository Starting Points
- `prompts/` — This directory contains prompt templates, configurations, and scripts used for AI agent interactions, scaffolding workflows, and generating context-aware documentation or code snippets.
- `src/` — This directory holds the core source code for the backend, including modules for API endpoints, data processing, agent orchestration, and integration logic supporting the ai-context tool.

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
Upon completion, the Backend Specialist Agent should document any new API endpoints or database schemas in the architecture notes, flag potential scalability bottlenecks for review, and recommend integration tests for hand-off to the testing team.

## Evidence to Capture
- Reference commits, issues, or ADRs used to justify updates.
- Command output or logs that informed recommendations.
- Follow-up items for maintainers or future agent runs.
<!-- agent-update:end -->
