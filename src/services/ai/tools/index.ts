import type { ToolSet } from 'ai';
import { readFileTool } from './readFileTool';
import { listFilesTool } from './listFilesTool';
import { analyzeSymbolsTool } from './analyzeSymbolsTool';
import { getFileStructureTool } from './getFileStructureTool';
import { searchCodeTool } from './searchCodeTool';

export { readFileTool } from './readFileTool';
export { listFilesTool } from './listFilesTool';
export { analyzeSymbolsTool } from './analyzeSymbolsTool';
export { getFileStructureTool } from './getFileStructureTool';
export { searchCodeTool } from './searchCodeTool';

/**
 * Returns all code analysis tools as a ToolSet for use with AI SDK
 */
export function getCodeAnalysisTools(): ToolSet {
  return {
    readFile: readFileTool,
    listFiles: listFilesTool,
    analyzeSymbols: analyzeSymbolsTool,
    getFileStructure: getFileStructureTool,
    searchCode: searchCodeTool
  };
}

/**
 * Tool names available for selective enabling
 */
export const TOOL_NAMES = [
  'readFile',
  'listFiles',
  'analyzeSymbols',
  'getFileStructure',
  'searchCode'
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];
