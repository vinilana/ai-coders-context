/**
 * PREVC Status Manager
 *
 * Manages the workflow status YAML file that tracks progress through phases.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import {
  PrevcStatus,
  PrevcPhase,
  PrevcRole,
  PhaseUpdate,
  RoleUpdate,
  ProjectScale,
  PhaseStatus,
  RoleStatus,
  WorkflowSettings,
  PlanApproval,
} from '../types';
import { PREVC_PHASE_ORDER } from '../phases';
import { getScaleRoute } from '../scaling';
import { createInitialStatus } from './templates';
import { getDefaultSettings } from '../gates';

/**
 * Default status file path relative to .context directory
 */
const STATUS_FILE = 'workflow/status.yaml';

/**
 * PREVC Status Manager
 *
 * Handles reading and writing the workflow status file.
 */
export class PrevcStatusManager {
  private contextPath: string;
  private statusPath: string;
  private cachedStatus: PrevcStatus | null = null;

  constructor(contextPath: string) {
    this.contextPath = contextPath;
    this.statusPath = path.join(contextPath, STATUS_FILE);
  }

  /**
   * Check if a workflow status file exists
   */
  async exists(): Promise<boolean> {
    return fs.pathExists(this.statusPath);
  }

  /**
   * Load the workflow status from disk
   */
  async load(): Promise<PrevcStatus> {
    if (!(await this.exists())) {
      throw new Error('Workflow status not found. Run "workflow init" first.');
    }

    const content = await fs.readFile(this.statusPath, 'utf-8');
    // Parse YAML manually (simple format)
    let status = this.parseYaml(content);
    // Apply migration for existing workflows
    status = this.migrateStatus(status);
    this.cachedStatus = status;
    return this.cachedStatus;
  }

  /**
   * Load status synchronously (for use in orchestrator)
   */
  loadSync(): PrevcStatus {
    if (this.cachedStatus) {
      return this.cachedStatus;
    }

    if (!fs.existsSync(this.statusPath)) {
      throw new Error('Workflow status not found. Run "workflow init" first.');
    }

    const content = fs.readFileSync(this.statusPath, 'utf-8');
    let status = this.parseYaml(content);
    // Apply migration for existing workflows
    status = this.migrateStatus(status);
    this.cachedStatus = status;
    return this.cachedStatus;
  }

  /**
   * Save the workflow status to disk
   */
  async save(status: PrevcStatus): Promise<void> {
    const dir = path.dirname(this.statusPath);
    await fs.ensureDir(dir);

    const content = this.serializeYaml(status);
    await fs.writeFile(this.statusPath, content, 'utf-8');
    this.cachedStatus = status;
  }

  /**
   * Create a new workflow status
   */
  async create(options: {
    name: string;
    scale: ProjectScale;
    phases?: PrevcPhase[];
    roles?: PrevcRole[] | 'all';
  }): Promise<PrevcStatus> {
    const route = getScaleRoute(options.scale);
    const phases = options.phases || route.phases;
    const roles = options.roles || route.roles;

    const status = createInitialStatus({
      name: options.name,
      scale: options.scale,
      phases,
      roles,
    });

    await this.save(status);
    return status;
  }

  /**
   * Update a phase's status
   */
  async updatePhase(phase: PrevcPhase, update: PhaseUpdate): Promise<void> {
    const status = await this.load();

    status.phases[phase] = {
      ...status.phases[phase],
      ...update,
    };

    await this.save(status);
  }

  /**
   * Update a role's status
   */
  async updateRole(role: PrevcRole, update: RoleUpdate): Promise<void> {
    const status = await this.load();

    if (!status.roles[role]) {
      status.roles[role] = {};
    }

    status.roles[role] = {
      ...status.roles[role],
      ...update,
    };

    await this.save(status);
  }

  /**
   * Transition to a new phase
   */
  async transitionToPhase(phase: PrevcPhase): Promise<void> {
    const status = await this.load();

    // Update current phase
    status.project.current_phase = phase;

    // Mark new phase as in_progress
    status.phases[phase] = {
      ...status.phases[phase],
      status: 'in_progress',
      started_at: new Date().toISOString(),
    };

    await this.save(status);
  }

  /**
   * Mark a phase as complete
   */
  async markPhaseComplete(
    phase: PrevcPhase,
    outputs?: string[]
  ): Promise<void> {
    const status = await this.load();

    const phaseStatus: PhaseStatus = {
      ...status.phases[phase],
      status: 'completed',
      completed_at: new Date().toISOString(),
    };

    if (outputs) {
      phaseStatus.outputs = outputs.map((p) => ({ path: p, status: 'filled' }));
    }

    status.phases[phase] = phaseStatus;
    await this.save(status);
  }

  /**
   * Get the current phase
   */
  async getCurrentPhase(): Promise<PrevcPhase> {
    const status = await this.load();
    return status.project.current_phase;
  }

  /**
   * Get the active role (if any)
   */
  async getActiveRole(): Promise<PrevcRole | null> {
    const status = await this.load();

    for (const [role, roleStatus] of Object.entries(status.roles)) {
      if ((roleStatus as RoleStatus).status === 'in_progress') {
        return role as PrevcRole;
      }
    }

    return null;
  }

  /**
   * Get the next phase that should be executed
   */
  async getNextPhase(): Promise<PrevcPhase | null> {
    const status = await this.load();
    const currentIndex = PREVC_PHASE_ORDER.indexOf(
      status.project.current_phase
    );

    for (let i = currentIndex + 1; i < PREVC_PHASE_ORDER.length; i++) {
      const phase = PREVC_PHASE_ORDER[i];
      if (status.phases[phase].status !== 'skipped') {
        return phase;
      }
    }

    return null;
  }

  /**
   * Check if the workflow is complete
   */
  async isComplete(): Promise<boolean> {
    const status = await this.load();

    for (const phase of PREVC_PHASE_ORDER) {
      const phaseStatus = status.phases[phase];
      if (
        phaseStatus.status !== 'completed' &&
        phaseStatus.status !== 'skipped'
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Set workflow settings
   */
  async setSettings(settings: Partial<WorkflowSettings>): Promise<WorkflowSettings> {
    const status = await this.load();
    const defaults = getDefaultSettings(status.project.scale);

    const currentSettings = status.project.settings || defaults;
    const newSettings: WorkflowSettings = {
      autonomous_mode: settings.autonomous_mode ?? currentSettings.autonomous_mode,
      require_plan: settings.require_plan ?? currentSettings.require_plan,
      require_approval: settings.require_approval ?? currentSettings.require_approval,
    };

    status.project.settings = newSettings;
    await this.save(status);
    return newSettings;
  }

  /**
   * Get workflow settings (with defaults applied)
   */
  async getSettings(): Promise<WorkflowSettings> {
    const status = await this.load();
    const defaults = getDefaultSettings(status.project.scale);
    return status.project.settings || defaults;
  }

  /**
   * Mark that a plan has been created/linked
   */
  async markPlanCreated(planSlug: string): Promise<void> {
    const status = await this.load();

    if (!status.approval) {
      status.approval = {
        plan_created: false,
        plan_approved: false,
      };
    }

    status.approval.plan_created = true;
    status.project.plan = planSlug;

    await this.save(status);
  }

  /**
   * Approve the plan
   */
  async approvePlan(approver: PrevcRole | string, notes?: string): Promise<PlanApproval> {
    const status = await this.load();

    if (!status.approval) {
      status.approval = {
        plan_created: false,
        plan_approved: false,
      };
    }

    status.approval.plan_approved = true;
    status.approval.approved_by = approver;
    status.approval.approved_at = new Date().toISOString();
    if (notes) {
      status.approval.approval_notes = notes;
    }

    await this.save(status);
    return status.approval;
  }

  /**
   * Get approval status
   */
  async getApproval(): Promise<PlanApproval | undefined> {
    const status = await this.load();
    return status.approval;
  }

  /**
   * Apply migration logic for existing workflows
   * - Add default settings based on scale
   * - Initialize approval tracking based on current state
   */
  private migrateStatus(status: PrevcStatus): PrevcStatus {
    // Add default settings if missing
    if (!status.project.settings) {
      status.project.settings = getDefaultSettings(status.project.scale);
    }

    // Initialize approval tracking if missing
    if (!status.approval) {
      const hasPlan = Boolean(status.project.plan || (status.project.plans && status.project.plans.length > 0));
      const isPastReview = ['E', 'V', 'C'].includes(status.project.current_phase) ||
        status.phases['R'].status === 'completed';

      status.approval = {
        plan_created: hasPlan,
        // Auto-approve if already past R phase (grandfather clause)
        plan_approved: isPastReview,
        approved_by: isPastReview ? 'system-migration' : undefined,
        approved_at: isPastReview ? new Date().toISOString() : undefined,
      };
    }

    return status;
  }

  /**
   * Parse YAML content to PrevcStatus object
   * Simple implementation for the specific format
   */
  private parseYaml(content: string): PrevcStatus {
    // Basic YAML parsing - for production, use a proper YAML library
    const lines = content.split('\n');
    const result: PrevcStatus = {
      project: {
        name: '',
        scale: ProjectScale.MEDIUM,
        started: new Date().toISOString(),
        current_phase: 'P',
      },
      phases: {
        P: { status: 'pending' },
        R: { status: 'pending' },
        E: { status: 'pending' },
        V: { status: 'pending' },
        C: { status: 'pending' },
      },
      roles: {},
    };

    let currentSection = '';
    let currentPhase = '';
    let currentRole = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (line.startsWith('project:')) {
        currentSection = 'project';
      } else if (line.startsWith('phases:')) {
        currentSection = 'phases';
      } else if (line.startsWith('roles:')) {
        currentSection = 'roles';
      } else if (line.startsWith('settings:')) {
        currentSection = 'settings';
      } else if (line.startsWith('approval:')) {
        currentSection = 'approval';
      } else if (currentSection === 'project' && line.startsWith('  ')) {
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
        if (key === 'name') result.project.name = value;
        if (key === 'scale') {
          const scaleMap: Record<string, ProjectScale> = {
            QUICK: ProjectScale.QUICK,
            SMALL: ProjectScale.SMALL,
            MEDIUM: ProjectScale.MEDIUM,
            LARGE: ProjectScale.LARGE,
            ENTERPRISE: ProjectScale.ENTERPRISE,
          };
          result.project.scale = scaleMap[value] ?? ProjectScale.MEDIUM;
        }
        if (key === 'started') result.project.started = value;
        if (key === 'current_phase')
          result.project.current_phase = value as PrevcPhase;
      } else if (currentSection === 'phases') {
        if (line.match(/^  [PREVC]:/)) {
          currentPhase = trimmed.replace(':', '') as PrevcPhase;
        } else if (currentPhase && line.startsWith('    ')) {
          const [key, ...valueParts] = trimmed.split(':');
          const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
          if (key === 'status') {
            result.phases[currentPhase as PrevcPhase].status = value as
              | 'pending'
              | 'in_progress'
              | 'completed'
              | 'skipped';
          }
          if (key === 'started_at') {
            result.phases[currentPhase as PrevcPhase].started_at = value;
          }
          if (key === 'completed_at') {
            result.phases[currentPhase as PrevcPhase].completed_at = value;
          }
          if (key === 'reason') {
            result.phases[currentPhase as PrevcPhase].reason = value;
          }
        }
      } else if (currentSection === 'roles') {
        if (line.match(/^  [a-z-]+:/)) {
          currentRole = trimmed.replace(':', '') as PrevcRole;
          result.roles[currentRole as PrevcRole] = {};
        } else if (currentRole && line.startsWith('    ')) {
          const [key, ...valueParts] = trimmed.split(':');
          const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
          const roleStatus = result.roles[currentRole as PrevcRole] || {};
          if (key === 'status') {
            roleStatus.status = value as
              | 'pending'
              | 'in_progress'
              | 'completed'
              | 'skipped';
          }
          if (key === 'phase') {
            roleStatus.phase = value as PrevcPhase;
          }
          if (key === 'last_active') {
            roleStatus.last_active = value;
          }
          if (key === 'current_task') {
            roleStatus.current_task = value;
          }
          result.roles[currentRole as PrevcRole] = roleStatus;
        }
      } else if (currentSection === 'settings' && line.startsWith('  ')) {
        if (!result.project.settings) {
          result.project.settings = {
            autonomous_mode: false,
            require_plan: true,
            require_approval: true,
          };
        }
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
        if (key === 'autonomous_mode') {
          result.project.settings.autonomous_mode = value === 'true';
        }
        if (key === 'require_plan') {
          result.project.settings.require_plan = value === 'true';
        }
        if (key === 'require_approval') {
          result.project.settings.require_approval = value === 'true';
        }
      } else if (currentSection === 'approval' && line.startsWith('  ')) {
        if (!result.approval) {
          result.approval = {
            plan_created: false,
            plan_approved: false,
          };
        }
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
        if (key === 'plan_created') {
          result.approval.plan_created = value === 'true';
        }
        if (key === 'plan_approved') {
          result.approval.plan_approved = value === 'true';
        }
        if (key === 'approved_by') {
          result.approval.approved_by = value || undefined;
        }
        if (key === 'approved_at') {
          result.approval.approved_at = value || undefined;
        }
        if (key === 'approval_notes') {
          result.approval.approval_notes = value || undefined;
        }
      }
    }

    return result;
  }

  /**
   * Serialize PrevcStatus object to YAML string
   */
  private serializeYaml(status: PrevcStatus): string {
    const lines: string[] = [];

    // Project section
    lines.push('project:');
    lines.push(`  name: "${status.project.name}"`);
    const scaleName =
      typeof status.project.scale === 'number'
        ? ProjectScale[status.project.scale]
        : status.project.scale;
    lines.push(`  scale: ${scaleName}`);
    lines.push(`  started: "${status.project.started}"`);
    lines.push(`  current_phase: ${status.project.current_phase}`);
    lines.push('');

    // Phases section
    lines.push('phases:');
    for (const phase of PREVC_PHASE_ORDER) {
      const phaseStatus = status.phases[phase];
      lines.push(`  ${phase}:`);
      lines.push(`    status: ${phaseStatus.status}`);
      if (phaseStatus.started_at) {
        lines.push(`    started_at: "${phaseStatus.started_at}"`);
      }
      if (phaseStatus.completed_at) {
        lines.push(`    completed_at: "${phaseStatus.completed_at}"`);
      }
      if (phaseStatus.role) {
        lines.push(`    role: ${phaseStatus.role}`);
      }
      if (phaseStatus.current_task) {
        lines.push(`    current_task: "${phaseStatus.current_task}"`);
      }
      if (phaseStatus.reason) {
        lines.push(`    reason: "${phaseStatus.reason}"`);
      }
      if (phaseStatus.outputs && phaseStatus.outputs.length > 0) {
        lines.push('    outputs:');
        for (const output of phaseStatus.outputs) {
          lines.push(`      - path: "${output.path}"`);
          lines.push(`        status: ${output.status}`);
        }
      }
    }
    lines.push('');

    // Roles section
    lines.push('roles:');
    for (const [role, roleStatus] of Object.entries(status.roles)) {
      if (roleStatus) {
        lines.push(`  ${role}:`);
        if (roleStatus.status) {
          lines.push(`    status: ${roleStatus.status}`);
        }
        if (roleStatus.phase) {
          lines.push(`    phase: ${roleStatus.phase}`);
        }
        if (roleStatus.last_active) {
          lines.push(`    last_active: "${roleStatus.last_active}"`);
        }
        if (roleStatus.current_task) {
          lines.push(`    current_task: "${roleStatus.current_task}"`);
        }
        if (roleStatus.outputs && roleStatus.outputs.length > 0) {
          lines.push(`    outputs: [${roleStatus.outputs.map((o) => `"${o}"`).join(', ')}]`);
        }
      }
    }
    lines.push('');

    // Settings section
    if (status.project.settings) {
      lines.push('settings:');
      lines.push(`  autonomous_mode: ${status.project.settings.autonomous_mode}`);
      lines.push(`  require_plan: ${status.project.settings.require_plan}`);
      lines.push(`  require_approval: ${status.project.settings.require_approval}`);
      lines.push('');
    }

    // Approval section
    if (status.approval) {
      lines.push('approval:');
      lines.push(`  plan_created: ${status.approval.plan_created}`);
      lines.push(`  plan_approved: ${status.approval.plan_approved}`);
      if (status.approval.approved_by) {
        lines.push(`  approved_by: "${status.approval.approved_by}"`);
      }
      if (status.approval.approved_at) {
        lines.push(`  approved_at: "${status.approval.approved_at}"`);
      }
      if (status.approval.approval_notes) {
        lines.push(`  approval_notes: "${status.approval.approval_notes}"`);
      }
      lines.push('');
    }

    return lines.join('\n') + '\n';
  }
}
