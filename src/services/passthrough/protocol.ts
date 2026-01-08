/**
 * Protocol types for CLI passthrough mode
 * Enables external AI agents to use the CLI via stdin/stdout JSON communication
 */

import { z } from 'zod';

// ============ Request Types ============

/**
 * Base request schema
 */
export const BaseRequestSchema = z.object({
  id: z.string().describe('Unique request identifier for correlating responses'),
  method: z.string().describe('Method to invoke'),
  params: z.record(z.string(), z.unknown()).optional().describe('Method parameters')
});

export type BaseRequest = z.infer<typeof BaseRequestSchema>;

/**
 * Tool call request
 */
export const ToolCallRequestSchema = z.object({
  id: z.string(),
  method: z.literal('tool.call'),
  params: z.object({
    tool: z.string().describe('Tool name to execute'),
    args: z.record(z.string(), z.unknown()).describe('Tool arguments')
  })
});

export type ToolCallRequest = z.infer<typeof ToolCallRequestSchema>;

/**
 * Tool list request
 */
export const ToolListRequestSchema = z.object({
  id: z.string(),
  method: z.literal('tool.list'),
  params: z.object({}).optional()
});

export type ToolListRequest = z.infer<typeof ToolListRequestSchema>;

/**
 * Context build request
 */
export const ContextBuildRequestSchema = z.object({
  id: z.string(),
  method: z.literal('context.build'),
  params: z.object({
    repoPath: z.string().describe('Path to the repository'),
    targetFile: z.string().optional().describe('Optional target file for focused context'),
    contextType: z.enum(['documentation', 'playbook', 'plan', 'compact']).default('compact'),
    options: z.object({
      useLSP: z.boolean().optional(),
      maxContextLength: z.number().optional(),
      includeDocumentation: z.boolean().optional(),
      includeSignatures: z.boolean().optional()
    }).optional()
  })
});

export type ContextBuildRequest = z.infer<typeof ContextBuildRequestSchema>;

/**
 * Agent run request
 */
export const AgentRunRequestSchema = z.object({
  id: z.string(),
  method: z.literal('agent.run'),
  params: z.object({
    agent: z.enum(['documentation', 'playbook', 'plan']).describe('Agent type to run'),
    repoPath: z.string().describe('Path to the repository'),
    targetFile: z.string().optional().describe('Target file for the agent'),
    llmConfig: z.object({
      apiKey: z.string(),
      model: z.string(),
      provider: z.enum(['openrouter', 'openai', 'anthropic', 'google']),
      baseUrl: z.string().optional()
    }).describe('LLM configuration for the agent'),
    options: z.record(z.string(), z.unknown()).optional().describe('Additional agent options')
  })
});

export type AgentRunRequest = z.infer<typeof AgentRunRequestSchema>;

/**
 * Capabilities request
 */
export const CapabilitiesRequestSchema = z.object({
  id: z.string(),
  method: z.literal('capabilities'),
  params: z.object({}).optional()
});

export type CapabilitiesRequest = z.infer<typeof CapabilitiesRequestSchema>;

/**
 * Union of all request types
 */
export const RequestSchema = z.discriminatedUnion('method', [
  ToolCallRequestSchema,
  ToolListRequestSchema,
  ContextBuildRequestSchema,
  AgentRunRequestSchema,
  CapabilitiesRequestSchema
]);

export type Request = z.infer<typeof RequestSchema>;

// ============ Response Types ============

/**
 * Success response
 */
export interface SuccessResponse<T = unknown> {
  id: string;
  success: true;
  result: T;
}

/**
 * Error response
 */
export interface ErrorResponse {
  id: string;
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Response type (union of success and error)
 */
export type Response<T = unknown> = SuccessResponse<T> | ErrorResponse;

// ============ Notification Types ============

/**
 * Progress notification
 */
export interface ProgressNotification {
  type: 'progress';
  data: {
    step: number;
    totalSteps?: number;
    message: string;
  };
}

/**
 * Tool call notification
 */
export interface ToolCallNotification {
  type: 'tool_call';
  data: {
    toolName: string;
    args?: Record<string, unknown>;
  };
}

/**
 * Tool result notification
 */
export interface ToolResultNotification {
  type: 'tool_result';
  data: {
    toolName: string;
    success: boolean;
    summary?: string;
  };
}

/**
 * Union of all notification types
 */
export type Notification = ProgressNotification | ToolCallNotification | ToolResultNotification;

// ============ Capabilities Types ============

/**
 * Tool description for capabilities response
 */
export interface ToolDescription {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Capabilities response data
 */
export interface CapabilitiesData {
  version: string;
  methods: string[];
  tools: ToolDescription[];
  agents: string[];
  contextTypes: string[];
}

// ============ Helper Functions ============

/**
 * Create a success response
 */
export function createSuccessResponse<T>(id: string, result: T): SuccessResponse<T> {
  return { id, success: true, result };
}

/**
 * Create an error response
 */
export function createErrorResponse(
  id: string,
  code: string,
  message: string,
  details?: unknown
): ErrorResponse {
  return {
    id,
    success: false,
    error: { code, message, details }
  };
}

/**
 * Create a progress notification
 */
export function createProgressNotification(
  step: number,
  message: string,
  totalSteps?: number
): ProgressNotification {
  return {
    type: 'progress',
    data: { step, message, totalSteps }
  };
}

/**
 * Create a tool call notification
 */
export function createToolCallNotification(
  toolName: string,
  args?: Record<string, unknown>
): ToolCallNotification {
  return {
    type: 'tool_call',
    data: { toolName, args }
  };
}

/**
 * Create a tool result notification
 */
export function createToolResultNotification(
  toolName: string,
  success: boolean,
  summary?: string
): ToolResultNotification {
  return {
    type: 'tool_result',
    data: { toolName, success, summary }
  };
}

// ============ Error Codes ============

export const ErrorCodes = {
  PARSE_ERROR: 'PARSE_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  METHOD_NOT_FOUND: 'METHOD_NOT_FOUND',
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  EXECUTION_ERROR: 'EXECUTION_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
