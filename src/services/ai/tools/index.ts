import type { ToolSet } from 'ai';
import { readFileTool } from './readFileTool';
import { listFilesTool } from './listFilesTool';
import { analyzeSymbolsTool } from './analyzeSymbolsTool';
import { getFileStructureTool } from './getFileStructureTool';
import { searchCodeTool } from './searchCodeTool';
import { checkScaffoldingTool } from './checkScaffoldingTool';
import { initializeContextTool } from './initializeContextTool';
import { scaffoldPlanTool } from './scaffoldPlanTool';
import { fillScaffoldingTool, listFilesToFillTool, fillSingleFileTool } from './fillScaffoldingTool';

export { readFileTool } from './readFileTool';
export { listFilesTool } from './listFilesTool';
export { analyzeSymbolsTool } from './analyzeSymbolsTool';
export { getFileStructureTool } from './getFileStructureTool';
export { searchCodeTool } from './searchCodeTool';
export { checkScaffoldingTool } from './checkScaffoldingTool';
export { initializeContextTool } from './initializeContextTool';
export { scaffoldPlanTool } from './scaffoldPlanTool';
export { fillScaffoldingTool, listFilesToFillTool, fillSingleFileTool } from './fillScaffoldingTool';

/**
 * Returns all code analysis tools as a ToolSet for use with AI SDK
 */
export function getCodeAnalysisTools(): ToolSet {
  return {
    readFile: readFileTool,
    listFiles: listFilesTool,
    analyzeSymbols: analyzeSymbolsTool,
    getFileStructure: getFileStructureTool,
    searchCode: searchCodeTool,
    checkScaffolding: checkScaffoldingTool,
    initializeContext: initializeContextTool,
    scaffoldPlan: scaffoldPlanTool,
    fillScaffolding: fillScaffoldingTool,
    listFilesToFill: listFilesToFillTool,
    fillSingleFile: fillSingleFileTool
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
  'searchCode',
  'checkScaffolding',
  'initializeContext',
  'scaffoldPlan',
  'fillScaffolding',
  'listFilesToFill',
  'fillSingleFile'
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];
