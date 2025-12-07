/**
 * Reusable Template Sections
 *
 * PROBLEM SOLVED:
 * - Every template had copy-pasted "AI Update Checklist" sections
 * - Every template had copy-pasted "Acceptable Sources" sections
 * - Guidance text was duplicated across 14+ files with minor variations
 * - No consistency in how sections were formatted
 *
 * NOW:
 * - Common sections are defined ONCE with semantic configurations
 * - Templates compose sections instead of duplicating text
 * - Consistent formatting guaranteed across all templates
 */

// ============================================================================
// COMMON GUIDANCE CHECKLISTS BY DOCUMENT TYPE
// ============================================================================

/**
 * Pre-defined guidance checklists for common document types.
 * Use these to avoid duplicating checklist items across templates.
 */
export const GUIDANCE_PRESETS = {
  /**
   * Standard project documentation guidance
   */
  standard: [
    'Verify all referenced files and paths exist in the current codebase',
    'Update version numbers and dates to reflect current state',
    'Remove or update any TODO placeholders with actual content',
    'Cross-reference with README and CONTRIBUTING for consistency',
    'Confirm technical accuracy with code inspection',
  ],

  /**
   * Architecture and design documentation
   */
  architecture: [
    'Verify system diagrams match current implementation',
    'Update component relationships and dependencies',
    'Document new architectural decisions or patterns',
    'Remove references to deprecated components',
    'Ensure consistency with ADR documents if present',
  ],

  /**
   * Workflow and process documentation
   */
  workflow: [
    'Verify command examples work in current environment',
    'Update CI/CD references to match current pipelines',
    'Confirm branch naming and PR conventions are accurate',
    'Document any new workflow requirements or changes',
    'Cross-reference with CI configuration files',
  ],

  /**
   * Testing documentation
   */
  testing: [
    'Review test scripts and CI workflows for accuracy',
    'Update quality gates with current thresholds',
    'Document new test categories or suites',
    'Record known flaky tests and link to tracking issues',
    'Confirm troubleshooting steps match current tooling',
  ],

  /**
   * Security documentation
   */
  security: [
    'Confirm security configurations match deployments',
    'Update secrets management details when storage changes',
    'Reflect new compliance obligations or audit findings',
    'Ensure incident response procedures are current',
    'Verify authentication flow descriptions are accurate',
  ],

  /**
   * API documentation
   */
  api: [
    'Verify endpoint paths and HTTP methods are accurate',
    'Update request/response schemas from code or OpenAPI specs',
    'Document new endpoints and deprecate removed ones',
    'Confirm authentication requirements are correct',
    'Test example requests against running services',
  ],

  /**
   * Troubleshooting documentation
   */
  troubleshooting: [
    'Review recent incident reports for new patterns',
    'Update diagnostic commands for current tooling',
    'Verify escalation contacts are current',
    'Add workarounds for newly discovered issues',
    'Validate resolution steps with recent fixes',
  ],

  /**
   * Onboarding documentation
   */
  onboarding: [
    'Verify prerequisite versions match current requirements',
    'Test installation steps on a clean environment',
    'Update environment variable examples',
    'Confirm first-task suggestions are achievable',
    'Cross-reference with README setup instructions',
  ],
} as const;

export type GuidancePreset = keyof typeof GUIDANCE_PRESETS;

// ============================================================================
// COMMON SOURCE CATEGORIES
// ============================================================================

/**
 * Pre-defined source categories for "Acceptable Sources" sections.
 * Reduces copy-paste and ensures consistent language.
 */
export const SOURCE_PRESETS = {
  /**
   * Standard code and config sources
   */
  standard: [
    'Source code files and module documentation',
    'Configuration files (package.json, tsconfig.json, etc.)',
    'README and CONTRIBUTING documentation',
    'Git history and commit messages',
  ],

  /**
   * Architecture documentation sources
   */
  architecture: [
    'Architecture Decision Records (ADRs)',
    'System design documents and diagrams',
    'Service boundary definitions',
    'Dependency graphs and import analysis',
  ],

  /**
   * Workflow and CI sources
   */
  workflow: [
    'CI/CD configuration files (GitHub Actions, CircleCI, etc.)',
    'Git workflow documentation',
    'Contributing guidelines',
    'Package.json scripts section',
  ],

  /**
   * Testing sources
   */
  testing: [
    'Test configuration files (jest.config.js, vitest.config.ts, etc.)',
    'CI job definitions with test steps',
    'Issue tracker items labelled "testing" or "flaky"',
    'Coverage reports and quality gate configurations',
  ],

  /**
   * Security sources
   */
  security: [
    'Security architecture docs and runbooks',
    'IAM/authorization configuration',
    'Compliance documentation from security/legal teams',
    'Incident post-mortems and security advisories',
  ],

  /**
   * API documentation sources
   */
  api: [
    'OpenAPI/Swagger specifications',
    'Route definitions in source code',
    'API integration tests',
    'SDK documentation and examples',
  ],

  /**
   * Troubleshooting sources
   */
  troubleshooting: [
    'Post-mortem and incident reports',
    'Support ticket patterns and resolutions',
    'Production logs and error tracking',
    'Team runbooks and knowledge base',
  ],

  /**
   * Onboarding sources
   */
  onboarding: [
    'README and quick-start documentation',
    'Environment setup scripts',
    'Docker/containerization configs',
    'New developer feedback and questions',
  ],
} as const;

export type SourcePreset = keyof typeof SOURCE_PRESETS;

// ============================================================================
// SECTION BUILDERS
// ============================================================================

/**
 * Build an AI guidance section using a preset or custom items
 */
export function buildGuidanceSection(
  preset: GuidancePreset | string[],
  additionalItems: string[] = []
): string {
  const baseItems = Array.isArray(preset) ? preset : GUIDANCE_PRESETS[preset];
  const allItems = [...baseItems, ...additionalItems];
  const numbered = allItems.map((item, i) => `${i + 1}. ${item}`).join('\n');

  return `<!-- agent-readonly:guidance -->
## AI Update Checklist
${numbered}`;
}

/**
 * Build an acceptable sources section using a preset or custom items
 */
export function buildSourcesSection(
  preset: SourcePreset | string[],
  additionalSources: string[] = []
): string {
  const baseSources = Array.isArray(preset) ? preset : SOURCE_PRESETS[preset];
  const allSources = [...baseSources, ...additionalSources];
  const bullets = allSources.map(s => `- ${s}`).join('\n');

  return `<!-- agent-readonly:sources -->
## Acceptable Sources
${bullets}`;
}

/**
 * Build both guidance and sources sections together
 */
export function buildReadonlySections(options: {
  guidance: GuidancePreset | string[];
  sources: SourcePreset | string[];
  extraGuidance?: string[];
  extraSources?: string[];
}): string {
  const { guidance, sources, extraGuidance = [], extraSources = [] } = options;

  return [
    buildGuidanceSection(guidance, extraGuidance),
    buildSourcesSection(sources, extraSources),
  ].join('\n\n');
}

// ============================================================================
// DOCUMENT WRAPPER
// ============================================================================

/**
 * Wrap a complete document with standard markers and readonly sections.
 * This is the preferred way to create templates for consistency.
 */
export function wrapDocument(options: {
  markerId: string;
  content: string;
  guidance: GuidancePreset | string[];
  sources: SourcePreset | string[];
  extraGuidance?: string[];
  extraSources?: string[];
}): string {
  const {
    markerId,
    content,
    guidance,
    sources,
    extraGuidance = [],
    extraSources = [],
  } = options;

  const readonlySections = buildReadonlySections({
    guidance,
    sources,
    extraGuidance,
    extraSources,
  });

  return `<!-- agent-update:start:${markerId} -->
${content.trim()}

${readonlySections}
<!-- agent-update:end -->`;
}
