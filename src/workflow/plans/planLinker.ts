/**
 * Plan Linker
 *
 * Links implementation plans to the PREVC workflow system.
 * Provides bidirectional sync between plan progress and workflow phases.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import {
  PlanReference,
  LinkedPlan,
  PlanPhase,
  PlanDecision,
  WorkflowPlans,
  PLAN_PHASE_TO_PREVC,
} from './types';
import { PrevcPhase, StatusType } from '../types';

/**
 * Plan Linker class
 */
export class PlanLinker {
  private repoPath: string;
  private contextPath: string;
  private plansPath: string;
  private workflowPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.contextPath = path.join(repoPath, '.context');
    this.plansPath = path.join(this.contextPath, 'plans');
    this.workflowPath = path.join(this.contextPath, 'workflow');
  }

  /**
   * Link a plan to the current workflow
   */
  async linkPlan(planSlug: string): Promise<PlanReference | null> {
    const planPath = path.join(this.plansPath, `${planSlug}.md`);

    if (!await fs.pathExists(planPath)) {
      return null;
    }

    const content = await fs.readFile(planPath, 'utf-8');
    const planInfo = this.parsePlanFile(content, planSlug);

    const ref: PlanReference = {
      slug: planSlug,
      path: `plans/${planSlug}.md`,
      title: planInfo.title,
      summary: planInfo.summary,
      linkedAt: new Date().toISOString(),
      status: 'active',
    };

    // Update workflow plans tracking
    await this.addPlanToWorkflow(ref);

    return ref;
  }

  /**
   * Get all linked plans for the current workflow
   */
  async getLinkedPlans(): Promise<WorkflowPlans> {
    const plansFile = path.join(this.workflowPath, 'plans.json');

    if (!await fs.pathExists(plansFile)) {
      return { active: [], completed: [] };
    }

    const content = await fs.readFile(plansFile, 'utf-8');
    try {
      return JSON.parse(content) || { active: [], completed: [] };
    } catch {
      return { active: [], completed: [] };
    }
  }

  /**
   * Get detailed plan with workflow mapping
   */
  async getLinkedPlan(planSlug: string): Promise<LinkedPlan | null> {
    const plans = await this.getLinkedPlans();
    const ref = [...plans.active, ...plans.completed].find(p => p.slug === planSlug);

    if (!ref) {
      return null;
    }

    const planPath = path.join(this.contextPath, ref.path);
    if (!await fs.pathExists(planPath)) {
      return null;
    }

    const content = await fs.readFile(planPath, 'utf-8');
    return this.parsePlanToLinked(content, ref);
  }

  /**
   * Get plans for a specific PREVC phase
   */
  async getPlansForPhase(phase: PrevcPhase): Promise<LinkedPlan[]> {
    const plans = await this.getLinkedPlans();
    const linkedPlans: LinkedPlan[] = [];

    for (const ref of plans.active) {
      const plan = await this.getLinkedPlan(ref.slug);
      if (plan) {
        const hasPhase = plan.phases.some(p => p.prevcPhase === phase);
        if (hasPhase) {
          linkedPlans.push(plan);
        }
      }
    }

    return linkedPlans;
  }

  /**
   * Update plan phase status and sync with workflow
   */
  async updatePlanPhase(
    planSlug: string,
    phaseId: string,
    status: StatusType
  ): Promise<boolean> {
    const trackingFile = path.join(this.workflowPath, 'plan-tracking', `${planSlug}.json`);

    let tracking: Record<string, unknown> = {};
    if (await fs.pathExists(trackingFile)) {
      const content = await fs.readFile(trackingFile, 'utf-8');
      try {
        tracking = JSON.parse(content) || {};
      } catch {
        tracking = {};
      }
    }

    // Update phase tracking
    if (!tracking.phases) {
      tracking.phases = {};
    }
    (tracking.phases as Record<string, unknown>)[phaseId] = {
      status,
      updatedAt: new Date().toISOString(),
    };

    // Calculate progress
    const plan = await this.getLinkedPlan(planSlug);
    if (plan) {
      const totalPhases = plan.phases.length;
      const completedPhases = plan.phases.filter(p =>
        (tracking.phases as Record<string, { status: string }>)?.[p.id]?.status === 'completed'
      ).length;
      tracking.progress = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;
    }

    // Save tracking
    await fs.ensureDir(path.dirname(trackingFile));
    await fs.writeFile(trackingFile, JSON.stringify(tracking, null, 2), 'utf-8');

    return true;
  }

  /**
   * Record a decision in the plan
   */
  async recordDecision(
    planSlug: string,
    decision: Omit<PlanDecision, 'id' | 'decidedAt'>
  ): Promise<PlanDecision> {
    const trackingFile = path.join(this.workflowPath, 'plan-tracking', `${planSlug}.json`);

    let tracking: Record<string, unknown> = {};
    if (await fs.pathExists(trackingFile)) {
      const content = await fs.readFile(trackingFile, 'utf-8');
      try {
        tracking = JSON.parse(content) || {};
      } catch {
        tracking = {};
      }
    }

    if (!tracking.decisions) {
      tracking.decisions = [];
    }

    const fullDecision: PlanDecision = {
      ...decision,
      id: `dec-${Date.now()}`,
      decidedAt: new Date().toISOString(),
    };

    (tracking.decisions as PlanDecision[]).push(fullDecision);

    await fs.ensureDir(path.dirname(trackingFile));
    await fs.writeFile(trackingFile, JSON.stringify(tracking, null, 2), 'utf-8');

    return fullDecision;
  }

  /**
   * Get current phase mapping for workflow
   */
  getPhaseMappingForWorkflow(plan: LinkedPlan, currentPrevcPhase: PrevcPhase): PlanPhase[] {
    return plan.phases.filter(p => p.prevcPhase === currentPrevcPhase);
  }

  /**
   * Check if plan has pending work for a PREVC phase
   */
  hasPendingWorkForPhase(plan: LinkedPlan, phase: PrevcPhase): boolean {
    const phasesInPrevc = plan.phases.filter(p => p.prevcPhase === phase);
    return phasesInPrevc.some(p => p.status === 'pending' || p.status === 'in_progress');
  }

  /**
   * Get plan progress summary
   */
  async getPlanProgress(planSlug: string): Promise<{
    overall: number;
    byPhase: Record<PrevcPhase, { total: number; completed: number; percentage: number }>;
  }> {
    const plan = await this.getLinkedPlan(planSlug);
    if (!plan) {
      return { overall: 0, byPhase: {} as Record<PrevcPhase, { total: number; completed: number; percentage: number }> };
    }

    const byPhase: Record<PrevcPhase, { total: number; completed: number; percentage: number }> = {
      P: { total: 0, completed: 0, percentage: 0 },
      R: { total: 0, completed: 0, percentage: 0 },
      E: { total: 0, completed: 0, percentage: 0 },
      V: { total: 0, completed: 0, percentage: 0 },
      C: { total: 0, completed: 0, percentage: 0 },
    };

    for (const phase of plan.phases) {
      byPhase[phase.prevcPhase].total++;
      if (phase.status === 'completed') {
        byPhase[phase.prevcPhase].completed++;
      }
    }

    // Calculate percentages
    for (const key of Object.keys(byPhase) as PrevcPhase[]) {
      const { total, completed } = byPhase[key];
      byPhase[key].percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    }

    return {
      overall: plan.progress,
      byPhase,
    };
  }

  /**
   * Parse plan markdown file to extract info
   */
  private parsePlanFile(content: string, slug: string): { title: string; summary?: string } {
    const titleMatch = content.match(/^#\s+(.+?)(?:\s+Plan)?$/m);
    const summaryMatch = content.match(/^>\s*(.+)$/m);

    return {
      title: titleMatch?.[1] || slug,
      summary: summaryMatch?.[1],
    };
  }

  /**
   * Parse plan file into LinkedPlan structure
   */
  private parsePlanToLinked(content: string, ref: PlanReference): LinkedPlan {
    const phases = this.extractPhases(content);
    const decisions = this.extractDecisions();
    const agents = this.extractAgents(content);
    const docs = this.extractDocs(content);

    const completedPhases = phases.filter(p => p.status === 'completed').length;
    const progress = phases.length > 0 ? Math.round((completedPhases / phases.length) * 100) : 0;

    const currentPhase = phases.find(p => p.status === 'in_progress')?.id;

    return {
      ref,
      phases,
      decisions,
      risks: [],
      agents,
      docs,
      progress,
      currentPhase,
    };
  }

  /**
   * Extract phases from plan markdown
   */
  private extractPhases(content: string): PlanPhase[] {
    const phases: PlanPhase[] = [];

    // Match "### Phase N — Name" or "### Phase N - Name"
    const phaseRegex = /###\s+Phase\s+(\d+)\s*[—-]\s*(.+)/g;
    let match;

    while ((match = phaseRegex.exec(content)) !== null) {
      const phaseNum = match[1];
      const phaseName = match[2].trim();
      const phaseId = `phase-${phaseNum}`;

      // Determine PREVC mapping based on phase name
      const lowerName = phaseName.toLowerCase();
      let prevcPhase: PrevcPhase = 'E'; // Default to Execution

      for (const [keyword, phase] of Object.entries(PLAN_PHASE_TO_PREVC)) {
        if (lowerName.includes(keyword)) {
          prevcPhase = phase;
          break;
        }
      }

      phases.push({
        id: phaseId,
        name: phaseName,
        prevcPhase,
        steps: [],
        status: 'pending',
      });
    }

    // If no phases found, create default structure
    if (phases.length === 0) {
      phases.push(
        { id: 'phase-1', name: 'Discovery & Alignment', prevcPhase: 'P', steps: [], status: 'pending' },
        { id: 'phase-2', name: 'Implementation', prevcPhase: 'E', steps: [], status: 'pending' },
        { id: 'phase-3', name: 'Validation & Handoff', prevcPhase: 'V', steps: [], status: 'pending' }
      );
    }

    return phases;
  }

  /**
   * Extract decisions from plan content
   */
  private extractDecisions(): PlanDecision[] {
    // Decisions are typically recorded during execution, start empty
    return [];
  }

  /**
   * Extract agents from plan content
   */
  private extractAgents(content: string): string[] {
    const agents: string[] = [];

    // Match agent references in table rows
    const agentRegex = /\[([^\]]+)\]\(\.\.\/agents\/([^)]+)\.md\)/g;
    let match;

    while ((match = agentRegex.exec(content)) !== null) {
      const agentType = match[2];
      if (!agents.includes(agentType)) {
        agents.push(agentType);
      }
    }

    return agents;
  }

  /**
   * Extract documentation references from plan
   */
  private extractDocs(content: string): string[] {
    const docs: string[] = [];

    // Match doc references
    const docRegex = /\[([^\]]+)\]\(\.\.\/docs\/([^)]+)\)/g;
    let match;

    while ((match = docRegex.exec(content)) !== null) {
      const docPath = match[2];
      if (!docs.includes(docPath)) {
        docs.push(docPath);
      }
    }

    return docs;
  }

  /**
   * Add plan reference to workflow tracking
   */
  private async addPlanToWorkflow(ref: PlanReference): Promise<void> {
    const plansFile = path.join(this.workflowPath, 'plans.json');

    let plans: WorkflowPlans = { active: [], completed: [] };
    if (await fs.pathExists(plansFile)) {
      const content = await fs.readFile(plansFile, 'utf-8');
      try {
        plans = JSON.parse(content) || { active: [], completed: [] };
      } catch {
        plans = { active: [], completed: [] };
      }
    }

    // Remove if already exists
    plans.active = plans.active.filter(p => p.slug !== ref.slug);
    plans.completed = plans.completed.filter(p => p.slug !== ref.slug);

    // Add to active
    plans.active.push(ref);

    // Set as primary if first plan
    if (!plans.primary) {
      plans.primary = ref.slug;
    }

    await fs.ensureDir(this.workflowPath);
    await fs.writeFile(plansFile, JSON.stringify(plans, null, 2), 'utf-8');
  }
}

// Export singleton factory
export function createPlanLinker(repoPath: string): PlanLinker {
  return new PlanLinker(repoPath);
}
