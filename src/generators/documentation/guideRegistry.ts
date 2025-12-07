import { GuideMeta } from './templates/types';
import { MARKER_IDS } from '../shared/markerRegistry';

/**
 * Unified Template Registry
 *
 * PROBLEMS SOLVED:
 * - Previously only 8 guides were registered, but 14 templates existed
 * - Templates like onboarding, api-reference, troubleshooting were orphaned
 * - Selective generation didn't work for unregistered templates
 *
 * NOW:
 * - ALL templates are registered in one place
 * - Each template has metadata for discovery and filtering
 * - Markers reference centralized registry for consistency
 */

// ============================================================================
// TEMPLATE CATEGORIES
// ============================================================================

export type TemplateCategory = 'core' | 'reference' | 'operational' | 'advanced';

export interface ExtendedGuideMeta extends GuideMeta {
  category: TemplateCategory;
  description: string;
  agentRelevance: string[]; // Which agent types should reference this doc
}

// ============================================================================
// UNIFIED GUIDE REGISTRY - ALL 14 TEMPLATES
// ============================================================================

export const DOCUMENT_GUIDES: ExtendedGuideMeta[] = [
  // -------------------------------------------------------------------------
  // CORE GUIDES (fundamental project understanding)
  // -------------------------------------------------------------------------
  {
    key: 'project-overview',
    title: 'Project Overview',
    file: 'project-overview.md',
    marker: `agent-update:${MARKER_IDS.docs.projectOverview}`,
    primaryInputs: 'Roadmap, README, stakeholder notes',
    category: 'core',
    description: 'High-level project purpose, goals, and structure',
    agentRelevance: ['architect-specialist', 'documentation-writer', 'feature-developer'],
  },
  {
    key: 'architecture',
    title: 'Architecture Notes',
    file: 'architecture.md',
    marker: `agent-update:${MARKER_IDS.docs.architecture}`,
    primaryInputs: 'ADRs, service boundaries, dependency graphs',
    category: 'core',
    description: 'System design, patterns, and architectural decisions',
    agentRelevance: ['architect-specialist', 'backend-specialist', 'frontend-specialist'],
  },
  {
    key: 'glossary',
    title: 'Glossary & Domain Concepts',
    file: 'glossary.md',
    marker: `agent-update:${MARKER_IDS.docs.glossary}`,
    primaryInputs: 'Business terminology, user personas, domain rules',
    category: 'core',
    description: 'Domain language and key concepts for consistent communication',
    agentRelevance: ['documentation-writer', 'feature-developer'],
  },

  // -------------------------------------------------------------------------
  // OPERATIONAL GUIDES (how to work with the codebase)
  // -------------------------------------------------------------------------
  {
    key: 'development-workflow',
    title: 'Development Workflow',
    file: 'development-workflow.md',
    marker: `agent-update:${MARKER_IDS.docs.developmentWorkflow}`,
    primaryInputs: 'Branching rules, CI config, contributing guide',
    category: 'operational',
    description: 'Git workflow, branching strategy, and PR process',
    agentRelevance: ['code-reviewer', 'feature-developer', 'bug-fixer'],
  },
  {
    key: 'testing-strategy',
    title: 'Testing Strategy',
    file: 'testing-strategy.md',
    marker: `agent-update:${MARKER_IDS.docs.testingStrategy}`,
    primaryInputs: 'Test configs, CI gates, known flaky suites',
    category: 'operational',
    description: 'Test types, coverage requirements, and quality gates',
    agentRelevance: ['test-writer', 'bug-fixer', 'code-reviewer'],
  },
  {
    key: 'tooling',
    title: 'Tooling & Productivity Guide',
    file: 'tooling.md',
    marker: `agent-update:${MARKER_IDS.docs.tooling}`,
    primaryInputs: 'CLI scripts, IDE configs, automation workflows',
    category: 'operational',
    description: 'Development tools, scripts, and productivity setup',
    agentRelevance: ['devops-specialist', 'feature-developer'],
  },
  {
    key: 'onboarding',
    title: 'Onboarding Guide',
    file: 'onboarding.md',
    marker: `agent-update:${MARKER_IDS.docs.onboarding}`,
    primaryInputs: 'Setup scripts, environment requirements, first tasks',
    category: 'operational',
    description: 'New developer setup and initial orientation',
    agentRelevance: ['documentation-writer', 'devops-specialist'],
  },

  // -------------------------------------------------------------------------
  // REFERENCE GUIDES (technical specifications)
  // -------------------------------------------------------------------------
  {
    key: 'data-flow',
    title: 'Data Flow & Integrations',
    file: 'data-flow.md',
    marker: `agent-update:${MARKER_IDS.docs.dataFlow}`,
    primaryInputs: 'System diagrams, integration specs, queue topics',
    category: 'reference',
    description: 'How data moves through the system and external integrations',
    agentRelevance: ['backend-specialist', 'database-specialist', 'architect-specialist'],
  },
  {
    key: 'api-reference',
    title: 'API Reference',
    file: 'api-reference.md',
    marker: `agent-update:${MARKER_IDS.docs.apiReference}`,
    primaryInputs: 'OpenAPI specs, route definitions, SDK docs',
    category: 'reference',
    description: 'API endpoints, request/response formats, authentication',
    agentRelevance: ['backend-specialist', 'frontend-specialist', 'documentation-writer'],
  },
  {
    key: 'security',
    title: 'Security & Compliance Notes',
    file: 'security.md',
    marker: `agent-update:${MARKER_IDS.docs.security}`,
    primaryInputs: 'Auth model, secrets management, compliance requirements',
    category: 'reference',
    description: 'Security policies, authentication, and compliance requirements',
    agentRelevance: ['security-auditor', 'backend-specialist', 'devops-specialist'],
  },

  // -------------------------------------------------------------------------
  // ADVANCED GUIDES (specialized procedures)
  // -------------------------------------------------------------------------
  {
    key: 'troubleshooting',
    title: 'Troubleshooting Guide',
    file: 'troubleshooting.md',
    marker: `agent-update:${MARKER_IDS.docs.troubleshooting}`,
    primaryInputs: 'Incident reports, support tickets, runbooks',
    category: 'advanced',
    description: 'Common issues, diagnostics, and resolution procedures',
    agentRelevance: ['bug-fixer', 'devops-specialist', 'performance-optimizer'],
  },
  {
    key: 'migration',
    title: 'Migration Guide',
    file: 'migration.md',
    marker: `agent-update:${MARKER_IDS.docs.migration}`,
    primaryInputs: 'Version changelogs, breaking changes, upgrade scripts',
    category: 'advanced',
    description: 'Version upgrades, breaking changes, and migration procedures',
    agentRelevance: ['database-specialist', 'backend-specialist', 'devops-specialist'],
  },
];

// ============================================================================
// DERIVED EXPORTS (backwards compatibility)
// ============================================================================

export const DOCUMENT_GUIDE_KEYS = DOCUMENT_GUIDES.map(guide => guide.key);

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get guides filtered by keys (maintains backwards compatibility)
 */
export function getGuidesByKeys(keys?: string[]): GuideMeta[] {
  if (!keys || keys.length === 0) {
    return DOCUMENT_GUIDES;
  }

  const set = new Set(keys);
  const filtered = DOCUMENT_GUIDES.filter(guide => set.has(guide.key));
  return filtered.length > 0 ? filtered : DOCUMENT_GUIDES;
}

/**
 * Get guides by category
 */
export function getGuidesByCategory(category: TemplateCategory): ExtendedGuideMeta[] {
  return DOCUMENT_GUIDES.filter(guide => guide.category === category);
}

/**
 * Get guides relevant to a specific agent type
 */
export function getGuidesForAgent(agentType: string): ExtendedGuideMeta[] {
  return DOCUMENT_GUIDES.filter(guide =>
    guide.agentRelevance.includes(agentType)
  );
}

/**
 * Get doc files set for selective generation
 */
export function getDocFilesByKeys(keys?: string[]): Set<string> | undefined {
  if (!keys || keys.length === 0) {
    return undefined;
  }
  const files = DOCUMENT_GUIDES
    .filter(guide => keys.includes(guide.key))
    .map(guide => guide.file);
  return files.length ? new Set(files) : undefined;
}

/**
 * Validate that a guide key exists
 */
export function isValidGuideKey(key: string): boolean {
  return DOCUMENT_GUIDE_KEYS.includes(key);
}

/**
 * Get guide metadata by key
 */
export function getGuideByKey(key: string): ExtendedGuideMeta | undefined {
  return DOCUMENT_GUIDES.find(guide => guide.key === key);
}
