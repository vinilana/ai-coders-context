/**
 * PREVC Workflow Types
 *
 * Core type definitions for the PREVC workflow system:
 * P - Planejamento (Planning)
 * R - Revisão (Review)
 * E - Execução (Execution)
 * V - Validação (Validation)
 * C - Confirmação (Confirmation)
 */

/**
 * The five phases of the PREVC workflow
 */
export type PrevcPhase = 'P' | 'R' | 'E' | 'V' | 'C';

/**
 * Available roles in the PREVC workflow
 */
export type PrevcRole =
  | 'planejador'
  | 'designer'
  | 'arquiteto'
  | 'desenvolvedor'
  | 'qa'
  | 'revisor'
  | 'documentador'
  | 'solo-dev';

/**
 * Project scale levels for adaptive routing
 */
export enum ProjectScale {
  QUICK = 0, // Bug fixes, tweaks (~5 min)
  SMALL = 1, // Simple features (~15 min)
  MEDIUM = 2, // Medium features (~30 min)
  LARGE = 3, // Products (~1 hour)
  ENTERPRISE = 4, // Systems with compliance
}

/**
 * Status of a phase or role
 */
export type StatusType = 'pending' | 'in_progress' | 'completed' | 'skipped';

/**
 * Definition of a PREVC phase
 */
export interface PhaseDefinition {
  name: string;
  description: string;
  roles: PrevcRole[];
  outputs: string[];
  optional: boolean;
  order: number;
}

/**
 * Definition of a PREVC role
 */
export interface RoleDefinition {
  phase: PrevcPhase | PrevcPhase[];
  responsibilities: string[];
  outputs: string[];
  specialists: string[]; // Mapped agent types from existing system
}

/**
 * Scale route configuration
 */
export interface ScaleRoute {
  phases: PrevcPhase[];
  roles: PrevcRole[] | 'all';
  documents: string[] | 'all';
  skipReview?: boolean;
  extras?: string[];
}

/**
 * Phase status in the workflow
 */
export interface PhaseStatus {
  status: StatusType;
  started_at?: string;
  completed_at?: string;
  role?: PrevcRole;
  current_task?: string;
  reason?: string;
  outputs?: OutputStatus[];
}

/**
 * Output file status
 */
export interface OutputStatus {
  path: string;
  status: 'unfilled' | 'filled';
}

/**
 * Role status in the workflow
 */
export interface RoleStatus {
  status?: StatusType;
  last_active?: string;
  phase?: PrevcPhase;
  current_task?: string;
  outputs?: string[];
}

/**
 * Project metadata in the workflow status
 */
export interface ProjectMetadata {
  name: string;
  scale: ProjectScale | keyof typeof ProjectScale;
  started: string;
  current_phase: PrevcPhase;
}

/**
 * Complete workflow status structure (stored in status.yaml)
 */
export interface PrevcStatus {
  project: ProjectMetadata;
  phases: Record<PrevcPhase, PhaseStatus>;
  roles: Partial<Record<PrevcRole, RoleStatus>>;
}

/**
 * Context for project analysis and scale detection
 */
export interface ProjectContext {
  name: string;
  description: string;
  files?: string[];
  complexity?: 'low' | 'medium' | 'high';
  hasCompliance?: boolean;
}

/**
 * Update payload for phase status
 */
export interface PhaseUpdate {
  status?: StatusType;
  role?: PrevcRole;
  current_task?: string;
  outputs?: OutputStatus[];
}

/**
 * Update payload for role status
 */
export interface RoleUpdate {
  status?: StatusType;
  phase?: PrevcPhase;
  current_task?: string;
  outputs?: string[];
  last_active?: string;
}

/**
 * Contribution in a collaboration session
 */
export interface Contribution {
  role: PrevcRole;
  message: string;
  timestamp: Date;
}

/**
 * Status of a collaboration session
 */
export interface CollaborationStatus {
  id: string;
  topic: string;
  participants: PrevcRole[];
  started: Date;
  status: 'active' | 'synthesizing' | 'concluded';
}

/**
 * Synthesis result from a collaboration session
 */
export interface CollaborationSynthesis {
  topic: string;
  participants: PrevcRole[];
  contributions: Contribution[];
  decisions: string[];
  recommendations: string[];
}
