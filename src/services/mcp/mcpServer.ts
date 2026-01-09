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
