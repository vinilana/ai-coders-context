import { GuideMeta } from './templates/types';

export const DOCUMENT_GUIDES: GuideMeta[] = [
  {
    key: 'project-overview',
    title: 'Project Overview',
    file: 'project-overview.md',
    marker: 'agent-update:project-overview',
    primaryInputs: 'Roadmap, README, stakeholder notes'
  },
  {
    key: 'architecture',
    title: 'Architecture Notes',
    file: 'architecture.md',
    marker: 'agent-update:architecture-notes',
    primaryInputs: 'ADRs, service boundaries, dependency graphs'
  },
  {
    key: 'development-workflow',
    title: 'Development Workflow',
    file: 'development-workflow.md',
    marker: 'agent-update:development-workflow',
    primaryInputs: 'Branching rules, CI config, contributing guide'
  },
  {
    key: 'testing-strategy',
    title: 'Testing Strategy',
    file: 'testing-strategy.md',
    marker: 'agent-update:testing-strategy',
    primaryInputs: 'Test configs, CI gates, known flaky suites'
  },
  {
    key: 'glossary',
    title: 'Glossary & Domain Concepts',
    file: 'glossary.md',
    marker: 'agent-update:glossary',
    primaryInputs: 'Business terminology, user personas, domain rules'
  },
  {
    key: 'data-flow',
    title: 'Data Flow & Integrations',
    file: 'data-flow.md',
    marker: 'agent-update:data-flow',
    primaryInputs: 'System diagrams, integration specs, queue topics'
  },
  {
    key: 'security',
    title: 'Security & Compliance Notes',
    file: 'security.md',
    marker: 'agent-update:security',
    primaryInputs: 'Auth model, secrets management, compliance requirements'
  },
  {
    key: 'tooling',
    title: 'Tooling & Productivity Guide',
    file: 'tooling.md',
    marker: 'agent-update:tooling',
    primaryInputs: 'CLI scripts, IDE configs, automation workflows'
  }
];

export const DOCUMENT_GUIDE_KEYS = DOCUMENT_GUIDES.map(guide => guide.key);

export function getGuidesByKeys(keys?: string[]): GuideMeta[] {
  if (!keys || keys.length === 0) {
    return DOCUMENT_GUIDES;
  }

  const set = new Set(keys);
  const filtered = DOCUMENT_GUIDES.filter(guide => set.has(guide.key));
  return filtered.length > 0 ? filtered : DOCUMENT_GUIDES;
}

export function getDocFilesByKeys(keys?: string[]): Set<string> | undefined {
  if (!keys || keys.length === 0) {
    return undefined;
  }
  const files = DOCUMENT_GUIDES
    .filter(guide => keys.includes(guide.key))
    .map(guide => guide.file);
  return files.length ? new Set(files) : undefined;
}
