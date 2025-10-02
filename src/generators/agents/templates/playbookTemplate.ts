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

  const touchpointList = touchpoints
    .map(tp => `- [${tp.title}](${tp.path}) — ${tp.description}`)
    .join('\n') || '- Add documentation touchpoints relevant to this agent.';

  return `# ${title} Agent Playbook

## Mission
Describe how the ${title.toLowerCase()} agent supports the team and when to engage it.

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

## Collaboration Checklist
1. Confirm assumptions with issue reporters or maintainers.
2. Review open pull requests affecting this area.
3. Update the relevant doc section listed above and resolve any TODO placeholders.
4. Capture learnings back in [docs/README.md](../docs/README.md) or the appropriate task marker.

## Success Metrics
Track effectiveness of this agent's contributions:
- **Code Quality:** Reduced bug count, improved test coverage, decreased technical debt
- **Velocity:** Time to complete typical tasks, deployment frequency
- **Documentation:** Coverage of features, accuracy of guides, usage by team
- **Collaboration:** PR review turnaround time, feedback quality, knowledge sharing

**Target Metrics:**
- TODO: Define measurable goals specific to this agent (e.g., "Reduce bug resolution time by 30%")
- TODO: Track trends over time to identify improvement areas

## Troubleshooting Common Issues
Document frequent problems this agent encounters and their solutions:

### Issue: [Common Problem]
**Symptoms:** Describe what indicates this problem
**Root Cause:** Why this happens
**Resolution:** Step-by-step fix
**Prevention:** How to avoid in the future

**Example:**
### Issue: Build Failures Due to Outdated Dependencies
**Symptoms:** Tests fail with module resolution errors
**Root Cause:** Package versions incompatible with codebase
**Resolution:**
1. Review package.json for version ranges
2. Run \`npm update\` to get compatible versions
3. Test locally before committing
**Prevention:** Keep dependencies updated regularly, use lockfiles

## Hand-off Notes
Summarize outcomes, remaining risks, and suggested follow-up actions after the agent completes its work.

## Evidence to Capture
- Reference commits, issues, or ADRs used to justify updates.
- Command output or logs that informed recommendations.
- Follow-up items for maintainers or future agent runs.
- Performance metrics and benchmarks where applicable.
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
