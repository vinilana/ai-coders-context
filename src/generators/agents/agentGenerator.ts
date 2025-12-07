import * as path from 'path';
import { RepoStructure } from '../../types';
import { GeneratorUtils } from '../shared';
import { AGENT_REGISTRY, AGENT_TYPES, AgentType, getAgentById } from './agentRegistry';
import { renderAgentPlaybook, renderAgentIndex } from './templates';
import { DOCUMENT_GUIDES, getGuidesForAgent } from '../documentation/guideRegistry';

interface AgentContext {
  topLevelDirectories: string[];
}

interface DocTouchpoint {
  title: string;
  path: string;
  marker: string;
}

export class AgentGenerator {
  constructor(..._legacyArgs: unknown[]) {}

  /**
   * Generate agent playbooks with smart doc touchpoints.
   * Each agent now only references docs relevant to their role.
   */
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
      // Get relevant doc touchpoints for this specific agent
      const touchpoints = this.getAgentTouchpoints(agentType);
      const content = renderAgentPlaybook(agentType, context.topLevelDirectories, touchpoints);
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

  /**
   * Get doc touchpoints relevant to a specific agent type.
   * Uses agent registry to determine which docs are relevant.
   */
  private getAgentTouchpoints(agentType: string): DocTouchpoint[] {
    const agent = getAgentById(agentType);

    // Always include the docs index
    const touchpoints: DocTouchpoint[] = [
      {
        title: 'Documentation Index',
        path: '../docs/README.md',
        marker: 'agent-update:docs-index',
      },
    ];

    if (agent) {
      // Use the agent's declared doc touchpoints for relevant guides
      const relevantGuides = DOCUMENT_GUIDES.filter(guide =>
        agent.docTouchpoints.includes(guide.key)
      );

      for (const guide of relevantGuides) {
        touchpoints.push({
          title: guide.title,
          path: `../docs/${guide.file}`,
          marker: guide.marker,
        });
      }
    } else {
      // Fallback: include all guides (legacy behavior)
      for (const guide of DOCUMENT_GUIDES) {
        touchpoints.push({
          title: guide.title,
          path: `../docs/${guide.file}`,
          marker: guide.marker,
        });
      }
    }

    return touchpoints;
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
      topLevelDirectories: Array.from(directorySet).sort(),
    };
  }
}
