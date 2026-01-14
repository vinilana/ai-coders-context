/**
 * Get Codebase Map Tool
 *
 * Retrieves specific sections of the codebase-map.json file to allow
 * LLMs to query only the parts they need, reducing token usage.
 */

import { tool } from 'ai';
import * as fs from 'fs-extra';
import * as path from 'path';
import { GetCodebaseMapInputSchema, type GetCodebaseMapInput, type GetCodebaseMapOutput } from '../schemas';
import type { CodebaseMap } from '../../../generators/documentation';

export const getCodebaseMapTool = tool({
  description: 'Get codebase map data (structure, symbols, architecture) from the pre-generated JSON. Use specific sections to reduce token usage.',
  inputSchema: GetCodebaseMapInputSchema,
  execute: async (input: GetCodebaseMapInput): Promise<GetCodebaseMapOutput> => {
    const repoPath = input.repoPath || process.cwd();
    const section = input.section || 'all';

    try {
      const mapPath = path.join(repoPath, '.context', 'docs', 'codebase-map.json');

      if (!await fs.pathExists(mapPath)) {
        return {
          success: false,
          section,
          error: `Codebase map not found at ${mapPath}. Run initialization with --semantic flag first.`
        };
      }

      const codebaseMap: CodebaseMap = await fs.readJson(mapPath);
      const data = extractSection(codebaseMap, section);

      return {
        success: true,
        section,
        data,
        mapPath
      };
    } catch (error) {
      return {
        success: false,
        section,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

/**
 * Extract a specific section from the codebase map
 */
function extractSection(map: CodebaseMap, section: string): unknown {
  switch (section) {
    case 'all':
      return map;
    case 'stack':
      return map.stack;
    case 'structure':
      return map.structure;
    case 'architecture':
      return map.architecture;
    case 'symbols':
      return map.symbols;
    case 'symbols.classes':
      return map.symbols.classes;
    case 'symbols.interfaces':
      return map.symbols.interfaces;
    case 'symbols.functions':
      return map.symbols.functions;
    case 'symbols.types':
      return map.symbols.types;
    case 'symbols.enums':
      return map.symbols.enums;
    case 'publicAPI':
      return map.publicAPI;
    case 'dependencies':
      return map.dependencies;
    case 'stats':
      return map.stats;
    default:
      return map;
  }
}
