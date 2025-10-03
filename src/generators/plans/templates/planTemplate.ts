import { PlanTemplateContext } from './types';

export function renderPlanTemplate(context: PlanTemplateContext): string {
  const { title, slug, summary, agents, docs } = context;

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
    : '| Documentation Index | [README.md](../docs/README.md) | Key navigation and repository context |';

  return `---
id: plan-${slug}
ai_update_goal: "Define the stages, owners, and evidence required to complete ${title}."
required_inputs:
  - "Task summary or issue link describing the goal"
  - "Relevant documentation sections from docs/README.md"
  - "Matching agent playbooks from agents/README.md"
success_criteria:
  - "Stages list clear owners, deliverables, and success signals"
  - "Plan references documentation and agent resources that exist today"
  - "Follow-up actions and evidence expectations are recorded"
related_agents:
${relatedAgents}
---

# ${title} Plan

> ${summary?.trim() || 'TODO: Summarize the desired outcome and the problem this plan addresses.'}

## Task Snapshot
- **Primary goal:** TODO: Describe the outcome to achieve.
- **Success signal:** TODO: Define how the team will know the plan worked.
- **Key references:**
  - [Documentation Index](../docs/README.md)
  - [Agent Handbook](../agents/README.md)
  - [Plans Index](./README.md)

## Agent Lineup
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

## Agent Playbook Checklist
1. Pick the agent that matches your task.
2. Enrich the template with project-specific context or links.
3. Share the final prompt with your AI assistant.
4. Capture learnings in the relevant documentation file so future runs improve.

## Evidence & Follow-up
- TODO: List artifacts to collect (logs, PR links, test runs, design notes).
- TODO: Record follow-up actions or owners.
`;
}
