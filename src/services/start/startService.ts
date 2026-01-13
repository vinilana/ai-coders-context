/**
 * Unified Start Service
 *
 * Smart command that detects project state and executes the appropriate workflow.
 * Combines init + fill + workflow init into a single intelligent command.
 */

import * as path from 'path';
import type { AIProvider } from '../../types';
import {
  AIDependencies,
  withSpinner,
  resolveContextPaths,
} from '../shared';
import { InitService } from '../init/initService';
import { FillService } from '../fill/fillService';
import { WorkflowService } from '../workflow';
import { StateDetector } from '../state';
import { StackDetector, type StackInfo } from '../stack/stackDetector';
import { ProjectScale } from '../../workflow';

export type StartServiceDependencies = AIDependencies;

export interface StartOptions {
  featureName?: string;
  template?: 'hotfix' | 'feature' | 'mvp' | 'auto';
  skipFill?: boolean;
  skipWorkflow?: boolean;
  apiKey?: string;
  model?: string;
  provider?: string;
  verbose?: boolean;
}

export interface StartResult {
  initialized: boolean;
  filled: boolean;
  workflowStarted: boolean;
  stackDetected?: StackInfo;
  scale?: ProjectScale;
  featureName?: string;
}

/**
 * Template to scale mapping
 */
const TEMPLATE_TO_SCALE: Record<string, ProjectScale> = {
  hotfix: ProjectScale.QUICK,
  feature: ProjectScale.MEDIUM,
  mvp: ProjectScale.LARGE,
};

export class StartService {
  private initService: InitService;
  private fillService: FillService;
  private stackDetector: StackDetector;

  constructor(private deps: StartServiceDependencies) {
    this.initService = new InitService({
      ui: deps.ui,
      t: deps.t,
      version: deps.version,
    });
    this.fillService = new FillService({
      ui: deps.ui,
      t: deps.t,
      version: deps.version,
      defaultModel: deps.defaultModel,
    });
    this.stackDetector = new StackDetector();
  }

  /**
   * Run the unified start command
   */
  async run(repoPath: string, options: StartOptions = {}): Promise<StartResult> {
    const paths = resolveContextPaths(repoPath);
    const result: StartResult = {
      initialized: false,
      filled: false,
      workflowStarted: false,
    };

    // Step 1: Detect stack
    const stackInfo = await this.detectStack(paths.absolutePath);
    result.stackDetected = stackInfo;

    // Step 2: Detect project state and initialize if needed
    const detector = new StateDetector({ projectPath: paths.absolutePath });
    const state = await detector.detect();

    if (state.state === 'new') {
      result.initialized = await this.initializeProject(paths.absolutePath, paths.contextPath, options);
    }

    // Step 3: Fill with LLM if needed
    if (this.shouldFill(state.state, options)) {
      result.filled = await this.fillDocs(paths.absolutePath, paths.contextPath, options);
    }

    // Step 4: Initialize workflow if feature name provided
    if (!options.skipWorkflow && options.featureName) {
      const workflowResult = await this.initializeWorkflow(
        paths.absolutePath,
        options.featureName,
        stackInfo,
        options
      );
      result.workflowStarted = workflowResult.started;
      result.scale = workflowResult.scale;
      result.featureName = options.featureName;
    }

    return result;
  }

  /**
   * Detect technology stack
   */
  private async detectStack(repoPath: string): Promise<StackInfo> {
    const { result } = await withSpinner(
      this.deps.ui,
      this.deps.t('spinner.start.detectingStack'),
      () => this.stackDetector.detect(repoPath),
      {
        successMessage: this.deps.t('spinner.start.stackDetected', {
          stack: 'detected',
        }),
      }
    );
    return result || {
      primaryLanguage: null,
      languages: [],
      frameworks: [],
      testFrameworks: [],
      buildTools: [],
      files: [],
      packageManager: null,
      isMonorepo: false,
      hasDocker: false,
      hasCI: false,
    };
  }

  /**
   * Initialize project context
   */
  private async initializeProject(
    repoPath: string,
    contextPath: string,
    options: StartOptions
  ): Promise<boolean> {
    const { success } = await withSpinner(
      this.deps.ui,
      this.deps.t('spinner.start.initializing'),
      () =>
        this.initService.run(repoPath, 'both', {
          output: contextPath,
          semantic: true,
          verbose: options.verbose,
        }),
      {
        successMessage: this.deps.t('spinner.start.initialized'),
        failMessage: this.deps.t('spinner.start.initFailed'),
      }
    );
    return success;
  }

  /**
   * Check if we should fill docs
   */
  private shouldFill(state: string, options: StartOptions): boolean {
    if (options.skipFill) return false;
    if (!options.apiKey && !this.hasApiKeyInEnv()) return false;
    return state === 'new' || state === 'unfilled';
  }

  /**
   * Fill documentation with AI
   */
  private async fillDocs(
    repoPath: string,
    contextPath: string,
    options: StartOptions
  ): Promise<boolean> {
    const { success } = await withSpinner(
      this.deps.ui,
      this.deps.t('spinner.start.filling'),
      () =>
        this.fillService.run(repoPath, {
          output: contextPath,
          model: options.model || this.deps.defaultModel,
          provider: options.provider as AIProvider | undefined,
          apiKey: options.apiKey,
          verbose: options.verbose,
          semantic: true,
        }),
      {
        successMessage: this.deps.t('spinner.start.filled'),
        failMessage: this.deps.t('spinner.start.fillFailed'),
        failStatus: 'warn',
      }
    );
    return success;
  }

  /**
   * Initialize workflow
   */
  private async initializeWorkflow(
    repoPath: string,
    featureName: string,
    stackInfo: StackInfo,
    options: StartOptions
  ): Promise<{ started: boolean; scale?: ProjectScale }> {
    const workflowService = new WorkflowService(repoPath, {
      ui: {
        displaySuccess: (msg) => this.deps.ui.displaySuccess(msg),
        displayError: (msg, err) => this.deps.ui.displayError(msg, err),
        displayInfo: (title, detail) => this.deps.ui.displayInfo(title, detail || ''),
      },
    });

    // Determine scale from template or auto-detect
    const scale = options.template && options.template !== 'auto'
      ? TEMPLATE_TO_SCALE[options.template]
      : undefined;

    try {
      const status = await workflowService.init({
        name: featureName,
        description: `${featureName} - ${stackInfo.primaryLanguage || 'project'}`,
        scale,
        files: stackInfo.files,
      });

      return {
        started: true,
        scale: status.project.scale as ProjectScale,
      };
    } catch (error) {
      this.deps.ui.displayError(this.deps.t('errors.start.workflowFailed'), error as Error);
      return { started: false };
    }
  }

  /**
   * Check if any API key is available in environment
   */
  private hasApiKeyInEnv(): boolean {
    return !!(
      process.env.OPENROUTER_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.GOOGLE_API_KEY
    );
  }
}
