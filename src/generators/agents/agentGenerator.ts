import * as path from 'path';
import { RepoStructure } from '../../types';
import { GeneratorUtils } from '../shared';
import { AGENT_TYPES, AgentType } from './agentTypes';
import { AGENT_RESPONSIBILITIES, AGENT_BEST_PRACTICES } from './agentConfig';

interface AgentContext {
  topLevelDirectories: string[];
}

interface DocTouchpoint {
  title: string;
  path: string;
  marker: string;
}

export class AgentGenerator {
  private readonly docTouchpoints: DocTouchpoint[] = [
    {
      title: 'Documentation Index',
      path: '../docs/README.md',
      marker: 'ai-task:docs-index'
    },
    {
      title: 'Project Overview',
      path: '../docs/project-overview.md',
      marker: 'ai-task:project-overview'
    },
    {
      title: 'Architecture Notes',
      path: '../docs/architecture.md',
      marker: 'ai-task:architecture-notes'
    },
    {
      title: 'Development Workflow',
      path: '../docs/development-workflow.md',
      marker: 'ai-task:development-workflow'
    },
    {
      title: 'Testing Strategy',
      path: '../docs/testing-strategy.md',
      marker: 'ai-task:testing-strategy'
    }
  ];

  constructor(..._legacyArgs: unknown[]) {}


  async generateAgentPrompts(
    repoStructure: RepoStructure,
    outputDir: string,
    verbose: boolean = false
  ): Promise<number> {
    const agentsDir = path.join(outputDir, 'agents');
    await GeneratorUtils.ensureDirectoryAndLog(agentsDir, verbose, 'Generating agent scaffold in');

    const context = this.buildContext(repoStructure);

    let created = 0;
    for (const agentType of AGENT_TYPES) {
      const content = this.buildAgentContent(agentType, context);
      const filePath = path.join(agentsDir, `${agentType}.md`);
      await GeneratorUtils.writeFileWithLogging(filePath, content, verbose, `Created ${agentType}.md`);
      created += 1;
    }

    const indexPath = path.join(agentsDir, 'README.md');
    const indexContent = this.buildAgentIndex();
    await GeneratorUtils.writeFileWithLogging(indexPath, indexContent, verbose, 'Created README.md');
    created += 1;

    return created;
  }

  private buildContext(repoStructure: RepoStructure): AgentContext {
    const directorySet = new Set<string>();

    repoStructure.directories.forEach(dir => {
      const [firstSegment] = dir.relativePath.split(/[\\/]/).filter(Boolean);
      if (firstSegment) {
        directorySet.add(firstSegment);
      }
    });

    return {
      topLevelDirectories: Array.from(directorySet).sort()
    };
  }

  private buildAgentContent(agentType: AgentType, context: AgentContext): string {
    const title = GeneratorUtils.formatTitle(agentType);
    const responsibilities = AGENT_RESPONSIBILITIES[agentType] || ['Clarify this agent\'s responsibilities.'];
    const bestPractices = AGENT_BEST_PRACTICES[agentType] || ['Document preferred workflows.'];
    const directoryList = this.formatDirectoryList(context.topLevelDirectories);

    const touchpoints = this.docTouchpoints
      .map(tp => `- [${tp.title}](${tp.path}) — ${tp.marker}`)
      .join('\n');

    return `# ${title} Agent Playbook

## Mission
Describe how the ${title.toLowerCase()} agent supports the team and when to engage it.

## Responsibilities
${responsibilities.map(item => `- ${item}`).join('\n')}

## Best Practices
${bestPractices.map(item => `- ${item}`).join('\n')}

## Key Project Resources
- Documentation index: [docs/README.md](../docs/README.md)
- Agent handbook: [agents/README.md](./README.md)
- Contributor guide: [AGENTS.md](../AGENTS.md)

## Repository Starting Points
${directoryList || '- Add directory highlights relevant to this agent.'}

## Documentation Touchpoints
${touchpoints}

## Collaboration Checklist
1. Confirm assumptions with issue reporters or maintainers.
2. Review open pull requests affecting this area.
3. Update the relevant doc section listed above and remove any resolved \`ai-slot\` placeholders.
4. Capture learnings back in [docs/README.md](../docs/README.md) or the appropriate task marker.

## Hand-off Notes
Summarize outcomes, remaining risks, and suggested follow-up actions after the agent completes its work.

## Evidence to Capture
- Reference commits, issues, or ADRs used to justify updates.
- Command output or logs that informed recommendations.
- Follow-up items for maintainers or future agent runs.
`;
  }

  private buildAgentIndex(): string {
    const agentEntries = AGENT_TYPES.map(type => {
      const title = GeneratorUtils.formatTitle(type);
      const primaryResponsibility = AGENT_RESPONSIBILITIES[type]?.[0] || 'Document responsibilities here.';
      return `- [${title}](./${type}.md) — ${primaryResponsibility}`;
    }).join('\n');

    return `# Agent Handbook

This directory contains ready-to-customize playbooks for AI agents collaborating on the repository.

## Available Agents
${agentEntries}

## How To Use These Playbooks
1. Pick the agent that matches your task.
2. Enrich the template with project-specific context or links.
3. Share the final prompt with your AI assistant.
4. Capture learnings in the relevant documentation file so future runs improve.

## Related Resources
- [Documentation Index](../docs/README.md)
- [Contributor Guidelines](../AGENTS.md)
`;
  }

  private formatDirectoryList(topLevelDirectories: string[]): string {
    if (topLevelDirectories.length === 0) {
      return '';
    }

    return topLevelDirectories.map(dir => `- \`${dir}/\` — Note why this directory matters for the agent.`).join('\n');
  }
}
