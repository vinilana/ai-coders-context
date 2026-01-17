/**
 * PREVC Status Templates
 *
 * Templates for creating initial workflow status structures.
 */

import {
  PrevcStatus,
  PrevcPhase,
  PrevcRole,
  ProjectScale,
  PhaseStatus,
  ExecutionHistory,
  ExecutionAction,
} from '../types';
import { PREVC_PHASE_ORDER } from '../phases';
import { getScaleRoute } from '../scaling';

/**
 * All available roles constant
 */
const ALL_ROLES: PrevcRole[] = [
  'planner',
  'designer',
  'architect',
  'developer',
  'qa',
  'reviewer',
  'documenter',
  'solo-dev',
];

/**
 * Phase names for resume context
 */
const PHASE_NAMES: Record<PrevcPhase, string> = {
  P: 'Planejamento',
  R: 'Revisão',
  E: 'Execução',
  V: 'Validação',
  C: 'Confirmação',
};

/**
 * Step context for resume context generation
 */
interface StepContext {
  planPhase?: string;
  stepIndex?: number;
  stepDescription?: string;
}

/**
 * Generate resume context based on current phase and action
 */
export function generateResumeContext(
  phase: PrevcPhase,
  action: ExecutionAction,
  stepContext?: StepContext
): string {
  const phaseName = PHASE_NAMES[phase];

  switch (action) {
    case 'started':
      return `Fase ${phase} (${phaseName}) em progresso`;
    case 'completed':
      return `Fase ${phase} (${phaseName}) concluída`;
    case 'plan_linked':
      return `Plano vinculado - aguardando revisão`;
    case 'plan_approved':
      return `Plano aprovado - pronto para execução`;
    case 'phase_skipped':
      return `Fase ${phase} ignorada - avançando`;
    case 'settings_changed':
      return `Configurações atualizadas`;
    // Step-level breadcrumb actions
    case 'step_started':
      if (stepContext?.stepDescription) {
        return `Trabalhando em: ${stepContext.stepDescription}`;
      }
      return `Trabalhando no passo ${stepContext?.stepIndex || '?'} de ${stepContext?.planPhase || 'fase'}`;
    case 'step_completed':
      if (stepContext?.stepDescription) {
        return `Concluído: ${stepContext.stepDescription}`;
      }
      return `Passo ${stepContext?.stepIndex || '?'} de ${stepContext?.planPhase || 'fase'} concluído`;
    case 'step_skipped':
      return `Passo ${stepContext?.stepIndex || '?'} de ${stepContext?.planPhase || 'fase'} ignorado`;
    default:
      return `Fase ${phase} (${phaseName})`;
  }
}

/**
 * Options for creating initial status
 */
export interface CreateStatusOptions {
  name: string;
  scale: ProjectScale;
  phases?: PrevcPhase[];
  roles?: PrevcRole[] | 'all';
}

/**
 * Create initial workflow status
 */
export function createInitialStatus(options: CreateStatusOptions): PrevcStatus {
  const { name, scale, phases, roles } = options;

  const route = getScaleRoute(scale);
  const activePhasesSet = new Set(phases || route.phases);

  // Determine first active phase
  let firstPhase: PrevcPhase = 'P';
  for (const phase of PREVC_PHASE_ORDER) {
    if (activePhasesSet.has(phase)) {
      firstPhase = phase;
      break;
    }
  }

  // Create phase statuses
  const phaseStatuses: Record<PrevcPhase, PhaseStatus> = {
    P: { status: 'pending' },
    R: { status: 'pending' },
    E: { status: 'pending' },
    V: { status: 'pending' },
    C: { status: 'pending' },
  };

  // Mark skipped phases
  for (const phase of PREVC_PHASE_ORDER) {
    if (!activePhasesSet.has(phase)) {
      phaseStatuses[phase] = {
        status: 'skipped',
        reason: `Not required for scale ${ProjectScale[scale]}`,
      };
    }
  }

  // Mark first phase as in_progress
  phaseStatuses[firstPhase] = {
    status: 'in_progress',
    started_at: new Date().toISOString(),
  };

  // Get active roles
  const activeRoles =
    roles === 'all'
      ? ALL_ROLES
      : Array.isArray(roles)
      ? roles
      : route.roles === 'all'
      ? ALL_ROLES.filter(r => r !== 'solo-dev')
      : route.roles;

  // Create role statuses (legacy - kept for backward compatibility)
  const roleStatuses: Partial<Record<PrevcRole, object>> = {};
  for (const role of activeRoles) {
    roleStatuses[role] = {
      status: 'pending',
    };
  }

  // Create execution history
  const now = new Date().toISOString();
  const execution: ExecutionHistory = {
    history: [{
      timestamp: now,
      phase: firstPhase,
      action: 'started',
    }],
    last_activity: now,
    resume_context: generateResumeContext(firstPhase, 'started'),
  };

  return {
    project: {
      name,
      scale,
      started: now,
      current_phase: firstPhase,
    },
    phases: phaseStatuses,
    execution,
    roles: roleStatuses,
  };
}

/**
 * Create a minimal status for quick flow
 */
export function createQuickFlowStatus(name: string): PrevcStatus {
  return createInitialStatus({
    name,
    scale: ProjectScale.QUICK,
    phases: ['E', 'V'],
    roles: ['solo-dev'],
  });
}

/**
 * Create a status for small projects
 */
export function createSmallProjectStatus(name: string): PrevcStatus {
  return createInitialStatus({
    name,
    scale: ProjectScale.SMALL,
    phases: ['P', 'E', 'V'],
    roles: ['planner', 'developer', 'qa'],
  });
}

/**
 * Create a status for medium projects
 */
export function createMediumProjectStatus(name: string): PrevcStatus {
  return createInitialStatus({
    name,
    scale: ProjectScale.MEDIUM,
    phases: ['P', 'R', 'E', 'V'],
    roles: ['planner', 'architect', 'developer', 'qa', 'reviewer'],
  });
}

/**
 * Create a status for large projects
 */
export function createLargeProjectStatus(name: string): PrevcStatus {
  return createInitialStatus({
    name,
    scale: ProjectScale.LARGE,
    phases: ['P', 'R', 'E', 'V', 'C'],
    roles: 'all',
  });
}

/**
 * Create a status for enterprise projects
 */
export function createEnterpriseProjectStatus(name: string): PrevcStatus {
  return createInitialStatus({
    name,
    scale: ProjectScale.ENTERPRISE,
    phases: ['P', 'R', 'E', 'V', 'C'],
    roles: 'all',
  });
}
