import { AgentType } from '../agentTypes';

export interface DocTouchpoint {
  title: string;
  path: string;
  marker: string;
}

export interface AgentTemplateContext {
  agentType: AgentType;
  topLevelDirectories: string[];
  docTouchpoints: DocTouchpoint[];
  responsibilities: string[];
  bestPractices: string[];
}
