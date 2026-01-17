/**
 * Plan Gateway Handler
 *
 * Handles plan management and execution tracking operations.
 * Replaces: linkPlan, getLinkedPlans, getPlanDetails, getPlansForPhase,
 *           updatePlanPhase, recordDecision, updatePlanStep, getPlanExecutionStatus,
 *           syncPlanMarkdown
 */

import * as path from 'path';
import { WorkflowService } from '../../workflow';
import {
  PHASE_NAMES_EN,
  createPlanLinker,
  PrevcStatusManager,
} from '../../../workflow';

import type { PlanParams } from './types';
import type { MCPToolResponse } from './response';
import { createJsonResponse, createErrorResponse } from './response';

export interface PlanOptions {
  repoPath: string;
}

/**
 * Handles plan gateway actions for plan management and execution tracking.
 */
export async function handlePlan(
  params: PlanParams,
  options: PlanOptions
): Promise<MCPToolResponse> {
  const repoPath = options.repoPath || process.cwd();
  // Create statusManager for breadcrumb trail logging in step updates
  const contextPath = path.join(repoPath, '.context');
  const statusManager = new PrevcStatusManager(contextPath);
  const linker = createPlanLinker(repoPath, statusManager);

  try {
    switch (params.action) {
      case 'link': {
        const ref = await linker.linkPlan(params.planSlug!);

        if (!ref) {
          return createJsonResponse({
            success: false,
            error: `Plan not found: ${params.planSlug}`,
          });
        }

        const service = new WorkflowService(repoPath);
        if (await service.hasWorkflow()) {
          await service.markPlanCreated(params.planSlug!);
        }

        let canAdvanceToReview = false;
        if (await service.hasWorkflow()) {
          const gateResult = await service.checkGates();
          canAdvanceToReview = gateResult.gates.plan_required.passed;
        }

        return createJsonResponse({
          success: true,
          plan: ref,
          planCreatedForGates: true,
          canAdvanceToReview,
        });
      }

      case 'getLinked': {
        const plans = await linker.getLinkedPlans();
        return createJsonResponse({
          success: true,
          plans,
        });
      }

      case 'getDetails': {
        const plan = await linker.getLinkedPlan(params.planSlug!);

        if (!plan) {
          return createJsonResponse({
            success: false,
            error: `Plan not found or not linked: ${params.planSlug}`,
          });
        }

        return createJsonResponse({
          success: true,
          plan: {
            ...plan,
            phasesWithPrevc: plan.phases.map(p => ({
              ...p,
              prevcPhaseName: PHASE_NAMES_EN[p.prevcPhase],
            })),
          },
        });
      }

      case 'getForPhase': {
        const plans = await linker.getPlansForPhase(params.phase!);

        return createJsonResponse({
          success: true,
          phase: params.phase,
          phaseName: PHASE_NAMES_EN[params.phase!],
          plans: plans.map(p => ({
            slug: p.ref.slug,
            title: p.ref.title,
            phasesInThisPrevc: p.phases
              .filter(ph => ph.prevcPhase === params.phase)
              .map(ph => ({ id: ph.id, name: ph.name, status: ph.status })),
            hasPendingWork: linker.hasPendingWorkForPhase(p, params.phase!),
          })),
        });
      }

      case 'updatePhase': {
        const success = await linker.updatePlanPhase(params.planSlug!, params.phaseId!, params.status!);

        return createJsonResponse({
          success,
          planSlug: params.planSlug,
          phaseId: params.phaseId,
          status: params.status,
        });
      }

      case 'recordDecision': {
        const decision = await linker.recordDecision(params.planSlug!, {
          title: params.title!,
          description: params.description!,
          phase: params.phase,
          alternatives: params.alternatives,
          status: 'accepted',
        });

        return createJsonResponse({
          success: true,
          decision,
        });
      }

      case 'updateStep': {
        const success = await linker.updatePlanStep(
          params.planSlug!,
          params.phaseId!,
          params.stepIndex!,
          params.status!,
          { output: params.output, notes: params.notes }
        );

        return createJsonResponse({
          success,
          planSlug: params.planSlug,
          phaseId: params.phaseId,
          stepIndex: params.stepIndex,
          status: params.status,
        });
      }

      case 'getStatus': {
        const status = await linker.getPlanExecutionStatus(params.planSlug!);

        if (!status) {
          return createJsonResponse({
            success: false,
            error: 'Plan tracking not found. The plan may not have any execution data yet.',
          });
        }

        return createJsonResponse({
          success: true,
          ...status,
        });
      }

      case 'syncMarkdown': {
        const success = await linker.syncPlanMarkdown(params.planSlug!);

        return createJsonResponse({
          success,
          planSlug: params.planSlug,
          message: success ? 'Plan markdown synced successfully' : 'Failed to sync - plan or tracking not found',
        });
      }

      default:
        return createErrorResponse(`Unknown plan action: ${params.action}`);
    }
  } catch (error) {
    return createErrorResponse(error);
  }
}
