/**
 * SKILL.md Template
 */

import { SkillMetadata, SKILL_TO_PHASES, BuiltInSkillType, isBuiltInSkill } from '../../../workflow/skills';
import { PrevcPhase } from '../../../workflow/types';

export interface SkillTemplateOptions {
  name: string;
  description: string;
  phases?: PrevcPhase[];
  mode?: boolean;
  disableModelInvocation?: boolean;
}

/**
 * Generate SKILL.md content
 */
export function generateSkillContent(options: SkillTemplateOptions): string {
  const { name, description, phases, mode, disableModelInvocation } = options;

  const frontmatter = buildFrontmatter({
    name,
    description,
    phases,
    mode,
    disableModelInvocation,
  });

  const body = buildBody(name, description);

  return `${frontmatter}\n\n${body}`;
}

function buildFrontmatter(options: SkillTemplateOptions): string {
  const lines: string[] = ['---'];

  lines.push(`name: ${options.name}`);
  lines.push(`description: ${options.description}`);

  if (options.phases && options.phases.length > 0) {
    lines.push(`phases: [${options.phases.join(', ')}]`);
  }

  if (options.mode !== undefined) {
    lines.push(`mode: ${options.mode}`);
  }

  if (options.disableModelInvocation !== undefined) {
    lines.push(`disable-model-invocation: ${options.disableModelInvocation}`);
  }

  lines.push('---');

  return lines.join('\n');
}

function buildBody(name: string, description: string): string {
  const title = name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return `# ${title}

## When to Use

${description}

## Instructions

<!-- TODO: Add step-by-step instructions for this skill -->

1. First step
2. Second step
3. Third step

## Examples

<!-- TODO: Add examples of how to use this skill -->

\`\`\`
Example usage here
\`\`\`

## Guidelines

<!-- TODO: Add guidelines and best practices -->

- Guideline 1
- Guideline 2
- Guideline 3
`;
}

/**
 * Get default phases for a skill name
 */
export function getDefaultPhases(skillName: string): PrevcPhase[] {
  if (isBuiltInSkill(skillName)) {
    return SKILL_TO_PHASES[skillName as BuiltInSkillType];
  }
  return ['E']; // Default to Execution phase
}
