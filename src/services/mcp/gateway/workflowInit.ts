/**
 * Workflow Init Handler
 *
 * Handles PREVC workflow initialization.
 * Primary entry point for AI to start workflows.
 */

import * as path from 'path';
import { WorkflowService } from '../../workflow';
import {
  getScaleName,
  ProjectScale,
  PrevcPhase,
} from '../../../workflow';

import type { MCPToolResponse } from './response';
import { createJsonResponse, createErrorResponse } from './response';

export interface WorkflowInitParams {
  name: string;
  description?: string;
  scale?: 'QUICK' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
  autonomous?: boolean;
  require_plan?: boolean;
  require_approval?: boolean;
  archive_previous?: boolean;
  repoPath?: string;
}

export interface WorkflowInitOptions {
  repoPath: string;
}

/**
 * Initialize a PREVC workflow.
 *
 * This is the primary method for AI to start workflows.
 * Use this after .context/ exists (use project-setup for first-time setup).
 */
export async function handleWorkflowInit(
  params: WorkflowInitParams,
  options: WorkflowInitOptions
): Promise<MCPToolResponse> {
  const repoPath = path.resolve(params.repoPath || options.repoPath);

  try {
    const service = new WorkflowService(repoPath);

    const status = await service.init({
      name: params.name,
      description: params.description,
      scale: params.scale,
      autonomous: params.autonomous,
      requirePlan: params.require_plan,
      requireApproval: params.require_approval,
      archivePrevious: params.archive_previous,
    });

    const contextPath = path.join(repoPath, '.context');
    const statusFilePath = path.join(contextPath, 'workflow', 'status.yaml');
    const settings = await service.getSettings();

    return createJsonResponse({
      success: true,
      message: `Workflow initialized: ${params.name}`,
      scale: getScaleName(status.project.scale as ProjectScale),
      currentPhase: status.project.current_phase,
      phases: Object.keys(status.phases).filter(
        (p) => status.phases[p as PrevcPhase].status !== 'skipped'
      ),
      settings: {
        autonomous_mode: settings.autonomous_mode,
        require_plan: settings.require_plan,
        require_approval: settings.require_approval,
      },
      statusFilePath,
      contextPath,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
