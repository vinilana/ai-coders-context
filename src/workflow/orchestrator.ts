/**
 * PREVC Workflow Orchestrator
 *
 * Manages workflow progression, phase transitions, and role handoffs.
 */

import {
  PrevcStatus,
  PrevcPhase,
  PrevcRole,
  ProjectContext,
  ProjectScale,
} from './types';
import { PrevcStatusManager } from './status/statusManager';
import { detectProjectScale, getScaleRoute } from './scaling';
import { PREVC_PHASE_ORDER, getPhaseDefinition } from './phases';
import { getRoleConfig } from './prevcConfig';

/**
 * PREVC Workflow Orchestrator
 *
 * Coordinates the execution of the PREVC workflow.
 */
export class PrevcOrchestrator {
  private statusManager: PrevcStatusManager;

  constructor(contextPath: string) {
    this.statusManager = new PrevcStatusManager(contextPath);
  }

  /**
   * Check if a workflow exists
   */
  async hasWorkflow(): Promise<boolean> {
    return this.statusManager.exists();
  }

  /**
   * Initialize a new workflow
   */
  async initWorkflow(context: ProjectContext): Promise<PrevcStatus> {
    const scale = detectProjectScale(context);
    const route = getScaleRoute(scale);

    return this.statusManager.create({
      name: context.name,
      scale,
      phases: route.phases,
      roles: route.roles,
    });
  }

  /**
   * Initialize a workflow with explicit scale
   */
  async initWorkflowWithScale(
    name: string,
    scale: ProjectScale
  ): Promise<PrevcStatus> {
    const route = getScaleRoute(scale);

    return this.statusManager.create({
      name,
      scale,
      phases: route.phases,
      roles: route.roles,
    });
  }

  /**
   * Get the current workflow status
   */
  async getStatus(): Promise<PrevcStatus> {
    return this.statusManager.load();
  }

  /**
   * Get the current phase
   */
  async getCurrentPhase(): Promise<PrevcPhase> {
    return this.statusManager.getCurrentPhase();
  }

  /**
   * Get the current active role
   */
  async getCurrentRole(): Promise<PrevcRole | null> {
    return this.statusManager.getActiveRole();
  }

  /**
   * Get the phase definition for the current phase
   */
  async getCurrentPhaseDefinition() {
    const phase = await this.getCurrentPhase();
    return getPhaseDefinition(phase);
  }

  /**
   * Perform a handoff from one role to another
   */
  async handoff(
    from: PrevcRole,
    to: PrevcRole,
    artifacts: string[]
  ): Promise<void> {
    // Update the outgoing role
    await this.statusManager.updateRole(from, {
      status: 'completed',
      outputs: artifacts,
    });

    // Update the incoming role
    await this.statusManager.updateRole(to, {
      status: 'in_progress',
    });
  }

  /**
   * Complete the current phase and advance to the next
   */
  async completePhase(outputs?: string[]): Promise<PrevcPhase | null> {
    const currentPhase = await this.getCurrentPhase();

    // Mark current phase as complete
    await this.statusManager.markPhaseComplete(currentPhase, outputs);

    // Get and transition to next phase
    const nextPhase = await this.getNextPhase();
    if (nextPhase) {
      await this.statusManager.transitionToPhase(nextPhase);
    }

    return nextPhase;
  }

  /**
   * Advance to the next phase
   */
  async advanceToNextPhase(): Promise<PrevcPhase | null> {
    const nextPhase = await this.getNextPhase();
    if (nextPhase) {
      await this.statusManager.transitionToPhase(nextPhase);
    }
    return nextPhase;
  }

  /**
   * Get the next phase that should be executed
   */
  async getNextPhase(): Promise<PrevcPhase | null> {
    return this.statusManager.getNextPhase();
  }

  /**
   * Check if the workflow is complete
   */
  async isComplete(): Promise<boolean> {
    return this.statusManager.isComplete();
  }

  /**
   * Get recommended next actions for the current state
   */
  async getRecommendedActions(): Promise<string[]> {
    const status = await this.getStatus();
    const currentPhase = status.project.current_phase;
    const phaseDefinition = getPhaseDefinition(currentPhase);
    const actions: string[] = [];

    // Suggest phase-specific actions
    actions.push(
      `Complete ${phaseDefinition.name} phase tasks`
    );

    // Suggest role-specific actions
    for (const role of phaseDefinition.roles) {
      const roleConfig = getRoleConfig(role);
      if (roleConfig) {
        actions.push(...roleConfig.responsibilities.slice(0, 2));
      }
    }

    // Suggest output creation
    if (phaseDefinition.outputs.length > 0) {
      actions.push(
        `Create outputs: ${phaseDefinition.outputs.join(', ')}`
      );
    }

    return actions;
  }

  /**
   * Get a summary of the current workflow state
   */
  async getSummary(): Promise<WorkflowSummary> {
    const status = await this.getStatus();
    const isComplete = await this.isComplete();

    // Count completed phases
    let completedPhases = 0;
    let totalPhases = 0;

    for (const phase of PREVC_PHASE_ORDER) {
      if (status.phases[phase].status !== 'skipped') {
        totalPhases++;
        if (status.phases[phase].status === 'completed') {
          completedPhases++;
        }
      }
    }

    return {
      name: status.project.name,
      scale: status.project.scale,
      currentPhase: status.project.current_phase,
      progress: {
        completed: completedPhases,
        total: totalPhases,
        percentage: Math.round((completedPhases / totalPhases) * 100),
      },
      isComplete,
      startedAt: status.project.started,
    };
  }

  /**
   * Update the current task description
   */
  async updateCurrentTask(task: string): Promise<void> {
    const currentPhase = await this.getCurrentPhase();
    const activeRole = await this.getCurrentRole();

    await this.statusManager.updatePhase(currentPhase, {
      current_task: task,
      role: activeRole || undefined,
    });
  }

  /**
   * Start a specific role in the current phase
   */
  async startRole(role: PrevcRole): Promise<void> {
    const currentPhase = await this.getCurrentPhase();

    await this.statusManager.updateRole(role, {
      status: 'in_progress',
      phase: currentPhase,
    });

    await this.statusManager.updatePhase(currentPhase, {
      role,
    });
  }

  /**
   * Complete a role's work in the current phase
   */
  async completeRole(role: PrevcRole, outputs: string[]): Promise<void> {
    await this.statusManager.updateRole(role, {
      status: 'completed',
      outputs,
      last_active: new Date().toISOString(),
    });
  }
}

/**
 * Workflow summary for display
 */
export interface WorkflowSummary {
  name: string;
  scale: ProjectScale | keyof typeof ProjectScale;
  currentPhase: PrevcPhase;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  isComplete: boolean;
  startedAt: string;
}
