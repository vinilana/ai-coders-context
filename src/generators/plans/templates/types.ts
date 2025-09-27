import { AgentType } from '../../agents/agentTypes';
import { GuideMeta } from '../../documentation/templates/types';

export interface PlanAgentSummary {
  type: AgentType;
  title: string;
  responsibility: string;
}

export interface PlanTemplateContext {
  title: string;
  slug: string;
  summary?: string;
  agents: PlanAgentSummary[];
  docs: GuideMeta[];
}

export interface PlanIndexEntry {
  slug: string;
  title: string;
}
