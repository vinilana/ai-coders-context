import * as path from 'path';
import { RepoStructure } from '../../types';
import { GeneratorUtils } from '../shared';
import { AGENT_TYPES, AgentType } from './agentTypes';
import { renderAgentPlaybook, renderAgentIndex } from './templates';

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
    },
    {
      title: 'Glossary & Domain Concepts',
      path: '../docs/glossary.md',
      marker: 'ai-task:glossary'
    },
    {
      title: 'Data Flow & Integrations',
      path: '../docs/data-flow.md',
      marker: 'ai-task:data-flow'
    },
    {
      title: 'Security & Compliance Notes',
      path: '../docs/security.md',
      marker: 'ai-task:security'
    },
    {
      title: 'Tooling & Productivity Guide',
      path: '../docs/tooling.md',
      marker: 'ai-task:tooling'
    }
  ];

  constructor(..._legacyArgs: unknown[]) {}


  async generateAgentPrompts(
    repoStructure: RepoStructure,
    outputDir: string,
    selectedAgentTypes?: string[],
    verbose: boolean = false
  ): Promise<number> {
    const agentsDir = path.join(outputDir, 'agents');
    await GeneratorUtils.ensureDirectoryAndLog(agentsDir, verbose, 'Generating agent scaffold in');

    const context = this.buildContext(repoStructure);
    const agentTypes = this.resolveAgentSelection(selectedAgentTypes);

    let created = 0;
    for (const agentType of agentTypes) {
      const content = renderAgentPlaybook(agentType, context.topLevelDirectories, this.docTouchpoints);
      const filePath = path.join(agentsDir, `${agentType}.md`);
      await GeneratorUtils.writeFileWithLogging(filePath, content, verbose, `Created ${agentType}.md`);
      created += 1;
    }

    const indexPath = path.join(agentsDir, 'README.md');
    const indexContent = renderAgentIndex(agentTypes);
    await GeneratorUtils.writeFileWithLogging(indexPath, indexContent, verbose, 'Created README.md');
    created += 1;

    return created;
  }

  private resolveAgentSelection(selected?: string[]): readonly AgentType[] {
    if (!selected || selected.length === 0) {
      return AGENT_TYPES;
    }

    const allowed = new Set<AgentType>(AGENT_TYPES);
    const filtered = selected.filter((agent): agent is AgentType => allowed.has(agent as AgentType));
    return (filtered.length > 0 ? filtered : AGENT_TYPES) as readonly AgentType[];
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

  private formatDirectoryList(topLevelDirectories: string[]): string {
    if (topLevelDirectories.length === 0) {
      return '';
    }

    return topLevelDirectories.map(dir => `- \`${dir}/\` — Note why this directory matters for the agent.`).join('\n');
  }
}
