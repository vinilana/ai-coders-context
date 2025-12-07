import { getAgentById, AGENT_RESPONSIBILITIES, AGENT_BEST_PRACTICES } from '../agentRegistry';
import { MARKER_IDS, Markers } from '../../shared/markerRegistry';
import { DocTouchpoint } from './types';

/**
 * Agent Playbook Template
 *
 * REFACTORED:
 * - Uses centralized agent registry for metadata
 * - Uses MARKER_IDS for consistent marker generation
 * - Reduces hardcoded content by pulling from registry
 * - Each agent gets a customized description from registry
 */
export function renderAgentPlaybook(
  agentType: string,
  topLevelDirectories: string[],
  touchpoints: DocTouchpoint[]
): string {
  const agent = getAgentById(agentType);
  const title = agent?.title ?? formatTitle(agentType);
  const description = agent?.description ?? `Describe how the ${title.toLowerCase()} agent supports the team.`;

  const responsibilities = agent?.responsibilities ?? AGENT_RESPONSIBILITIES[agentType] ?? ['Clarify this agent\'s responsibilities.'];
  const bestPractices = agent?.bestPractices ?? AGENT_BEST_PRACTICES[agentType] ?? ['Document preferred workflows.'];

  const directoryList = formatSimpleDirectoryList(topLevelDirectories);
  const markerId = MARKER_IDS.agent(agentType);

  const touchpointList = touchpoints
    .map(tp => `- [${tp.title}](${tp.path}) — ${tp.marker}`)
    .join('\n');

  const content = `# ${title} Agent Playbook

## Mission
${description}

## Responsibilities
${formatList(responsibilities)}

## Best Practices
${formatList(bestPractices)}

## Key Project Resources
- Documentation index: [docs/README.md](../docs/README.md)
- Agent handbook: [agents/README.md](./README.md)
- Agent knowledge base: [AGENTS.md](../../AGENTS.md)
- Contributor guide: [CONTRIBUTING.md](../../CONTRIBUTING.md)

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

## Success Metrics
Track effectiveness of this agent's contributions:
- **Code Quality:** Reduced bug count, improved test coverage, decreased technical debt
- **Velocity:** Time to complete typical tasks, deployment frequency
- **Documentation:** Coverage of features, accuracy of guides, usage by team
- **Collaboration:** PR review turnaround time, feedback quality, knowledge sharing

## Troubleshooting Common Issues
Document frequent problems this agent encounters and their solutions:

### Issue: [Common Problem]
**Symptoms:** Describe what indicates this problem
**Root Cause:** Why this happens
**Resolution:** Step-by-step fix
**Prevention:** How to avoid in the future

## Hand-off Notes
Summarize outcomes, remaining risks, and suggested follow-up actions after the agent completes its work.

## Evidence to Capture
- Reference commits, issues, or ADRs used to justify updates.
- Command output or logs that informed recommendations.
- Follow-up items for maintainers or future agent runs.`;

  return Markers.wrap(markerId, content);
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

function formatSimpleDirectoryList(directories: string[]): string {
  if (!directories.length) {
    return '';
  }
  return directories.map(dir => `- \`${dir}/\``).join('\n');
}
