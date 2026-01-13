/**
 * Unified Start Service
 *
 * Smart command that detects project state and executes the appropriate workflow.
 * Combines init + fill + workflow init into a single intelligent command.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { glob } from 'glob';
import type { CLIInterface } from '../../utils/cliUI';
import type { TranslateFn } from '../../utils/i18n';
import type { AIProvider } from '../../types';
import { InitService } from '../init/initService';
import { FillService } from '../fill/fillService';
import { WorkflowService } from '../workflow';
import { StateDetector } from '../state';
import { StackDetector, type StackInfo } from '../stack/stackDetector';
import { ProjectScale } from '../../workflow';

export interface StartServiceDependencies {
  ui: CLIInterface;
  t: TranslateFn;
  version: string;
  defaultModel: string;
}

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
  private deps: StartServiceDependencies;
  private initService: InitService;
  private fillService: FillService;
  private stackDetector: StackDetector;

  constructor(deps: StartServiceDependencies) {
    this.deps = deps;
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
    const absolutePath = path.resolve(repoPath);
    const contextPath = path.join(absolutePath, '.context');
    const result: StartResult = {
      initialized: false,
      filled: false,
      workflowStarted: false,
    };

    // Step 1: Detect stack
    this.deps.ui.startSpinner(this.deps.t('spinner.start.detectingStack'));
    const stackInfo = await this.stackDetector.detect(absolutePath);
    result.stackDetected = stackInfo;
    this.deps.ui.updateSpinner(
      this.deps.t('spinner.start.stackDetected', { stack: stackInfo.primaryLanguage || 'Unknown' }),
      'success'
    );
    this.deps.ui.stopSpinner();

    // Step 2: Detect project state
    const detector = new StateDetector({ projectPath: absolutePath });
    const state = await detector.detect();

    // Step 3: Initialize if needed
    if (state.state === 'new') {
      this.deps.ui.startSpinner(this.deps.t('spinner.start.initializing'));
      try {
        await this.initService.run(absolutePath, 'both', {
          output: contextPath,
          semantic: true,
          verbose: options.verbose,
        });
        result.initialized = true;
        this.deps.ui.updateSpinner(this.deps.t('spinner.start.initialized'), 'success');
      } catch (error) {
        this.deps.ui.updateSpinner(this.deps.t('spinner.start.initFailed'), 'fail');
        throw error;
      } finally {
        this.deps.ui.stopSpinner();
      }
    }

    // Step 4: Fill with LLM if requested and API key available
    if (!options.skipFill && (options.apiKey || this.hasApiKeyInEnv())) {
      const shouldFill = state.state === 'new' || state.state === 'unfilled';

      if (shouldFill) {
        this.deps.ui.startSpinner(this.deps.t('spinner.start.filling'));
        try {
          await this.fillService.run(absolutePath, {
            output: contextPath,
            model: options.model || this.deps.defaultModel,
            provider: options.provider as AIProvider | undefined,
            apiKey: options.apiKey,
            verbose: options.verbose,
            semantic: true,
          });
          result.filled = true;
          this.deps.ui.updateSpinner(this.deps.t('spinner.start.filled'), 'success');
        } catch (error) {
          this.deps.ui.updateSpinner(this.deps.t('spinner.start.fillFailed'), 'warn');
          // Don't throw - filling is optional
        } finally {
          this.deps.ui.stopSpinner();
        }
      }
    }

    // Step 5: Initialize workflow if feature name provided
    if (!options.skipWorkflow && options.featureName) {
      const workflowService = new WorkflowService(absolutePath, {
        ui: {
          displaySuccess: (msg) => this.deps.ui.displaySuccess(msg),
          displayError: (msg, err) => this.deps.ui.displayError(msg, err),
          displayInfo: (title, detail) => this.deps.ui.displayInfo(title, detail || ''),
        },
      });

      // Determine scale from template or auto-detect
      let scale: ProjectScale | undefined;
      if (options.template && options.template !== 'auto') {
        scale = TEMPLATE_TO_SCALE[options.template];
      }

      try {
        const status = await workflowService.init({
          name: options.featureName,
          description: `${options.featureName} - ${stackInfo.primaryLanguage || 'project'}`,
          scale,
          files: stackInfo.files,
        });

        result.workflowStarted = true;
        result.scale = status.project.scale as ProjectScale;
        result.featureName = options.featureName;
      } catch (error) {
        this.deps.ui.displayError(this.deps.t('errors.start.workflowFailed'), error as Error);
        // Don't throw - workflow is optional
      }
    }

    return result;
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
