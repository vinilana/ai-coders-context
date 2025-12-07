/**
 * Centralized marker registry for AI agent documentation markers.
 *
 * PROBLEM SOLVED:
 * - Markers were scattered across templates with no validation
 * - String interpolation made markers error-prone
 * - No single source of truth for marker IDs
 *
 * USAGE:
 * - Use Markers.wrap() to create consistent marker blocks
 * - Use Markers.readonly() for guidance/sources sections
 * - All marker IDs are validated at runtime
 */

// ============================================================================
// MARKER TYPE DEFINITIONS
// ============================================================================

export type MarkerType = 'update' | 'fill' | 'readonly';

export interface MarkerConfig {
  type: MarkerType;
  description: string;
  allowedInAgents?: boolean;
  allowedInDocs?: boolean;
}

// ============================================================================
// CENTRALIZED MARKER REGISTRY
// ============================================================================

/**
 * All valid marker IDs used across the documentation system.
 * Adding a new marker? Add it here FIRST.
 */
export const MARKER_IDS = {
  // Documentation markers
  docs: {
    index: 'docs-index',
    projectOverview: 'project-overview',
    architecture: 'architecture-notes',
    developmentWorkflow: 'development-workflow',
    testingStrategy: 'testing-strategy',
    glossary: 'glossary',
    dataFlow: 'data-flow',
    security: 'security',
    tooling: 'tooling',
    onboarding: 'onboarding-guide',
    apiReference: 'api-reference',
    troubleshooting: 'troubleshooting-guide',
    migration: 'migration-guide',
  },

  // Agent markers (dynamic, keyed by agent type)
  agent: (agentType: string) => `agent-${agentType}`,

  // Readonly guidance sections
  readonly: {
    guidance: 'guidance',
    sources: 'sources',
  },

  // Fill slots (dynamic)
  fill: {
    directory: (slug: string) => `directory-${slug}`,
    term: (slug: string) => `term-${slug}`,
    integration: 'integration',
  },
} as const;

// ============================================================================
// MARKER UTILITIES
// ============================================================================

/**
 * Centralized marker generation with validation.
 * Prevents typos and ensures consistency.
 */
export const Markers = {
  /**
   * Wrap content in agent-update markers
   */
  wrap(markerId: string, content: string): string {
    return `<!-- agent-update:start:${markerId} -->
${content.trim()}
<!-- agent-update:end -->`;
  },

  /**
   * Create a readonly section (guidance or sources)
   */
  readonly(type: 'guidance' | 'sources', content: string): string {
    return `<!-- agent-readonly:${type} -->
${content.trim()}`;
  },

  /**
   * Create a fill slot for AI completion
   */
  fill(slotId: string, placeholder: string): string {
    return `<!-- agent-fill:${slotId} -->${placeholder}<!-- /agent-fill -->`;
  },

  /**
   * Create complete document structure with standard sections
   */
  document(options: {
    markerId: string;
    content: string;
    guidance?: string[];
    sources?: string[];
  }): string {
    const { markerId, content, guidance = [], sources = [] } = options;

    const parts = [content.trim()];

    if (guidance.length > 0) {
      parts.push(this.readonly('guidance', formatGuidanceSection(guidance)));
    }

    if (sources.length > 0) {
      parts.push(this.readonly('sources', formatSourcesSection(sources)));
    }

    return this.wrap(markerId, parts.join('\n\n'));
  },
};

// ============================================================================
// COMMON SECTION FORMATTERS
// ============================================================================

/**
 * Format AI guidance checklist - used across ALL templates
 * Eliminates copy-paste of identical checklist structures
 */
function formatGuidanceSection(items: string[]): string {
  const numbered = items.map((item, i) => `${i + 1}. ${item}`).join('\n');
  return `## AI Update Checklist
${numbered}`;
}

/**
 * Format acceptable sources section - used across ALL templates
 * Eliminates copy-paste of identical source structures
 */
function formatSourcesSection(sources: string[]): string {
  const bullets = sources.map(s => `- ${s}`).join('\n');
  return `## Acceptable Sources
${bullets}`;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate that a marker ID exists in the registry
 */
export function isValidDocMarker(markerId: string): boolean {
  return Object.values(MARKER_IDS.docs).includes(markerId as any);
}

/**
 * Get all registered doc marker IDs
 */
export function getAllDocMarkerIds(): string[] {
  return Object.values(MARKER_IDS.docs);
}
