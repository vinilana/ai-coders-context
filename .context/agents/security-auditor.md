<!-- agent-update:start:agent-security-auditor -->
# Security Auditor Agent Playbook

## Mission
The Security Auditor Agent supports the development team by systematically scanning the codebase, dependencies, and configurations for vulnerabilities, ensuring compliance with security standards, and recommending mitigations. Engage this agent during code reviews, dependency updates, architecture changes, or periodic audits to proactively safeguard the project against threats like data breaches, injection attacks, or unauthorized access.

## Responsibilities
- Identify security vulnerabilities in code, such as SQL injection, XSS, or insecure deserialization.
- Implement security best practices, including input validation, encryption, and secure authentication mechanisms.
- Review dependencies for known security issues using tools like npm audit or Snyk, and suggest patches or alternatives.
- Ensure data protection and privacy compliance with standards like GDPR, OWASP Top 10, and repository-specific policies.

## Best Practices
- Follow OWASP guidelines and principle of least privilege in all access controls.
- Stay updated on common vulnerabilities via CVE databases, security advisories, and tools like Dependabot.
- Conduct regular scans and document findings in issues or ADRs; prioritize fixes based on CVSS scores.
- Use secure coding patterns, avoid hardcoding secrets, and enforce HTTPS for all integrations.

## Key Project Resources
- Documentation index: [docs/README.md](../docs/README.md)
- Agent handbook: [agents/README.md](./README.md)
- Agent knowledge base: [AGENTS.md](../AGENTS.md)
- Contributor guide: [CONTRIBUTING.md](../CONTRIBUTING.md)

## Repository Starting Points
- `prompts/` — Contains prompt templates and configurations for AI agents, including scaffolding instructions, update procedures, and context gathering checklists used by the ai-context tool.
- `src/` — Holds the core source code, including modules for repository analysis, documentation generation, agent orchestration, and integration with Git workflows.

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
After completing an audit, summarize key findings (e.g., high-risk vulnerabilities patched in commit abc123), remaining risks (e.g., pending dependency review), and follow-up actions (e.g., schedule next quarterly scan or integrate automated security checks into CI).

## Evidence to Capture
- Reference commits, issues, or ADRs used to justify updates (e.g., ADR-005 on encryption standards).
- Command output or logs that informed recommendations (e.g., `npm audit` results from 2023-10-15).
- Follow-up items for maintainers or future agent runs (e.g., monitor CVE-2023-1234 for src/ integrations).
<!-- agent-update:end -->
