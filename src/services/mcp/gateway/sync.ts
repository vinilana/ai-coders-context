/**
 * Sync Gateway Handler
 *
 * Handles import/export synchronization operations.
 * Replaces: exportRules, exportDocs, exportAgents, exportContext, exportSkills,
 *           reverseQuickSync, importDocs, importAgents, importSkills
 */

import { VERSION } from '../../../version';
import { ExportRulesService, ContextExportService } from '../../export';
import { ReverseQuickSyncService, ImportSkillsService } from '../../reverseSync';
import { ImportRulesService, ImportAgentsService } from '../../import';
import { SyncService } from '../../sync';
import type { PresetName } from '../../sync/types';

import type { SyncParams } from './types';
import type { MCPToolResponse } from './response';
import { createJsonResponse, createErrorResponse } from './response';
import { minimalUI, mockTranslate } from './shared';

export interface SyncOptions {
  repoPath: string;
}

/**
 * Handles sync gateway actions for import/export operations.
 */
export async function handleSync(
  params: SyncParams,
  options: SyncOptions
): Promise<MCPToolResponse> {
  const repoPath = params.repoPath || options.repoPath || process.cwd();

  try {
    switch (params.action) {
      case 'exportRules': {
        const exportService = new ExportRulesService({
          ui: minimalUI as any,
          t: mockTranslate,
          version: VERSION,
        });

        const result = await exportService.run(repoPath, {
          preset: params.preset,
          force: params.force,
          dryRun: params.dryRun
        });

        return createJsonResponse({
          success: true,
          filesCreated: result.filesCreated,
          filesSkipped: result.filesSkipped,
          filesFailed: result.filesFailed,
          targets: result.targets,
          errors: result.errors,
          dryRun: params.dryRun || false,
        });
      }

      case 'exportDocs': {
        const exportService = new ExportRulesService({
          ui: minimalUI as any,
          t: mockTranslate,
          version: VERSION,
        });

        const result = await exportService.run(repoPath, {
          preset: params.preset,
          indexMode: params.indexMode,
          force: params.force,
          dryRun: params.dryRun
        });

        return createJsonResponse({
          success: true,
          filesCreated: result.filesCreated,
          filesSkipped: result.filesSkipped,
          filesFailed: result.filesFailed,
          targets: result.targets,
          errors: result.errors,
          indexMode: params.indexMode || 'readme',
          dryRun: params.dryRun || false,
        });
      }

      case 'exportAgents': {
        const syncService = new SyncService({
          ui: minimalUI as any,
          t: mockTranslate,
          version: VERSION,
        });

        await syncService.run({
          source: '.context/agents',
          preset: (params.preset || 'all') as PresetName,
          mode: (params.mode || 'symlink') as 'symlink' | 'markdown',
          force: params.force || false,
          dryRun: params.dryRun || false,
        });

        return createJsonResponse({
          success: true,
          preset: params.preset,
          mode: params.mode,
          dryRun: params.dryRun || false,
          message: `Agents exported to ${params.preset} targets`,
        });
      }

      case 'exportContext': {
        const contextExportService = new ContextExportService({
          ui: minimalUI as any,
          t: mockTranslate,
          version: VERSION,
        });

        const result = await contextExportService.run(repoPath, {
          preset: params.preset,
          skipDocs: params.skipDocs,
          skipAgents: params.skipAgents,
          skipSkills: params.skipSkills,
          skipCommands: params.skipCommands,
          docsIndexMode: params.docsIndexMode,
          agentMode: params.agentMode,
          includeBuiltInSkills: params.includeBuiltInSkills,
          force: params.force,
          dryRun: params.dryRun,
        });

        return createJsonResponse({
          success: true,
          docsExported: result.docsExported,
          agentsExported: result.agentsExported,
          skillsExported: result.skillsExported,
          commandsExported: result.commandsExported,
          targets: result.targets,
          errors: result.errors,
          dryRun: params.dryRun || false,
        });
      }

      case 'exportSkills': {
        const { SkillExportService } = require('../../export/skillExportService');
        const exportService = new SkillExportService({
          ui: minimalUI,
          t: mockTranslate,
          version: VERSION,
        });

        const result = await exportService.run(repoPath, {
          preset: params.preset,
          includeBuiltIn: params.includeBuiltIn,
          force: params.force,
        });

        return createJsonResponse({
          success: result.filesCreated > 0,
          targets: result.targets,
          skillsExported: result.skillsExported,
          filesCreated: result.filesCreated,
          filesSkipped: result.filesSkipped,
        });
      }

      case 'exportCommands': {
        const { CommandExportService } = require('../../export/commandExportService');
        const exportService = new CommandExportService({
          ui: minimalUI,
          t: mockTranslate,
          version: VERSION,
        });

        const result = await exportService.run(repoPath, {
          preset: params.preset,
          force: params.force,
          dryRun: params.dryRun,
        });

        return createJsonResponse({
          success: result.filesCreated > 0,
          targets: result.targets,
          commandsExported: result.commandsExported,
          filesCreated: result.filesCreated,
          filesSkipped: result.filesSkipped,
          dryRun: params.dryRun || false,
        });
      }

      case 'reverseSync': {
        const service = new ReverseQuickSyncService({
          ui: minimalUI as any,
          t: mockTranslate,
          version: VERSION,
        });

        const result = await service.run(repoPath, {
          skipRules: params.skipRules || false,
          skipAgents: params.skipAgents || false,
          skipSkills: params.skipSkills || false,
          mergeStrategy: params.mergeStrategy || 'skip',
          dryRun: params.dryRun || false,
          force: params.force || false,
          metadata: params.addMetadata !== false,
        });

        return createJsonResponse({
          success: true,
          ...result,
        });
      }

      case 'importDocs': {
        const service = new ImportRulesService({
          ui: minimalUI as any,
          t: mockTranslate,
          version: VERSION,
        });

        await service.run({
          autoDetect: params.autoDetect !== false,
          force: params.force || false,
          dryRun: params.dryRun || false,
        }, repoPath);

        return createJsonResponse({
          success: true,
          message: 'Docs imported successfully',
          dryRun: params.dryRun || false,
        });
      }

      case 'importAgents': {
        const service = new ImportAgentsService({
          ui: minimalUI as any,
          t: mockTranslate,
          version: VERSION,
        });

        await service.run({
          autoDetect: params.autoDetect !== false,
          force: params.force || false,
          dryRun: params.dryRun || false,
        }, repoPath);

        return createJsonResponse({
          success: true,
          message: 'Agents imported successfully',
          dryRun: params.dryRun || false,
        });
      }

      case 'importSkills': {
        const service = new ImportSkillsService({
          ui: minimalUI as any,
          t: mockTranslate,
          version: VERSION,
        });

        const result = await service.run({
          autoDetect: params.autoDetect !== false,
          mergeStrategy: params.mergeStrategy || 'skip',
          force: params.force || false,
          dryRun: params.dryRun || false,
        }, repoPath);

        return createJsonResponse({
          success: true,
          skillsImported: result.filesCreated,
          filesSkipped: result.filesSkipped,
          filesFailed: result.filesFailed,
          dryRun: params.dryRun || false,
        });
      }

      default:
        return createErrorResponse(`Unknown sync action: ${params.action}`);
    }
  } catch (error) {
    return createErrorResponse(error);
  }
}
