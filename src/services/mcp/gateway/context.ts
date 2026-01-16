/**
 * Context Gateway Handler
 *
 * Handles context scaffolding and semantic context operations.
 * Replaces: checkScaffolding, initializeContext, fillScaffolding, listFilesToFill,
 *           fillSingleFile, getCodebaseMap, buildSemanticContext, scaffoldPlan
 */

import {
  checkScaffoldingTool,
  initializeContextTool,
  scaffoldPlanTool,
  fillScaffoldingTool,
  listFilesToFillTool,
  fillSingleFileTool,
  getCodebaseMapTool,
} from '../../ai/tools';
import { SemanticContextBuilder, type ContextFormat } from '../../semantic/contextBuilder';

import type { ContextParams } from './types';
import type { MCPToolResponse } from './response';
import { createJsonResponse, createErrorResponse, createTextResponse } from './response';
import { toolContext } from './shared';

export interface ContextOptions {
  repoPath: string;
  contextBuilder: SemanticContextBuilder;
}

/**
 * Handles context gateway actions for scaffolding and semantic context.
 */
export async function handleContext(
  params: ContextParams,
  options: ContextOptions
): Promise<MCPToolResponse> {
  const repoPath = params.repoPath || options.repoPath || process.cwd();

  try {
    switch (params.action) {
      case 'check': {
        const result = await checkScaffoldingTool.execute!(
          { repoPath },
          toolContext
        );
        return createJsonResponse(result);
      }

      case 'init': {
        const result = await initializeContextTool.execute!(
          {
            repoPath,
            type: params.type,
            outputDir: params.outputDir,
            semantic: params.semantic,
            include: params.include,
            exclude: params.exclude,
            autoFill: params.autoFill,
            skipContentGeneration: params.skipContentGeneration
          },
          toolContext
        );
        return createJsonResponse(result);
      }

      case 'fill': {
        const result = await fillScaffoldingTool.execute!(
          {
            repoPath,
            outputDir: params.outputDir,
            target: params.target,
            offset: params.offset,
            limit: params.limit
          },
          toolContext
        );
        return createJsonResponse(result);
      }

      case 'fillSingle': {
        const result = await fillSingleFileTool.execute!(
          { repoPath, filePath: params.filePath! },
          toolContext
        );
        return createJsonResponse(result);
      }

      case 'listToFill': {
        const result = await listFilesToFillTool.execute!(
          { repoPath, outputDir: params.outputDir, target: params.target },
          toolContext
        );
        return createJsonResponse(result);
      }

      case 'getMap': {
        const result = await getCodebaseMapTool.execute!(
          { repoPath, section: params.section as any },
          toolContext
        );
        return createJsonResponse(result);
      }

      case 'buildSemantic': {
        const isLocalBuilder = !!params.options;
        const builder = isLocalBuilder
          ? new SemanticContextBuilder(params.options)
          : options.contextBuilder;

        try {
          let context: string;
          const contextType = (params.contextType || 'compact') as ContextFormat;

          switch (contextType) {
            case 'documentation':
              context = await builder.buildDocumentationContext(repoPath, params.targetFile);
              break;
            case 'playbook':
              context = await builder.buildPlaybookContext(repoPath, params.targetFile || 'generic');
              break;
            case 'plan':
              context = await builder.buildPlanContext(repoPath, params.targetFile);
              break;
            case 'compact':
            default:
              context = await builder.buildCompactContext(repoPath);
              break;
          }

          return createTextResponse(context);
        } finally {
          if (isLocalBuilder) {
            await builder.shutdown();
          }
        }
      }

      case 'scaffoldPlan': {
        const result = await scaffoldPlanTool.execute!(
          {
            planName: params.planName!,
            repoPath,
            outputDir: params.outputDir,
            title: params.title,
            summary: params.summary,
            semantic: params.semantic,
            autoFill: params.autoFill
          },
          toolContext
        );
        return createJsonResponse(result);
      }

      default:
        return createErrorResponse(`Unknown context action: ${params.action}`);
    }
  } catch (error) {
    return createErrorResponse(error);
  }
}
