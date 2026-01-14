/**
 * Skills Index (README.md) Template
 */

import { Skill } from '../../../workflow/skills';

export interface SkillsIndexOptions {
  skills: Skill[];
  projectName?: string;
}

/**
 * Generate README.md for skills directory
 */
export function generateSkillsIndex(options: SkillsIndexOptions): string {
  const { skills, projectName } = options;

  const builtIn = skills.filter((s) => s.isBuiltIn);
  const custom = skills.filter((s) => !s.isBuiltIn);

  let content = `# Skills

On-demand expertise for AI agents. Skills are task-specific procedures that get activated when relevant.

`;

  if (projectName) {
    content += `> Project: ${projectName}\n\n`;
  }

  content += `## How Skills Work

1. **Discovery**: AI agents discover available skills
2. **Matching**: When a task matches a skill's description, it's activated
3. **Execution**: The skill's instructions guide the AI's behavior

## Available Skills

`;

  if (builtIn.length > 0) {
    content += `### Built-in Skills

| Skill | Description | Phases |
|-------|-------------|--------|
`;

    for (const skill of builtIn) {
      const phases = skill.metadata.phases?.join(', ') || '-';
      content += `| [${skill.metadata.name}](./${skill.slug}/SKILL.md) | ${skill.metadata.description} | ${phases} |\n`;
    }

    content += '\n';
  }

  if (custom.length > 0) {
    content += `### Custom Skills

| Skill | Description | Phases |
|-------|-------------|--------|
`;

    for (const skill of custom) {
      const phases = skill.metadata.phases?.join(', ') || '-';
      content += `| [${skill.metadata.name}](./${skill.slug}/SKILL.md) | ${skill.metadata.description} | ${phases} |\n`;
    }

    content += '\n';
  }

  content += `## Creating Custom Skills

Create a new skill by adding a directory with a \`SKILL.md\` file:

\`\`\`
.context/skills/
└── my-skill/
    ├── SKILL.md          # Required: skill definition
    └── templates/        # Optional: helper resources
        └── checklist.md
\`\`\`

### SKILL.md Format

\`\`\`yaml
---
name: my-skill
description: When to use this skill
phases: [P, E, V]  # Optional: PREVC phases
mode: false        # Optional: mode command?
---

# My Skill

## When to Use
[Description of when this skill applies]

## Instructions
1. Step one
2. Step two

## Examples
[Usage examples]
\`\`\`

## PREVC Phase Mapping

| Phase | Name | Skills |
|-------|------|--------|
| P | Planning | feature-breakdown, documentation, api-design |
| R | Review | pr-review, code-review, api-design, security-audit |
| E | Execution | commit-message, test-generation, refactoring, bug-investigation |
| V | Validation | pr-review, code-review, test-generation, security-audit |
| C | Confirmation | commit-message, documentation |
`;

  return content;
}
