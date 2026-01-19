/**
 * Factory function for creating agent structures
 */

import { ScaffoldStructure } from '../types';

/**
 * Create an agent structure with standard sections
 */
export function createAgentStructure(
  agentType: string,
  title: string,
  description: string,
  additionalContext?: string
): ScaffoldStructure {
  return {
    fileType: 'agent',
    documentName: agentType,
    title: `${title} Agent Playbook`,
    description,
    tone: 'instructional',
    audience: 'ai-agents',
    sections: [
      {
        heading: 'Mission',
        order: 1,
        contentType: 'prose',
        guidance: `Describe how the ${title.toLowerCase()} agent supports the team and when to engage it.`,
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Responsibilities',
        order: 2,
        contentType: 'list',
        guidance: 'List specific responsibilities this agent handles. Be concrete about what tasks it performs.',
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Best Practices',
        order: 3,
        contentType: 'list',
        guidance: 'List best practices and guidelines for this agent to follow.',
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Key Project Resources',
        order: 4,
        contentType: 'list',
        guidance: 'Link to documentation index, agent handbook, AGENTS.md, and contributor guide.',
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Repository Starting Points',
        order: 5,
        contentType: 'list',
        guidance: 'List top-level directories relevant to this agent with brief descriptions.',
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Key Files',
        order: 6,
        contentType: 'list',
        guidance: 'List entry points, pattern implementations, and service files relevant to this agent.',
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Architecture Context',
        order: 7,
        contentType: 'list',
        guidance: 'For each architectural layer, describe directories, symbol counts, and key exports.',
        required: false,
        headingLevel: 2,
      },
      {
        heading: 'Key Symbols for This Agent',
        order: 8,
        contentType: 'list',
        guidance: 'List symbols (classes, functions, types) most relevant to this agent with links.',
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Documentation Touchpoints',
        order: 9,
        contentType: 'list',
        guidance: 'Link to relevant documentation files this agent should reference.',
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Collaboration Checklist',
        order: 10,
        contentType: 'checklist',
        guidance: 'Numbered checklist for agent workflow: confirm assumptions, review PRs, update docs, capture learnings.',
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Hand-off Notes',
        order: 11,
        contentType: 'prose',
        guidance: 'Summarize outcomes, remaining risks, and suggested follow-up actions after the agent completes work.',
        required: false,
        headingLevel: 2,
      },
    ],
    linkTo: ['../docs/README.md', 'README.md', '../../AGENTS.md'],
    additionalContext,
  };
}
