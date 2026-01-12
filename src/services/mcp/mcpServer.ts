/**
 * MCP Server - Model Context Protocol server for Claude Code integration
 *
 * Exposes code analysis tools and semantic context as MCP resources.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import {
  readFileTool,
  listFilesTool,
  analyzeSymbolsTool,
  getFileStructureTool,
  searchCodeTool,
  checkScaffoldingTool,
  initializeContextTool,
  scaffoldPlanTool,
  fillScaffoldingTool,
  listFilesToFillTool,
  fillSingleFileTool
} from '../ai/tools';
import { getToolDescription } from '../ai/toolRegistry';
import { SemanticContextBuilder, type ContextFormat } from '../semantic/contextBuilder';
import { VERSION } from '../../version';
import { WorkflowService } from '../workflow';
import {
  PREVC_ROLES,
  PHASE_NAMES_PT,
  ROLE_DISPLAY_NAMES,
  getScaleName,
  ProjectScale,
  PrevcPhase,
  PrevcRole,
  agentOrchestrator,
  documentLinker,
  AgentType,
  AGENT_TYPES,
} from '../../workflow';

export interface MCPServerOptions {
  /** Default repository path for tools */
  repoPath?: string;
  /** Server name */
  name?: string;
  /** Enable verbose logging */
  verbose?: boolean;
}

export class AIContextMCPServer {
  private server: McpServer;
  private contextBuilder: SemanticContextBuilder;
  private options: MCPServerOptions;
  private transport: StdioServerTransport | null = null;

  constructor(options: MCPServerOptions = {}) {
    this.options = {
      name: 'ai-context',
      verbose: false,
      ...options
    };

    this.server = new McpServer({
      name: this.options.name!,
      version: VERSION
    });

    this.contextBuilder = new SemanticContextBuilder();

    this.registerTools();
    this.registerResources();
  }

  /**
   * Register code analysis tools
   */
  private registerTools(): void {
    // readFile tool
    this.server.registerTool('readFile', {
      description: getToolDescription('readFile'),
      inputSchema: {
        filePath: z.string().describe('Absolute or relative path to the file to read'),
        encoding: z.enum(['utf-8', 'ascii', 'binary']).default('utf-8').optional()
      }
    }, async ({ filePath, encoding }) => {
      const result = await readFileTool.execute!(
        { filePath, encoding },
        { toolCallId: '', messages: [] }
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }]
      };
    });

    // listFiles tool
    this.server.registerTool('listFiles', {
      description: getToolDescription('listFiles'),
      inputSchema: {
        pattern: z.string().describe('Glob pattern to match files (e.g., "**/*.ts")'),
        cwd: z.string().optional().describe('Working directory for the glob pattern'),
        ignore: z.array(z.string()).optional().describe('Patterns to ignore')
      }
    }, async ({ pattern, cwd, ignore }) => {
      const result = await listFilesTool.execute!(
        { pattern, cwd: cwd || this.options.repoPath, ignore },
        { toolCallId: '', messages: [] }
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }]
      };
    });

    // analyzeSymbols tool
    this.server.registerTool('analyzeSymbols', {
      description: getToolDescription('analyzeSymbols'),
      inputSchema: {
        filePath: z.string().describe('Path to the file to analyze'),
        symbolTypes: z.array(z.enum(['class', 'interface', 'function', 'type', 'enum']))
          .optional()
          .describe('Types of symbols to extract')
      }
    }, async ({ filePath, symbolTypes }) => {
      const result = await analyzeSymbolsTool.execute!(
        { filePath, symbolTypes },
        { toolCallId: '', messages: [] }
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }]
      };
    });

    // getFileStructure tool
    this.server.registerTool('getFileStructure', {
      description: getToolDescription('getFileStructure'),
      inputSchema: {
        rootPath: z.string().describe('Root path of the repository'),
        maxDepth: z.number().optional().default(3).describe('Maximum directory depth'),
        includePatterns: z.array(z.string()).optional()
      }
    }, async ({ rootPath, maxDepth, includePatterns }) => {
      const result = await getFileStructureTool.execute!(
        { rootPath: rootPath || this.options.repoPath || '.', maxDepth, includePatterns },
        { toolCallId: '', messages: [] }
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }]
      };
    });

    // searchCode tool
    this.server.registerTool('searchCode', {
      description: getToolDescription('searchCode'),
      inputSchema: {
        pattern: z.string().describe('Regex pattern to search for'),
        fileGlob: z.string().optional().describe('Glob pattern to filter files'),
        maxResults: z.number().optional().default(50),
        cwd: z.string().optional().describe('Working directory for the search')
      }
    }, async ({ pattern, fileGlob, maxResults, cwd }) => {
      const result = await searchCodeTool.execute!(
        {
          pattern,
          fileGlob,
          maxResults,
          cwd: cwd || this.options.repoPath
        } as any,
        { toolCallId: '', messages: [] }
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }]
      };
    });

    // buildSemanticContext tool - higher-level context building
    this.server.registerTool('buildSemanticContext', {
      description: getToolDescription('buildSemanticContext'),
      inputSchema: {
        repoPath: z.string().describe('Path to the repository'),
        contextType: z.enum(['documentation', 'playbook', 'plan', 'compact'])
          .default('compact')
          .describe('Type of context to build'),
        targetFile: z.string().optional().describe('Optional target file for focused context'),
        options: z.object({
          useLSP: z.boolean().optional(),
          maxContextLength: z.number().optional(),
          includeDocumentation: z.boolean().optional(),
          includeSignatures: z.boolean().optional()
        }).optional()
      }
    }, async ({ repoPath, contextType, targetFile, options }) => {
      const isLocalBuilder = !!options;
      const builder = isLocalBuilder
        ? new SemanticContextBuilder(options)
        : this.contextBuilder;

      try {
        let context: string;
        const resolvedPath = repoPath || this.options.repoPath || '.';

        switch (contextType) {
          case 'documentation':
            context = await builder.buildDocumentationContext(resolvedPath, targetFile);
            break;
          case 'playbook':
            context = await builder.buildPlaybookContext(resolvedPath, targetFile || 'generic');
            break;
          case 'plan':
            context = await builder.buildPlanContext(resolvedPath, targetFile);
            break;
          case 'compact':
          default:
            context = await builder.buildCompactContext(resolvedPath);
            break;
        }

        return {
          content: [{
            type: 'text' as const,
            text: context
          }]
        };
      } finally {
        if (isLocalBuilder) {
          await builder.shutdown();
        }
      }
    });

    // checkScaffolding tool
    this.server.registerTool('checkScaffolding', {
      description: getToolDescription('checkScaffolding'),
      inputSchema: {
        repoPath: z.string().optional().describe('Repository path to check (defaults to cwd)')
      }
    }, async ({ repoPath }) => {
      const result = await checkScaffoldingTool.execute!(
        { repoPath: repoPath || this.options.repoPath },
        { toolCallId: '', messages: [] }
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }]
      };
    });

    // initializeContext tool
    this.server.registerTool('initializeContext', {
      description: getToolDescription('initializeContext', true),
      inputSchema: {
        repoPath: z.string().describe('Repository path to initialize'),
        type: z.enum(['docs', 'agents', 'both']).default('both').optional()
          .describe('Type of scaffolding to create'),
        outputDir: z.string().optional().describe('Output directory (default: ./.context)'),
        semantic: z.boolean().default(true).optional()
          .describe('Enable semantic analysis for richer templates'),
        include: z.array(z.string()).optional().describe('Include patterns'),
        exclude: z.array(z.string()).optional().describe('Exclude patterns')
      }
    }, async ({ repoPath, type, outputDir, semantic, include, exclude }) => {
      const result = await initializeContextTool.execute!(
        {
          repoPath: repoPath || this.options.repoPath || process.cwd(),
          type,
          outputDir,
          semantic,
          include,
          exclude
        },
        { toolCallId: '', messages: [] }
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }]
      };
    });

    // scaffoldPlan tool
    this.server.registerTool('scaffoldPlan', {
      description: getToolDescription('scaffoldPlan'),
      inputSchema: {
        planName: z.string().describe('Name of the plan (will be slugified)'),
        repoPath: z.string().optional().describe('Repository path'),
        outputDir: z.string().optional().describe('Output directory'),
        title: z.string().optional().describe('Plan title (defaults to formatted planName)'),
        summary: z.string().optional().describe('Plan summary/goal'),
        semantic: z.boolean().default(true).optional().describe('Enable semantic analysis')
      }
    }, async ({ planName, repoPath, outputDir, title, summary, semantic }) => {
      const result = await scaffoldPlanTool.execute!(
        {
          planName,
          repoPath: repoPath || this.options.repoPath || process.cwd(),
          outputDir,
          title,
          summary,
          semantic
        },
        { toolCallId: '', messages: [] }
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }]
      };
    });

    // fillScaffolding tool (with pagination)
    this.server.registerTool('fillScaffolding', {
      description: getToolDescription('fillScaffolding', true),
      inputSchema: {
        repoPath: z.string().describe('Repository path'),
        outputDir: z.string().optional().describe('Scaffold directory (default: ./.context)'),
        target: z.enum(['docs', 'agents', 'plans', 'all']).default('all').optional()
          .describe('Which scaffolding to fill'),
        offset: z.number().optional().describe('Skip first N files (for pagination)'),
        limit: z.number().optional().describe('Max files to return (default: 3, use 0 for all)')
      }
    }, async ({ repoPath, outputDir, target, offset, limit }) => {
      const result = await fillScaffoldingTool.execute!(
        {
          repoPath: repoPath || this.options.repoPath || process.cwd(),
          outputDir,
          target,
          offset,
          limit
        },
        { toolCallId: '', messages: [] }
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }]
      };
    });

    // listFilesToFill tool - lightweight listing without content
    this.server.registerTool('listFilesToFill', {
      description: getToolDescription('listFilesToFill', true),
      inputSchema: {
        repoPath: z.string().describe('Repository path'),
        outputDir: z.string().optional().describe('Scaffold directory (default: ./.context)'),
        target: z.enum(['docs', 'agents', 'plans', 'all']).default('all').optional()
          .describe('Which scaffolding to list')
      }
    }, async ({ repoPath, outputDir, target }) => {
      const result = await listFilesToFillTool.execute!(
        {
          repoPath: repoPath || this.options.repoPath || process.cwd(),
          outputDir,
          target
        },
        { toolCallId: '', messages: [] }
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }]
      };
    });

    // fillSingleFile tool - process one file at a time
    this.server.registerTool('fillSingleFile', {
      description: getToolDescription('fillSingleFile', true),
      inputSchema: {
        repoPath: z.string().describe('Repository path'),
        filePath: z.string().describe('Absolute path to the scaffold file to fill')
      }
    }, async ({ repoPath, filePath }) => {
      const result = await fillSingleFileTool.execute!(
        {
          repoPath: repoPath || this.options.repoPath || process.cwd(),
          filePath
        },
        { toolCallId: '', messages: [] }
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }]
      };
    });

    this.log('Registered 12 tools');

    // Register PREVC workflow tools
    this.registerWorkflowTools();
  }

  /**
   * Register PREVC workflow tools
   */
  private registerWorkflowTools(): void {
    const repoPath = this.options.repoPath || process.cwd();

    // workflowInit - Initialize a PREVC workflow
    this.server.registerTool('workflowInit', {
      description: 'Initialize a PREVC workflow with automatic scale detection. PREVC = Planejamento, Revisão, Execução, Validação, Confirmação.',
      inputSchema: {
        name: z.string().describe('Name of the project/feature'),
        description: z.string().optional().describe('Description for scale detection'),
        scale: z.enum(['QUICK', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE']).optional()
          .describe('Project scale (auto-detected if not provided)')
      }
    }, async ({ name, description, scale }) => {
      try {
        const service = new WorkflowService(repoPath);
        const status = await service.init({
          name,
          description,
          scale: scale as string | undefined,
        });

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              message: `Workflow initialized: ${name}`,
              scale: getScaleName(status.project.scale as ProjectScale),
              currentPhase: status.project.current_phase,
              phases: Object.keys(status.phases).filter(
                (p) => status.phases[p as PrevcPhase].status !== 'skipped'
              ),
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error)
            }, null, 2)
          }]
        };
      }
    });

    // workflowStatus - Get current workflow status
    this.server.registerTool('workflowStatus', {
      description: 'Get the current status of the PREVC workflow including phases, roles, and progress.',
      inputSchema: {}
    }, async () => {
      try {
        const service = new WorkflowService(repoPath);

        if (!(await service.hasWorkflow())) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: 'No workflow found. Run workflowInit first.'
              }, null, 2)
            }]
          };
        }

        const summary = await service.getSummary();
        const status = await service.getStatus();

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              name: summary.name,
              scale: getScaleName(summary.scale as ProjectScale),
              currentPhase: {
                code: summary.currentPhase,
                name: PHASE_NAMES_PT[summary.currentPhase],
              },
              progress: summary.progress,
              isComplete: summary.isComplete,
              phases: status.phases,
              roles: status.roles,
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error)
            }, null, 2)
          }]
        };
      }
    });

    // workflowAdvance - Advance to the next phase
    this.server.registerTool('workflowAdvance', {
      description: 'Complete the current phase and advance to the next phase in the PREVC workflow.',
      inputSchema: {
        outputs: z.array(z.string()).optional()
          .describe('List of artifact paths generated in the current phase')
      }
    }, async ({ outputs }) => {
      try {
        const service = new WorkflowService(repoPath);

        if (!(await service.hasWorkflow())) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: 'No workflow found. Run workflowInit first.'
              }, null, 2)
            }]
          };
        }

        const nextPhase = await service.advance(outputs);

        if (nextPhase) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                message: `Advanced to ${PHASE_NAMES_PT[nextPhase]} phase`,
                nextPhase: {
                  code: nextPhase,
                  name: PHASE_NAMES_PT[nextPhase],
                }
              }, null, 2)
            }]
          };
        } else {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                message: 'Workflow completed!',
                isComplete: true
              }, null, 2)
            }]
          };
        }
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error)
            }, null, 2)
          }]
        };
      }
    });

    // workflowHandoff - Handoff between roles
    this.server.registerTool('workflowHandoff', {
      description: 'Perform a handoff from one role to another within the PREVC workflow.',
      inputSchema: {
        from: z.enum(PREVC_ROLES as unknown as [string, ...string[]])
          .describe('Role handing off'),
        to: z.enum(PREVC_ROLES as unknown as [string, ...string[]])
          .describe('Role receiving handoff'),
        artifacts: z.array(z.string()).describe('Artifacts being handed off')
      }
    }, async ({ from, to, artifacts }) => {
      try {
        const service = new WorkflowService(repoPath);

        if (!(await service.hasWorkflow())) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: 'No workflow found. Run workflowInit first.'
              }, null, 2)
            }]
          };
        }

        await service.handoff(from as PrevcRole, to as PrevcRole, artifacts);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              message: `Handoff complete: ${ROLE_DISPLAY_NAMES[from as PrevcRole]} → ${ROLE_DISPLAY_NAMES[to as PrevcRole]}`,
              from: { role: from, displayName: ROLE_DISPLAY_NAMES[from as PrevcRole] },
              to: { role: to, displayName: ROLE_DISPLAY_NAMES[to as PrevcRole] },
              artifacts
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error)
            }, null, 2)
          }]
        };
      }
    });

    // workflowCollaborate - Start a collaboration session
    this.server.registerTool('workflowCollaborate', {
      description: 'Start a multi-role collaboration session for complex decisions or brainstorming.',
      inputSchema: {
        topic: z.string().describe('Topic for the collaboration session'),
        participants: z.array(z.enum(PREVC_ROLES as unknown as [string, ...string[]]))
          .optional()
          .describe('Roles to participate (auto-selected if not provided)')
      }
    }, async ({ topic, participants }) => {
      try {
        const service = new WorkflowService(repoPath);
        const session = await service.startCollaboration(
          topic,
          participants as PrevcRole[] | undefined
        );
        const status = session.getStatus();

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              message: `Collaboration session started: ${topic}`,
              sessionId: status.id,
              topic: status.topic,
              participants: status.participants.map((p) => ({
                role: p,
                displayName: ROLE_DISPLAY_NAMES[p],
              })),
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error)
            }, null, 2)
          }]
        };
      }
    });

    // workflowCreateDoc - Create a document for the current phase
    this.server.registerTool('workflowCreateDoc', {
      description: 'Create a document template for the current phase of the PREVC workflow.',
      inputSchema: {
        type: z.enum(['prd', 'tech-spec', 'architecture', 'adr', 'test-plan', 'changelog'])
          .describe('Type of document to create'),
        name: z.string().describe('Name/title for the document')
      }
    }, async ({ type, name }) => {
      try {
        const service = new WorkflowService(repoPath);

        if (!(await service.hasWorkflow())) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: 'No workflow found. Run workflowInit first.'
              }, null, 2)
            }]
          };
        }

        // For now, return the document path that should be created
        const docPath = `.context/workflow/docs/${type}-${name.toLowerCase().replace(/\s+/g, '-')}.md`;

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              message: `Document template ready: ${type}`,
              documentType: type,
              suggestedPath: docPath,
              name,
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error)
            }, null, 2)
          }]
        };
      }
    });

    this.log('Registered 6 workflow tools');
  }

  /**
   * Register semantic context resources
   */
  private registerResources(): void {
    const repoPath = this.options.repoPath || process.cwd();

    // Register context resources as templates with URI patterns
    this.server.registerResource(
      'codebase-context',
      `context://codebase/{contextType}`,
      {
        description: 'Semantic context for the codebase. Use contextType: documentation, playbook, plan, or compact',
        mimeType: 'text/markdown'
      },
      async (uri) => {
        // Extract context type from URI
        const match = uri.pathname.match(/\/([^/]+)$/);
        const contextType = (match?.[1] || 'compact') as ContextFormat;

        let context: string;
        switch (contextType) {
          case 'documentation':
            context = await this.contextBuilder.buildDocumentationContext(repoPath);
            break;
          case 'playbook':
            context = await this.contextBuilder.buildPlaybookContext(repoPath, 'generic');
            break;
          case 'plan':
            context = await this.contextBuilder.buildPlanContext(repoPath);
            break;
          case 'compact':
          default:
            context = await this.contextBuilder.buildCompactContext(repoPath);
            break;
        }

        return {
          contents: [{
            uri: uri.href,
            mimeType: 'text/markdown',
            text: context
          }]
        };
      }
    );

    // Register file resource template
    this.server.registerResource(
      'file-content',
      `file://{path}`,
      {
        description: 'Read file contents from the repository',
        mimeType: 'text/plain'
      },
      async (uri) => {
        const filePath = uri.pathname;
        const result = await readFileTool.execute!(
          { filePath },
          { toolCallId: '', messages: [] }
        ) as { success: boolean; content?: string; error?: string };

        if (!result.success) {
          throw new Error(result.error || 'Failed to read file');
        }

        return {
          contents: [{
            uri: uri.href,
            mimeType: 'text/plain',
            text: result.content || ''
          }]
        };
      }
    );

    this.log('Registered 2 resource templates');

    // Register PREVC workflow resources
    this.registerWorkflowResources();

    // Register orchestration tools
    this.registerOrchestrationTools();
  }

  /**
   * Register PREVC workflow resources
   */
  private registerWorkflowResources(): void {
    const repoPath = this.options.repoPath || process.cwd();

    // workflow://status - Current workflow status
    this.server.registerResource(
      'workflow-status',
      'workflow://status',
      {
        description: 'Current PREVC workflow status including phases, roles, and progress',
        mimeType: 'application/json'
      },
      async () => {
        try {
          const service = new WorkflowService(repoPath);

          if (!(await service.hasWorkflow())) {
            return {
              contents: [{
                uri: 'workflow://status',
                mimeType: 'application/json',
                text: JSON.stringify({ error: 'No workflow found' }, null, 2)
              }]
            };
          }

          const summary = await service.getSummary();
          const status = await service.getStatus();

          return {
            contents: [{
              uri: 'workflow://status',
              mimeType: 'application/json',
              text: JSON.stringify({
                name: summary.name,
                scale: getScaleName(summary.scale as ProjectScale),
                currentPhase: summary.currentPhase,
                progress: summary.progress,
                isComplete: summary.isComplete,
                phases: status.phases,
                roles: status.roles,
              }, null, 2)
            }]
          };
        } catch (error) {
          return {
            contents: [{
              uri: 'workflow://status',
              mimeType: 'application/json',
              text: JSON.stringify({
                error: error instanceof Error ? error.message : String(error)
              }, null, 2)
            }]
          };
        }
      }
    );

    this.log('Registered 1 workflow resource');
  }

  /**
   * Register agent orchestration tools
   */
  private registerOrchestrationTools(): void {
    // orchestrateAgents - Select agents for a task, phase, or role
    this.server.registerTool('orchestrateAgents', {
      description: 'Select appropriate agents based on task description, PREVC phase, or role. Returns recommended agents with their descriptions and relevant documentation.',
      inputSchema: {
        task: z.string().optional().describe('Task description for intelligent agent selection'),
        phase: z.enum(['P', 'R', 'E', 'V', 'C']).optional().describe('PREVC phase to get agents for'),
        role: z.enum(PREVC_ROLES).optional().describe('PREVC role to get agents for'),
      },
    }, async ({ task, phase, role }) => {
      try {
        let agents: AgentType[] = [];
        let source = '';

        if (task) {
          agents = agentOrchestrator.selectAgentsByTask(task);
          source = `task: "${task}"`;
        } else if (phase) {
          agents = agentOrchestrator.getAgentsForPhase(phase as PrevcPhase);
          source = `phase: ${phase} (${PHASE_NAMES_PT[phase as PrevcPhase]})`;
        } else if (role) {
          agents = agentOrchestrator.getAgentsForRole(role as PrevcRole);
          source = `role: ${ROLE_DISPLAY_NAMES[role as PrevcRole]}`;
        } else {
          return {
            content: [{ type: 'text', text: 'Error: Provide task, phase, or role parameter' }],
          };
        }

        const agentDetails = agents.map((agent) => ({
          type: agent,
          description: agentOrchestrator.getAgentDescription(agent),
          docs: documentLinker.getDocPathsForAgent(agent),
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              source,
              agents: agentDetails,
              count: agents.length,
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    });

    // getAgentSequence - Get recommended agent sequence for a task
    this.server.registerTool('getAgentSequence', {
      description: 'Get recommended sequence of agents for a task, including handoff order. Useful for planning multi-agent workflows.',
      inputSchema: {
        task: z.string().describe('Task description'),
        includeReview: z.boolean().optional().describe('Include code review in sequence (default: true)'),
        phases: z.array(z.enum(['P', 'R', 'E', 'V', 'C'])).optional().describe('PREVC phases to include (for phase-based sequencing)'),
      },
    }, async ({ task, includeReview, phases }) => {
      try {
        let sequence: AgentType[];

        if (phases && phases.length > 0) {
          sequence = agentOrchestrator.getAgentHandoffSequence(phases as PrevcPhase[]);
        } else {
          sequence = agentOrchestrator.getTaskAgentSequence(
            task,
            includeReview !== false
          );
        }

        const sequenceDetails = sequence.map((agent, index) => ({
          order: index + 1,
          agent,
          description: agentOrchestrator.getAgentDescription(agent),
          primaryDoc: documentLinker.getPrimaryDocForAgent(agent)?.path || null,
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              task,
              sequence: sequenceDetails,
              totalAgents: sequence.length,
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    });

    // getAgentDocs - Get documentation relevant to an agent
    this.server.registerTool('getAgentDocs', {
      description: 'Get documentation guides relevant to a specific agent type. Helps agents find the right context.',
      inputSchema: {
        agent: z.enum(AGENT_TYPES).describe('Agent type to get documentation for'),
      },
    }, async ({ agent }) => {
      try {
        if (!agentOrchestrator.isValidAgentType(agent)) {
          return {
            content: [{
              type: 'text',
              text: `Error: Invalid agent type "${agent}". Valid types: ${AGENT_TYPES.join(', ')}`,
            }],
          };
        }

        const docs = documentLinker.getDocsForAgent(agent as AgentType);
        const agentDesc = agentOrchestrator.getAgentDescription(agent as AgentType);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              agent,
              description: agentDesc,
              documentation: docs.map((doc) => ({
                type: doc.type,
                title: doc.title,
                path: doc.path,
                description: doc.description,
              })),
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    });

    // getPhaseDocs - Get documentation for a PREVC phase
    this.server.registerTool('getPhaseDocs', {
      description: 'Get documentation relevant to a PREVC workflow phase. Helps understand what documentation is needed at each phase.',
      inputSchema: {
        phase: z.enum(['P', 'R', 'E', 'V', 'C']).describe('PREVC phase (P=Planning, R=Review, E=Execution, V=Validation, C=Confirmation)'),
      },
    }, async ({ phase }) => {
      try {
        const docs = documentLinker.getDocsForPhase(phase as PrevcPhase);
        const agents = agentOrchestrator.getAgentsForPhase(phase as PrevcPhase);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              phase,
              phaseName: PHASE_NAMES_PT[phase as PrevcPhase],
              documentation: docs.map((doc) => ({
                type: doc.type,
                title: doc.title,
                path: doc.path,
                description: doc.description,
              })),
              recommendedAgents: agents.map((agent) => ({
                type: agent,
                description: agentOrchestrator.getAgentDescription(agent),
              })),
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    });

    // listAgentTypes - List all available agent types
    this.server.registerTool('listAgentTypes', {
      description: 'List all available agent types with their descriptions. Use this to understand what agents are available.',
      inputSchema: {},
    }, async () => {
      const agents = agentOrchestrator.getAllAgentTypes().map((agent) => ({
        type: agent,
        description: agentOrchestrator.getAgentDescription(agent),
        primaryDoc: documentLinker.getPrimaryDocForAgent(agent)?.title || null,
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            agents,
            total: agents.length,
          }, null, 2),
        }],
      };
    });

    this.log('Registered 5 orchestration tools');
  }

  /**
   * Start the MCP server with stdio transport
   */
  async start(): Promise<void> {
    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
    this.log('MCP Server started on stdio');
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    await this.server.close();
    await this.contextBuilder.shutdown();
    this.log('MCP Server stopped');
  }

  /**
   * Log message to stderr (not stdout, to avoid polluting MCP messages)
   */
  private log(message: string): void {
    if (this.options.verbose) {
      process.stderr.write(`[mcp] ${message}\n`);
    }
  }
}

/**
 * Create and start an MCP server
 */
export async function startMCPServer(options: MCPServerOptions = {}): Promise<AIContextMCPServer> {
  const server = new AIContextMCPServer(options);
  await server.start();
  return server;
}
