/**
 * REFERENCE ONLY - This file is not used by generators anymore.
 *
 * Scaffold structures are now defined in:
 * src/generators/shared/scaffoldStructures.ts
 *
 * This file serves as historical reference for the structure/content
 * that should be generated for this plan type.
 *
 * @deprecated Since v2.0.0 scaffold system
 */
import { PlanTemplateContext, CodebaseSnapshot } from './types';
import { SemanticContext } from '../../../services/semantic';

/**
 * Wrap plan content with enhanced YAML front matter including agent lineup.
 * This allows AI agents to quickly read which agents are needed for the plan.
 */
function wrapWithPlanFrontMatter(
  content: string,
  options: {
    agents: Array<{ type: string; role?: string }>;
    docs: string[];
    phases: Array<{ id: string; name: string; prevcPhase: string }>;
  }
): string {
  const date = new Date().toISOString().split('T')[0];

  // Format agents as YAML array
  const agentsYaml = options.agents.length > 0
    ? options.agents.map(a => `  - type: "${a.type}"${a.role ? `\n    role: "${a.role}"` : ''}`).join('\n')
    : '  - type: "documentation-writer"';

  // Format docs as YAML array
  const docsYaml = options.docs.length > 0
    ? options.docs.map(d => `  - "${d}"`).join('\n')
    : '  - "README.md"';

  // Format phases as YAML array
  const phasesYaml = options.phases.map(p =>
    `  - id: "${p.id}"\n    name: "${p.name}"\n    prevc: "${p.prevcPhase}"`
  ).join('\n');

  return `---
status: unfilled
generated: ${date}
agents:
${agentsYaml}
docs:
${docsYaml}
phases:
${phasesYaml}
---

${content}`;
}

function renderCodebaseSnapshot(snapshot?: CodebaseSnapshot): string {
  if (!snapshot) {
    return `- **Codebase analysis:** *No codebase insights available.*`;
  }

  const lines = [
    `- **Total files analyzed:** ${snapshot.totalFiles}`,
    `- **Total symbols discovered:** ${snapshot.totalSymbols}`
  ];

  if (snapshot.layers.length > 0) {
    lines.push(`- **Architecture layers:** ${snapshot.layers.join(', ')}`);
  }

  if (snapshot.patterns.length > 0) {
    lines.push(`- **Detected patterns:** ${snapshot.patterns.join(', ')}`);
  }

  if (snapshot.entryPoints.length > 0) {
    lines.push(`- **Entry points:** ${snapshot.entryPoints.slice(0, 3).join(', ')}${snapshot.entryPoints.length > 3 ? ` (+${snapshot.entryPoints.length - 3} more)` : ''}`);
  }

  return lines.join('\n');
}

function renderKeyComponents(semantics?: SemanticContext): string {
  if (!semantics) {
    return '';
  }

  const { symbols } = semantics;
  const keyClasses = symbols.classes.filter(s => s.exported).slice(0, 5);
  const keyInterfaces = symbols.interfaces.filter(s => s.exported).slice(0, 5);

  if (keyClasses.length === 0 && keyInterfaces.length === 0) {
    return '';
  }

  const lines = ['### Key Components'];

  if (keyClasses.length > 0) {
    lines.push('**Core Classes:**');
    keyClasses.forEach(cls => {
      lines.push(`- \`${cls.name}\` — ${cls.location.file}:${cls.location.line}`);
    });
  }

  if (keyInterfaces.length > 0) {
    lines.push('', '**Key Interfaces:**');
    keyInterfaces.forEach(iface => {
      lines.push(`- \`${iface.name}\` — ${iface.location.file}:${iface.location.line}`);
    });
  }

  return lines.join('\n') + '\n';
}

export function renderPlanTemplate(context: PlanTemplateContext): string {
  const { title, slug, summary, agents, docs, semantics, codebaseSnapshot } = context;

  const relatedAgents = agents.length
    ? agents.map(agent => `  - "${agent.type}"`).join('\n')
    : '  - "documentation-writer"';

  const agentTableRows = agents.length
    ? agents
        .map(agent => `| ${agent.title} | TODO: Describe why this agent is involved. | [${agent.title}](../agents/${agent.type}.md) | ${agent.responsibility} |`)
        .join('\n')
    : '| Documentation Writer | TODO: Describe why this agent is involved. | [Documentation Writer](../agents/documentation-writer.md) | Create clear, comprehensive documentation |';

  const docsTableRows = docs.length
    ? docs
        .map(doc => `| ${doc.title} | [${doc.file}](../docs/${doc.file}) | ${doc.primaryInputs} |`)
        .join('\n')
    : '| Documentation Index | [README.md](../docs/README.md) | Current docs directory listing |';

  const content = `# ${title} Plan

> ${summary?.trim() || 'TODO: Summarize the desired outcome and the problem this plan addresses.'}

## Task Snapshot
- **Primary goal:** TODO: Describe the outcome to achieve.
- **Success signal:** TODO: Define how the team will know the plan worked.
- **Key references:**
  - [Documentation Index](../docs/README.md)
  - [Agent Handbook](../agents/README.md)
  - [Plans Index](./README.md)

## Codebase Context
${renderCodebaseSnapshot(codebaseSnapshot)}

${renderKeyComponents(semantics)}## Agent Lineup
| Agent | Role in this plan | Playbook | First responsibility focus |
| --- | --- | --- | --- |
${agentTableRows}

## Documentation Touchpoints
| Guide | File | Primary Inputs |
| --- | --- | --- |
${docsTableRows}

## Risk Assessment
Identify potential blockers, dependencies, and mitigation strategies before beginning work.

### Identified Risks
| Risk | Probability | Impact | Mitigation Strategy | Owner |
| --- | --- | --- | --- | --- |
| TODO: Dependency on external team | Medium | High | Early coordination meeting, clear requirements | TODO: Name |
| TODO: Insufficient test coverage | Low | Medium | Allocate time for test writing in Phase 2 | TODO: Name |

### Dependencies
- **Internal:** TODO: List dependencies on other teams, services, or infrastructure
- **External:** TODO: List dependencies on third-party services, vendors, or partners
- **Technical:** TODO: List technical prerequisites or required upgrades

### Assumptions
- TODO: Document key assumptions being made (e.g., "Assume current API schema remains stable")
- TODO: Note what happens if assumptions prove false

## Resource Estimation

### Time Allocation
| Phase | Estimated Effort | Calendar Time | Team Size |
| --- | --- | --- | --- |
| Phase 1 - Discovery | TODO: e.g., 2 person-days | 3-5 days | 1-2 people |
| Phase 2 - Implementation | TODO: e.g., 5 person-days | 1-2 weeks | 2-3 people |
| Phase 3 - Validation | TODO: e.g., 2 person-days | 3-5 days | 1-2 people |
| **Total** | **TODO: total** | **TODO: total** | **-** |

### Required Skills
- TODO: List required expertise (e.g., "React experience", "Database optimization", "Infrastructure knowledge")
- TODO: Identify skill gaps and training needs

### Resource Availability
- **Available:** TODO: List team members and their availability
- **Blocked:** TODO: Note any team members with conflicting priorities
- **Escalation:** TODO: Name of person to contact if resources are insufficient

## Working Phases
### Phase 1 — Discovery & Alignment
**Steps**
1. TODO: Outline discovery tasks and assign the accountable owner.
2. TODO: Capture open questions that require clarification.

**Commit Checkpoint**
- After completing this phase, capture the agreed context and create a commit (for example, \`git commit -m "chore(plan): complete phase 1 discovery"\`).

### Phase 2 — Implementation & Iteration
**Steps**
1. TODO: Note build tasks, pairing expectations, and review cadence.
2. TODO: Reference docs or playbooks to keep changes aligned.

**Commit Checkpoint**
- Summarize progress, update cross-links, and create a commit documenting the outcomes of this phase (for example, \`git commit -m "chore(plan): complete phase 2 implementation"\`).

### Phase 3 — Validation & Handoff
**Steps**
1. TODO: Detail testing, verification, and documentation updates.
2. TODO: Document evidence the team must capture for maintainers.

**Commit Checkpoint**
- Record the validation evidence and create a commit signalling the handoff completion (for example, \`git commit -m "chore(plan): complete phase 3 validation"\`).

## Rollback Plan
Document how to revert changes if issues arise during or after implementation.

### Rollback Triggers
When to initiate rollback:
- Critical bugs affecting core functionality
- Performance degradation beyond acceptable thresholds
- Data integrity issues detected
- Security vulnerabilities introduced
- User-facing errors exceeding alert thresholds

### Rollback Procedures
#### Phase 1 Rollback
- Action: Discard discovery branch, restore previous documentation state
- Data Impact: None (no production changes)
- Estimated Time: < 1 hour

#### Phase 2 Rollback
- Action: TODO: Revert commits, restore database to pre-migration snapshot
- Data Impact: TODO: Describe any data loss or consistency concerns
- Estimated Time: TODO: e.g., 2-4 hours

#### Phase 3 Rollback
- Action: TODO: Full deployment rollback, restore previous version
- Data Impact: TODO: Document data synchronization requirements
- Estimated Time: TODO: e.g., 1-2 hours

### Post-Rollback Actions
1. Document reason for rollback in incident report
2. Notify stakeholders of rollback and impact
3. Schedule post-mortem to analyze failure
4. Update plan with lessons learned before retry

## Evidence & Follow-up

List artifacts to collect (logs, PR links, test runs, design notes). Record follow-up actions or owners.
`;

  // Build frontmatter data
  const frontMatterAgents = agents.length > 0
    ? agents.map(a => ({ type: a.type, role: a.responsibility }))
    : [{ type: 'documentation-writer' }];

  const frontMatterDocs = docs.length > 0
    ? docs.map(d => d.file)
    : ['README.md'];

  const frontMatterPhases = [
    { id: 'phase-1', name: 'Discovery & Alignment', prevcPhase: 'P' },
    { id: 'phase-2', name: 'Implementation & Iteration', prevcPhase: 'E' },
    { id: 'phase-3', name: 'Validation & Handoff', prevcPhase: 'V' },
  ];

  return wrapWithPlanFrontMatter(content, {
    agents: frontMatterAgents,
    docs: frontMatterDocs,
    phases: frontMatterPhases,
  });
}
