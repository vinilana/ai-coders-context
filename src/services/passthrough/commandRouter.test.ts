import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import { CommandRouter } from './commandRouter';
import { ErrorCodes, type CapabilitiesData, type ToolDescription } from './protocol';

// Mock the semantic context builder
jest.mock('../semantic/contextBuilder', () => ({
  SemanticContextBuilder: jest.fn().mockImplementation(() => ({
    buildDocumentationContext: jest.fn().mockResolvedValue('# Documentation Context'),
    buildPlaybookContext: jest.fn().mockResolvedValue('# Playbook Context'),
    buildPlanContext: jest.fn().mockResolvedValue('# Plan Context'),
    buildCompactContext: jest.fn().mockResolvedValue('# Compact Context'),
    shutdown: jest.fn().mockResolvedValue(undefined)
  }))
}));

// Mock the agents
jest.mock('../ai/agents/documentationAgent', () => ({
  DocumentationAgent: jest.fn().mockImplementation(() => ({
    generateDocumentation: jest.fn().mockResolvedValue({
      text: '# Generated Documentation',
      toolsUsed: ['semanticAnalysis'],
      steps: 1
    })
  }))
}));

jest.mock('../ai/agents/playbookAgent', () => ({
  PlaybookAgent: jest.fn().mockImplementation(() => ({
    generatePlaybook: jest.fn().mockResolvedValue({
      text: '# Generated Playbook',
      toolsUsed: ['semanticAnalysis'],
      steps: 1
    })
  }))
}));

jest.mock('../ai/agents/planAgent', () => ({
  PlanAgent: jest.fn().mockImplementation(() => ({
    generatePlan: jest.fn().mockResolvedValue({
      text: '# Generated Plan',
      toolsUsed: ['semanticAnalysis'],
      steps: 1
    })
  }))
}));

describe('CommandRouter', () => {
  let router: CommandRouter;
  let tempDir: string;
  let notifications: any[];

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'router-test-'));
    notifications = [];

    router = new CommandRouter({
      defaultRepoPath: tempDir,
      onNotification: (notification) => notifications.push(notification)
    });

    // Create a test file
    await fs.writeFile(path.join(tempDir, 'test.ts'), 'export const x = 1;');
  });

  afterEach(async () => {
    await router.shutdown();
    await fs.remove(tempDir);
  });

  describe('capabilities method', () => {
    it('should return capabilities', async () => {
      const response = await router.route({
        id: 'req-1',
        method: 'capabilities'
      });

      expect(response.success).toBe(true);
      if (response.success) {
        const result = response.result as CapabilitiesData;
        expect(result).toHaveProperty('version');
        expect(result).toHaveProperty('methods');
        expect(result).toHaveProperty('tools');
        expect(result).toHaveProperty('agents');
        expect(result).toHaveProperty('contextTypes');

        expect(result.methods).toContain('tool.call');
        expect(result.methods).toContain('context.build');
        expect(result.methods).toContain('agent.run');

        expect(result.tools.length).toBeGreaterThan(0);
        expect(result.agents).toContain('documentation');
        expect(result.agents).toContain('playbook');
        expect(result.agents).toContain('plan');
      }
    });
  });

  describe('tool.list method', () => {
    it('should return list of available tools', async () => {
      const response = await router.route({
        id: 'req-1',
        method: 'tool.list'
      });

      expect(response.success).toBe(true);
      if (response.success) {
        const result = response.result as ToolDescription[];
        expect(Array.isArray(result)).toBe(true);
        const toolNames = result.map((t) => t.name);
        expect(toolNames).toContain('readFile');
        expect(toolNames).toContain('listFiles');
        expect(toolNames).toContain('analyzeSymbols');
        expect(toolNames).toContain('getFileStructure');
        expect(toolNames).toContain('searchCode');
      }
    });

    it('should include input schemas for each tool', async () => {
      const response = await router.route({
        id: 'req-1',
        method: 'tool.list'
      });

      expect(response.success).toBe(true);
      if (response.success) {
        const result = response.result as ToolDescription[];
        for (const tool of result) {
          expect(tool).toHaveProperty('name');
          expect(tool).toHaveProperty('description');
          expect(tool).toHaveProperty('inputSchema');
        }
      }
    });
  });

  describe('tool.call method', () => {
    it('should call readFile tool successfully', async () => {
      const testFile = path.join(tempDir, 'test.ts');

      const response = await router.route({
        id: 'req-1',
        method: 'tool.call',
        params: {
          tool: 'readFile',
          args: { filePath: testFile }
        }
      });

      expect(response.success).toBe(true);
      if (response.success) {
        const result = response.result as { success: boolean; content: string };
        expect(result.success).toBe(true);
        expect(result.content).toContain('export const x = 1;');
      }

      // Should emit notifications
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications.some(n => n.type === 'tool_call')).toBe(true);
      expect(notifications.some(n => n.type === 'tool_result')).toBe(true);
    });

    it('should call listFiles tool successfully', async () => {
      const response = await router.route({
        id: 'req-1',
        method: 'tool.call',
        params: {
          tool: 'listFiles',
          args: { pattern: '*.ts', cwd: tempDir }
        }
      });

      expect(response.success).toBe(true);
      if (response.success) {
        const result = response.result as { success: boolean; count: number };
        expect(result.success).toBe(true);
        expect(result.count).toBeGreaterThan(0);
      }
    });

    it('should return error for unknown tool', async () => {
      const response = await router.route({
        id: 'req-1',
        method: 'tool.call',
        params: {
          tool: 'unknownTool',
          args: {}
        }
      });

      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe(ErrorCodes.TOOL_NOT_FOUND);
        expect(response.error.message).toContain('unknownTool');
      }
    });
  });

  describe('context.build method', () => {
    it('should build compact context by default', async () => {
      const response = await router.route({
        id: 'req-1',
        method: 'context.build',
        params: {
          repoPath: tempDir
        }
      });

      expect(response.success).toBe(true);
      if (response.success) {
        expect(typeof response.result).toBe('string');
      }

      // Should emit progress notifications
      expect(notifications.some(n => n.type === 'progress')).toBe(true);
    });

    it('should build documentation context', async () => {
      const response = await router.route({
        id: 'req-1',
        method: 'context.build',
        params: {
          repoPath: tempDir,
          contextType: 'documentation'
        }
      });

      expect(response.success).toBe(true);
    });

    it('should build playbook context', async () => {
      const response = await router.route({
        id: 'req-1',
        method: 'context.build',
        params: {
          repoPath: tempDir,
          contextType: 'playbook',
          targetFile: 'code-reviewer'
        }
      });

      expect(response.success).toBe(true);
    });

    it('should build plan context', async () => {
      const response = await router.route({
        id: 'req-1',
        method: 'context.build',
        params: {
          repoPath: tempDir,
          contextType: 'plan'
        }
      });

      expect(response.success).toBe(true);
    });
  });

  describe('invalid requests', () => {
    it('should return error for unknown method', async () => {
      const response = await router.route({
        id: 'req-1',
        method: 'unknown.method'
      });

      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe(ErrorCodes.INVALID_REQUEST);
      }
    });

    it('should return error for malformed tool.call', async () => {
      const response = await router.route({
        id: 'req-1',
        method: 'tool.call',
        params: {
          // Missing 'tool' and 'args'
        }
      });

      expect(response.success).toBe(false);
    });
  });
});
