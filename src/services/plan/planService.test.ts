import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';

import { PlanService, PlanFillFlags } from './planService';
import type { CLIInterface } from '../../utils/cliUI';
import type { TranslateFn } from '../../utils/i18n';
import { PlanGenerator } from '../../generators/plans/planGenerator';

// Mock the PlanAgent
jest.mock('../ai/agents/planAgent', () => ({
  PlanAgent: jest.fn().mockImplementation(() => ({
    updatePlan: jest.fn().mockResolvedValue({
      text: '# Updated Plan\n\nContent here.',
      toolsUsed: ['semanticAnalysis'],
      steps: 1
    })
  }))
}));

// Mock resolveLlmConfig
jest.mock('../shared/llmConfig', () => ({
  resolveLlmConfig: jest.fn().mockResolvedValue({
    apiKey: 'test-api-key',
    model: 'test-model',
    provider: 'openrouter',
    baseUrl: undefined
  })
}));

// Mock resolvePlanPrompt
jest.mock('../../utils/promptLoader', () => ({
  resolvePlanPrompt: jest.fn().mockResolvedValue({
    content: 'Test prompt content',
    path: undefined,
    source: 'builtin'
  })
}));

function createTempOutput(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

function createMockUI(): CLIInterface {
  return {
    displayWelcome: jest.fn(),
    displayProjectInfo: jest.fn(),
    displayStep: jest.fn(),
    displaySuccess: jest.fn(),
    displayWarning: jest.fn(),
    displayError: jest.fn(),
    displayInfo: jest.fn(),
    displayAnalysisComplete: jest.fn(),
    displayFileTypeDistribution: jest.fn(),
    displayGenerationSummary: jest.fn(),
    startSpinner: jest.fn(),
    updateSpinner: jest.fn(),
    stopSpinner: jest.fn(),
    createAgentCallbacks: jest.fn(() => ({}))
  } as unknown as CLIInterface;
}

function createMockTranslate(): TranslateFn {
  return ((key: string, params?: Record<string, unknown>) => {
    if (params) {
      let result = key;
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(`{${k}}`, String(v));
      }
      return result;
    }
    return key;
  }) as TranslateFn;
}

describe('PlanService', () => {
  let tempDir: string;
  let outputDir: string;
  let mockUI: CLIInterface;
  let mockT: TranslateFn;
  let service: PlanService;

  beforeEach(async () => {
    tempDir = await createTempOutput('ai-context-planservice-');
    outputDir = path.join(tempDir, '.context');
    mockUI = createMockUI();
    mockT = createMockTranslate();

    service = new PlanService({
      ui: mockUI,
      t: mockT,
      version: '0.4.0',
      defaultModel: 'test-model',
      planGenerator: new PlanGenerator()
    });

    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.remove(tempDir);
    }
  });

  describe('scaffoldPlanIfNeeded', () => {
    it('should create plan if it does not exist', async () => {
      await service.scaffoldPlanIfNeeded('test-plan', outputDir, {});

      const planPath = path.join(outputDir, 'plans', 'test-plan.md');
      expect(await fs.pathExists(planPath)).toBe(true);
      expect(mockUI.displayInfo).toHaveBeenCalled();
    });

    it('should skip if plan exists and force=false', async () => {
      // First create the plan
      await service.scaffoldPlanIfNeeded('test-plan', outputDir, {});
      jest.clearAllMocks();

      // Try again without force - should skip
      await service.scaffoldPlanIfNeeded('test-plan', outputDir, { force: false });

      // displayInfo should not be called again since we skipped
      expect(mockUI.displayInfo).not.toHaveBeenCalled();
    });

    it('should overwrite plan if force=true', async () => {
      // First create the plan
      await service.scaffoldPlanIfNeeded('test-plan', outputDir, { summary: 'Original' });
      jest.clearAllMocks();

      // Try again with force - should overwrite
      await service.scaffoldPlanIfNeeded('test-plan', outputDir, { force: true, summary: 'Updated' });

      const planPath = path.join(outputDir, 'plans', 'test-plan.md');
      const content = await fs.readFile(planPath, 'utf-8');
      expect(content).toContain('Updated');
      expect(mockUI.displayInfo).toHaveBeenCalled();
    });

    it('should throw error for invalid plan name', async () => {
      await expect(
        service.scaffoldPlanIfNeeded('', outputDir, {})
      ).rejects.toThrow('errors.plan.invalidName');
    });
  });

  describe('fillPlan', () => {
    beforeEach(async () => {
      // Set up the scaffold directories
      await fs.ensureDir(path.join(outputDir, 'docs'));
      await fs.ensureDir(path.join(outputDir, 'agents'));
      await fs.ensureDir(path.join(outputDir, 'plans'));

      // Create a plan file
      await fs.writeFile(
        path.join(outputDir, 'plans', 'test-plan.md'),
        '# Test Plan\n\n## TODO\n'
      );

      // Create index files
      await fs.writeFile(
        path.join(outputDir, 'docs', 'README.md'),
        '# Documentation Index\n'
      );
      await fs.writeFile(
        path.join(outputDir, 'agents', 'README.md'),
        '# Agents Index\n'
      );
    });

    it('should throw error when plans directory does not exist', async () => {
      await fs.remove(path.join(outputDir, 'plans'));

      await expect(
        service.fillPlan('test-plan', { output: outputDir, repo: tempDir })
      ).rejects.toThrow('errors.plan.missingPlansDir');
    });

    it('should throw error when neither docs nor agents directory exists', async () => {
      await fs.remove(path.join(outputDir, 'docs'));
      await fs.remove(path.join(outputDir, 'agents'));

      await expect(
        service.fillPlan('test-plan', { output: outputDir, repo: tempDir })
      ).rejects.toThrow('errors.fill.missingScaffold');
    });

    it('should work when only docs directory exists', async () => {
      await fs.remove(path.join(outputDir, 'agents'));

      await service.fillPlan('test-plan', { output: outputDir, repo: tempDir });

      expect(mockUI.displaySuccess).toHaveBeenCalled();
    });

    it('should work when only agents directory exists', async () => {
      await fs.remove(path.join(outputDir, 'docs'));

      await service.fillPlan('test-plan', { output: outputDir, repo: tempDir });

      expect(mockUI.displaySuccess).toHaveBeenCalled();
    });

    it('should throw error when plan file does not exist', async () => {
      await fs.remove(path.join(outputDir, 'plans', 'test-plan.md'));

      await expect(
        service.fillPlan('non-existent-plan', { output: outputDir, repo: tempDir })
      ).rejects.toThrow('errors.plan.notFound');
    });

    it('should successfully fill plan with valid setup', async () => {
      await service.fillPlan('test-plan', {
        output: outputDir,
        repo: tempDir
      });

      const planPath = path.join(outputDir, 'plans', 'test-plan.md');
      const content = await fs.readFile(planPath, 'utf-8');

      // Should contain the updated content from mock
      expect(content).toContain('# Updated Plan');
      expect(mockUI.displaySuccess).toHaveBeenCalled();
    });

    it('should handle dry-run mode without writing files', async () => {
      const originalContent = await fs.readFile(
        path.join(outputDir, 'plans', 'test-plan.md'),
        'utf-8'
      );

      await service.fillPlan('test-plan', {
        output: outputDir,
        repo: tempDir,
        dryRun: true
      });

      const content = await fs.readFile(
        path.join(outputDir, 'plans', 'test-plan.md'),
        'utf-8'
      );

      // Content should be unchanged
      expect(content).toBe(originalContent);
      expect(mockUI.displayInfo).toHaveBeenCalled();
    });

    it('should pass useLSP option to PlanAgent (default true)', async () => {
      const { PlanAgent } = require('../ai/agents/planAgent');

      await service.fillPlan('test-plan', {
        output: outputDir,
        repo: tempDir
      });

      // Get the mock instance
      const mockInstance = PlanAgent.mock.results[0].value;
      expect(mockInstance.updatePlan).toHaveBeenCalledWith(
        expect.objectContaining({
          useLSP: true
        })
      );
    });

    it('should pass useLSP=false when lsp option is false', async () => {
      const { PlanAgent } = require('../ai/agents/planAgent');

      await service.fillPlan('test-plan', {
        output: outputDir,
        repo: tempDir,
        lsp: false
      });

      const mockInstance = PlanAgent.mock.results[0].value;
      expect(mockInstance.updatePlan).toHaveBeenCalledWith(
        expect.objectContaining({
          useLSP: false
        })
      );
    });
  });

  describe('helper methods', () => {
    it('should ensure trailing newline is added', async () => {
      // Test through fillPlan - the written file should have trailing newline
      await fs.ensureDir(path.join(outputDir, 'docs'));
      await fs.ensureDir(path.join(outputDir, 'agents'));
      await fs.ensureDir(path.join(outputDir, 'plans'));

      await fs.writeFile(
        path.join(outputDir, 'plans', 'newline-test.md'),
        '# Test'
      );
      await fs.writeFile(
        path.join(outputDir, 'docs', 'README.md'),
        '# Docs'
      );
      await fs.writeFile(
        path.join(outputDir, 'agents', 'README.md'),
        '# Agents'
      );

      await service.fillPlan('newline-test', {
        output: outputDir,
        repo: tempDir
      });

      const content = await fs.readFile(
        path.join(outputDir, 'plans', 'newline-test.md'),
        'utf-8'
      );

      // Content should end with newline
      expect(content.endsWith('\n')).toBe(true);
    });
  });
});
