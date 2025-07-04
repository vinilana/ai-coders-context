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
      expect(output).toContain('AI-powered CLI');
      expect(output).toContain('Commands:');
      expect(output).toContain('init');
      expect(output).toContain('guidelines');
      expect(output).toContain('analyze');
      expect(output).toContain('update');
      expect(output).toContain('preview');
    });

    it('should display version when --version flag is used', () => {
      const output = execSync(`node ${cliPath} --version`, { encoding: 'utf8' });
      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('init command', () => {
    it('should display help for init command', () => {
      const output = execSync(`node ${cliPath} init --help`, { encoding: 'utf8' });
      expect(output).toContain('Initialize documentation and agent prompts');
      expect(output).toContain('"docs", "agents",');
      expect(output).toContain('"guidelines", or "both"');
      expect(output).toContain('[type]');
      expect(output).toContain('(default: "both")');
    });
  });

  describe('guidelines command', () => {
    it('should display help for guidelines command', () => {
      const output = execSync(`node ${cliPath} guidelines --help`, { encoding: 'utf8' });
      expect(output).toContain('Generate software development guidelines');
      expect(output).toContain('categories...');
      expect(output).toContain('--project-type');
      expect(output).toContain('--complexity');
      expect(output).toContain('--team-size');
    });
  });
});