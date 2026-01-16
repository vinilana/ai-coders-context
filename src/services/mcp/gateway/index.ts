/**
 * Gateway Tools Module
 *
 * Exports all gateway handlers, types, and response utilities.
 * This module consolidates 58 MCP tools into 8 gateway tools.
 */

// Response types and helpers
export {
  type MCPToolResponse,
  createJsonResponse,
  createErrorResponse,
  createTextResponse,
} from './response';

// Shared utilities
export { minimalUI, mockTranslate, toolContext } from './shared';

// Type definitions
export type {
  ExploreAction,
  ContextAction,
  WorkflowAction,
  ProjectAction,
  SyncAction,
  PlanAction,
  AgentAction,
  SkillAction,
  ExploreParams,
  ContextParams,
  WorkflowParams,
  ProjectParams,
  SyncParams,
  PlanParams,
  AgentParams,
  SkillParams,
} from './types';

// Gateway handlers
export { handleExplore, type ExploreOptions } from './explore';
export { handleContext, type ContextOptions } from './context';
export { handleWorkflow, type WorkflowOptions } from './workflow';
export { handleProject, type ProjectOptions } from './project';
export { handleSync, type SyncOptions } from './sync';
export { handlePlan, type PlanOptions } from './plan';
export { handleAgent, type AgentOptions } from './agent';
export { handleSkill, type SkillOptions } from './skill';
