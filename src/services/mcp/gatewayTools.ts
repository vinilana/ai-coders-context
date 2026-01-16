/**
 * Gateway Tools
 *
 * Re-exports all gateway handlers, types, and response utilities from the
 * modular gateway directory. This file provides backward compatibility
 * while the actual implementation is split into focused modules.
 *
 * @module gatewayTools
 * @see {@link ./gateway/index.ts} for the modular implementation
 */

// Re-export everything from the gateway module
export {
  // Response types and helpers
  type MCPToolResponse,
  createJsonResponse,
  createErrorResponse,
  createTextResponse,

  // Shared utilities
  minimalUI,
  mockTranslate,
  toolContext,

  // Action types
  type ExploreAction,
  type ContextAction,
  type WorkflowAction,
  type ProjectAction,
  type SyncAction,
  type PlanAction,
  type AgentAction,
  type SkillAction,

  // Parameter types
  type ExploreParams,
  type ContextParams,
  type WorkflowParams,
  type ProjectParams,
  type SyncParams,
  type PlanParams,
  type AgentParams,
  type SkillParams,

  // Gateway handlers
  handleExplore,
  handleContext,
  handleWorkflow,
  handleProject,
  handleSync,
  handlePlan,
  handleAgent,
  handleSkill,

  // Options types
  type ExploreOptions,
  type ContextOptions,
  type WorkflowOptions,
  type ProjectOptions,
  type SyncOptions,
  type PlanOptions,
  type AgentOptions,
  type SkillOptions,
} from './gateway';
