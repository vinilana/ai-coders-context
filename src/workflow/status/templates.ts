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
} from '../types';
import { PREVC_PHASE_ORDER } from '../phases';
import { getScaleRoute } from '../scaling';

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
      ? (['planejador', 'designer', 'arquiteto', 'desenvolvedor', 'qa', 'revisor', 'documentador', 'solo-dev'] as PrevcRole[])
      : Array.isArray(roles)
      ? roles
      : route.roles === 'all'
      ? (['planejador', 'designer', 'arquiteto', 'desenvolvedor', 'qa', 'revisor', 'documentador'] as PrevcRole[])
      : route.roles;

  // Create role statuses
  const roleStatuses: Partial<Record<PrevcRole, object>> = {};
  for (const role of activeRoles) {
    roleStatuses[role] = {
      status: 'pending',
    };
  }

  return {
    project: {
      name,
      scale,
      started: new Date().toISOString(),
      current_phase: firstPhase,
    },
    phases: phaseStatuses,
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
    roles: ['planejador', 'desenvolvedor', 'qa'],
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
    roles: ['planejador', 'arquiteto', 'desenvolvedor', 'qa', 'revisor'],
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
