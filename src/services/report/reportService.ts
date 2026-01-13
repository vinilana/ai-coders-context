/**
 * Report Service
 *
 * Generates comprehensive progress reports for PREVC workflows.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import type { CLIInterface } from '../../utils/cliUI';
import type { TranslateFn } from '../../utils/i18n';
import { WorkflowService } from '../workflow';
import { StackDetector } from '../stack';
import {
  PrevcStatus,
  PrevcPhase,
  PHASE_NAMES_EN,
  ROLE_DISPLAY_NAMES_EN,
  getScaleName,
  ProjectScale,
} from '../../workflow';

export interface ReportServiceDependencies {
  ui: CLIInterface;
  t: TranslateFn;
  version: string;
}

export interface ReportOptions {
  format?: 'markdown' | 'json' | 'console';
  output?: string;
  verbose?: boolean;
  includeStack?: boolean;
  includeDecisions?: boolean;
}

export interface WorkflowReport {
  generated: string;
  project: {
    name: string;
    scale: string;
    description?: string;
  };
  progress: {
    percentage: number;
    completed: number;
    total: number;
    currentPhase: string;
    isComplete: boolean;
  };
  phases: Array<{
    phase: string;
    name: string;
    status: string;
    startedAt?: string;
    completedAt?: string;
    outputs: string[];
    roles: Array<{
      role: string;
      name: string;
      status: string;
      outputs: string[];
    }>;
  }>;
  timeline: Array<{
    timestamp: string;
    event: string;
    phase?: string;
    role?: string;
  }>;
  stack?: {
    primaryLanguage: string | null;
    languages: string[];
    frameworks: string[];
    testFrameworks: string[];
  };
  recommendations: string[];
}

export class ReportService {
  private deps: ReportServiceDependencies;

  constructor(deps: ReportServiceDependencies) {
    this.deps = deps;
  }

  /**
   * Generate a workflow progress report
   */
  async generate(repoPath: string, options: ReportOptions = {}): Promise<WorkflowReport> {
    const absolutePath = path.resolve(repoPath);

    const workflowService = new WorkflowService(absolutePath, {
      ui: {
        displaySuccess: () => {},
        displayError: () => {},
        displayInfo: () => {},
      },
    });

    if (!(await workflowService.hasWorkflow())) {
      throw new Error(this.deps.t('errors.report.noWorkflow'));
    }

    const status = await workflowService.getStatus();
    const summary = await workflowService.getSummary();
    const actions = await workflowService.getRecommendedActions();

    const report: WorkflowReport = {
      generated: new Date().toISOString(),
      project: {
        name: status.project.name,
        scale: getScaleName(status.project.scale as ProjectScale),
      },
      progress: {
        percentage: summary.progress.percentage,
        completed: summary.progress.completed,
        total: summary.progress.total,
        currentPhase: summary.currentPhase,
        isComplete: summary.isComplete,
      },
      phases: this.buildPhasesReport(status),
      timeline: this.buildTimeline(status),
      recommendations: actions,
    };

    // Include stack info if requested
    if (options.includeStack) {
      const stackDetector = new StackDetector();
      const stack = await stackDetector.detect(absolutePath);
      report.stack = {
        primaryLanguage: stack.primaryLanguage,
        languages: stack.languages,
        frameworks: stack.frameworks,
        testFrameworks: stack.testFrameworks,
      };
    }

    return report;
  }

  /**
   * Output report in requested format
   */
  async output(report: WorkflowReport, options: ReportOptions = {}): Promise<void> {
    const format = options.format || 'console';

    switch (format) {
      case 'json':
        await this.outputJson(report, options);
        break;
      case 'markdown':
        await this.outputMarkdown(report, options);
        break;
      case 'console':
      default:
        this.outputConsole(report);
        break;
    }
  }

  /**
   * Build phases report from status
   */
  private buildPhasesReport(status: PrevcStatus): WorkflowReport['phases'] {
    const phases: WorkflowReport['phases'] = [];

    for (const [phase, phaseStatus] of Object.entries(status.phases)) {
      const roles: WorkflowReport['phases'][0]['roles'] = [];

      // Get role status from the main roles object for this phase
      for (const [role, roleStatus] of Object.entries(status.roles || {})) {
        if (roleStatus && roleStatus.phase === phase) {
          roles.push({
            role,
            name: ROLE_DISPLAY_NAMES_EN[role as keyof typeof ROLE_DISPLAY_NAMES_EN] || role,
            status: roleStatus.status || 'pending',
            outputs: roleStatus.outputs || [],
          });
        }
      }

      // Map outputs to string array
      const outputPaths = (phaseStatus.outputs || []).map(o =>
        typeof o === 'string' ? o : o.path
      );

      phases.push({
        phase,
        name: PHASE_NAMES_EN[phase as PrevcPhase] || phase,
        status: phaseStatus.status,
        startedAt: phaseStatus.started_at,
        completedAt: phaseStatus.completed_at,
        outputs: outputPaths,
        roles,
      });
    }

    return phases;
  }

  /**
   * Build timeline from status
   */
  private buildTimeline(status: PrevcStatus): WorkflowReport['timeline'] {
    const timeline: WorkflowReport['timeline'] = [];

    // Add workflow start
    if (status.project.started) {
      timeline.push({
        timestamp: status.project.started,
        event: 'Workflow started',
      });
    }

    // Add phase transitions
    for (const [phase, phaseStatus] of Object.entries(status.phases)) {
      if (phaseStatus.started_at) {
        timeline.push({
          timestamp: phaseStatus.started_at,
          event: `Phase ${phase} started`,
          phase,
        });
      }

      if (phaseStatus.completed_at) {
        timeline.push({
          timestamp: phaseStatus.completed_at,
          event: `Phase ${phase} completed`,
          phase,
        });
      }
    }

    // Add role events from roles object
    for (const [role, roleStatus] of Object.entries(status.roles || {})) {
      if (roleStatus && roleStatus.last_active) {
        timeline.push({
          timestamp: roleStatus.last_active,
          event: `Role ${role} active`,
          phase: roleStatus.phase,
          role,
        });
      }
    }

    // Sort by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return timeline;
  }

  /**
   * Output report as JSON
   */
  private async outputJson(report: WorkflowReport, options: ReportOptions): Promise<void> {
    const json = JSON.stringify(report, null, 2);

    if (options.output) {
      await fs.writeFile(options.output, json, 'utf-8');
      this.deps.ui.displaySuccess(this.deps.t('success.report.saved', { path: options.output }));
    } else {
      console.log(json);
    }
  }

  /**
   * Output report as Markdown
   */
  private async outputMarkdown(report: WorkflowReport, options: ReportOptions): Promise<void> {
    const md = this.generateMarkdown(report);

    if (options.output) {
      await fs.writeFile(options.output, md, 'utf-8');
      this.deps.ui.displaySuccess(this.deps.t('success.report.saved', { path: options.output }));
    } else {
      console.log(md);
    }
  }

  /**
   * Output report to console with visual dashboard
   */
  private outputConsole(report: WorkflowReport): void {
    console.log('');
    console.log(this.generateVisualDashboard(report));
    console.log('');
  }

  /**
   * Generate visual dashboard string
   */
  generateVisualDashboard(report: WorkflowReport): string {
    const lines: string[] = [];
    const width = 50;

    // Header box
    lines.push('╭' + '─'.repeat(width) + '╮');
    lines.push('│' + this.centerText(`${report.project.name}`, width) + '│');
    lines.push('│' + this.centerText(`[${report.project.scale}]`, width) + '│');
    lines.push('├' + '─'.repeat(width) + '┤');

    // Progress bar
    const progressBar = this.generateProgressBar(report.progress.percentage, width - 4);
    lines.push('│' + this.centerText(progressBar, width) + '│');
    lines.push(
      '│' +
        this.centerText(
          `Progress: ${report.progress.percentage}% (${report.progress.completed}/${report.progress.total} phases)`,
          width
        ) +
        '│'
    );
    lines.push('├' + '─'.repeat(width) + '┤');

    // Phase status line
    const phaseIcons = report.phases.map((p) => {
      if (p.status === 'completed') return '✓';
      if (p.status === 'in_progress') return '●';
      if (p.status === 'skipped') return '⊘';
      return '○';
    });

    const phaseNames = report.phases.map((p) => p.phase);
    const phaseDisplay = phaseNames.map((name, i) => `${phaseIcons[i]} ${name}`).join(' → ');
    lines.push('│' + this.centerText(phaseDisplay, width) + '│');

    // Current phase indicator
    if (!report.progress.isComplete) {
      const currentIdx = report.phases.findIndex((p) => p.status === 'in_progress');
      if (currentIdx >= 0) {
        const current = report.phases[currentIdx];
        lines.push('│' + this.centerText(`↑ Current: ${current.name}`, width) + '│');
      }
    }

    lines.push('├' + '─'.repeat(width) + '┤');

    // Phase details
    for (const phase of report.phases) {
      const icon =
        phase.status === 'completed'
          ? '✅'
          : phase.status === 'in_progress'
          ? '🔄'
          : phase.status === 'skipped'
          ? '⏭️'
          : '⏸️';
      lines.push('│' + this.padText(` ${icon} ${phase.phase}: ${phase.name}`, width) + '│');

      if (phase.outputs.length > 0 && phase.status === 'completed') {
        lines.push('│' + this.padText(`    Outputs: ${phase.outputs.length} file(s)`, width) + '│');
      }
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      lines.push('├' + '─'.repeat(width) + '┤');
      lines.push('│' + this.padText(' 💡 Next Actions:', width) + '│');
      for (const action of report.recommendations.slice(0, 3)) {
        lines.push('│' + this.padText(`    • ${action.slice(0, width - 8)}`, width) + '│');
      }
    }

    // Footer
    lines.push('╰' + '─'.repeat(width) + '╯');

    if (report.progress.isComplete) {
      lines.push('');
      lines.push('✨ Workflow Complete!');
    }

    return lines.join('\n');
  }

  /**
   * Generate progress bar
   */
  private generateProgressBar(percentage: number, width: number): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Center text within width
   */
  private centerText(text: string, width: number): string {
    const padding = Math.max(0, width - text.length);
    const left = Math.floor(padding / 2);
    const right = padding - left;
    return ' '.repeat(left) + text + ' '.repeat(right);
  }

  /**
   * Pad text to width
   */
  private padText(text: string, width: number): string {
    if (text.length >= width) return text.slice(0, width);
    return text + ' '.repeat(width - text.length);
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdown(report: WorkflowReport): string {
    const lines: string[] = [];

    lines.push(`# Workflow Report: ${report.project.name}`);
    lines.push('');
    lines.push(`> Generated: ${new Date(report.generated).toLocaleString()}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`| Property | Value |`);
    lines.push(`|----------|-------|`);
    lines.push(`| Scale | ${report.project.scale} |`);
    lines.push(`| Progress | ${report.progress.percentage}% |`);
    lines.push(`| Current Phase | ${report.progress.currentPhase} |`);
    lines.push(`| Status | ${report.progress.isComplete ? 'Complete' : 'In Progress'} |`);
    lines.push('');

    // Phases
    lines.push('## Phases');
    lines.push('');

    for (const phase of report.phases) {
      const icon =
        phase.status === 'completed' ? '✅' : phase.status === 'in_progress' ? '🔄' : '⏸️';
      lines.push(`### ${icon} ${phase.phase} - ${phase.name}`);
      lines.push('');
      lines.push(`**Status:** ${phase.status}`);

      if (phase.startedAt) {
        lines.push(`**Started:** ${new Date(phase.startedAt).toLocaleString()}`);
      }
      if (phase.completedAt) {
        lines.push(`**Completed:** ${new Date(phase.completedAt).toLocaleString()}`);
      }

      if (phase.outputs.length > 0) {
        lines.push('');
        lines.push('**Outputs:**');
        for (const output of phase.outputs) {
          lines.push(`- ${output}`);
        }
      }

      if (phase.roles.length > 0) {
        lines.push('');
        lines.push('**Roles:**');
        for (const role of phase.roles) {
          const roleIcon = role.status === 'completed' ? '✓' : role.status === 'active' ? '●' : '○';
          lines.push(`- ${roleIcon} ${role.name}: ${role.status}`);
        }
      }

      lines.push('');
    }

    // Timeline
    if (report.timeline.length > 0) {
      lines.push('## Timeline');
      lines.push('');
      for (const event of report.timeline) {
        const time = new Date(event.timestamp).toLocaleString();
        lines.push(`- **${time}**: ${event.event}`);
      }
      lines.push('');
    }

    // Stack
    if (report.stack) {
      lines.push('## Technology Stack');
      lines.push('');
      lines.push(`- **Primary Language:** ${report.stack.primaryLanguage || 'Unknown'}`);
      lines.push(`- **Languages:** ${report.stack.languages.join(', ') || 'None detected'}`);
      lines.push(`- **Frameworks:** ${report.stack.frameworks.join(', ') || 'None detected'}`);
      lines.push(`- **Test Frameworks:** ${report.stack.testFrameworks.join(', ') || 'None detected'}`);
      lines.push('');
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      lines.push('## Recommended Actions');
      lines.push('');
      for (const action of report.recommendations) {
        lines.push(`- [ ] ${action}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
