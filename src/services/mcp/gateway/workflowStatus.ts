/**
 * Workflow Status Handler
 *
 * Handles PREVC workflow status queries.
 */

import * as path from 'path';
import { WorkflowService } from '../../workflow';
import {
  PHASE_NAMES_EN,
  getScaleName,
  ProjectScale,
} from '../../../workflow';

import type { MCPToolResponse } from './response';
import { createJsonResponse, createErrorResponse } from './response';

export interface WorkflowStatusParams {
  repoPath?: string;
}

export interface WorkflowStatusOptions {
  repoPath: string;
}

/**
 * Get current PREVC workflow status including phase, gates, and linked plans.
 */
export async function handleWorkflowStatus(
  params: WorkflowStatusParams,
  options: WorkflowStatusOptions
): Promise<MCPToolResponse> {
  const repoPath = path.resolve(params.repoPath || options.repoPath);
  const contextPath = path.basename(repoPath) === '.context'
    ? repoPath
    : path.join(repoPath, '.context');

  try {
    const service = new WorkflowService(repoPath);

    if (!(await service.hasWorkflow())) {
      return createJsonResponse({
        success: false,
        error: 'No workflow found. Initialize a workflow first.',
        suggestion: 'Use workflow-init({ name: "feature-name" }) to start.',
        note: 'Workflows enable structured PREVC phases. Skip for trivial changes.',
        statusFilePath: path.join(contextPath, 'workflow', 'status.yaml')
      });
    }

    const summary = await service.getSummary();
    const status = await service.getStatus();
    const statusFilePath = path.join(contextPath, 'workflow', 'status.yaml');
    const orchestration = await service.getPhaseOrchestration(summary.currentPhase);

    return createJsonResponse({
      success: true,
      name: summary.name,
      scale: getScaleName(summary.scale as ProjectScale),
      currentPhase: {
        code: summary.currentPhase,
        name: PHASE_NAMES_EN[summary.currentPhase],
      },
      progress: summary.progress,
      isComplete: summary.isComplete,
      phases: status.phases,
      agents: status.agents,
      roles: status.roles,
      orchestration,
      statusFilePath,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
