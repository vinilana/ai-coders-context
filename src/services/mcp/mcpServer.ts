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
import { StartService } from '../start';
import { ReportService } from '../report';
import { ExportRulesService, EXPORT_PRESETS } from '../export';
import { StackDetector } from '../stack';
import {
  PREVC_ROLES,
  PHASE_NAMES_EN,
  ROLE_DISPLAY_NAMES,
  getScaleName,
  ProjectScale,
  PrevcPhase,
  PrevcRole,
  agentOrchestrator,
  documentLinker,
  AgentType,
  AGENT_TYPES,
  createPlanLinker,
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
                name: PHASE_NAMES_EN[summary.currentPhase],
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
                message: `Advanced to ${PHASE_NAMES_EN[nextPhase]} phase`,
                nextPhase: {
                  code: nextPhase,
                  name: PHASE_NAMES_EN[nextPhase],
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

    // Register extended workflow tools (start, report, export, stack detection)
    this.registerExtendedWorkflowTools();
  }

  /**
   * Register extended workflow tools (start, report, export, stack detection)
   */
  private registerExtendedWorkflowTools(): void {
    const repoPath = this.options.repoPath || process.cwd();

    // projectStart - Unified start command
    this.server.registerTool('projectStart', {
      description: 'Start a new project with unified setup: scaffolding + context fill + workflow initialization. Supports workflow templates (hotfix, feature, mvp).',
      inputSchema: {
        featureName: z.string().describe('Feature/project name'),
        template: z.enum(['hotfix', 'feature', 'mvp', 'auto']).optional()
          .describe('Workflow template (hotfix=quick fix, feature=standard, mvp=complete)'),
        skipFill: z.boolean().optional().describe('Skip AI-assisted context filling'),
        skipWorkflow: z.boolean().optional().describe('Skip workflow initialization'),
      }
    }, async ({ featureName, template, skipFill, skipWorkflow }) => {
      try {
        const startService = new StartService({
          ui: {
            displayOutput: () => {},
            displaySuccess: () => {},
            displayError: () => {},
            displayInfo: () => {},
            displayWarning: () => {},
            startSpinner: () => {},
            stopSpinner: () => {},
            updateSpinner: () => {},
            prompt: async () => '',
            confirm: async () => true,
          } as any,
          t: (key: string) => key,
          version: VERSION,
          defaultModel: 'claude-3-5-sonnet-20241022',
        });

        const result = await startService.run(repoPath, {
          featureName,
          template: template as any,
          skipFill,
          skipWorkflow,
        });

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: result.workflowStarted || result.initialized,
              initialized: result.initialized,
              filled: result.filled,
              workflowStarted: result.workflowStarted,
              scale: result.scale ? getScaleName(result.scale) : null,
              featureName: result.featureName,
              stack: result.stackDetected ? {
                primaryLanguage: result.stackDetected.primaryLanguage,
                frameworks: result.stackDetected.frameworks,
              } : null,
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

    // projectReport - Generate visual reports
    this.server.registerTool('projectReport', {
      description: 'Generate a visual progress report for the current PREVC workflow. Shows phases, roles, deliverables, and a visual dashboard.',
      inputSchema: {
        format: z.enum(['json', 'markdown', 'dashboard']).default('dashboard').optional()
          .describe('Output format: json (raw data), markdown (formatted), dashboard (visual)'),
        includeStack: z.boolean().optional().describe('Include technology stack info'),
      }
    }, async ({ format, includeStack }) => {
      try {
        const reportService = new ReportService({
          ui: {
            displayOutput: () => {},
            displaySuccess: () => {},
            displayError: () => {},
            displayInfo: () => {},
            displayWarning: () => {},
            startSpinner: () => {},
            stopSpinner: () => {},
            updateSpinner: () => {},
          } as any,
          t: (key: string) => key,
          version: VERSION,
        });

        const report = await reportService.generate(repoPath, { includeStack });

        let output: string;
        if (format === 'json') {
          output = JSON.stringify(report, null, 2);
        } else if (format === 'dashboard') {
          output = reportService.generateVisualDashboard(report);
        } else {
          // Markdown format - use visual dashboard as fallback
          output = reportService.generateVisualDashboard(report);
        }

        return {
          content: [{
            type: 'text' as const,
            text: output
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

    // exportRules - Export rules to AI tools
    this.server.registerTool('exportRules', {
      description: 'Export context rules to AI tool directories (Cursor, Claude, GitHub Copilot, Windsurf, Cline, Aider, Codex). Bidirectional rules sync.',
      inputSchema: {
        preset: z.enum(['cursor', 'claude', 'github', 'windsurf', 'cline', 'aider', 'codex', 'all']).default('all')
          .describe('Target AI tool preset or "all" for all supported tools'),
        force: z.boolean().optional().describe('Overwrite existing files'),
        dryRun: z.boolean().optional().describe('Preview changes without writing'),
      }
    }, async ({ preset, force, dryRun }) => {
      try {
        const exportService = new ExportRulesService({
          ui: {
            displayOutput: () => {},
            displaySuccess: () => {},
            displayError: () => {},
            displayInfo: () => {},
            displayWarning: () => {},
            startSpinner: () => {},
            stopSpinner: () => {},
            updateSpinner: () => {},
          } as any,
          t: (key: string) => key,
          version: VERSION,
        });

        const result = await exportService.run(repoPath, { preset, force, dryRun });

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              filesCreated: result.filesCreated,
              filesSkipped: result.filesSkipped,
              filesFailed: result.filesFailed,
              targets: result.targets,
              errors: result.errors,
              dryRun: dryRun || false,
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

    // detectStack - Detect project technology stack
    this.server.registerTool('detectStack', {
      description: 'Detect the project technology stack including languages, frameworks, build tools, and test frameworks. Useful for intelligent defaults.',
      inputSchema: {}
    }, async () => {
      try {
        const detector = new StackDetector();
        const stackInfo = await detector.detect(repoPath);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              stack: stackInfo,
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

    this.log('Registered 4 extended workflow tools');

    // Register plan-workflow integration tools
    this.registerPlanTools();
  }

  /**
   * Register plan-workflow integration tools
   */
  private registerPlanTools(): void {
    const repoPath = this.options.repoPath || process.cwd();

    // linkPlan - Link a plan to the current workflow
    this.server.registerTool('linkPlan', {
      description: 'Link an implementation plan to the current PREVC workflow. Plans provide detailed steps mapped to workflow phases.',
      inputSchema: {
        planSlug: z.string().describe('Plan slug/identifier (filename without .md)'),
      }
    }, async ({ planSlug }) => {
      try {
        const linker = createPlanLinker(repoPath);
        const ref = await linker.linkPlan(planSlug);

        if (!ref) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: `Plan not found: ${planSlug}`,
              }, null, 2)
            }]
          };
        }

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              plan: ref,
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

    // getLinkedPlans - Get all plans linked to the workflow
    this.server.registerTool('getLinkedPlans', {
      description: 'Get all implementation plans linked to the current PREVC workflow.',
      inputSchema: {}
    }, async () => {
      try {
        const linker = createPlanLinker(repoPath);
        const plans = await linker.getLinkedPlans();

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              plans,
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

    // getPlanDetails - Get detailed plan with PREVC mapping
    this.server.registerTool('getPlanDetails', {
      description: 'Get detailed plan information including phases mapped to PREVC, agents, and documentation.',
      inputSchema: {
        planSlug: z.string().describe('Plan slug/identifier'),
      }
    }, async ({ planSlug }) => {
      try {
        const linker = createPlanLinker(repoPath);
        const plan = await linker.getLinkedPlan(planSlug);

        if (!plan) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: `Plan not found or not linked: ${planSlug}`,
              }, null, 2)
            }]
          };
        }

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              plan: {
                ...plan,
                phasesWithPrevc: plan.phases.map(p => ({
                  ...p,
                  prevcPhaseName: PHASE_NAMES_EN[p.prevcPhase],
                })),
              },
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

    // getPlansForPhase - Get plans relevant to current PREVC phase
    this.server.registerTool('getPlansForPhase', {
      description: 'Get all plans that have work items for a specific PREVC phase.',
      inputSchema: {
        phase: z.enum(['P', 'R', 'E', 'V', 'C']).describe('PREVC phase'),
      }
    }, async ({ phase }) => {
      try {
        const linker = createPlanLinker(repoPath);
        const plans = await linker.getPlansForPhase(phase as PrevcPhase);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              phase,
              phaseName: PHASE_NAMES_EN[phase as PrevcPhase],
              plans: plans.map(p => ({
                slug: p.ref.slug,
                title: p.ref.title,
                phasesInThisPrevc: p.phases
                  .filter(ph => ph.prevcPhase === phase)
                  .map(ph => ({ id: ph.id, name: ph.name, status: ph.status })),
                hasPendingWork: linker.hasPendingWorkForPhase(p, phase as PrevcPhase),
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

    // updatePlanPhase - Update plan phase status
    this.server.registerTool('updatePlanPhase', {
      description: 'Update the status of a plan phase (syncs with PREVC workflow tracking).',
      inputSchema: {
        planSlug: z.string().describe('Plan slug/identifier'),
        phaseId: z.string().describe('Phase ID within the plan (e.g., "phase-1")'),
        status: z.enum(['pending', 'in_progress', 'completed', 'skipped']).describe('New status'),
      }
    }, async ({ planSlug, phaseId, status }) => {
      try {
        const linker = createPlanLinker(repoPath);
        const success = await linker.updatePlanPhase(planSlug, phaseId, status as any);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success,
              planSlug,
              phaseId,
              status,
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

    // recordDecision - Record a decision in a plan
    this.server.registerTool('recordDecision', {
      description: 'Record a decision made during plan execution. Decisions are tracked and can be referenced later.',
      inputSchema: {
        planSlug: z.string().describe('Plan slug/identifier'),
        title: z.string().describe('Decision title'),
        description: z.string().describe('Decision description and rationale'),
        phase: z.enum(['P', 'R', 'E', 'V', 'C']).optional().describe('Related PREVC phase'),
        alternatives: z.array(z.string()).optional().describe('Alternatives that were considered'),
      }
    }, async ({ planSlug, title, description, phase, alternatives }) => {
      try {
        const linker = createPlanLinker(repoPath);
        const decision = await linker.recordDecision(planSlug, {
          title,
          description,
          phase: phase as PrevcPhase | undefined,
          alternatives,
          status: 'accepted',
        });

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              decision,
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

    // discoverAgents - Discover all available agents (built-in + custom)
    this.server.registerTool('discoverAgents', {
      description: 'Discover all available agents including custom ones. Scans .context/agents/ for custom agent playbooks.',
      inputSchema: {}
    }, async () => {
      try {
        const linker = createPlanLinker(repoPath);
        const agents = await linker.discoverAgents();

        const builtIn = agents.filter(a => !a.isCustom);
        const custom = agents.filter(a => a.isCustom);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              totalAgents: agents.length,
              builtInCount: builtIn.length,
              customCount: custom.length,
              agents: {
                builtIn: builtIn.map(a => a.type),
                custom: custom.map(a => ({ type: a.type, path: a.path })),
              },
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

    // getAgentInfo - Get detailed info about a specific agent
    this.server.registerTool('getAgentInfo', {
      description: 'Get detailed information about a specific agent (built-in or custom). Returns path, existence status, title, and description.',
      inputSchema: {
        agentType: z.string().describe('Agent type/identifier (e.g., "code-reviewer" or "agente-de-marketing")'),
      }
    }, async ({ agentType }) => {
      try {
        const linker = createPlanLinker(repoPath);
        const info = await linker.getAgentInfo(agentType);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              agent: info,
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

    this.log('Registered 8 plan-workflow tools');
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
          source = `phase: ${phase} (${PHASE_NAMES_EN[phase as PrevcPhase]})`;
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
              phaseName: PHASE_NAMES_EN[phase as PrevcPhase],
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

    // Register skill tools
    this.registerSkillTools();
  }

  /**
   * Register skill tools for on-demand expertise
   */
  private registerSkillTools(): void {
    const repoPath = this.options.repoPath || process.cwd();

    // Import skill registry
    const { createSkillRegistry, BUILT_IN_SKILLS, SKILL_TO_PHASES } = require('../../workflow/skills');

    // listSkills - List all available skills
    this.server.registerTool('listSkills', {
      description: 'List all available skills (built-in + custom). Skills are on-demand expertise for specific tasks.',
      inputSchema: {
        includeContent: z.boolean().optional().describe('Include full skill content in response'),
      }
    }, async ({ includeContent }) => {
      try {
        const registry = createSkillRegistry(repoPath);
        const discovered = await registry.discoverAll();

        const format = (skill: any) => ({
          slug: skill.slug,
          name: skill.metadata.name,
          description: skill.metadata.description,
          phases: skill.metadata.phases || [],
          isBuiltIn: skill.isBuiltIn,
          ...(includeContent ? { content: skill.content } : {}),
        });

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              totalSkills: discovered.all.length,
              builtInCount: discovered.builtIn.length,
              customCount: discovered.custom.length,
              skills: {
                builtIn: discovered.builtIn.map(format),
                custom: discovered.custom.map(format),
              },
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

    // getSkillContent - Get full content of a specific skill
    this.server.registerTool('getSkillContent', {
      description: 'Get the full content of a skill by slug. Returns the SKILL.md content with instructions.',
      inputSchema: {
        skillSlug: z.string().describe('Skill slug/identifier (e.g., "commit-message", "pr-review")'),
      }
    }, async ({ skillSlug }) => {
      try {
        const registry = createSkillRegistry(repoPath);
        const content = await registry.getSkillContent(skillSlug);

        if (!content) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: `Skill not found: ${skillSlug}`,
                availableSkills: BUILT_IN_SKILLS,
              }, null, 2)
            }]
          };
        }

        const skill = await registry.getSkillMetadata(skillSlug);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              skill: {
                slug: skillSlug,
                name: skill?.metadata.name,
                description: skill?.metadata.description,
                phases: skill?.metadata.phases,
                isBuiltIn: skill?.isBuiltIn,
              },
              content,
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

    // getSkillsForPhase - Get skills relevant to a PREVC phase
    this.server.registerTool('getSkillsForPhase', {
      description: 'Get all skills relevant to a specific PREVC phase. Useful for knowing which skills to activate during workflow execution.',
      inputSchema: {
        phase: z.enum(['P', 'R', 'E', 'V', 'C']).describe('PREVC phase'),
      }
    }, async ({ phase }) => {
      try {
        const registry = createSkillRegistry(repoPath);
        const skills = await registry.getSkillsForPhase(phase);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              phase,
              phaseName: PHASE_NAMES_EN[phase as PrevcPhase],
              skills: skills.map((s: any) => ({
                slug: s.slug,
                name: s.metadata.name,
                description: s.metadata.description,
                isBuiltIn: s.isBuiltIn,
              })),
              count: skills.length,
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

    // scaffoldSkills - Generate skill files
    this.server.registerTool('scaffoldSkills', {
      description: 'Scaffold skill files in .context/skills/. Creates SKILL.md files for built-in or custom skills.',
      inputSchema: {
        skills: z.array(z.string()).optional().describe('Specific skills to scaffold (default: all built-in)'),
        force: z.boolean().optional().describe('Overwrite existing skill files'),
      }
    }, async ({ skills, force }) => {
      try {
        const { createSkillGenerator } = require('../../generators/skills');
        const generator = createSkillGenerator({ repoPath });
        const result = await generator.generate({ skills, force });

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              skillsDir: result.skillsDir,
              generated: result.generatedSkills,
              skipped: result.skippedSkills,
              indexPath: result.indexPath,
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

    // exportSkills - Export skills to AI tool directories
    this.server.registerTool('exportSkills', {
      description: 'Export skills to AI tool directories (Claude Code, Gemini CLI, Codex). Copies skills to .claude/skills/, .gemini/skills/, etc.',
      inputSchema: {
        preset: z.enum(['claude', 'gemini', 'codex', 'all']).default('all')
          .describe('Target AI tool or "all" for all supported tools'),
        includeBuiltIn: z.boolean().optional().describe('Include built-in skills even if not scaffolded'),
        force: z.boolean().optional().describe('Overwrite existing files'),
      }
    }, async ({ preset, includeBuiltIn, force }) => {
      try {
        const { SkillExportService } = require('../export/skillExportService');
        const exportService = new SkillExportService({
          ui: {
            displayOutput: () => {},
            displaySuccess: () => {},
            displayError: () => {},
            displayWarning: () => {},
            startSpinner: () => {},
            stopSpinner: () => {},
            updateSpinner: () => {},
          },
          t: (key: string) => key,
          version: VERSION,
        });

        const result = await exportService.run(repoPath, {
          preset,
          includeBuiltIn,
          force,
        });

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: result.filesCreated > 0,
              targets: result.targets,
              skillsExported: result.skillsExported,
              filesCreated: result.filesCreated,
              filesSkipped: result.filesSkipped,
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

    this.log('Registered 5 skill tools');
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
