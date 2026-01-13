/**
 * PREVC Role Configuration
 *
 * Defines responsibilities, outputs, and specialists for each PREVC role.
 */

import { PrevcRole, RoleDefinition } from './types';

/**
 * Complete configuration for all PREVC roles
 */
export const ROLE_CONFIG: Record<PrevcRole, RoleDefinition> = {
  planner: {
    phase: 'P',
    responsibilities: [
      'Conduct discovery and requirements gathering',
      'Create specifications and project scope',
      'Define acceptance criteria',
      'Generate PRD or Tech Spec',
      'Identify risks and dependencies',
    ],
    outputs: ['prd', 'tech-spec', 'requirements'],
    specialists: [],
  },

  designer: {
    phase: ['P', 'R'],
    responsibilities: [
      'Create wireframes and prototypes',
      'Define design system and components',
      'Ensure accessibility and usability',
      'Document UI/UX patterns',
      'Validate user flows',
    ],
    outputs: ['wireframes', 'design-spec', 'ui-components'],
    specialists: ['frontend-specialist'],
  },

  architect: {
    phase: 'R',
    responsibilities: [
      'Define system architecture',
      'Create ADRs (Architecture Decision Records)',
      'Choose technologies and patterns',
      'Ensure scalability and maintainability',
      'Review technical impact of decisions',
    ],
    outputs: ['architecture', 'adr', 'tech-decisions'],
    specialists: ['architect-specialist'],
  },

  developer: {
    phase: 'E',
    responsibilities: [
      'Implement code according to specifications',
      'Follow defined patterns and architecture',
      'Create basic unit tests',
      'Document code when necessary',
      'Solve technical problems',
    ],
    outputs: ['code', 'unit-tests'],
    specialists: [
      'feature-developer',
      'bug-fixer',
      'backend-specialist',
      'frontend-specialist',
      'mobile-specialist',
      'database-specialist',
      'devops-specialist',
    ],
  },

  qa: {
    phase: 'V',
    responsibilities: [
      'Create and execute integration tests',
      'Validate security and performance',
      'Ensure quality gates',
      'Report and track bugs',
      'Validate acceptance criteria',
    ],
    outputs: ['test-report', 'qa-approval', 'bug-report'],
    specialists: ['test-writer', 'security-auditor', 'performance-optimizer'],
  },

  reviewer: {
    phase: 'V',
    responsibilities: [
      'Review code and architecture',
      'Ensure compliance with standards',
      'Suggest improvements and optimizations',
      'Validate best practices',
      'Approve or request changes',
    ],
    outputs: ['review-comments', 'approval'],
    specialists: ['code-reviewer'],
  },

  documenter: {
    phase: 'C',
    responsibilities: [
      'Create technical documentation',
      'Update README and APIs',
      'Prepare handoff to production',
      'Generate changelog and release notes',
      'Document important decisions',
    ],
    outputs: ['documentation', 'changelog', 'readme'],
    specialists: ['documentation-writer'],
  },

  'solo-dev': {
    phase: ['P', 'R', 'E', 'V', 'C'],
    responsibilities: [
      'Execute complete flow for small tasks',
      'Bug fixes and quick refactorings',
      'Low complexity features',
      'Maintenance of existing code',
      'Adjustments and specific tweaks',
    ],
    outputs: ['code', 'tests', 'docs'],
    specialists: ['refactoring-specialist', 'bug-fixer'],
  },
};

/**
 * Get the configuration for a specific role
 */
export function getRoleConfig(role: PrevcRole): RoleDefinition {
  return ROLE_CONFIG[role];
}

/**
 * Get all roles that participate in a specific phase
 */
export function getRolesForPhase(phase: string): PrevcRole[] {
  return (Object.entries(ROLE_CONFIG) as [PrevcRole, RoleDefinition][])
    .filter(([, config]) => {
      if (Array.isArray(config.phase)) {
        return config.phase.includes(phase as 'P' | 'R' | 'E' | 'V' | 'C');
      }
      return config.phase === phase;
    })
    .map(([role]) => role);
}

/**
 * Get all outputs for a specific role
 */
export function getOutputsForRole(role: PrevcRole): string[] {
  return ROLE_CONFIG[role]?.outputs || [];
}

/**
 * Get all responsibilities for a specific role
 */
export function getResponsibilitiesForRole(role: PrevcRole): string[] {
  return ROLE_CONFIG[role]?.responsibilities || [];
}
