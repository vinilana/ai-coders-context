/**
 * PREVC Workflow Phases
 *
 * Defines the five phases of the PREVC workflow:
 * P - Planejamento (Planning)
 * R - Revisão (Review)
 * E - Execução (Execution)
 * V - Validação (Validation)
 * C - Confirmação (Confirmation)
 */

import { PrevcPhase, PhaseDefinition } from './types';

/**
 * All PREVC phases in order
 */
export const PREVC_PHASE_ORDER: PrevcPhase[] = ['P', 'R', 'E', 'V', 'C'];

/**
 * Complete definition of all PREVC phases
 */
export const PREVC_PHASES: Record<PrevcPhase, PhaseDefinition> = {
  P: {
    name: 'Planejamento',
    description: 'Discovery, requisitos e especificações',
    roles: ['planejador', 'designer'],
    outputs: ['prd', 'tech-spec', 'requisitos', 'wireframes'],
    optional: false,
    order: 1,
  },
  R: {
    name: 'Revisão',
    description: 'Arquitetura, decisões técnicas e design review',
    roles: ['arquiteto', 'designer'],
    outputs: ['architecture', 'adr', 'design-spec'],
    optional: true, // Depends on scale
    order: 2,
  },
  E: {
    name: 'Execução',
    description: 'Implementação e desenvolvimento',
    roles: ['desenvolvedor'],
    outputs: ['code', 'unit-tests'],
    optional: false,
    order: 3,
  },
  V: {
    name: 'Validação',
    description: 'Testes, QA e code review',
    roles: ['qa', 'revisor'],
    outputs: ['test-report', 'review-comments', 'approval'],
    optional: false,
    order: 4,
  },
  C: {
    name: 'Confirmação',
    description: 'Documentação, deploy e handoff',
    roles: ['documentador'],
    outputs: ['documentation', 'changelog', 'deploy'],
    optional: true, // Depends on scale
    order: 5,
  },
};

/**
 * Phase display names in English
 */
export const PHASE_NAMES_EN: Record<PrevcPhase, string> = {
  P: 'Planning',
  R: 'Review',
  E: 'Execution',
  V: 'Validation',
  C: 'Confirmation',
};

/**
 * Phase display names in Portuguese
 */
export const PHASE_NAMES_PT: Record<PrevcPhase, string> = {
  P: 'Planejamento',
  R: 'Revisão',
  E: 'Execução',
  V: 'Validação',
  C: 'Confirmação',
};

/**
 * Get the definition for a specific phase
 */
export function getPhaseDefinition(phase: PrevcPhase): PhaseDefinition {
  return PREVC_PHASES[phase];
}

/**
 * Get the next phase in the workflow
 */
export function getNextPhase(currentPhase: PrevcPhase): PrevcPhase | null {
  const currentIndex = PREVC_PHASE_ORDER.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex >= PREVC_PHASE_ORDER.length - 1) {
    return null;
  }
  return PREVC_PHASE_ORDER[currentIndex + 1];
}

/**
 * Get the previous phase in the workflow
 */
export function getPreviousPhase(currentPhase: PrevcPhase): PrevcPhase | null {
  const currentIndex = PREVC_PHASE_ORDER.indexOf(currentPhase);
  if (currentIndex <= 0) {
    return null;
  }
  return PREVC_PHASE_ORDER[currentIndex - 1];
}

/**
 * Check if a phase is optional
 */
export function isPhaseOptional(phase: PrevcPhase): boolean {
  return PREVC_PHASES[phase]?.optional ?? false;
}

/**
 * Get all roles for a specific phase
 */
export function getRolesForPhase(phase: PrevcPhase): string[] {
  return PREVC_PHASES[phase]?.roles || [];
}

/**
 * Get all outputs for a specific phase
 */
export function getOutputsForPhase(phase: PrevcPhase): string[] {
  return PREVC_PHASES[phase]?.outputs || [];
}

/**
 * Check if a string is a valid PREVC phase
 */
export function isValidPhase(phase: string): phase is PrevcPhase {
  return PREVC_PHASE_ORDER.includes(phase as PrevcPhase);
}

/**
 * Get the phase order number (1-5)
 */
export function getPhaseOrder(phase: PrevcPhase): number {
  return PREVC_PHASES[phase]?.order ?? 0;
}
