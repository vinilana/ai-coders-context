/**
 * MCP Server - Model Context Protocol server for Claude Code integration
 *
 * Exposes 8 gateway tools that consolidate 58 original tools for reduced context
 * and simpler tool selection for AI agents.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as path from 'path';

import { readFileTool } from '../ai/tools';
import { SemanticContextBuilder, type ContextFormat } from '../semantic/contextBuilder';
import { VERSION } from '../../version';
import { WorkflowService } from '../workflow';
import {
  PREVC_ROLES,
  PHASE_NAMES_EN,
  getScaleName,
  ProjectScale,
  PrevcPhase,
  AGENT_TYPES,
} from '../../workflow';

import {
  handleExplore,
  handleContext,
  handleWorkflow,
  handleProject,
  handleSync,
  handlePlan,
  handleAgent,
  handleSkill,
  type ExploreParams,
  type ContextParams,
  type WorkflowParams,
  type ProjectParams,
  type SyncParams,
  type PlanParams,
  type AgentParams,
  type SkillParams,
  type MCPToolResponse,
} from './gatewayTools';

export interface MCPServerOptions {
  /** Default repository path for tools */
  repoPath?: string;
  /** Server name */
  name?: string;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Optional injected SemanticContextBuilder for testing */
  contextBuilder?: SemanticContextBuilder;
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

    // Support dependency injection for testing, with default fallback
    this.contextBuilder = options.contextBuilder ?? new SemanticContextBuilder();

    this.registerGatewayTools();
    this.registerResources();
  }

  /**
   * Register 8 gateway tools that consolidate all functionality
   */
  private registerGatewayTools(): void {
    const repoPath = this.options.repoPath || process.cwd();

    // Gateway 1: explore - File and code exploration
    this.server.registerTool('explore', {
      description: `File and code exploration. Actions:
- read: Read file contents (params: filePath, encoding?)
- list: List files matching pattern (params: pattern, cwd?, ignore?)
- analyze: Analyze symbols in a file (params: filePath, symbolTypes?)
- search: Search code with regex (params: pattern, fileGlob?, maxResults?, cwd?)
- getStructure: Get directory structure (params: rootPath?, maxDepth?, includePatterns?)`,
      inputSchema: {
        action: z.enum(['read', 'list', 'analyze', 'search', 'getStructure'])
          .describe('Action to perform'),
        filePath: z.string().optional()
          .describe('(read, analyze) File path to read or analyze'),
        pattern: z.string().optional()
          .describe('(list, search) Glob pattern for list, regex pattern for search'),
        cwd: z.string().optional()
          .describe('(list, search) Working directory'),
        encoding: z.enum(['utf-8', 'ascii', 'binary']).optional()
          .describe('(read) File encoding'),
        ignore: z.array(z.string()).optional()
          .describe('(list) Patterns to ignore'),
        symbolTypes: z.array(z.enum(['class', 'interface', 'function', 'type', 'enum'])).optional()
          .describe('(analyze) Types of symbols to extract'),
        fileGlob: z.string().optional()
          .describe('(search) Glob pattern to filter files'),
        maxResults: z.number().optional()
          .describe('(search) Maximum results to return'),
        rootPath: z.string().optional()
          .describe('(getStructure) Root path for structure'),
        maxDepth: z.number().optional()
          .describe('(getStructure) Maximum directory depth'),
        includePatterns: z.array(z.string()).optional()
          .describe('(getStructure) Include patterns'),
      }
    }, async (params): Promise<MCPToolResponse> => {
      return handleExplore(params as ExploreParams, { repoPath });
    });

    // Gateway 2: context - Context scaffolding and semantic context
    this.server.registerTool('context', {
      description: `Context scaffolding and semantic context. Actions:
- check: Check if .context scaffolding exists (params: repoPath?)
- init: Initialize .context scaffolding (params: repoPath?, type?, outputDir?, semantic?, autoFill?, skipContentGeneration?)
- fill: Fill scaffolding with AI content (params: repoPath?, outputDir?, target?, offset?, limit?)
- fillSingle: Fill a single scaffold file (params: repoPath?, filePath)
- listToFill: List files that need filling (params: repoPath?, outputDir?, target?)
- getMap: Get codebase map section (params: repoPath?, section?)
- buildSemantic: Build semantic context (params: repoPath?, contextType?, targetFile?, options?)
- scaffoldPlan: Create a plan template (params: planName, repoPath?, title?, summary?, autoFill?)`,
      inputSchema: {
        action: z.enum(['check', 'init', 'fill', 'fillSingle', 'listToFill', 'getMap', 'buildSemantic', 'scaffoldPlan'])
          .describe('Action to perform'),
        repoPath: z.string().optional()
          .describe('Repository path (defaults to cwd)'),
        outputDir: z.string().optional()
          .describe('Output directory (default: ./.context)'),
        type: z.enum(['docs', 'agents', 'both']).optional()
          .describe('(init) Type of scaffolding to create'),
        semantic: z.boolean().optional()
          .describe('(init, scaffoldPlan) Enable semantic analysis'),
        include: z.array(z.string()).optional()
          .describe('(init) Include patterns'),
        exclude: z.array(z.string()).optional()
          .describe('(init) Exclude patterns'),
        autoFill: z.boolean().optional()
          .describe('(init, scaffoldPlan) Auto-fill with codebase content'),
        skipContentGeneration: z.boolean().optional()
          .describe('(init) Skip pre-generating content'),
        target: z.enum(['docs', 'agents', 'plans', 'all']).optional()
          .describe('(fill, listToFill) Which scaffolding to target'),
        offset: z.number().optional()
          .describe('(fill) Skip first N files'),
        limit: z.number().optional()
          .describe('(fill) Max files to return'),
        filePath: z.string().optional()
          .describe('(fillSingle) Absolute path to scaffold file'),
        section: z.enum([
          'all', 'stack', 'structure', 'architecture', 'symbols',
          'symbols.classes', 'symbols.interfaces', 'symbols.functions',
          'symbols.types', 'symbols.enums', 'publicAPI', 'dependencies', 'stats'
        ]).optional()
          .describe('(getMap) Section to retrieve'),
        contextType: z.enum(['documentation', 'playbook', 'plan', 'compact']).optional()
          .describe('(buildSemantic) Type of context to build'),
        targetFile: z.string().optional()
          .describe('(buildSemantic) Target file for focused context'),
        options: z.object({
          useLSP: z.boolean().optional(),
          maxContextLength: z.number().optional(),
          includeDocumentation: z.boolean().optional(),
          includeSignatures: z.boolean().optional()
        }).optional()
          .describe('(buildSemantic) Builder options'),
        planName: z.string().optional()
          .describe('(scaffoldPlan) Name of the plan'),
        title: z.string().optional()
          .describe('(scaffoldPlan) Plan title'),
        summary: z.string().optional()
          .describe('(scaffoldPlan) Plan summary/goal'),
      }
    }, async (params): Promise<MCPToolResponse> => {
      return handleContext(params as ContextParams, { repoPath, contextBuilder: this.contextBuilder });
    });

    // Gateway 3: workflow - PREVC workflow management
    this.server.registerTool('workflow', {
      description: `PREVC workflow management. Actions:
- init: Initialize workflow (params: name, description?, scale?, autonomous?, require_plan?, require_approval?, archive_previous?)
- status: Get current workflow status
- advance: Advance to next phase (params: outputs?, force?)
- handoff: Handoff between roles (params: from, to, artifacts)
- collaborate: Start collaboration session (params: topic, participants?)
- createDoc: Create workflow document (params: type, docName)
- getGates: Check gate status
- approvePlan: Approve linked plan (params: planSlug?, approver?, notes?)
- setAutonomous: Toggle autonomous mode (params: enabled, reason?)`,
      inputSchema: {
        action: z.enum(['init', 'status', 'advance', 'handoff', 'collaborate', 'createDoc', 'getGates', 'approvePlan', 'setAutonomous'])
          .describe('Action to perform'),
        name: z.string().optional()
          .describe('(init) Workflow/project name'),
        description: z.string().optional()
          .describe('(init) Description for scale detection'),
        scale: z.enum(['QUICK', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE']).optional()
          .describe('(init) Project scale'),
        autonomous: z.boolean().optional()
          .describe('(init) Enable autonomous mode'),
        require_plan: z.boolean().optional()
          .describe('(init) Require plan before P → R'),
        require_approval: z.boolean().optional()
          .describe('(init) Require approval before R → E'),
        archive_previous: z.boolean().optional()
          .describe('(init) Archive existing workflow'),
        outputs: z.array(z.string()).optional()
          .describe('(advance) Artifact paths'),
        force: z.boolean().optional()
          .describe('(advance) Force advancement'),
        from: z.enum(PREVC_ROLES as unknown as [string, ...string[]]).optional()
          .describe('(handoff) Role handing off'),
        to: z.enum(PREVC_ROLES as unknown as [string, ...string[]]).optional()
          .describe('(handoff) Role receiving'),
        artifacts: z.array(z.string()).optional()
          .describe('(handoff) Artifacts to hand off'),
        topic: z.string().optional()
          .describe('(collaborate) Collaboration topic'),
        participants: z.array(z.enum(PREVC_ROLES as unknown as [string, ...string[]])).optional()
          .describe('(collaborate) Participating roles'),
        type: z.enum(['prd', 'tech-spec', 'architecture', 'adr', 'test-plan', 'changelog']).optional()
          .describe('(createDoc) Document type'),
        docName: z.string().optional()
          .describe('(createDoc) Document name'),
        planSlug: z.string().optional()
          .describe('(approvePlan) Plan to approve'),
        approver: z.enum(PREVC_ROLES as unknown as [string, ...string[]]).optional()
          .describe('(approvePlan) Approving role'),
        notes: z.string().optional()
          .describe('(approvePlan) Approval notes'),
        enabled: z.boolean().optional()
          .describe('(setAutonomous) Enable/disable'),
        reason: z.string().optional()
          .describe('(setAutonomous) Reason for change'),
      }
    }, async (params): Promise<MCPToolResponse> => {
      return handleWorkflow(params as WorkflowParams, { repoPath });
    });

    // Gateway 4: project - Project initialization and reporting
    this.server.registerTool('project', {
      description: `Project initialization and reporting. Actions:
- start: Start new project with scaffolding + workflow (params: featureName, template?, skipFill?, skipWorkflow?)
- report: Generate progress report (params: format?, includeStack?)
- detectStack: Detect technology stack
- detectAITools: Detect AI tool configurations (params: repoPath?)`,
      inputSchema: {
        action: z.enum(['start', 'report', 'detectStack', 'detectAITools'])
          .describe('Action to perform'),
        featureName: z.string().optional()
          .describe('(start) Feature/project name'),
        template: z.enum(['hotfix', 'feature', 'mvp', 'auto']).optional()
          .describe('(start) Workflow template'),
        skipFill: z.boolean().optional()
          .describe('(start) Skip AI context filling'),
        skipWorkflow: z.boolean().optional()
          .describe('(start) Skip workflow init'),
        format: z.enum(['json', 'markdown', 'dashboard']).optional()
          .describe('(report) Output format'),
        includeStack: z.boolean().optional()
          .describe('(report) Include stack info'),
        repoPath: z.string().optional()
          .describe('(detectAITools) Repository path'),
      }
    }, async (params): Promise<MCPToolResponse> => {
      return handleProject(params as ProjectParams, { repoPath });
    });

    // Gateway 5: sync - Import/export synchronization
    this.server.registerTool('sync', {
      description: `Import/export synchronization with AI tools. Actions:
- exportRules: Export rules to AI tools (params: preset?, force?, dryRun?)
- exportDocs: Export docs to AI tools (params: preset?, indexMode?, force?, dryRun?)
- exportAgents: Export agents to AI tools (params: preset?, mode?, force?, dryRun?)
- exportContext: Export all context (params: preset?, skipDocs?, skipAgents?, skipSkills?, docsIndexMode?, agentMode?, force?, dryRun?)
- exportSkills: Export skills to AI tools (params: preset?, includeBuiltIn?, force?)
- reverseSync: Import from AI tools to .context/ (params: skipRules?, skipAgents?, skipSkills?, mergeStrategy?, dryRun?, force?, addMetadata?)
- importDocs: Import docs from AI tools (params: autoDetect?, force?, dryRun?)
- importAgents: Import agents from AI tools (params: autoDetect?, force?, dryRun?)
- importSkills: Import skills from AI tools (params: autoDetect?, mergeStrategy?, force?, dryRun?)`,
      inputSchema: {
        action: z.enum(['exportRules', 'exportDocs', 'exportAgents', 'exportContext', 'exportSkills', 'reverseSync', 'importDocs', 'importAgents', 'importSkills'])
          .describe('Action to perform'),
        preset: z.string().optional()
          .describe('Target AI tool preset'),
        force: z.boolean().optional()
          .describe('Overwrite existing files'),
        dryRun: z.boolean().optional()
          .describe('Preview without writing'),
        indexMode: z.enum(['readme', 'all']).optional()
          .describe('(exportDocs) Index mode'),
        mode: z.enum(['symlink', 'markdown']).optional()
          .describe('(exportAgents) Sync mode'),
        skipDocs: z.boolean().optional()
          .describe('(exportContext) Skip docs'),
        skipAgents: z.boolean().optional()
          .describe('(exportContext, reverseSync) Skip agents'),
        skipSkills: z.boolean().optional()
          .describe('(exportContext, reverseSync) Skip skills'),
        skipRules: z.boolean().optional()
          .describe('(reverseSync) Skip rules'),
        docsIndexMode: z.enum(['readme', 'all']).optional()
          .describe('(exportContext) Docs index mode'),
        agentMode: z.enum(['symlink', 'markdown']).optional()
          .describe('(exportContext) Agent sync mode'),
        includeBuiltInSkills: z.boolean().optional()
          .describe('(exportContext) Include built-in skills'),
        includeBuiltIn: z.boolean().optional()
          .describe('(exportSkills) Include built-in skills'),
        mergeStrategy: z.enum(['skip', 'overwrite', 'merge', 'rename']).optional()
          .describe('(reverseSync, importSkills) Conflict handling'),
        autoDetect: z.boolean().optional()
          .describe('(import*) Auto-detect files'),
        addMetadata: z.boolean().optional()
          .describe('(reverseSync) Add frontmatter metadata'),
        repoPath: z.string().optional()
          .describe('Repository path'),
      }
    }, async (params): Promise<MCPToolResponse> => {
      return handleSync(params as SyncParams, { repoPath });
    });

    // Gateway 6: plan - Plan management and execution tracking
    this.server.registerTool('plan', {
      description: `Plan management and execution tracking. Actions:
- link: Link plan to workflow (params: planSlug)
- getLinked: Get all linked plans
- getDetails: Get detailed plan info (params: planSlug)
- getForPhase: Get plans for PREVC phase (params: phase)
- updatePhase: Update plan phase status (params: planSlug, phaseId, status)
- recordDecision: Record a decision (params: planSlug, title, description, phase?, alternatives?)
- updateStep: Update step status (params: planSlug, phaseId, stepIndex, status, output?, notes?)
- getStatus: Get plan execution status (params: planSlug)
- syncMarkdown: Sync tracking to markdown (params: planSlug)
- commitPhase: Create git commit for completed phase (params: planSlug, phaseId, coAuthor?, stagePatterns?, dryRun?)`,
      inputSchema: {
        action: z.enum(['link', 'getLinked', 'getDetails', 'getForPhase', 'updatePhase', 'recordDecision', 'updateStep', 'getStatus', 'syncMarkdown', 'commitPhase'])
          .describe('Action to perform'),
        planSlug: z.string().optional()
          .describe('Plan slug/identifier'),
        phaseId: z.string().optional()
          .describe('(updatePhase, updateStep, commitPhase) Phase ID'),
        status: z.enum(['pending', 'in_progress', 'completed', 'skipped']).optional()
          .describe('(updatePhase, updateStep) New status'),
        phase: z.enum(['P', 'R', 'E', 'V', 'C']).optional()
          .describe('(getForPhase, recordDecision) PREVC phase'),
        title: z.string().optional()
          .describe('(recordDecision) Decision title'),
        description: z.string().optional()
          .describe('(recordDecision) Decision description'),
        alternatives: z.array(z.string()).optional()
          .describe('(recordDecision) Considered alternatives'),
        stepIndex: z.number().optional()
          .describe('(updateStep) Step number (1-based)'),
        output: z.string().optional()
          .describe('(updateStep) Step output artifact'),
        notes: z.string().optional()
          .describe('(updateStep) Execution notes'),
        coAuthor: z.string().optional()
          .describe('(commitPhase) Agent name for Co-Authored-By footer'),
        stagePatterns: z.array(z.string()).optional()
          .describe('(commitPhase) Patterns for files to stage (default: [".context/**"])'),
        dryRun: z.boolean().optional()
          .describe('(commitPhase) Preview without committing'),
      }
    }, async (params): Promise<MCPToolResponse> => {
      return handlePlan(params as PlanParams, { repoPath });
    });

    // Gateway 7: agent - Agent orchestration and discovery
    this.server.registerTool('agent', {
      description: `Agent orchestration and discovery. Actions:
- discover: Discover all agents (built-in + custom)
- getInfo: Get agent details (params: agentType)
- orchestrate: Select agents for task/phase/role (params: task?, phase?, role?)
- getSequence: Get agent handoff sequence (params: task, includeReview?, phases?)
- getDocs: Get agent documentation (params: agent)
- getPhaseDocs: Get phase documentation (params: phase)
- listTypes: List all agent types`,
      inputSchema: {
        action: z.enum(['discover', 'getInfo', 'orchestrate', 'getSequence', 'getDocs', 'getPhaseDocs', 'listTypes'])
          .describe('Action to perform'),
        agentType: z.string().optional()
          .describe('(getInfo) Agent type identifier'),
        task: z.string().optional()
          .describe('(orchestrate, getSequence) Task description'),
        phase: z.enum(['P', 'R', 'E', 'V', 'C']).optional()
          .describe('(orchestrate, getPhaseDocs) PREVC phase'),
        role: z.enum(PREVC_ROLES as unknown as [string, ...string[]]).optional()
          .describe('(orchestrate) PREVC role'),
        includeReview: z.boolean().optional()
          .describe('(getSequence) Include code review'),
        phases: z.array(z.enum(['P', 'R', 'E', 'V', 'C'])).optional()
          .describe('(getSequence) Phases to include'),
        agent: z.enum(AGENT_TYPES as unknown as [string, ...string[]]).optional()
          .describe('(getDocs) Agent type for docs'),
      }
    }, async (params): Promise<MCPToolResponse> => {
      return handleAgent(params as AgentParams, { repoPath });
    });

    // Gateway 8: skill - Skill management
    this.server.registerTool('skill', {
      description: `Skill management for on-demand expertise. Actions:
- list: List all skills (params: includeContent?)
- getContent: Get skill content (params: skillSlug)
- getForPhase: Get skills for PREVC phase (params: phase)
- scaffold: Generate skill files (params: skills?, force?)
- export: Export skills to AI tools (params: preset?, includeBuiltIn?, force?)
- fill: Fill skills with codebase content (params: skills?, force?)`,
      inputSchema: {
        action: z.enum(['list', 'getContent', 'getForPhase', 'scaffold', 'export', 'fill'])
          .describe('Action to perform'),
        skillSlug: z.string().optional()
          .describe('(getContent) Skill identifier'),
        phase: z.enum(['P', 'R', 'E', 'V', 'C']).optional()
          .describe('(getForPhase) PREVC phase'),
        skills: z.array(z.string()).optional()
          .describe('(scaffold, fill) Specific skills to process'),
        includeContent: z.boolean().optional()
          .describe('(list) Include full content'),
        includeBuiltIn: z.boolean().optional()
          .describe('(export, fill) Include built-in skills'),
        preset: z.enum(['claude', 'gemini', 'codex', 'antigravity', 'all']).optional()
          .describe('(export) Target AI tool'),
        force: z.boolean().optional()
          .describe('(scaffold, export) Overwrite existing'),
      }
    }, async (params): Promise<MCPToolResponse> => {
      return handleSkill(params as SkillParams, { repoPath });
    });

    this.log('Registered 8 gateway tools');
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
