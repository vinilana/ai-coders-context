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
        .map(doc => `| ${doc.title} | [${doc.file}](../docs/${doc.file}) | ${doc.marker} | ${doc.primaryInputs} |`)
        .join('\n')
    : '| Documentation Index | [README.md](../docs/README.md) | ai-task:docs-index | Current docs directory listing |';

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

<!-- ai-task:plan-${slug} -->
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
| Guide | File | Task Marker | Primary Inputs |
| --- | --- | --- | --- |
${docsTableRows}

## Working Stages
### Stage 1 — Discovery & Alignment
- TODO: Outline discovery tasks and the agent/owner who leads them.
- TODO: Capture open questions that require clarification.

### Stage 2 — Implementation & Iteration
- TODO: Note build tasks, pairing expectations, and review cadence.
- TODO: Reference docs or playbooks to keep changes aligned.

### Stage 3 — Validation & Handoff
- TODO: Detail testing, verification, and documentation updates.
- TODO: Document evidence the team must capture for maintainers.

## Agent Playbook Checklist
1. Pick the agent that matches your task.
2. Enrich the template with project-specific context or links.
3. Share the final prompt with your AI assistant.
4. Capture learnings in the relevant documentation file so future runs improve.

## Evidence & Follow-up
- TODO: List artifacts to collect (logs, PR links, test runs, design notes).
- TODO: Record follow-up actions or owners.

<!-- /ai-task:plan-${slug} -->
`;
}
