/**
 * PREVC Workflow Service
 *
 * High-level service for managing PREVC workflows via CLI and MCP.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import {
  PrevcOrchestrator,
  WorkflowSummary,
  PrevcStatus,
  PrevcPhase,
  PrevcRole,
  ProjectScale,
  ProjectContext,
  CollaborationSession,
  CollaborationManager,
  CollaborationSynthesis,
  getScaleName,
  getScaleFromName,
  PHASE_NAMES_PT,
  ROLE_DISPLAY_NAMES,
} from '../../workflow';

/**
 * Workflow service dependencies
 * Uses loose typing to be compatible with CLI and MCP contexts
 */
export interface WorkflowServiceDependencies {
  ui?: {
    displaySuccess: (message: string) => void;
    displayError: (message: string, error?: Error) => void;
    displayInfo: (message: string, detail?: string) => void;
  };
  t?: (key: string, params?: Record<string, unknown>) => string;
}

/**
 * Options for initializing a workflow
 */
export interface WorkflowInitOptions {
  name: string;
  description?: string;
  scale?: string | ProjectScale;
  files?: string[];
}

/**
 * PREVC Workflow Service
 */
export class WorkflowService {
  private contextPath: string;
  private orchestrator: PrevcOrchestrator;
  private collaborationManager: CollaborationManager;
  private deps: WorkflowServiceDependencies;

  constructor(
    repoPath: string,
    deps: WorkflowServiceDependencies = {}
  ) {
    this.contextPath = path.join(repoPath, '.context');
    this.orchestrator = new PrevcOrchestrator(this.contextPath);
    this.collaborationManager = new CollaborationManager();
    this.deps = deps;
  }

  /**
   * Check if a workflow exists
   */
  async hasWorkflow(): Promise<boolean> {
    return this.orchestrator.hasWorkflow();
  }

  /**
   * Initialize a new workflow
   */
  async init(options: WorkflowInitOptions): Promise<PrevcStatus> {
    // Ensure .context directory exists
    await fs.ensureDir(this.contextPath);
    await fs.ensureDir(path.join(this.contextPath, 'workflow'));

    // Determine scale
    let scale: ProjectScale;
    if (typeof options.scale === 'string') {
      scale = getScaleFromName(options.scale) ?? ProjectScale.MEDIUM;
    } else if (typeof options.scale === 'number') {
      scale = options.scale;
    } else {
      // Auto-detect based on context
      const context: ProjectContext = {
        name: options.name,
        description: options.description || options.name,
        files: options.files,
      };
      const { detectProjectScale } = await import('../../workflow');
      scale = detectProjectScale(context);
    }

    // Initialize workflow
    const status = await this.orchestrator.initWorkflowWithScale(
      options.name,
      scale
    );

    this.deps.ui?.displaySuccess(
      `Workflow PREVC initialized: ${options.name} (Scale: ${getScaleName(scale)})`
    );

    return status;
  }

  /**
   * Get current workflow status
   */
  async getStatus(): Promise<PrevcStatus> {
    return this.orchestrator.getStatus();
  }

  /**
   * Get workflow summary for display
   */
  async getSummary(): Promise<WorkflowSummary> {
    return this.orchestrator.getSummary();
  }

  /**
   * Get formatted status for CLI display
   */
  async getFormattedStatus(): Promise<string> {
    const summary = await this.getSummary();
    const status = await this.getStatus();

    const lines: string[] = [];

    lines.push(`📋 Workflow: ${summary.name}`);
    lines.push(`📊 Scale: ${getScaleName(summary.scale as ProjectScale)}`);
    lines.push(`📍 Current Phase: ${PHASE_NAMES_PT[summary.currentPhase]} (${summary.currentPhase})`);
    lines.push(`📈 Progress: ${summary.progress.percentage}% (${summary.progress.completed}/${summary.progress.total} phases)`);
    lines.push('');
    lines.push('Phases:');

    for (const [phase, phaseStatus] of Object.entries(status.phases)) {
      const emoji = phaseStatus.status === 'completed' ? '✅' :
                    phaseStatus.status === 'in_progress' ? '🔄' :
                    phaseStatus.status === 'skipped' ? '⏭️' : '⏸️';
      const phaseName = PHASE_NAMES_PT[phase as PrevcPhase];
      lines.push(`  ${emoji} ${phase}: ${phaseName} - ${phaseStatus.status}`);
    }

    if (summary.isComplete) {
      lines.push('');
      lines.push('✨ Workflow complete!');
    }

    return lines.join('\n');
  }

  /**
   * Advance to the next phase
   */
  async advance(outputs?: string[]): Promise<PrevcPhase | null> {
    const currentPhase = await this.orchestrator.getCurrentPhase();
    const nextPhase = await this.orchestrator.completePhase(outputs);

    if (nextPhase) {
      this.deps.ui?.displaySuccess(
        `Advanced from ${PHASE_NAMES_PT[currentPhase]} to ${PHASE_NAMES_PT[nextPhase]}`
      );
    } else {
      this.deps.ui?.displaySuccess('Workflow completed!');
    }

    return nextPhase;
  }

  /**
   * Perform a handoff between roles
   */
  async handoff(
    from: PrevcRole,
    to: PrevcRole,
    artifacts: string[]
  ): Promise<void> {
    await this.orchestrator.handoff(from, to, artifacts);

    this.deps.ui?.displaySuccess(
      `Handoff: ${ROLE_DISPLAY_NAMES[from]} → ${ROLE_DISPLAY_NAMES[to]}`
    );
  }

  /**
   * Start a collaboration session
   */
  async startCollaboration(
    topic: string,
    participants?: PrevcRole[]
  ): Promise<CollaborationSession> {
    const session = this.collaborationManager.createSession(topic, participants);
    await session.start(topic, participants);

    this.deps.ui?.displaySuccess(
      `Collaboration started: ${topic}`
    );
    this.deps.ui?.displayInfo(
      `Participants: ${session.getParticipantNames().join(', ')}`
    );

    return session;
  }

  /**
   * Add a contribution to a collaboration session
   */
  contributeToCollaboration(
    sessionId: string,
    role: PrevcRole,
    message: string
  ): void {
    const session = this.collaborationManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.contribute(role, message);
  }

  /**
   * End a collaboration session and get synthesis
   */
  async endCollaboration(sessionId: string): Promise<CollaborationSynthesis | null> {
    return this.collaborationManager.endSession(sessionId);
  }

  /**
   * Get recommended next actions
   */
  async getRecommendedActions(): Promise<string[]> {
    return this.orchestrator.getRecommendedActions();
  }

  /**
   * Check if workflow is complete
   */
  async isComplete(): Promise<boolean> {
    return this.orchestrator.isComplete();
  }

  /**
   * Update the current task
   */
  async updateTask(task: string): Promise<void> {
    await this.orchestrator.updateCurrentTask(task);
  }

  /**
   * Start a role in the current phase
   */
  async startRole(role: PrevcRole): Promise<void> {
    await this.orchestrator.startRole(role);
    this.deps.ui?.displaySuccess(
      `Started role: ${ROLE_DISPLAY_NAMES[role]}`
    );
  }

  /**
   * Complete a role's work
   */
  async completeRole(role: PrevcRole, outputs: string[]): Promise<void> {
    await this.orchestrator.completeRole(role, outputs);
    this.deps.ui?.displaySuccess(
      `Completed role: ${ROLE_DISPLAY_NAMES[role]}`
    );
  }
}
