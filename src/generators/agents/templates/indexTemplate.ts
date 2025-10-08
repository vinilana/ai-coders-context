import { AgentType } from '../agentTypes';
import { AGENT_RESPONSIBILITIES } from '../agentConfig';

export function renderAgentIndex(agentTypes: readonly AgentType[]): string {
  const agentEntries = agentTypes.map(type => {
    const title = formatTitle(type);
    const primaryResponsibility = AGENT_RESPONSIBILITIES[type]?.[0] || 'Document responsibilities here.';
    return `- [${title}](./${type}.json) — ${primaryResponsibility}`;
  }).join('\n');

  return `# Agent Handbook

This directory contains ready-to-customize playbooks for AI agents collaborating on the repository.

## Available Agents
${agentEntries}

## How To Use These Playbooks
1. Pick the agent that matches your task.
2. Enrich the JSON template with project-specific context or links.
3. Share the structured prompt with your AI assistant.
4. Capture learnings in the relevant documentation file so future runs improve.

## Related Resources
- [Documentation Index](../docs/README.md)
- [Agent Knowledge Base](../../AGENTS.md)
- [Contributor Guidelines](../../CONTRIBUTING.md)
- JSON context: [\`../context.json\`](../context.json)
- TDD plan: [\`../test-plan.json\`](../test-plan.json)
`;
}

function formatTitle(agentType: string): string {
  return agentType
    .split('-')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
