/**
 * Reverse Sync Presets
 *
 * Configuration for skill sources and tool mappings
 */

import type { RuleSource } from '../import/types';

// ============================================================================
// Skill Sources
// ============================================================================

/**
 * Sources for skill detection
 * Pattern follows RULE_SOURCES and AGENT_SOURCES from import/presets.ts
 */
export const SKILL_SOURCES: RuleSource[] = [
  // Claude Code
  {
    name: 'claude-skills',
    paths: ['.claude/skills'],
    patterns: [
      '**/.claude/skills/*/SKILL.md',
      '**/.claude/skills/**/*.md',
    ],
    description: 'Claude Code skills directory',
  },
  // Gemini CLI
  {
    name: 'gemini-skills',
    paths: ['.gemini/skills'],
    patterns: [
      '**/.gemini/skills/*/SKILL.md',
      '**/.gemini/skills/**/*.md',
    ],
    description: 'Gemini CLI skills directory',
  },
  // Codex CLI
  {
    name: 'codex-skills',
    paths: ['.codex/skills'],
    patterns: [
      '**/.codex/skills/*/SKILL.md',
      '**/.codex/skills/**/*.md',
    ],
    description: 'OpenAI Codex CLI skills directory',
  },
  // Google Antigravity
  {
    name: 'antigravity-workflows',
    paths: ['.agent/workflows'],
    patterns: [
      '**/.agent/workflows/*/SKILL.md',
      '**/.agent/workflows/**/*.md',
    ],
    description: 'Google Antigravity workflows directory',
  },
];

// ============================================================================
// Tool Name Mappings
// ============================================================================

/**
 * Map directory prefixes to canonical tool identifiers
 */
export const TOOL_NAME_MAP: Record<string, string> = {
  '.claude': 'claude',
  '.cursor': 'cursor',
  '.github': 'github',
  '.windsurf': 'windsurf',
  '.cline': 'cline',
  '.continue': 'continue',
  '.gemini': 'gemini',
  '.codex': 'codex',
  '.aider': 'aider',
  '.zed': 'zed',
  '.agent': 'antigravity',
  '.trae': 'trae',
};

/**
 * Human-readable display names for AI tools
 */
export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  claude: 'Claude Code',
  cursor: 'Cursor AI',
  github: 'GitHub Copilot',
  windsurf: 'Windsurf (Codeium)',
  cline: 'Cline',
  continue: 'Continue.dev',
  gemini: 'Gemini CLI',
  codex: 'Codex CLI',
  aider: 'Aider',
  zed: 'Zed Editor',
  antigravity: 'Google Antigravity',
  trae: 'Trae AI',
};

/**
 * Tool capabilities - which content types each tool supports
 */
export const TOOL_CAPABILITIES: Record<string, { rules: boolean; agents: boolean; skills: boolean }> = {
  claude: { rules: true, agents: true, skills: true },
  cursor: { rules: true, agents: true, skills: false },
  github: { rules: true, agents: true, skills: false },
  windsurf: { rules: true, agents: true, skills: false },
  cline: { rules: true, agents: true, skills: false },
  continue: { rules: true, agents: true, skills: false },
  gemini: { rules: false, agents: false, skills: true },
  codex: { rules: true, agents: false, skills: true },
  aider: { rules: true, agents: false, skills: false },
  zed: { rules: true, agents: false, skills: false },
  antigravity: { rules: true, agents: true, skills: true },
  trae: { rules: true, agents: true, skills: false },
};

/**
 * All known tool identifiers
 */
export const ALL_TOOL_IDS = Object.keys(TOOL_DISPLAY_NAMES);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a skill source by name
 */
export function getSkillSourceByName(name: string): RuleSource | undefined {
  return SKILL_SOURCES.find((s) => s.name === name);
}

/**
 * Get all skill source names
 */
export function getAllSkillSourceNames(): string[] {
  return SKILL_SOURCES.map((s) => s.name);
}

/**
 * Extract tool ID from a file path
 * @param filePath - Relative or absolute path
 * @returns Tool ID or 'unknown' if not recognized
 */
export function getToolIdFromPath(filePath: string): string {
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');

  for (const [prefix, toolId] of Object.entries(TOOL_NAME_MAP)) {
    if (normalizedPath.includes(`${prefix}/`) || normalizedPath.startsWith(prefix)) {
      return toolId;
    }
  }

  // Check for special cases not in directories
  if (normalizedPath.includes('CLAUDE.md')) return 'claude';
  if (normalizedPath.includes('CONVENTIONS.md')) return 'aider';
  if (normalizedPath.includes('.cursorrules')) return 'cursor';
  if (normalizedPath.includes('.windsurfrules')) return 'windsurf';
  if (normalizedPath.includes('.clinerules')) return 'cline';
  if (normalizedPath.includes('.continuerules')) return 'continue';
  if (normalizedPath.includes('GEMINI.md')) return 'antigravity';

  return 'unknown';
}

/**
 * Get display name for a tool ID
 */
export function getToolDisplayName(toolId: string): string {
  return TOOL_DISPLAY_NAMES[toolId] || toolId;
}

/**
 * Get tool capabilities
 */
export function getToolCapabilities(toolId: string): { rules: boolean; agents: boolean; skills: boolean } {
  return TOOL_CAPABILITIES[toolId] || { rules: false, agents: false, skills: false };
}
