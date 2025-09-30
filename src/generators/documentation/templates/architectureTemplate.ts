import { DocumentationTemplateContext } from './types';
import { formatDirectoryStats } from './common';

export function renderArchitectureNotes(context: DocumentationTemplateContext): string {
  const directorySnapshot = formatDirectoryStats(context.directoryStats);
  const coreComponentsSection = directorySnapshot || '- *Add notes for each core component or module.*';

  return `<!-- agent-update:start:architecture-notes -->
# Architecture Notes

> TODO: Describe how the system is assembled and why the current design exists.

## System Architecture Overview
- Summarize the top-level topology (monolith, modular service, microservices) and deployment model.
- Highlight how requests traverse the system and where control pivots between layers.

## Core System Components
${coreComponentsSection}

## Internal System Boundaries
- Document seams between domains, bounded contexts, or service ownership.
- Note data ownership, synchronization strategies, and shared contract enforcement.

## System Integration Points
- Map inbound interfaces (APIs, events, webhooks) and the modules that own them.
- Capture orchestration touchpoints where this system calls or coordinates other internal services.

## External Service Dependencies
- List SaaS platforms, third-party APIs, or infrastructure services the system relies on.
- Describe authentication methods, rate limits, and failure considerations for each dependency.

## Key Decisions & Trade-offs
- Summarize architectural decisions, experiments, or ADR outcomes that shape the current design.
- Reference supporting documents and explain why selected approaches won over alternatives.

## Diagrams
- Link architectural diagrams or add mermaid definitions here.

## Risks & Constraints
- Document performance constraints, scaling considerations, or external system assumptions.

## Top Directories Snapshot
${directorySnapshot}

<!-- agent-readonly:guidance -->
## AI Update Checklist
1. Review ADRs, design docs, or major PRs for architectural changes.
2. Verify that each documented decision still holds; mark superseded choices clearly.
3. Capture upstream/downstream impacts (APIs, events, data flows).
4. Update Risks & Constraints with active incident learnings or TODO debt.
5. Link any new diagrams or dashboards referenced in recent work.

<!-- agent-readonly:sources -->
## Acceptable Sources
- ADR folders, \`/docs/architecture\` notes, or RFC threads.
- Dependency visualisations from build tooling or scripts.
- Issue tracker discussions vetted by maintainers.

## Related Resources
- [Project Overview](./project-overview.md)
- Update [agents/README.md](../agents/README.md) when architecture changes.

<!-- agent-update:end -->
`;
}
