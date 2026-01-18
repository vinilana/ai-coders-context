/**
 * Workflow Advance Handler
 *
 * Handles advancing PREVC workflow to the next phase.
 */

import * as path from 'path';
import { WorkflowService } from '../../workflow';
import {
  PHASE_NAMES_EN,
  WorkflowGateError,
} from '../../../workflow';

import type { MCPToolResponse } from './response';
import { createJsonResponse, createErrorResponse } from './response';

export interface WorkflowAdvanceParams {
  outputs?: string[];
  force?: boolean;
  repoPath?: string;
}

export interface WorkflowAdvanceOptions {
  repoPath: string;
}

/**
 * Advance workflow to the next PREVC phase (P→R→E→V→C).
 *
 * Enforces gates:
 * - P→R: Requires plan if require_plan=true
 * - R→E: Requires approval if require_approval=true
 *
 * Use force=true to bypass gates, or use workflow-manage({ action: 'setAutonomous' }).
 */
export async function handleWorkflowAdvance(
  params: WorkflowAdvanceParams,
  options: WorkflowAdvanceOptions
): Promise<MCPToolResponse> {
  try {
    // Resolve repo path: use explicit param, then options
    // options.repoPath is guaranteed to be valid by MCP server initialization
    const repoPath = path.resolve(params.repoPath || options.repoPath);
    const contextPath = path.join(repoPath, '.context');

    // Create service
    const service = await WorkflowService.create(repoPath);

    if (!(await service.hasWorkflow())) {
      return createJsonResponse({
        success: false,
        error: 'No workflow found. Initialize a workflow first.',
        suggestion: 'Use workflow-init({ name: "feature-name" }) to start.',
        statusFilePath: path.join(contextPath, 'workflow', 'status.yaml')
      });
    }

    try {
      const nextPhase = await service.advance(params.outputs, { force: params.force });

      if (nextPhase) {
        const response: Record<string, unknown> = {
          success: true,
          message: `Advanced to ${PHASE_NAMES_EN[nextPhase]} phase`,
          nextPhase: {
            code: nextPhase,
            name: PHASE_NAMES_EN[nextPhase],
          }
        };

        response.orchestration = await service.getPhaseOrchestration(nextPhase);

        return createJsonResponse(response);
      } else {
        return createJsonResponse({
          success: true,
          message: 'Workflow completed!',
          isComplete: true
        });
      }
    } catch (error) {
      if (error instanceof WorkflowGateError) {
        const blockedGate = error.message.includes('plan') ? 'plan_required' : 'approval_required';

        return createJsonResponse({
          success: false,
          error: error.message,
          gate: error.gate,
          transition: error.transition,
          blockedGate,
          hint: error.hint,
          resolution: blockedGate === 'plan_required'
            ? 'Create and link a plan: plan({ action: "link", planSlug: "plan-name" })'
            : 'Approve plan: workflow-manage({ action: "approvePlan", planSlug: "plan-name" })',
          alternative: 'Use workflow-advance({ force: true }) to bypass gate',
          autonomousMode: 'Or use workflow-manage({ action: "setAutonomous", enabled: true })'
        });
      }
      throw error;
    }
  } catch (error) {
    return createErrorResponse(error);
  }
}
