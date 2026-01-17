/**
 * Project Gateway Handler
 *
 * Handles project initialization and reporting operations.
 * Replaces: projectStart, projectReport, detectStack, detectAITools
 */

import { VERSION } from '../../../version';
import { StartService } from '../../start';
import { ReportService } from '../../report';
import { StackDetector } from '../../stack';
import { ToolDetector } from '../../reverseSync';
import { getScaleName } from '../../../workflow';

import type { ProjectParams } from './types';
import type { MCPToolResponse } from './response';
import { createJsonResponse, createErrorResponse, createTextResponse, createScaffoldResponse } from './response';
import * as path from 'path';
import * as fs from 'fs-extra';
import { minimalUI, mockTranslate } from './shared';

export interface ProjectOptions {
  repoPath: string;
}

/**
 * Handles project gateway actions for initialization and reporting.
 */
export async function handleProject(
  params: ProjectParams,
  options: ProjectOptions
): Promise<MCPToolResponse> {
  const repoPath = params.repoPath || options.repoPath || process.cwd();

  try {
    switch (params.action) {
      case 'start': {
        const startService = new StartService({
          ui: minimalUI as any,
          t: mockTranslate,
          version: VERSION,
          defaultModel: 'claude-3-5-sonnet-20241022',
        });

        const result = await startService.run(repoPath, {
          featureName: params.featureName,
          template: params.template as any,
          skipFill: params.skipFill,
          skipWorkflow: params.skipWorkflow,
        });

        // Collect pending files if scaffolding was initialized but not filled
        let pendingFiles: string[] = [];
        if (result.initialized && !result.filled) {
          const contextPath = path.join(repoPath, '.context');
          const docsDir = path.join(contextPath, 'docs');
          const agentsDir = path.join(contextPath, 'agents');

          if (await fs.pathExists(docsDir)) {
            const docs = await fs.readdir(docsDir);
            pendingFiles.push(...docs.filter(f => f.endsWith('.md') && f.toLowerCase() !== 'readme.md').map(f => `docs/${f}`));
          }
          if (await fs.pathExists(agentsDir)) {
            const agents = await fs.readdir(agentsDir);
            pendingFiles.push(...agents.filter(f => f.endsWith('.md') && f.toLowerCase() !== 'readme.md').map(f => `agents/${f}`));
          }
        }

        const responseData = {
          success: result.workflowStarted || result.initialized,
          initialized: result.initialized,
          filled: result.filled,
          workflowStarted: result.workflowStarted,
          scale: result.scale ? getScaleName(result.scale) : null,
          featureName: result.featureName,
          stack: result.stackDetected ? {
            primaryLanguage: result.stackDetected.primaryLanguage,
            frameworks: result.stackDetected.frameworks,
          } : null,
        };

        // Use scaffold response if files need enhancement
        if (pendingFiles.length > 0) {
          return createScaffoldResponse(responseData, {
            filesGenerated: pendingFiles.length,
            pendingFiles,
            repoPath,
          });
        }

        return createJsonResponse(responseData);
      }

      case 'report': {
        const reportService = new ReportService({
          ui: minimalUI as any,
          t: mockTranslate,
          version: VERSION,
        });

        const report = await reportService.generate(repoPath, { includeStack: params.includeStack });

        if (params.format === 'json') {
          return createJsonResponse(report);
        } else {
          const output = reportService.generateVisualDashboard(report);
          return createTextResponse(output);
        }
      }

      case 'detectStack': {
        const detector = new StackDetector();
        const stackInfo = await detector.detect(repoPath);

        return createJsonResponse({
          success: true,
          stack: stackInfo,
        });
      }

      case 'detectAITools': {
        const detector = new ToolDetector();
        const result = await detector.detect(repoPath);

        return createJsonResponse({
          success: true,
          ...result
        });
      }

      default:
        return createErrorResponse(`Unknown project action: ${params.action}`);
    }
  } catch (error) {
    return createErrorResponse(error);
  }
}
