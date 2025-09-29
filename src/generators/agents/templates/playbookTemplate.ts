import { AGENT_RESPONSIBILITIES, AGENT_BEST_PRACTICES } from '../agentConfig';
import { AgentType } from '../agentTypes';
import { formatDirectoryList } from '../../shared/directoryTemplateHelpers';
import { DocTouchpoint } from './types';

export function renderAgentPlaybook(
  agentType: AgentType,
  topLevelDirectories: string[],
  touchpoints: DocTouchpoint[]
): string {
  const title = formatTitle(agentType);
  const responsibilities = AGENT_RESPONSIBILITIES[agentType] || ['Clarify this agent\'s responsibilities.'];
  const bestPractices = AGENT_BEST_PRACTICES[agentType] || ['Document preferred workflows.'];
  const directoryList = formatDirectoryList(topLevelDirectories);
  const markerId = `agent-${agentType}`;

  const touchpointList = touchpoints
    .map(tp => `- [${tp.title}](${tp.path}) — ${tp.marker}`)
    .join('\n');

  return `<!-- agent-update:start:${markerId} -->
# ${title} Agent Playbook

## Mission
Describe how the ${title.toLowerCase()} agent supports the team and when to engage it.

## Responsibilities
${formatList(responsibilities)}

## Best Practices
${formatList(bestPractices)}

## Key Project Resources
- Documentation index: [docs/README.md](../docs/README.md)
- Agent handbook: [agents/README.md](./README.md)
- Agent knowledge base: [AGENTS.md](../AGENTS.md)
- Contributor guide: [CONTRIBUTING.md](../CONTRIBUTING.md)

## Repository Starting Points
${directoryList || '- Add directory highlights relevant to this agent.'}

## Documentation Touchpoints
${touchpointList}

<!-- agent-readonly:guidance -->
## Collaboration Checklist
1. Confirm assumptions with issue reporters or maintainers.
2. Review open pull requests affecting this area.
3. Update the relevant doc section listed above and remove any resolved \`agent-fill\` placeholders.
4. Capture learnings back in [docs/README.md](../docs/README.md) or the appropriate task marker.

## Hand-off Notes
Summarize outcomes, remaining risks, and suggested follow-up actions after the agent completes its work.

## Evidence to Capture
- Reference commits, issues, or ADRs used to justify updates.
- Command output or logs that informed recommendations.
- Follow-up items for maintainers or future agent runs.
<!-- agent-update:end -->
`;
}

function formatTitle(agentType: string): string {
  return agentType
    .split('-')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatList(items: string[]): string {
  if (!items.length) {
    return '- _No entries defined yet._';
  }
  return items.map(item => `- ${item}`).join('\n');
}
