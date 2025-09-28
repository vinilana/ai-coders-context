import { AGENT_TYPES } from '../../generators/agents/agentTypes';

export function getAgentFilesByTypes(types?: string[]): Set<string> | undefined {
  if (!types || types.length === 0) {
    return undefined;
  }

  const allowed = new Set(AGENT_TYPES);
  const files = types
    .filter(type => allowed.has(type as typeof AGENT_TYPES[number]))
    .map(type => `${type}.md`);

  return files.length ? new Set(files) : undefined;
}
