export { AIContextMCPServer, startMCPServer, type MCPServerOptions } from './mcpServer';
export {
  MCPInstallService,
  type MCPInstallServiceDependencies,
  type MCPInstallOptions,
  type MCPInstallResult,
  type MCPInstallation,
} from './mcpInstallService';

// Gateway tool handlers
export {
  handleExplore,
  handleContext,
  handleWorkflow,
  handleProject,
  handleSync,
  handlePlan,
  handleAgent,
  handleSkill,
} from './gatewayTools';

// Gateway tool action types
export type {
  ExploreAction,
  ContextAction,
  WorkflowAction,
  ProjectAction,
  SyncAction,
  PlanAction,
  AgentAction,
  SkillAction,
} from './gatewayTools';

// Gateway tool parameter types
export type {
  ExploreParams,
  ContextParams,
  WorkflowParams,
  ProjectParams,
  SyncParams,
  PlanParams,
  AgentParams,
  SkillParams,
} from './gatewayTools';

// Response types and helpers
export {
  createJsonResponse,
  createErrorResponse,
  type MCPToolResponse,
} from './gatewayTools';
