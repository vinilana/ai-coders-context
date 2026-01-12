/**
 * PREVC Workflow Roles
 *
 * Defines the available roles in the PREVC workflow system
 * and their mapping to existing agent types.
 */

import { PrevcRole } from './types';

/**
 * All available PREVC roles
 */
export const PREVC_ROLES = [
  'planejador', // P: Discovery, requirements, specifications
  'designer', // P/R: UX, design systems, wireframes
  'arquiteto', // R: ADRs, technical decisions, blueprints
  'desenvolvedor', // E: Implementation, coding
  'qa', // V: Tests, quality gates
  'revisor', // V: Code review, standards
  'documentador', // C: Documentation, handoff
  'solo-dev', // P→C: Full quick flow
] as const;

/**
 * Mapping from PREVC roles to existing agent types (specialists)
 */
export const ROLE_TO_SPECIALISTS: Record<PrevcRole, string[]> = {
  planejador: [], // New role, no existing mapping
  designer: ['frontend-specialist'],
  arquiteto: ['architect-specialist'],
  desenvolvedor: [
    'feature-developer',
    'bug-fixer',
    'backend-specialist',
    'frontend-specialist',
    'mobile-specialist',
  ],
  qa: ['test-writer', 'security-auditor', 'performance-optimizer'],
  revisor: ['code-reviewer'],
  documentador: ['documentation-writer'],
  'solo-dev': ['refactoring-specialist', 'bug-fixer'],
};

/**
 * Mapping from existing agent types to PREVC roles
 */
export const SPECIALIST_TO_ROLE: Record<string, PrevcRole> = {
  'frontend-specialist': 'designer',
  'architect-specialist': 'arquiteto',
  'feature-developer': 'desenvolvedor',
  'bug-fixer': 'desenvolvedor',
  'backend-specialist': 'desenvolvedor',
  'mobile-specialist': 'desenvolvedor',
  'test-writer': 'qa',
  'security-auditor': 'qa',
  'performance-optimizer': 'qa',
  'code-reviewer': 'revisor',
  'documentation-writer': 'documentador',
  'refactoring-specialist': 'solo-dev',
  'database-specialist': 'desenvolvedor',
  'devops-specialist': 'desenvolvedor',
};

/**
 * Role display names in Portuguese
 */
export const ROLE_DISPLAY_NAMES: Record<PrevcRole, string> = {
  planejador: 'Planejador',
  designer: 'Designer',
  arquiteto: 'Arquiteto',
  desenvolvedor: 'Desenvolvedor',
  qa: 'QA',
  revisor: 'Revisor',
  documentador: 'Documentador',
  'solo-dev': 'Solo Dev',
};

/**
 * Role display names in English
 */
export const ROLE_DISPLAY_NAMES_EN: Record<PrevcRole, string> = {
  planejador: 'Planner',
  designer: 'Designer',
  arquiteto: 'Architect',
  desenvolvedor: 'Developer',
  qa: 'QA Engineer',
  revisor: 'Reviewer',
  documentador: 'Documenter',
  'solo-dev': 'Solo Dev',
};

/**
 * Check if a string is a valid PREVC role
 */
export function isValidRole(role: string): role is PrevcRole {
  return PREVC_ROLES.includes(role as PrevcRole);
}

/**
 * Get the PREVC role for an existing agent type
 */
export function getRoleForSpecialist(specialist: string): PrevcRole | null {
  return SPECIALIST_TO_ROLE[specialist] || null;
}

/**
 * Get all specialists for a PREVC role
 */
export function getSpecialistsForRole(role: PrevcRole): string[] {
  return ROLE_TO_SPECIALISTS[role] || [];
}
