/**
 * Plan-Workflow Integration Types
 *
 * Types for linking implementation plans to the PREVC workflow system.
 * Plans provide the "what" and "how", workflow provides the "when" and tracking.
 */

import { PrevcPhase, PrevcRole, StatusType } from '../types';

/**
 * Plan phase mapping to PREVC phases
 */
export const PLAN_PHASE_TO_PREVC: Record<string, PrevcPhase> = {
  'discovery': 'P',      // Discovery & Alignment → Planning
  'alignment': 'P',
  'review': 'R',         // Architecture Review → Review
  'architecture': 'R',
  'implementation': 'E', // Implementation → Execution
  'build': 'E',
  'validation': 'V',     // Validation → Validation
  'testing': 'V',
  'handoff': 'C',        // Handoff → Confirmation
  'deployment': 'C',
};

/**
 * Reference to a plan file
 */
export interface PlanReference {
  /** Slug/identifier of the plan */
  slug: string;
  /** Path to the plan file relative to .context */
  path: string;
  /** Display title */
  title: string;
  /** Brief summary */
  summary?: string;
  /** When the plan was linked */
  linkedAt: string;
  /** Plan status */
  status: 'active' | 'completed' | 'paused' | 'cancelled';
}

/**
 * Step within a plan phase
 */
export interface PlanStep {
  /** Step number within the phase */
  order: number;
  /** Step description */
  description: string;
  /** Assigned role/owner */
  assignee?: PrevcRole | string;
  /** Step status */
  status: StatusType;
  /** Output artifacts produced */
  outputs?: string[];
  /** Completion timestamp */
  completedAt?: string;
}

/**
 * Phase within a plan (maps to PREVC phases)
 */
export interface PlanPhase {
  /** Phase identifier (e.g., "phase-1", "discovery") */
  id: string;
  /** Display name */
  name: string;
  /** Mapped PREVC phase */
  prevcPhase: PrevcPhase;
  /** Steps in this phase */
  steps: PlanStep[];
  /** Phase status */
  status: StatusType;
  /** Commit checkpoint message */
  commitCheckpoint?: string;
  /** Start timestamp */
  startedAt?: string;
  /** Completion timestamp */
  completedAt?: string;
}

/**
 * Decision record within a plan
 */
export interface PlanDecision {
  /** Decision identifier */
  id: string;
  /** Decision title */
  title: string;
  /** Decision description/rationale */
  description: string;
  /** Who made the decision */
  decidedBy?: PrevcRole | string;
  /** When the decision was made */
  decidedAt?: string;
  /** Related PREVC phase */
  phase?: PrevcPhase;
  /** Status: proposed, accepted, rejected, superseded */
  status: 'proposed' | 'accepted' | 'rejected' | 'superseded';
  /** Alternatives considered */
  alternatives?: string[];
  /** Consequences of this decision */
  consequences?: string[];
}

/**
 * Risk entry within a plan
 */
export interface PlanRisk {
  /** Risk identifier */
  id: string;
  /** Risk description */
  description: string;
  /** Probability: low, medium, high */
  probability: 'low' | 'medium' | 'high';
  /** Impact: low, medium, high */
  impact: 'low' | 'medium' | 'high';
  /** Mitigation strategy */
  mitigation?: string;
  /** Owner responsible for mitigation */
  owner?: PrevcRole | string;
  /** Current status */
  status: 'identified' | 'mitigated' | 'occurred' | 'closed';
}

/**
 * Complete plan structure linked to workflow
 */
export interface LinkedPlan {
  /** Plan reference info */
  ref: PlanReference;
  /** Plan phases with PREVC mapping */
  phases: PlanPhase[];
  /** Key decisions made during planning */
  decisions: PlanDecision[];
  /** Identified risks */
  risks: PlanRisk[];
  /** Agents involved in this plan */
  agents: string[];
  /** Documentation touchpoints */
  docs: string[];
  /** Overall progress percentage */
  progress: number;
  /** Current active phase */
  currentPhase?: string;
}

/**
 * Plan tracking in workflow status
 */
export interface WorkflowPlans {
  /** Currently active plans */
  active: PlanReference[];
  /** Completed plans */
  completed: PlanReference[];
  /** Current primary plan (if any) */
  primary?: string;
}

/**
 * Plan-workflow sync event
 */
export interface PlanSyncEvent {
  /** Event type */
  type: 'plan_linked' | 'plan_updated' | 'phase_completed' | 'decision_made' | 'risk_updated';
  /** Plan slug */
  planSlug: string;
  /** Affected PREVC phase */
  phase?: PrevcPhase;
  /** Event timestamp */
  timestamp: string;
  /** Event details */
  details?: Record<string, unknown>;
}
