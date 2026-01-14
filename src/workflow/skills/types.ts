/**
 * Skill Types
 *
 * Skills are on-demand expertise that AI agents can activate when needed.
 * Unlike agents (persistent behavioral playbooks), skills are task-specific
 * procedures that get loaded only when relevant.
 */

import { PrevcPhase } from '../types';

/**
 * SKILL.md frontmatter metadata
 */
export interface SkillMetadata {
  /** Unique identifier (lowercase, hyphens) */
  name: string;
  /** Description of when to use this skill */
  description: string;
  /** Categorize as mode command (modifies behavior) */
  mode?: boolean;
  /** Prevent auto-activation by AI */
  disableModelInvocation?: boolean;
  /** PREVC phases where this skill is relevant */
  phases?: PrevcPhase[];
}

/**
 * Full skill representation
 */
export interface Skill {
  /** Directory name */
  slug: string;
  /** Full path to SKILL.md */
  path: string;
  /** Parsed frontmatter */
  metadata: SkillMetadata;
  /** Markdown instructions */
  content: string;
  /** Optional helper files in skill directory */
  resources: string[];
  /** Is this a built-in skill? */
  isBuiltIn: boolean;
}

/**
 * Skill reference for linking
 */
export interface SkillReference {
  slug: string;
  path: string;
  name: string;
  description: string;
  linkedAt: string;
}

/**
 * Discovered skills summary
 */
export interface DiscoveredSkills {
  builtIn: Skill[];
  custom: Skill[];
  all: Skill[];
}

/**
 * Built-in skills we provide
 */
export const BUILT_IN_SKILLS = [
  'commit-message',
  'pr-review',
  'code-review',
  'test-generation',
  'documentation',
  'refactoring',
  'bug-investigation',
  'feature-breakdown',
  'api-design',
  'security-audit',
] as const;

export type BuiltInSkillType = (typeof BUILT_IN_SKILLS)[number];

/**
 * Check if a skill is built-in
 */
export function isBuiltInSkill(skillType: string): skillType is BuiltInSkillType {
  return BUILT_IN_SKILLS.includes(skillType as BuiltInSkillType);
}

/**
 * Skill to PREVC phase mapping
 */
export const SKILL_TO_PHASES: Record<BuiltInSkillType, PrevcPhase[]> = {
  'commit-message': ['E', 'C'],
  'pr-review': ['R', 'V'],
  'code-review': ['R', 'V'],
  'test-generation': ['E', 'V'],
  'documentation': ['P', 'C'],
  'refactoring': ['E'],
  'bug-investigation': ['E', 'V'],
  'feature-breakdown': ['P'],
  'api-design': ['P', 'R'],
  'security-audit': ['R', 'V'],
};
