import * as path from 'path';
import * as os from 'os';
import type { RuleSource } from './types';

export const RULE_SOURCES: RuleSource[] = [
  {
    name: 'cursorrules',
    paths: ['.cursorrules', '.cursor/.cursorrules'],
    patterns: ['**/.cursorrules', '**/.cursor/.cursorrules'],
    description: 'Cursor AI rules file'
  },
  {
    name: 'claude-memory',
    paths: [
      '.claude/memories',
      path.join(os.homedir(), '.claude', 'memories'),
      '.claude/memories/**/*.md'
    ],
    patterns: ['**/.claude/memories/**/*.md', '**/.claude/**/*.memory'],
    description: 'Claude Code memories'
  },
  {
    name: 'github-copilot',
    paths: ['.github/copilot/**/*.md', '.github/.copilot/**/*'],
    patterns: ['**/.github/copilot/**/*', '**/.github/.copilot/**/*'],
    description: 'GitHub Copilot rules'
  }
];

export const AGENT_SOURCES: RuleSource[] = [
  {
    name: 'cursor-agents',
    paths: ['.cursor/agents'],
    patterns: ['**/.cursor/agents/**/*.md'],
    description: 'Cursor AI agents directory'
  },
  {
    name: 'claude-agents',
    paths: ['.claude/agents'],
    patterns: ['**/.claude/agents/**/*.md'],
    description: 'Claude Code agents directory'
  },
  {
    name: 'github-agents',
    paths: ['.github/agents'],
    patterns: ['**/.github/agents/**/*.md'],
    description: 'GitHub Copilot agents directory'
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
