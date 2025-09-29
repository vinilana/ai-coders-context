import { createFrontMatter } from './frontMatter';
import { DocumentationTemplateContext } from './types';
import { formatDirectoryStats } from './common';

export function renderArchitectureNotes(context: DocumentationTemplateContext): string {
  const frontMatter = createFrontMatter({
    id: 'architecture-notes',
    goal: 'Describe how the system is assembled, key trade-offs, and active constraints.',
    requiredInputs: [
      'Recent architectural decisions or ADRs',
      'Observed service/module boundaries in the codebase',
      'Dependency graphs or build tooling insights'
    ],
    successCriteria: [
      'Decision list covers the most influential trade-offs',
      'Risks capture active constraints or technical debt',
      'Links to diagrams or monitors are up to date'
    ],
    relatedAgents: ['architect-specialist', 'backend-specialist']
  });

  const defaultSections = [
    'System boundaries and integration points',
    'Primary modules and their responsibilities',
    'Data flow between major components',
    'Dependencies worth highlighting'
  ];

  const directorySnapshot = formatDirectoryStats(context.directoryStats);

  return `${frontMatter}
<!-- agent-update:start:architecture-notes -->
# Architecture Notes

> TODO: Describe how the system is assembled and why the current design exists.

## Decisions To Record
${defaultSections.map(item => `- ${item}`).join('\n')}

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
