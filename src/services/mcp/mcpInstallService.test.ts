import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import { MCPInstallService } from './mcpInstallService';
import type { CLIInterface } from '../../utils/cliUI';

// Mock CLIInterface
const createMockUI = (): CLIInterface => ({
  displayWelcome: jest.fn(),
  displayError: jest.fn(),
  displaySuccess: jest.fn(),
  displayInfo: jest.fn(),
  displayWarning: jest.fn(),
  displayList: jest.fn(),
  displayTable: jest.fn(),
  displayJson: jest.fn(),
  displayProjectConfiguration: jest.fn(),
  displayFileTypeDistribution: jest.fn(),
  displayGenerationSummary: jest.fn(),
  startSpinner: jest.fn(),
  updateSpinner: jest.fn(),
  stopSpinner: jest.fn(),
  displayAnalysisComplete: jest.fn(),
  displayBox: jest.fn(),
  displaySection: jest.fn(),
  displayStep: jest.fn(),
  displayDiff: jest.fn(),
  displaySkillHeader: jest.fn(),
  displaySkillDefinition: jest.fn(),
  displaySkillExamples: jest.fn(),
  displaySkillContent: jest.fn(),
} as unknown as CLIInterface);

// Mock translate function
const mockT = (key: string, params?: Record<string, unknown>) => {
  if (params) {
    let result = key;
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(`{${k}}`, String(v));
    }
    return result;
  }
  return key;
};

describe('MCPInstallService', () => {
  let tempDir: string;
  let service: MCPInstallService;
  let mockUI: CLIInterface;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-install-test-'));
    mockUI = createMockUI();
    service = new MCPInstallService({
      ui: mockUI,
      t: mockT,
      version: '1.0.0',
    });
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('getSupportedTools', () => {
    it('should return list of supported tools', () => {
      const tools = service.getSupportedTools();
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.some(t => t.id === 'claude')).toBe(true);
      expect(tools.some(t => t.id === 'cursor')).toBe(true);
    });
  });

  describe('getSupportedToolIds', () => {
    it('should return list of supported tool IDs', () => {
      const ids = service.getSupportedToolIds();
      expect(ids).toContain('claude');
      expect(ids).toContain('cursor');
      expect(ids).toContain('windsurf');
      expect(ids).toContain('cline');
      expect(ids).toContain('continue');
    });
  });

  describe('detectInstalledTools', () => {
    it('should return an array of tool IDs', async () => {
      // This test doesn't mock homedir, just verifies the return type
      const detected = await service.detectInstalledTools();
      expect(Array.isArray(detected)).toBe(true);
      // All returned IDs should be valid tool IDs
      const validIds = service.getSupportedToolIds();
      for (const id of detected) {
        expect(validIds).toContain(id);
      }
    });
  });

  describe('run', () => {
    it('should install MCP configuration for Claude', async () => {
      const result = await service.run({
        tool: 'claude',
        global: false,
        repoPath: tempDir,
        dryRun: false,
      });

      expect(result.filesCreated).toBe(1);
      expect(result.installations.length).toBe(1);
      expect(result.installations[0].tool).toBe('claude');
      expect(result.installations[0].action).toBe('created');

      // Verify file was created
      const configPath = path.join(tempDir, '.claude', 'mcp_servers.json');
      expect(await fs.pathExists(configPath)).toBe(true);

      // Verify config content
      const config = await fs.readJson(configPath);
      expect(config.mcpServers).toBeDefined();
      expect(config.mcpServers['ai-context']).toBeDefined();
      expect(config.mcpServers['ai-context'].command).toBe('npx');
    });

    it('should support dry-run mode', async () => {
      const result = await service.run({
        tool: 'claude',
        global: false,
        repoPath: tempDir,
        dryRun: true,
      });

      expect(result.filesCreated).toBe(1);
      expect(result.installations[0].dryRun).toBe(true);

      // Verify file was NOT created
      const configPath = path.join(tempDir, '.claude', 'mcp_servers.json');
      expect(await fs.pathExists(configPath)).toBe(false);
    });

    it('should skip if already configured', async () => {
      // First install
      await service.run({
        tool: 'claude',
        global: false,
        repoPath: tempDir,
        dryRun: false,
      });

      // Second install should skip
      const result = await service.run({
        tool: 'claude',
        global: false,
        repoPath: tempDir,
        dryRun: false,
      });

      expect(result.filesSkipped).toBe(1);
      expect(result.installations[0].action).toBe('skipped');
    });

    it('should merge with existing config', async () => {
      // Create existing config with other servers
      const configPath = path.join(tempDir, '.claude', 'mcp_servers.json');
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeJson(configPath, {
        mcpServers: {
          'other-server': { command: 'other', args: [] },
        },
      });

      const result = await service.run({
        tool: 'claude',
        global: false,
        repoPath: tempDir,
        dryRun: false,
      });

      expect(result.filesCreated).toBe(1);
      expect(result.installations[0].action).toBe('updated');

      // Verify both servers exist
      const config = await fs.readJson(configPath);
      expect(config.mcpServers['other-server']).toBeDefined();
      expect(config.mcpServers['ai-context']).toBeDefined();
    });

    it('should install for multiple tools when specifying tool as "all"', async () => {
      // When "all" is specified, it installs for detected tools (or all if none detected)
      const result = await service.run({
        tool: 'all',
        global: false,
        repoPath: tempDir,
        dryRun: false,
      });

      // Should have at least some installations
      expect(result.installations.length).toBeGreaterThan(0);
      // All installations should be for valid tools
      const validIds = service.getSupportedToolIds();
      for (const install of result.installations) {
        expect(validIds).toContain(install.tool);
      }
    });

    it('should show warning when unsupported tool is specified', async () => {
      const result = await service.run({
        tool: 'nonexistent-tool',
        global: false,
        repoPath: tempDir,
      });

      expect(mockUI.displayError).toHaveBeenCalled();
      expect(result.filesCreated).toBe(0);
    });
  });

  describe('tool-specific configurations', () => {
    it('should generate correct config for Cursor', async () => {
      const result = await service.run({
        tool: 'cursor',
        global: false,
        repoPath: tempDir,
      });

      expect(result.filesCreated).toBe(1);

      const configPath = path.join(tempDir, '.cursor', 'mcp.json');
      expect(await fs.pathExists(configPath)).toBe(true);

      const config = await fs.readJson(configPath);
      expect(config.mcpServers['ai-context']).toBeDefined();
    });

    it('should generate correct config for Continue.dev', async () => {
      const result = await service.run({
        tool: 'continue',
        global: false,
        repoPath: tempDir,
      });

      expect(result.filesCreated).toBe(1);

      const configPath = path.join(tempDir, '.continue', 'config.json');
      expect(await fs.pathExists(configPath)).toBe(true);

      const config = await fs.readJson(configPath);
      expect(config.experimental).toBeDefined();
      expect(config.experimental.modelContextProtocolServers).toBeDefined();
      expect(config.experimental.modelContextProtocolServers.some(
        (s: { name: string }) => s.name === 'ai-context'
      )).toBe(true);
    });
  });

  describe('Phase 1: Standard JSON tools', () => {
    it('should install MCP configuration for Claude Desktop', async () => {
      const result = await service.run({
        tool: 'claude-desktop',
        global: false,
        repoPath: tempDir,
      });

      expect(result.filesCreated).toBe(1);
      const configPath = path.join(tempDir, '.claude-desktop', 'mcp_servers.json');
      expect(await fs.pathExists(configPath)).toBe(true);

      const config = await fs.readJson(configPath);
      expect(config.mcpServers['ai-context']).toBeDefined();
      expect(config.mcpServers['ai-context'].command).toBe('npx');
    });

    it('should install MCP configuration for VS Code', async () => {
      const result = await service.run({
        tool: 'vscode',
        global: false,
        repoPath: tempDir,
      });

      expect(result.filesCreated).toBe(1);
      const configPath = path.join(tempDir, '.vscode', 'mcp.json');
      expect(await fs.pathExists(configPath)).toBe(true);

      const config = await fs.readJson(configPath);
      expect(config.mcpServers['ai-context']).toBeDefined();
    });

    it('should install MCP configuration for Roo Code', async () => {
      const result = await service.run({
        tool: 'roo',
        global: false,
        repoPath: tempDir,
      });

      expect(result.filesCreated).toBe(1);
      const configPath = path.join(tempDir, '.roo', 'mcp.json');
      expect(await fs.pathExists(configPath)).toBe(true);

      const config = await fs.readJson(configPath);
      expect(config.mcpServers['ai-context']).toBeDefined();
    });

    it('should install MCP configuration for Warp Terminal', async () => {
      const result = await service.run({
        tool: 'warp',
        global: false,
        repoPath: tempDir,
      });

      expect(result.filesCreated).toBe(1);
      const configPath = path.join(tempDir, '.warp', 'mcp_servers.json');
      expect(await fs.pathExists(configPath)).toBe(true);

      const config = await fs.readJson(configPath);
      expect(config.mcpServers['ai-context']).toBeDefined();
    });

    it('should install MCP configuration for Amazon Q Developer CLI', async () => {
      const result = await service.run({
        tool: 'amazonq',
        global: false,
        repoPath: tempDir,
      });

      expect(result.filesCreated).toBe(1);
      const configPath = path.join(tempDir, '.amazonq', 'mcp.json');
      expect(await fs.pathExists(configPath)).toBe(true);

      const config = await fs.readJson(configPath);
      expect(config.mcpServers['ai-context']).toBeDefined();
    });

    it('should install MCP configuration for Gemini CLI', async () => {
      const result = await service.run({
        tool: 'gemini-cli',
        global: false,
        repoPath: tempDir,
      });

      expect(result.filesCreated).toBe(1);
      const configPath = path.join(tempDir, '.gemini', 'settings.json');
      expect(await fs.pathExists(configPath)).toBe(true);

      const config = await fs.readJson(configPath);
      expect(config.mcpServers['ai-context']).toBeDefined();
    });

    it('should install MCP configuration for Kiro', async () => {
      const result = await service.run({
        tool: 'kiro',
        global: false,
        repoPath: tempDir,
      });

      expect(result.filesCreated).toBe(1);
      const configPath = path.join(tempDir, '.kiro', 'mcp.json');
      expect(await fs.pathExists(configPath)).toBe(true);

      const config = await fs.readJson(configPath);
      expect(config.mcpServers['ai-context']).toBeDefined();
    });
  });

  describe('Phase 2: Special JSON formats', () => {
    it('should install MCP configuration for Zed with context_servers', async () => {
      const result = await service.run({
        tool: 'zed',
        global: false,
        repoPath: tempDir,
      });

      expect(result.filesCreated).toBe(1);
      const configPath = path.join(tempDir, '.zed', 'settings.json');
      expect(await fs.pathExists(configPath)).toBe(true);

      const config = await fs.readJson(configPath);
      expect(config.context_servers).toBeDefined();
      expect(config.context_servers['ai-context']).toBeDefined();
      expect(config.context_servers['ai-context'].command).toBeDefined();
      expect(config.context_servers['ai-context'].command.path).toBe('npx');
    });

    it('should install MCP configuration for JetBrains', async () => {
      const result = await service.run({
        tool: 'jetbrains',
        global: false,
        repoPath: tempDir,
      });

      expect(result.filesCreated).toBe(1);
      const configPath = path.join(tempDir, '.idea', 'mcp.json');
      expect(await fs.pathExists(configPath)).toBe(true);

      const config = await fs.readJson(configPath);
      expect(config.mcpServers['ai-context']).toBeDefined();
    });
  });

  describe('Merge behavior for new tools', () => {
    it('should preserve existing MCP servers when installing VS Code', async () => {
      // Create existing config with another server
      const configPath = path.join(tempDir, '.vscode', 'mcp.json');
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeJson(configPath, {
        mcpServers: {
          'other-server': { command: 'other', args: [] }
        }
      });

      await service.run({
        tool: 'vscode',
        global: false,
        repoPath: tempDir,
      });

      const config = await fs.readJson(configPath);
      expect(config.mcpServers['other-server']).toBeDefined();
      expect(config.mcpServers['ai-context']).toBeDefined();
    });

    it('should preserve existing context_servers when installing Zed', async () => {
      // Create existing config with another server
      const configPath = path.join(tempDir, '.zed', 'settings.json');
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeJson(configPath, {
        context_servers: {
          'other-server': { command: { path: 'other', args: [] } }
        }
      });

      await service.run({
        tool: 'zed',
        global: false,
        repoPath: tempDir,
      });

      const config = await fs.readJson(configPath);
      expect(config.context_servers['other-server']).toBeDefined();
      expect(config.context_servers['ai-context']).toBeDefined();
    });
  });
});
