/**
 * Centralized tool descriptions and metadata.
 * Single source of truth for tool descriptions used by both AI SDK tools and MCP server.
 */

export interface ToolDescription {
  name: string;
  description: string;
  /** Extended description with usage instructions (used by MCP) */
  extendedDescription?: string;
}

/**
 * Tool descriptions - the single source of truth
 */
export const TOOL_DESCRIPTIONS: Record<string, ToolDescription> = {
  readFile: {
    name: 'readFile',
    description: 'Read the contents of a file from the filesystem'
  },

  listFiles: {
    name: 'listFiles',
    description: 'List files matching a glob pattern in the repository'
  },

  analyzeSymbols: {
    name: 'analyzeSymbols',
    description: 'Analyze symbols in a source file (classes, functions, interfaces, types, enums)'
  },

  getFileStructure: {
    name: 'getFileStructure',
    description: 'Get the directory structure and file listing of a repository'
  },

  searchCode: {
    name: 'searchCode',
    description: 'Search for code patterns across files using regex'
  },

  buildSemanticContext: {
    name: 'buildSemanticContext',
    description: 'Build optimized semantic context for LLM prompts. Pre-analyzes the codebase and returns formatted context.'
  },

  getCodebaseMap: {
    name: 'getCodebaseMap',
    description: 'Get codebase map data (structure, symbols, architecture) from the pre-generated JSON.',
    extendedDescription: `Get codebase map data from .context/docs/codebase-map.json.
Use specific sections to reduce token usage:
- "stack": Tech stack info (languages, frameworks, build tools)
- "structure": File counts, top directories, language distribution
- "architecture": Detected layers, patterns, entry points
- "symbols": All symbol categories (classes, interfaces, functions, types, enums)
- "symbols.classes", "symbols.interfaces", etc.: Specific symbol category
- "publicAPI": Exported public API symbols
- "dependencies": Most imported files
- "stats": Analysis statistics
- "all": Complete codebase map (default)

The codebase map is generated during initialization with --semantic flag.`
  },

  checkScaffolding: {
    name: 'checkScaffolding',
    description: 'Check if .context scaffolding exists and return granular status'
  },

  initializeContext: {
    name: 'initializeContext',
    description: 'Initialize .context scaffolding and create template files.',
    extendedDescription: `Initialize .context scaffolding and create template files.

RESPONSE FORMAT:
When autoFill=true (default), this tool returns status: "requires_action" with a requiredActions array.
Each action contains pre-generated suggestedContent that you MUST write to the file.

WORKFLOW:
1. Call initializeContext - scaffolding is created and content is pre-generated
2. Response has status: "requires_action" with requiredActions[] array
3. For EACH action in requiredActions where actionType="WRITE_FILE":
   - Call Write tool with filePath and suggestedContent
   - Example: Write({ file_path: action.filePath, content: action.suggestedContent })
4. The operation is INCOMPLETE until ALL files in requiredActions are written

IMPORTANT:
- status: "requires_action" means you MUST complete the requiredActions
- status: "success" means initialization is complete (no actions needed)
- status: "error" means initialization failed

QUALITY REQUIREMENTS:
After writing the pre-generated content, you MAY enhance the documentation with:
- Explanations for "why" not just "what"
- Practical examples where helpful
- Important caveats or gotchas
- Design patterns and architectural decisions`
  },

  scaffoldPlan: {
    name: 'scaffoldPlan',
    description: 'Create a plan template in .context/plans/'
  },

  fillScaffolding: {
    name: 'fillScaffolding',
    description: 'Analyze codebase and generate filled content for scaffolding templates.',
    extendedDescription: `Analyze codebase and generate filled content for scaffolding templates.
Returns suggestedContent for each file. Supports pagination with offset/limit (default: 3 files).
For large projects, use listFilesToFill + fillSingleFile instead to avoid output size limits.
IMPORTANT: After calling this, write each suggestedContent to its corresponding file path.`
  },

  listFilesToFill: {
    name: 'listFilesToFill',
    description: 'List scaffold files that need to be filled. Returns only file paths (no content).',
    extendedDescription: `List scaffold files that need to be filled. Returns only file paths (no content).
Use this first to get the list, then call fillSingleFile for each file.
This is more efficient than fillScaffolding for large projects.`
  },

  fillSingleFile: {
    name: 'fillSingleFile',
    description: 'Generate suggested content for a single scaffold file.',
    extendedDescription: `Generate suggested content for a single scaffold file.
Call listFilesToFill first to get file paths, then call this for each file.
This avoids output size limits by processing one file at a time.`
  }
};

/**
 * Get description for a tool (uses extended if available for MCP, regular for AI SDK)
 */
export function getToolDescription(toolName: string, useExtended = false): string {
  const tool = TOOL_DESCRIPTIONS[toolName];
  if (!tool) return '';
  return useExtended && tool.extendedDescription
    ? tool.extendedDescription
    : tool.description;
}

/**
 * Get all tool names
 */
export function getToolNames(): string[] {
  return Object.keys(TOOL_DESCRIPTIONS);
}

/**
 * Generate a tool list summary for system prompts
 */
export function getToolListForPrompt(toolNames?: string[]): string {
  const names = toolNames || ['readFile', 'listFiles', 'analyzeSymbols', 'getFileStructure', 'searchCode'];
  return names
    .map(name => {
      const tool = TOOL_DESCRIPTIONS[name];
      return tool ? `- ${name}: ${tool.description}` : null;
    })
    .filter(Boolean)
    .join('\n');
}
