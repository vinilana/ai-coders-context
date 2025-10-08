import { AgentType } from '../agentTypes';
import { AGENT_RESPONSIBILITIES } from '../agentConfig';
import type { AgentIndexDocument, AgentIndexEntry } from '../../../types';

export function renderAgentIndex(agentTypes: readonly AgentType[], generatedAt: string): AgentIndexDocument {
  const agents: AgentIndexEntry[] = agentTypes.map(type => {
    const title = formatTitle(type);
    const primaryResponsibility = AGENT_RESPONSIBILITIES[type]?.[0] || 'Document responsibilities here.';
    return {
      id: type,
      name: title,
      primaryResponsibility,
      playbookPath: `./${type}.json`,
      description: `TODO: Summarize when to collaborate with the ${title.toLowerCase()} agent and expected deliverables.`
    };
  });

  return {
    generatedAt,
    summary: 'TODO: Explain how AI agents collaborate with maintainers to keep this repository healthy.',
    instructions: [
      'Review the plan queue and documentation touchpoints before starting a new task.',
      'Coordinate with maintainers when responsibilities overlap or require clarification.',
      'Record evidence and lessons learned back into documentation and test plans.'
    ],
    agents,
    updateChecklist: [
      'Verify every playbook remains current with the latest repository workflows.',
      'Sync primary responsibilities with AGENT_RESPONSIBILITIES definitions.',
      'Confirm playbook paths and referenced resources resolve correctly.'
    ],
    recommendedSources: [
      'docs/README.md — latest documentation map and update guidance.',
      '../../AGENTS.md — repository-wide onboarding notes for AI collaborators.',
      '../test-plan.json — TDD scenarios that anchor acceptance criteria.',
      '../context.json — repository summary for quick onboarding.'
    ]
  };
}

function formatTitle(agentType: string): string {
  return agentType
    .split('-')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
