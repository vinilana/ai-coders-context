/**
 * Workflow Status Handler
 *
 * Handles PREVC workflow status queries.
 */

import * as path from 'path';
import { WorkflowService } from '../../workflow';
import { resolveContextRoot } from '../../shared/contextRootResolver';
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
  try {
    // Resolve repo path with robust context detection
    let repoPath = params.repoPath || options.repoPath;
    if (!repoPath) {
      const resolution = await resolveContextRoot({ validate: false });
      repoPath = resolution.projectRoot;
    }
    repoPath = path.resolve(repoPath);

    // Get context path using robust resolver
    const resolution = await resolveContextRoot({
      startPath: repoPath,
      validate: false,
    });
    const contextPath = resolution.contextPath;

    // Create service with robust detection
    const service = await WorkflowService.create(repoPath);

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
