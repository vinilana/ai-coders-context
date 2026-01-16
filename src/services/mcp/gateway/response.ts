/**
 * MCP Response Helpers
 *
 * Standardized response creation for MCP tool handlers.
 */

/**
 * MCP Tool Response type that matches the MCP SDK CallToolResult interface.
 * Uses index signature for forward compatibility with SDK extensions.
 */
export interface MCPToolResponse {
  [x: string]: unknown;
  content: Array<{
    type: 'text';
    text: string;
    annotations?: {
      audience?: ('user' | 'assistant')[];
      priority?: number;
    };
  }>;
  isError?: boolean;
}

/**
 * Creates a successful JSON response for MCP tool handlers.
 */
export function createJsonResponse(data: unknown): MCPToolResponse {
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(data, null, 2)
    }]
  };
}

/**
 * Creates an error response for MCP tool handlers.
 */
export function createErrorResponse(error: unknown): MCPToolResponse {
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }, null, 2)
    }],
    isError: true
  };
}

/**
 * Creates a plain text response for MCP tool handlers.
 */
export function createTextResponse(text: string): MCPToolResponse {
  return {
    content: [{
      type: 'text' as const,
      text
    }]
  };
}
