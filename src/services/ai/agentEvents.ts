/**
 * Agent event callbacks for real-time progress display
 */

export type AgentType = 'documentation' | 'playbook' | 'plan' | 'fill' | 'skill';

export interface AgentStartEvent {
  agent: AgentType;
  target?: string;
}

export interface AgentStepEvent {
  agent: AgentType;
  step: number;
  totalSteps?: number;
}

export interface ToolCallEvent {
  agent: AgentType;
  toolName: string;
  args?: Record<string, unknown>;
}

export interface ToolResultEvent {
  agent: AgentType;
  toolName: string;
  success: boolean;
  summary?: string;
}

export interface AgentCompleteEvent {
  agent: AgentType;
  toolsUsed: string[];
  steps: number;
}

export interface AgentEventCallbacks {
  onAgentStart?: (event: AgentStartEvent) => void;
  onAgentStep?: (event: AgentStepEvent) => void;
  onToolCall?: (event: ToolCallEvent) => void;
  onToolResult?: (event: ToolResultEvent) => void;
  onAgentComplete?: (event: AgentCompleteEvent) => void;
}

/**
 * Get a human-readable description of tool arguments
 */
export function summarizeToolArgs(toolName: string, args: unknown): string {
  if (!args || typeof args !== 'object') {
    return '';
  }

  const argsObj = args as Record<string, unknown>;

  switch (toolName) {
    case 'readFile':
      return argsObj.filePath ? String(argsObj.filePath) : '';
    case 'listFiles':
      return argsObj.pattern ? `pattern: ${argsObj.pattern}` : '';
    case 'analyzeSymbols':
      return argsObj.filePath ? String(argsObj.filePath) : '';
    case 'getFileStructure':
      return argsObj.rootPath ? String(argsObj.rootPath) : '';
    case 'searchCode':
      return argsObj.pattern ? `pattern: ${argsObj.pattern}` : '';
    default:
      return '';
  }
}

/**
 * Get a human-readable summary of tool result
 */
export function summarizeToolResult(toolName: string, result: unknown): string {
  if (!result || typeof result !== 'object') {
    return '';
  }

  const resultObj = result as Record<string, unknown>;

  if (!resultObj.success) {
    return resultObj.error ? String(resultObj.error) : 'failed';
  }

  switch (toolName) {
    case 'readFile':
      return resultObj.size ? `${resultObj.size} bytes` : 'read';
    case 'listFiles':
      return resultObj.count !== undefined ? `${resultObj.count} files` : 'listed';
    case 'analyzeSymbols': {
      const symbols = resultObj.symbols as unknown[] | undefined;
      return symbols ? `${symbols.length} symbols` : 'analyzed';
    }
    case 'getFileStructure':
      return resultObj.totalFiles !== undefined ? `${resultObj.totalFiles} files` : 'mapped';
    case 'searchCode': {
      const matches = resultObj.totalMatches;
      return matches !== undefined ? `${matches} matches` : 'searched';
    }
    default:
      return 'done';
  }
}
