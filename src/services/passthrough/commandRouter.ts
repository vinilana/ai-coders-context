/**
 * CommandRouter - Routes JSON-RPC style commands to appropriate handlers
 */

import {
  type BaseRequest,
  type Response,
  type Notification,
  type CapabilitiesData,
  type ToolDescription,
  RequestSchema,
  ErrorCodes,
  createSuccessResponse,
  createErrorResponse,
  createProgressNotification,
  createToolCallNotification,
  createToolResultNotification
} from './protocol';
import {
  getCodeAnalysisTools,
  TOOL_NAMES,
  readFileTool,
  listFilesTool,
  analyzeSymbolsTool,
  getFileStructureTool,
  searchCodeTool
} from '../ai/tools';
import { SemanticContextBuilder, type ContextFormat } from '../semantic/contextBuilder';
import type { AgentEventCallbacks } from '../ai/agentEvents';
import {
  ReadFileInputSchema,
  ListFilesInputSchema,
  AnalyzeSymbolsInputSchema,
  GetFileStructureInputSchema,
  SearchCodeInputSchema
} from '../ai/schemas';
import { type ZodType, type ZodObject, type ZodRawShape } from 'zod';
import { VERSION } from '../../version';

/**
 * Convert a Zod schema to a simplified JSON schema representation
 */
function zodSchemaToSimpleJson(schema: ZodType): Record<string, unknown> {
  const def = (schema as any)._def;

  if (def.typeName === 'ZodObject') {
    const shape = (schema as ZodObject<ZodRawShape>).shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const fieldDef = (value as any)._def;
      const isOptional = fieldDef.typeName === 'ZodOptional' || fieldDef.typeName === 'ZodDefault';

      if (!isOptional) {
        required.push(key);
      }

      // Get description from the field
      const description = fieldDef.description || (fieldDef.innerType?._def?.description);

      properties[key] = {
        type: getZodTypeName(value as ZodType),
        ...(description ? { description } : {})
      };
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined
    };
  }

  return { type: 'unknown' };
}

/**
 * Get a simple type name from a Zod type
 */
function getZodTypeName(schema: ZodType): string {
  const def = (schema as any)._def;
  const typeName = def.typeName;

  switch (typeName) {
    case 'ZodString': return 'string';
    case 'ZodNumber': return 'number';
    case 'ZodBoolean': return 'boolean';
    case 'ZodArray': return 'array';
    case 'ZodObject': return 'object';
    case 'ZodOptional': return getZodTypeName(def.innerType);
    case 'ZodDefault': return getZodTypeName(def.innerType);
    case 'ZodEnum': return 'string';
    default: return 'unknown';
  }
}

export interface CommandRouterOptions {
  /** Default repository path for tools */
  defaultRepoPath?: string;
  /** Callback for sending notifications */
  onNotification?: (notification: Notification) => void;
}

type ToolExecuteFn = (args: Record<string, unknown>) => Promise<unknown>;

interface ToolEntry {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: ToolExecuteFn;
}

export class CommandRouter {
  private options: CommandRouterOptions;
  private contextBuilder: SemanticContextBuilder;
  private toolRegistry: Map<string, ToolEntry>;

  constructor(options: CommandRouterOptions = {}) {
    this.options = options;
    this.contextBuilder = new SemanticContextBuilder();
    this.toolRegistry = this.buildToolRegistry();
  }

  /**
   * Build the tool registry from existing tools
   */
  private buildToolRegistry(): Map<string, ToolEntry> {
    const registry = new Map<string, ToolEntry>();

    // Register each tool with its schema
    // Note: Using non-null assertion because these tools are guaranteed to have execute functions
    registry.set('readFile', {
      name: 'readFile',
      description: 'Read the contents of a file from the filesystem',
      inputSchema: zodSchemaToSimpleJson(ReadFileInputSchema),
      execute: async (args) => readFileTool.execute!(args as any, { toolCallId: '', messages: [] })
    });

    registry.set('listFiles', {
      name: 'listFiles',
      description: 'List files matching a glob pattern',
      inputSchema: zodSchemaToSimpleJson(ListFilesInputSchema),
      execute: async (args) => listFilesTool.execute!(args as any, { toolCallId: '', messages: [] })
    });

    registry.set('analyzeSymbols', {
      name: 'analyzeSymbols',
      description: 'Analyze symbols in a source file (classes, functions, interfaces, etc.)',
      inputSchema: zodSchemaToSimpleJson(AnalyzeSymbolsInputSchema),
      execute: async (args) => analyzeSymbolsTool.execute!(args as any, { toolCallId: '', messages: [] })
    });

    registry.set('getFileStructure', {
      name: 'getFileStructure',
      description: 'Get the file structure of a repository',
      inputSchema: zodSchemaToSimpleJson(GetFileStructureInputSchema),
      execute: async (args) => getFileStructureTool.execute!(args as any, { toolCallId: '', messages: [] })
    });

    registry.set('searchCode', {
      name: 'searchCode',
      description: 'Search for code patterns using regex',
      inputSchema: zodSchemaToSimpleJson(SearchCodeInputSchema),
      execute: async (args) => searchCodeTool.execute!(args as any, { toolCallId: '', messages: [] })
    });

    return registry;
  }

  /**
   * Route a request to the appropriate handler
   */
  async route(request: BaseRequest): Promise<Response> {
    // Validate the full request
    const validation = RequestSchema.safeParse(request);
    if (!validation.success) {
      return createErrorResponse(
        request.id,
        ErrorCodes.INVALID_REQUEST,
        `Invalid request: ${validation.error.message}`
      );
    }

    const validRequest = validation.data;

    try {
      switch (validRequest.method) {
        case 'capabilities':
          return this.handleCapabilities(validRequest.id);

        case 'tool.list':
          return this.handleToolList(validRequest.id);

        case 'tool.call':
          return await this.handleToolCall(
            validRequest.id,
            validRequest.params.tool,
            validRequest.params.args
          );

        case 'context.build':
          return await this.handleContextBuild(
            validRequest.id,
            validRequest.params.repoPath,
            validRequest.params.contextType,
            validRequest.params.targetFile,
            validRequest.params.options
          );

        case 'agent.run':
          return await this.handleAgentRun(
            validRequest.id,
            validRequest.params.agent,
            validRequest.params.repoPath,
            validRequest.params.llmConfig,
            validRequest.params.targetFile,
            validRequest.params.options
          );

        default:
          return createErrorResponse(
            request.id,
            ErrorCodes.METHOD_NOT_FOUND,
            `Unknown method: ${(validRequest as any).method}`
          );
      }
    } catch (error) {
      return createErrorResponse(
        request.id,
        ErrorCodes.EXECUTION_ERROR,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Handle capabilities request
   */
  private handleCapabilities(id: string): Response<CapabilitiesData> {
    const tools: ToolDescription[] = [];

    for (const [, toolEntry] of this.toolRegistry) {
      tools.push({
        name: toolEntry.name,
        description: toolEntry.description,
        inputSchema: toolEntry.inputSchema
      });
    }

    return createSuccessResponse(id, {
      version: VERSION,
      methods: ['capabilities', 'tool.list', 'tool.call', 'context.build', 'agent.run'],
      tools,
      agents: ['documentation', 'playbook', 'plan'],
      contextTypes: ['documentation', 'playbook', 'plan', 'compact']
    });
  }

  /**
   * Handle tool.list request
   */
  private handleToolList(id: string): Response<ToolDescription[]> {
    const tools: ToolDescription[] = [];

    for (const [, toolEntry] of this.toolRegistry) {
      tools.push({
        name: toolEntry.name,
        description: toolEntry.description,
        inputSchema: toolEntry.inputSchema
      });
    }

    return createSuccessResponse(id, tools);
  }

  /**
   * Handle tool.call request
   */
  private async handleToolCall(
    id: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<Response> {
    const tool = this.toolRegistry.get(toolName);

    if (!tool) {
      return createErrorResponse(
        id,
        ErrorCodes.TOOL_NOT_FOUND,
        `Tool not found: ${toolName}. Available tools: ${[...this.toolRegistry.keys()].join(', ')}`
      );
    }

    // Emit tool call notification
    this.notify(createToolCallNotification(toolName, args));

    try {
      const result = await tool.execute(args);

      // Emit tool result notification
      const success = (result as any)?.success !== false;
      this.notify(createToolResultNotification(toolName, success));

      return createSuccessResponse(id, result);
    } catch (error) {
      this.notify(createToolResultNotification(toolName, false, String(error)));
      throw error;
    }
  }

  /**
   * Handle context.build request
   */
  private async handleContextBuild(
    id: string,
    repoPath: string,
    contextType: ContextFormat,
    targetFile?: string,
    options?: {
      useLSP?: boolean;
      maxContextLength?: number;
      includeDocumentation?: boolean;
      includeSignatures?: boolean;
    }
  ): Promise<Response<string>> {
    this.notify(createProgressNotification(1, `Building ${contextType} context for ${repoPath}`));

    // Create a new builder with options if provided
    const builder = options
      ? new SemanticContextBuilder(options)
      : this.contextBuilder;

    let context: string;

    switch (contextType) {
      case 'documentation':
        context = await builder.buildDocumentationContext(repoPath, targetFile);
        break;

      case 'playbook':
        context = await builder.buildPlaybookContext(repoPath, targetFile || 'generic');
        break;

      case 'plan':
        context = await builder.buildPlanContext(repoPath, targetFile);
        break;

      case 'compact':
      default:
        context = await builder.buildCompactContext(repoPath);
        break;
    }

    this.notify(createProgressNotification(2, 'Context built successfully'));

    return createSuccessResponse(id, context);
  }

  /**
   * Handle agent.run request
   */
  private async handleAgentRun(
    id: string,
    agentType: 'documentation' | 'playbook' | 'plan',
    repoPath: string,
    llmConfig: {
      apiKey: string;
      model: string;
      provider: 'openrouter' | 'openai' | 'anthropic' | 'google';
      baseUrl?: string;
    },
    targetFile?: string,
    options?: Record<string, unknown>
  ): Promise<Response> {
    this.notify(createProgressNotification(1, `Starting ${agentType} agent`));

    // Create callbacks that emit notifications
    const callbacks: AgentEventCallbacks = {
      onAgentStart: (event) => {
        this.notify(createProgressNotification(1, `Agent ${event.agent} started`));
      },
      onAgentStep: (event) => {
        this.notify(createProgressNotification(
          event.step,
          `Step ${event.step}${event.totalSteps ? ` of ${event.totalSteps}` : ''}`,
          event.totalSteps
        ));
      },
      onToolCall: (event) => {
        this.notify(createToolCallNotification(event.toolName, event.args));
      },
      onToolResult: (event) => {
        this.notify(createToolResultNotification(event.toolName, event.success, event.summary));
      },
      onAgentComplete: (event) => {
        this.notify(createProgressNotification(
          event.steps,
          `Agent completed with ${event.toolsUsed.length} tools used`
        ));
      }
    };

    try {
      // Dynamically import agents to avoid circular dependencies
      const { DocumentationAgent } = await import('../ai/agents/documentationAgent');
      const { PlaybookAgent } = await import('../ai/agents/playbookAgent');
      const { PlanAgent } = await import('../ai/agents/planAgent');

      let result: unknown;

      switch (agentType) {
        case 'documentation': {
          const agent = new DocumentationAgent(llmConfig);
          const docResult = await agent.generateDocumentation({
            repoPath,
            targetFile: targetFile || 'README.md',
            useSemanticContext: true,
            callbacks,
            ...options
          });
          result = docResult;
          break;
        }

        case 'playbook': {
          const agent = new PlaybookAgent(llmConfig);
          // Use targetFile as agent type if valid, otherwise default to 'code-reviewer'
          const { AGENT_TYPES } = await import('../../generators/agents/agentTypes');
          const validAgentType = targetFile && (AGENT_TYPES as readonly string[]).includes(targetFile)
            ? targetFile as typeof AGENT_TYPES[number]
            : 'code-reviewer';
          const playbookResult = await agent.generatePlaybook({
            repoPath,
            agentType: validAgentType,
            useSemanticContext: true,
            callbacks,
            ...options
          });
          result = playbookResult;
          break;
        }

        case 'plan': {
          const agent = new PlanAgent(llmConfig);
          const planResult = await agent.generatePlan({
            repoPath,
            planName: targetFile || 'new-plan',
            summary: (options?.summary as string) || undefined,
            useSemanticContext: true,
            callbacks,
            ...options
          });
          result = planResult;
          break;
        }

        default:
          return createErrorResponse(
            id,
            ErrorCodes.AGENT_NOT_FOUND,
            `Unknown agent type: ${agentType}`
          );
      }

      return createSuccessResponse(id, result);
    } catch (error) {
      return createErrorResponse(
        id,
        ErrorCodes.EXECUTION_ERROR,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Send a notification if callback is registered
   */
  private notify(notification: Notification): void {
    if (this.options.onNotification) {
      this.options.onNotification(notification);
    }
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    await this.contextBuilder.shutdown();
  }
}
