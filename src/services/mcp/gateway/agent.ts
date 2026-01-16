/**
 * Agent Gateway Handler
 *
 * Handles agent orchestration and discovery operations.
 * Replaces: discoverAgents, getAgentInfo, orchestrateAgents, getAgentSequence,
 *           getAgentDocs, getPhaseDocs, listAgentTypes
 */

import {
  PHASE_NAMES_EN,
  ROLE_DISPLAY_NAMES,
  agentOrchestrator,
  documentLinker,
  AgentType,
  AGENT_TYPES,
  createPlanLinker,
} from '../../../workflow';

import type { AgentParams } from './types';
import type { MCPToolResponse } from './response';
import { createJsonResponse, createErrorResponse } from './response';

export interface AgentOptions {
  repoPath: string;
}

/**
 * Handles agent gateway actions for orchestration and discovery.
 */
export async function handleAgent(
  params: AgentParams,
  options: AgentOptions
): Promise<MCPToolResponse> {
  const repoPath = options.repoPath || process.cwd();

  try {
    switch (params.action) {
      case 'discover': {
        const linker = createPlanLinker(repoPath);
        const agents = await linker.discoverAgents();

        const builtIn = agents.filter(a => !a.isCustom);
        const custom = agents.filter(a => a.isCustom);

        return createJsonResponse({
          success: true,
          totalAgents: agents.length,
          builtInCount: builtIn.length,
          customCount: custom.length,
          agents: {
            builtIn: builtIn.map(a => a.type),
            custom: custom.map(a => ({ type: a.type, path: a.path })),
          },
        });
      }

      case 'getInfo': {
        const linker = createPlanLinker(repoPath);
        const info = await linker.getAgentInfo(params.agentType!);

        return createJsonResponse({
          success: true,
          agent: info,
        });
      }

      case 'orchestrate': {
        let agents: AgentType[] = [];
        let source = '';

        if (params.task) {
          agents = agentOrchestrator.selectAgentsByTask(params.task);
          source = `task: "${params.task}"`;
        } else if (params.phase) {
          agents = agentOrchestrator.getAgentsForPhase(params.phase);
          source = `phase: ${params.phase} (${PHASE_NAMES_EN[params.phase]})`;
        } else if (params.role) {
          agents = agentOrchestrator.getAgentsForRole(params.role);
          source = `role: ${ROLE_DISPLAY_NAMES[params.role]}`;
        } else {
          return createErrorResponse('Provide task, phase, or role parameter');
        }

        const agentDetails = agents.map((agent) => ({
          type: agent,
          description: agentOrchestrator.getAgentDescription(agent),
          docs: documentLinker.getDocPathsForAgent(agent),
        }));

        return createJsonResponse({
          source,
          agents: agentDetails,
          count: agents.length,
        });
      }

      case 'getSequence': {
        let sequence: AgentType[];

        if (params.phases && params.phases.length > 0) {
          sequence = agentOrchestrator.getAgentHandoffSequence(params.phases);
        } else {
          sequence = agentOrchestrator.getTaskAgentSequence(
            params.task!,
            params.includeReview !== false
          );
        }

        const sequenceDetails = sequence.map((agent, index) => ({
          order: index + 1,
          agent,
          description: agentOrchestrator.getAgentDescription(agent),
          primaryDoc: documentLinker.getPrimaryDocForAgent(agent)?.path || null,
        }));

        return createJsonResponse({
          task: params.task,
          sequence: sequenceDetails,
          totalAgents: sequence.length,
        });
      }

      case 'getDocs': {
        if (!agentOrchestrator.isValidAgentType(params.agent!)) {
          return createErrorResponse(`Invalid agent type "${params.agent}". Valid types: ${AGENT_TYPES.join(', ')}`);
        }

        const docs = documentLinker.getDocsForAgent(params.agent!);
        const agentDesc = agentOrchestrator.getAgentDescription(params.agent!);

        return createJsonResponse({
          agent: params.agent,
          description: agentDesc,
          documentation: docs.map((doc) => ({
            type: doc.type,
            title: doc.title,
            path: doc.path,
            description: doc.description,
          })),
        });
      }

      case 'getPhaseDocs': {
        const docs = documentLinker.getDocsForPhase(params.phase!);
        const agents = agentOrchestrator.getAgentsForPhase(params.phase!);

        return createJsonResponse({
          phase: params.phase,
          phaseName: PHASE_NAMES_EN[params.phase!],
          documentation: docs.map((doc) => ({
            type: doc.type,
            title: doc.title,
            path: doc.path,
            description: doc.description,
          })),
          recommendedAgents: agents.map((agent) => ({
            type: agent,
            description: agentOrchestrator.getAgentDescription(agent),
          })),
        });
      }

      case 'listTypes': {
        const agents = agentOrchestrator.getAllAgentTypes().map((agent) => ({
          type: agent,
          description: agentOrchestrator.getAgentDescription(agent),
          primaryDoc: documentLinker.getPrimaryDocForAgent(agent)?.title || null,
        }));

        return createJsonResponse({
          agents,
          total: agents.length,
        });
      }

      default:
        return createErrorResponse(`Unknown agent action: ${params.action}`);
    }
  } catch (error) {
    return createErrorResponse(error);
  }
}
