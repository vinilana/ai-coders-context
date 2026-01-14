/**
 * Document Linker
 *
 * Links agents and workflow phases to relevant documentation sections,
 * enabling context-aware navigation and knowledge sharing.
 */

import { PrevcPhase, PrevcRole } from '../types';
import { AgentType } from './agentOrchestrator';

/**
 * Documentation types available in .context/docs/
 */
export type DocType =
  | 'architecture'
  | 'data-flow'
  | 'glossary'
  | 'api'
  | 'getting-started'
  | 'deployment'
  | 'security'
  | 'testing'
  | 'contributing'
  | 'readme';

/**
 * Document guide information
 */
export interface DocGuide {
  type: DocType;
  path: string;
  title: string;
  description: string;
}

/**
 * Standard documentation guides
 */
export const DOCUMENT_GUIDES: DocGuide[] = [
  {
    type: 'architecture',
    path: '.context/docs/architecture.md',
    title: 'Architecture',
    description: 'System architecture, patterns, and design decisions',
  },
  {
    type: 'data-flow',
    path: '.context/docs/data-flow.md',
    title: 'Data Flow',
    description: 'How data moves through the system',
  },
  {
    type: 'glossary',
    path: '.context/docs/glossary.md',
    title: 'Glossary',
    description: 'Domain terms and definitions',
  },
  {
    type: 'api',
    path: '.context/docs/api.md',
    title: 'API Reference',
    description: 'API endpoints and usage',
  },
  {
    type: 'getting-started',
    path: '.context/docs/getting-started.md',
    title: 'Getting Started',
    description: 'Setup and onboarding guide',
  },
  {
    type: 'deployment',
    path: '.context/docs/deployment.md',
    title: 'Deployment',
    description: 'Deployment procedures and environments',
  },
  {
    type: 'security',
    path: '.context/docs/security.md',
    title: 'Security',
    description: 'Security guidelines and practices',
  },
  {
    type: 'testing',
    path: '.context/docs/testing.md',
    title: 'Testing',
    description: 'Testing strategies and coverage',
  },
  {
    type: 'contributing',
    path: '.context/docs/contributing.md',
    title: 'Contributing',
    description: 'Contribution guidelines',
  },
  {
    type: 'readme',
    path: '.context/docs/README.md',
    title: 'Documentation Index',
    description: 'Overview of all documentation',
  },
];

/**
 * Mapping from agent types to relevant documentation
 */
export const AGENT_TO_DOCS: Record<AgentType, DocType[]> = {
  'code-reviewer': ['architecture', 'contributing', 'glossary'],
  'bug-fixer': ['architecture', 'data-flow', 'testing'],
  'feature-developer': ['architecture', 'data-flow', 'api', 'getting-started'],
  'refactoring-specialist': ['architecture', 'glossary', 'contributing'],
  'test-writer': ['testing', 'architecture', 'api'],
  'documentation-writer': ['readme', 'glossary', 'architecture', 'api'],
  'performance-optimizer': ['architecture', 'data-flow', 'deployment'],
  'security-auditor': ['security', 'architecture', 'api'],
  'backend-specialist': ['architecture', 'api', 'data-flow', 'deployment'],
  'frontend-specialist': ['architecture', 'data-flow', 'getting-started'],
  'architect-specialist': ['architecture', 'data-flow', 'security', 'deployment'],
  'devops-specialist': ['deployment', 'security', 'testing'],
  'database-specialist': ['architecture', 'data-flow', 'glossary'],
  'mobile-specialist': ['architecture', 'api', 'getting-started'],
};

/**
 * Mapping from PREVC phases to relevant documentation
 */
export const PHASE_TO_DOCS: Record<PrevcPhase, DocType[]> = {
  P: ['architecture', 'glossary', 'readme'], // Planning
  R: ['architecture', 'security', 'data-flow'], // Review
  E: ['architecture', 'api', 'data-flow', 'getting-started'], // Execution
  V: ['testing', 'security', 'api'], // Validation
  C: ['deployment', 'readme', 'contributing'], // Confirmation
};

/**
 * Mapping from PREVC roles to relevant documentation
 */
export const ROLE_TO_DOCS: Record<PrevcRole, DocType[]> = {
  planner: ['architecture', 'glossary', 'readme'],
  designer: ['architecture', 'getting-started'],
  architect: ['architecture', 'data-flow', 'security', 'deployment'],
  developer: ['architecture', 'api', 'data-flow', 'getting-started'],
  qa: ['testing', 'security', 'api'],
  reviewer: ['architecture', 'contributing', 'glossary'],
  documenter: ['readme', 'glossary', 'architecture', 'api', 'contributing'],
  'solo-dev': ['architecture', 'api', 'testing', 'readme'],
};

/**
 * Document Linker class
 */
export class DocumentLinker {
  /**
   * Get documentation guides for an agent type
   */
  getDocsForAgent(agent: AgentType): DocGuide[] {
    const docTypes = AGENT_TO_DOCS[agent] || [];
    return this.getGuidesByTypes(docTypes);
  }

  /**
   * Get documentation guides for a PREVC phase
   */
  getDocsForPhase(phase: PrevcPhase): DocGuide[] {
    const docTypes = PHASE_TO_DOCS[phase] || [];
    return this.getGuidesByTypes(docTypes);
  }

  /**
   * Get documentation guides for a PREVC role
   */
  getDocsForRole(role: PrevcRole): DocGuide[] {
    const docTypes = ROLE_TO_DOCS[role] || [];
    return this.getGuidesByTypes(docTypes);
  }

  /**
   * Get primary documentation for an agent (first in list)
   */
  getPrimaryDocForAgent(agent: AgentType): DocGuide | null {
    const docs = this.getDocsForAgent(agent);
    return docs.length > 0 ? docs[0] : null;
  }

  /**
   * Get all documentation guides
   */
  getAllDocs(): DocGuide[] {
    return [...DOCUMENT_GUIDES];
  }

  /**
   * Get a specific document guide by type
   */
  getDocByType(type: DocType): DocGuide | null {
    return DOCUMENT_GUIDES.find((doc) => doc.type === type) || null;
  }

  /**
   * Get documentation paths for an agent
   */
  getDocPathsForAgent(agent: AgentType): string[] {
    return this.getDocsForAgent(agent).map((doc) => doc.path);
  }

  /**
   * Get documentation paths for a phase
   */
  getDocPathsForPhase(phase: PrevcPhase): string[] {
    return this.getDocsForPhase(phase).map((doc) => doc.path);
  }

  /**
   * Get documentation paths for a role
   */
  getDocPathsForRole(role: PrevcRole): string[] {
    return this.getDocsForRole(role).map((doc) => doc.path);
  }

  /**
   * Get combined documentation for multiple agents
   */
  getDocsForAgents(agents: AgentType[]): DocGuide[] {
    const docTypes = new Set<DocType>();

    for (const agent of agents) {
      const types = AGENT_TO_DOCS[agent] || [];
      types.forEach((type) => docTypes.add(type));
    }

    return this.getGuidesByTypes(Array.from(docTypes));
  }

  /**
   * Get documentation relevant to a task description
   */
  getDocsForTask(taskDescription: string): DocGuide[] {
    const lowerTask = taskDescription.toLowerCase();
    const relevantDocs = new Set<DocType>();

    // Keyword matching
    if (lowerTask.includes('architect') || lowerTask.includes('design') || lowerTask.includes('structure')) {
      relevantDocs.add('architecture');
    }
    if (lowerTask.includes('api') || lowerTask.includes('endpoint')) {
      relevantDocs.add('api');
    }
    if (lowerTask.includes('test') || lowerTask.includes('coverage')) {
      relevantDocs.add('testing');
    }
    if (lowerTask.includes('security') || lowerTask.includes('auth')) {
      relevantDocs.add('security');
    }
    if (lowerTask.includes('deploy') || lowerTask.includes('release')) {
      relevantDocs.add('deployment');
    }
    if (lowerTask.includes('data') || lowerTask.includes('flow')) {
      relevantDocs.add('data-flow');
    }
    if (lowerTask.includes('document') || lowerTask.includes('readme')) {
      relevantDocs.add('readme');
    }
    if (lowerTask.includes('setup') || lowerTask.includes('start')) {
      relevantDocs.add('getting-started');
    }

    // Default to architecture if no matches
    if (relevantDocs.size === 0) {
      relevantDocs.add('architecture');
      relevantDocs.add('readme');
    }

    return this.getGuidesByTypes(Array.from(relevantDocs));
  }

  /**
   * Generate markdown links for agent documentation
   */
  generateAgentDocLinks(agent: AgentType): string {
    const docs = this.getDocsForAgent(agent);
    if (docs.length === 0) return '';

    const lines = ['## Relevant Documentation', ''];
    for (const doc of docs) {
      lines.push(`- [${doc.title}](${doc.path}) - ${doc.description}`);
    }
    return lines.join('\n');
  }

  /**
   * Generate markdown links for phase documentation
   */
  generatePhaseDocLinks(phase: PrevcPhase): string {
    const docs = this.getDocsForPhase(phase);
    if (docs.length === 0) return '';

    const lines = ['## Phase Documentation', ''];
    for (const doc of docs) {
      lines.push(`- [${doc.title}](${doc.path}) - ${doc.description}`);
    }
    return lines.join('\n');
  }

  /**
   * Helper to get guides by doc types
   */
  private getGuidesByTypes(types: DocType[]): DocGuide[] {
    return types
      .map((type) => DOCUMENT_GUIDES.find((doc) => doc.type === type))
      .filter((doc): doc is DocGuide => doc !== undefined);
  }
}

// Export singleton instance
export const documentLinker = new DocumentLinker();
