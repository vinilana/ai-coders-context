import * as path from 'path';
import * as os from 'os';
import type { RuleSource } from './types';

export const RULE_SOURCES: RuleSource[] = [
  // Cursor AI
  {
    name: 'cursorrules',
    paths: ['.cursorrules', '.cursor/.cursorrules', '.cursor/rules'],
    patterns: ['**/.cursorrules', '**/.cursor/.cursorrules', '**/.cursor/rules/**/*.md'],
    description: 'Cursor AI rules file'
  },
  // Claude Code
  {
    name: 'claude-memory',
    paths: [
      '.claude/memories',
      path.join(os.homedir(), '.claude', 'memories'),
      '.claude/memories/**/*.md',
      '.claude/settings.json'
    ],
    patterns: ['**/.claude/memories/**/*.md', '**/.claude/**/*.memory', '**/.claude/settings.json'],
    description: 'Claude Code memories and settings'
  },
  // GitHub Copilot
  {
    name: 'github-copilot',
    paths: ['.github/copilot-instructions.md', '.github/copilot/**/*.md', '.github/.copilot/**/*'],
    patterns: ['**/.github/copilot-instructions.md', '**/.github/copilot/**/*', '**/.github/.copilot/**/*'],
    description: 'GitHub Copilot instructions and rules'
  },
  // Windsurf (Codeium Cascade)
  {
    name: 'windsurfrules',
    paths: ['.windsurfrules', '.windsurf/rules', '.windsurf/.windsurfrules'],
    patterns: ['**/.windsurfrules', '**/.windsurf/rules/**/*.md', '**/.windsurf/.windsurfrules'],
    description: 'Windsurf (Codeium) rules file'
  },
  // Cline VS Code Extension
  {
    name: 'clinerules',
    paths: ['.clinerules', '.cline/rules', '.cline/.clinerules'],
    patterns: ['**/.clinerules', '**/.cline/rules/**/*.md', '**/.cline/.clinerules'],
    description: 'Cline VS Code extension rules'
  },
  // Aider
  {
    name: 'aider',
    paths: ['CONVENTIONS.md', '.aider.conf.yml', '.aider/conventions.md'],
    patterns: ['**/CONVENTIONS.md', '**/.aider.conf.yml', '**/.aider/conventions.md', '**/.aider/**/*.md'],
    description: 'Aider coding conventions and config'
  },
  // Continue.dev
  {
    name: 'continue',
    paths: ['.continuerules', '.continue/config.json', '.continue/rules'],
    patterns: ['**/.continuerules', '**/.continue/config.json', '**/.continue/rules/**/*.md'],
    description: 'Continue.dev configuration and rules'
  },
  // OpenAI Codex CLI
  {
    name: 'codex',
    paths: ['.codex/instructions.md', '.codex/config.toml'],
    patterns: ['**/.codex/instructions.md', '**/.codex/config.toml', '**/.codex/**/*.md'],
    description: 'OpenAI Codex CLI instructions'
  },
  // Zed Editor
  {
    name: 'zed',
    paths: ['.zed/settings.json', '.zed/rules'],
    patterns: ['**/.zed/settings.json', '**/.zed/rules/**/*.md'],
    description: 'Zed editor AI settings'
  },
  // Generic AI rules files
  {
    name: 'generic',
    paths: ['AI_RULES.md', 'CODING_RULES.md', 'AI_INSTRUCTIONS.md', 'CLAUDE.md'],
    patterns: ['**/AI_RULES.md', '**/CODING_RULES.md', '**/AI_INSTRUCTIONS.md', '**/CLAUDE.md'],
    description: 'Generic AI coding rules files'
  }
];

export const AGENT_SOURCES: RuleSource[] = [
  // Cursor AI
  {
    name: 'cursor-agents',
    paths: ['.cursor/agents'],
    patterns: ['**/.cursor/agents/**/*.md'],
    description: 'Cursor AI agents directory'
  },
  // Claude Code
  {
    name: 'claude-agents',
    paths: ['.claude/agents'],
    patterns: ['**/.claude/agents/**/*.md'],
    description: 'Claude Code agents directory'
  },
  // GitHub Copilot
  {
    name: 'github-agents',
    paths: ['.github/agents'],
    patterns: ['**/.github/agents/**/*.md'],
    description: 'GitHub Copilot agents directory'
  },
  // Windsurf (Codeium)
  {
    name: 'windsurf-agents',
    paths: ['.windsurf/agents'],
    patterns: ['**/.windsurf/agents/**/*.md'],
    description: 'Windsurf (Codeium) agents directory'
  },
  // Cline
  {
    name: 'cline-agents',
    paths: ['.cline/agents'],
    patterns: ['**/.cline/agents/**/*.md'],
    description: 'Cline agents directory'
  },
  // Continue.dev
  {
    name: 'continue-agents',
    paths: ['.continue/agents'],
    patterns: ['**/.continue/agents/**/*.md'],
    description: 'Continue.dev agents directory'
  }
];

export function getRuleSourceByName(name: string): RuleSource | undefined {
  return RULE_SOURCES.find(s => s.name === name);
}

export function getAgentSourceByName(name: string): RuleSource | undefined {
  return AGENT_SOURCES.find(s => s.name === name);
}

export function getAllRuleSourceNames(): string[] {
  return RULE_SOURCES.map(s => s.name);
}

export function getAllAgentSourceNames(): string[] {
  return AGENT_SOURCES.map(s => s.name);
}
