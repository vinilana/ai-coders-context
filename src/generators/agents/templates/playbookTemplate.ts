import { AGENT_RESPONSIBILITIES, AGENT_BEST_PRACTICES } from '../agentConfig';
import { AgentType } from '../agentTypes';
import { formatDirectoryList } from '../../shared/directoryTemplateHelpers';
import { DocTouchpoint, KeySymbolInfo, AgentTemplateContext } from './types';
import { SemanticContext } from '../../../services/semantic';
import * as path from 'path';

function renderKeySymbols(symbols?: KeySymbolInfo[]): string {
  if (!symbols || symbols.length === 0) {
    return '- *Run with `--semantic` flag to discover relevant symbols.*';
  }

  return symbols
    .slice(0, 10)
    .map(s => `- \`${s.name}\` (${s.kind}) — ${path.basename(s.file)}:${s.line}`)
    .join('\n');
}

function renderArchitectureLayers(semantics?: SemanticContext): string {
  if (!semantics || !semantics.architecture.layers.length) {
    return '';
  }

  const lines = ['## Architecture Context', ''];
  for (const layer of semantics.architecture.layers.slice(0, 5)) {
    const symbolCount = layer.symbols.length;
    lines.push(`- **${layer.name}**: ${layer.description} (${symbolCount} symbols)`);
  }
  return lines.join('\n') + '\n';
}

export function renderAgentPlaybook(
  agentType: AgentType,
  topLevelDirectories: string[],
  touchpoints: DocTouchpoint[],
  semantics?: SemanticContext,
  relevantSymbols?: KeySymbolInfo[]
): string {
  const title = formatTitle(agentType);
  const responsibilities = AGENT_RESPONSIBILITIES[agentType] || ['Clarify this agent\'s responsibilities.'];
  const bestPractices = AGENT_BEST_PRACTICES[agentType] || ['Document preferred workflows.'];
  const directoryList = formatDirectoryList(topLevelDirectories);
  const markerId = `agent-${agentType}`;

  const touchpointList = touchpoints
    .map(tp => `- [${tp.title}](${tp.path}) — ${tp.marker}`)
    .join('\n');

  const keySymbolsSection = renderKeySymbols(relevantSymbols);
  const architectureSection = renderArchitectureLayers(semantics);

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
- Agent knowledge base: [AGENTS.md](../../AGENTS.md)
- Contributor guide: [CONTRIBUTING.md](../../CONTRIBUTING.md)

## Repository Starting Points
${directoryList || '- Add directory highlights relevant to this agent.'}

${architectureSection}## Key Symbols for This Agent
${keySymbolsSection}

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
