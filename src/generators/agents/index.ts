export { AgentGenerator } from './agentGenerator';

// New unified registry (preferred)
export {
  AGENT_REGISTRY,
  AGENT_TYPE_IDS,
  AGENT_TYPES,
  AGENT_RESPONSIBILITIES,
  AGENT_BEST_PRACTICES,
  IMPORTANT_FILES,
  getAgentById,
  getAgentsByDomain,
  getAgentsByCapability,
  getAgentsForDocument,
  isValidAgentId,
} from './agentRegistry';

export type {
  AgentType,
  AgentDomain,
  AgentCapability,
  AgentDefinition,
} from './agentRegistry';

// Legacy exports for backwards compatibility (deprecated)
// These re-export from agentRegistry which is now the source of truth
