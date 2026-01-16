/**
 * Workflow Gateway Handler
 *
 * Handles PREVC workflow management operations.
 * Replaces: workflowInit, workflowStatus, workflowAdvance, workflowHandoff,
 *           workflowCollaborate, workflowCreateDoc, workflowGetGates,
 *           workflowApprovePlan, workflowSetAutonomous
 */

import * as path from 'path';
import { WorkflowService } from '../../workflow';
import {
  PHASE_NAMES_EN,
  ROLE_DISPLAY_NAMES,
  getScaleName,
  ProjectScale,
  PrevcPhase,
  createPlanLinker,
  WorkflowGateError,
} from '../../../workflow';

import type { WorkflowParams } from './types';
import type { MCPToolResponse } from './response';
import { createJsonResponse, createErrorResponse } from './response';

export interface WorkflowOptions {
  repoPath: string;
}

/**
 * Handles workflow gateway actions for PREVC workflow management.
 */
export async function handleWorkflow(
  params: WorkflowParams,
  options: WorkflowOptions
): Promise<MCPToolResponse> {
  const repoPath = path.resolve(options.repoPath);

  try {
    const service = new WorkflowService(repoPath);

    switch (params.action) {
      case 'init': {
        const status = await service.init({
          name: params.name!,
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
      }

      case 'status': {
        if (!(await service.hasWorkflow())) {
          return createJsonResponse({
            success: false,
            error: 'No workflow found. Run workflow({ action: "init" }) first.',
            statusFilePath: path.join(repoPath, '.context', 'workflow', 'status.yaml')
          });
        }

        const summary = await service.getSummary();
        const status = await service.getStatus();
        const statusFilePath = path.join(repoPath, '.context', 'workflow', 'status.yaml');

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
          roles: status.roles,
          statusFilePath,
        });
      }

      case 'advance': {
        if (!(await service.hasWorkflow())) {
          return createJsonResponse({
            success: false,
            error: 'No workflow found. Run workflow({ action: "init" }) first.'
          });
        }

        try {
          const nextPhase = await service.advance(params.outputs, { force: params.force });

          if (nextPhase) {
            return createJsonResponse({
              success: true,
              message: `Advanced to ${PHASE_NAMES_EN[nextPhase]} phase`,
              nextPhase: {
                code: nextPhase,
                name: PHASE_NAMES_EN[nextPhase],
              }
            });
          } else {
            return createJsonResponse({
              success: true,
              message: 'Workflow completed!',
              isComplete: true
            });
          }
        } catch (error) {
          if (error instanceof WorkflowGateError) {
            return createJsonResponse({
              success: false,
              error: error.message,
              gate: error.gate,
              transition: error.transition,
              hint: error.hint,
            });
          }
          throw error;
        }
      }

      case 'handoff': {
        if (!(await service.hasWorkflow())) {
          return createJsonResponse({
            success: false,
            error: 'No workflow found. Run workflow({ action: "init" }) first.'
          });
        }

        await service.handoff(params.from!, params.to!, params.artifacts!);

        return createJsonResponse({
          success: true,
          message: `Handoff complete: ${ROLE_DISPLAY_NAMES[params.from!]} → ${ROLE_DISPLAY_NAMES[params.to!]}`,
          from: { role: params.from, displayName: ROLE_DISPLAY_NAMES[params.from!] },
          to: { role: params.to, displayName: ROLE_DISPLAY_NAMES[params.to!] },
          artifacts: params.artifacts
        });
      }

      case 'collaborate': {
        const session = await service.startCollaboration(
          params.topic!,
          params.participants
        );
        const sessionStatus = session.getStatus();

        return createJsonResponse({
          success: true,
          message: `Collaboration session started: ${params.topic}`,
          sessionId: sessionStatus.id,
          topic: sessionStatus.topic,
          participants: sessionStatus.participants.map((p) => ({
            role: p,
            displayName: ROLE_DISPLAY_NAMES[p],
          })),
        });
      }

      case 'createDoc': {
        if (!(await service.hasWorkflow())) {
          return createJsonResponse({
            success: false,
            error: 'No workflow found. Run workflow({ action: "init" }) first.'
          });
        }

        const docPath = `.context/workflow/docs/${params.type}-${params.docName?.toLowerCase().replace(/\s+/g, '-')}.md`;

        return createJsonResponse({
          success: true,
          message: `Document template ready: ${params.type}`,
          documentType: params.type,
          suggestedPath: docPath,
          name: params.docName,
        });
      }

      case 'getGates': {
        if (!(await service.hasWorkflow())) {
          return createJsonResponse({
            success: false,
            error: 'No workflow found. Run workflow({ action: "init" }) first.'
          });
        }

        const gateResult = await service.checkGates();
        const settings = await service.getSettings();
        const approval = await service.getApproval();
        const summary = await service.getSummary();

        return createJsonResponse({
          success: true,
          currentPhase: {
            code: summary.currentPhase,
            name: PHASE_NAMES_EN[summary.currentPhase],
          },
          canAdvance: gateResult.canAdvance,
          gates: gateResult.gates,
          blockingReason: gateResult.blockingReason,
          hint: gateResult.hint,
          settings: {
            autonomous_mode: settings.autonomous_mode,
            require_plan: settings.require_plan,
            require_approval: settings.require_approval,
          },
          approval: approval ? {
            plan_created: approval.plan_created,
            plan_approved: approval.plan_approved,
            approved_by: approval.approved_by,
            approved_at: approval.approved_at,
          } : null,
        });
      }

      case 'approvePlan': {
        if (!(await service.hasWorkflow())) {
          return createJsonResponse({
            success: false,
            error: 'No workflow found. Run workflow({ action: "init" }) first.'
          });
        }

        const currentApproval = await service.getApproval();
        if (!currentApproval?.plan_created) {
          return createJsonResponse({
            success: false,
            error: 'No plan is linked to approve. Link a plan first using plan({ action: "link" }).',
            hint: 'Use context({ action: "scaffoldPlan" }) to create a plan, then plan({ action: "link" }) to link it.'
          });
        }

        const approval = await service.approvePlan(
          params.approver || 'reviewer',
          params.notes
        );

        if (params.planSlug) {
          const planLinker = createPlanLinker(repoPath);
          const plans = await planLinker.getLinkedPlans();
          const planRef = plans.active.find(p => p.slug === params.planSlug);
          if (planRef) {
            planRef.approval_status = 'approved';
            planRef.approved_at = approval.approved_at;
            planRef.approved_by = approval.approved_by as string;
          }
        }

        const gateResult = await service.checkGates();

        return createJsonResponse({
          success: true,
          message: 'Plan approved successfully',
          approval: {
            plan_approved: approval.plan_approved,
            approved_by: approval.approved_by,
            approved_at: approval.approved_at,
            approval_notes: approval.approval_notes,
          },
          canAdvanceToExecution: gateResult.gates.approval_required.passed,
        });
      }

      case 'setAutonomous': {
        if (!(await service.hasWorkflow())) {
          return createJsonResponse({
            success: false,
            error: 'No workflow found. Run workflow({ action: "init" }) first.'
          });
        }

        const settings = await service.setAutonomousMode(params.enabled!);

        return createJsonResponse({
          success: true,
          message: `Autonomous mode ${params.enabled ? 'enabled' : 'disabled'}${params.reason ? `: ${params.reason}` : ''}`,
          settings: {
            autonomous_mode: settings.autonomous_mode,
            require_plan: settings.require_plan,
            require_approval: settings.require_approval,
          },
          effect: params.enabled
            ? 'All workflow gates are now bypassed. Use workflow({ action: "advance" }) freely.'
            : 'Workflow gates are now enforced based on settings.',
        });
      }

      default:
        return createErrorResponse(`Unknown workflow action: ${params.action}`);
    }
  } catch (error) {
    return createErrorResponse(error);
  }
}
