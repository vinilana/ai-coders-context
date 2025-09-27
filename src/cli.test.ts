import { execSync } from 'child_process';
import * as path from 'path';

describe('CLI Commands', () => {
  const cliPath = path.join(__dirname, '../dist/index.js');
  
  beforeAll(() => {
    // Build the project before running tests
    execSync('npm run build', { stdio: 'pipe' });
  });

  describe('Main CLI', () => {
    it('should display help when --help flag is used', () => {
      const output = execSync(`node ${cliPath} --help`, { encoding: 'utf8' });
      expect(output).toContain('Scaffold documentation and agent playbooks');
      expect(output).toContain('Commands:');
      expect(output).toContain('init');
      expect(output).toContain('scaffold');
      expect(output).toContain('llm-fill');
    });

    it('should display version when --version flag is used', () => {
      const output = execSync(`node ${cliPath} --version`, { encoding: 'utf8' });
      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('init command', () => {
    it('should display help for init command', () => {
      const output = execSync(`node ${cliPath} init --help`, { encoding: 'utf8' });
      expect(output).toContain('Generate docs and agent scaffolding');
      expect(output).toContain('"docs", "agents", or "both"');
      expect(output).toContain('[type]');
      expect(output).toContain('(default)');
    });
  });

  describe('llm-fill command', () => {
    it('should display help for llm-fill command', () => {
      const output = execSync(`node ${cliPath} llm-fill --help`, { encoding: 'utf8' });
      expect(output).toContain('Use an LLM to fill or update the generated docs and agent playbooks');
      expect(output).toContain('--prompt <file>');
      expect(output).toContain('--dry-run');
      expect(output).toContain('--all');
    });
  });
});
