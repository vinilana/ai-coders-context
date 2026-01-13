/**
 * PREVC Workflow System
 *
 * A structured workflow for software development with 5 phases:
 * P - Planejamento (Planning)
 * R - Revisão (Review)
 * E - Execução (Execution)
 * V - Validação (Validation)
 * C - Confirmação (Confirmation)
 */

// Types
export * from './types';

// Roles
export {
  PREVC_ROLES,
  ROLE_TO_SPECIALISTS,
  SPECIALIST_TO_ROLE,
  ROLE_DISPLAY_NAMES,
  ROLE_DISPLAY_NAMES_EN,
  isValidRole,
  getRoleForSpecialist,
  getSpecialistsForRole,
} from './roles';

// Phases
export {
  PREVC_PHASE_ORDER,
  PREVC_PHASES,
  PHASE_NAMES_EN,
  PHASE_NAMES_PT,
  getPhaseDefinition,
  getNextPhase,
  getPreviousPhase,
  isPhaseOptional,
  getRolesForPhase,
  getOutputsForPhase,
  isValidPhase,
  getPhaseOrder,
} from './phases';

// Configuration
export {
  ROLE_CONFIG,
  getRoleConfig,
  getRolesForPhase as getRolesForPhaseFromConfig,
  getOutputsForRole,
  getResponsibilitiesForRole,
} from './prevcConfig';

// Scaling
export { ProjectScale } from './types';
export {
  SCALE_ROUTES,
  detectProjectScale,
  getScaleRoute,
  getPhasesForScale,
  getRolesForScale,
  isPhaseRequiredForScale,
  getScaleName,
  getScaleFromName,
  getEstimatedTime,
} from './scaling';

// Status Management
export { PrevcStatusManager } from './status/statusManager';
export {
  createInitialStatus,
  createQuickFlowStatus,
  createSmallProjectStatus,
  createMediumProjectStatus,
  createLargeProjectStatus,
  createEnterpriseProjectStatus,
} from './status/templates';

// Orchestrator
export { PrevcOrchestrator, WorkflowSummary } from './orchestrator';

// Collaboration
export {
  CollaborationSession,
  CollaborationManager,
} from './collaboration';

// Orchestration
export {
  AgentOrchestrator,
  agentOrchestrator,
  AgentType,
  AGENT_TYPES,
  PHASE_TO_AGENTS,
  ROLE_TO_AGENTS,
  DocumentLinker,
  documentLinker,
  DocType,
  DocGuide,
  DOCUMENT_GUIDES,
  AGENT_TO_DOCS,
  PHASE_TO_DOCS,
  ROLE_TO_DOCS,
} from './orchestration';

// Plan Integration
export {
  PlanLinker,
  createPlanLinker,
  PlanReference,
  LinkedPlan,
  PlanPhase,
  PlanStep,
  PlanDecision,
  PlanRisk,
  WorkflowPlans,
  AgentLineupEntry,
  PLAN_PHASE_TO_PREVC,
} from './plans';
