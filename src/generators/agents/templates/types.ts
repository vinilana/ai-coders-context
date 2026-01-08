import { AgentType } from '../agentTypes';
import { SemanticContext } from '../../../services/semantic';

export interface DocTouchpoint {
  title: string;
  path: string;
  marker: string;
}

export interface KeySymbolInfo {
  name: string;
  kind: string;
  file: string;
  line: number;
}

export interface AgentTemplateContext {
  agentType: AgentType;
  topLevelDirectories: string[];
  docTouchpoints: DocTouchpoint[];
  responsibilities: string[];
  bestPractices: string[];
  semantics?: SemanticContext;
  relevantSymbols?: KeySymbolInfo[];
}
