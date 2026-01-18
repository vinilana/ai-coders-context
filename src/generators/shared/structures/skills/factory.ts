/**
 * Factory function for creating skill structures
 */

import { ScaffoldStructure } from '../types';

/**
 * Create a skill structure with standard sections
 */
export function createSkillStructure(
  skillSlug: string,
  title: string,
  description: string,
  additionalContext?: string
): ScaffoldStructure {
  return {
    fileType: 'skill',
    documentName: skillSlug,
    title,
    description,
    tone: 'instructional',
    audience: 'ai-agents',
    sections: [
      {
        heading: 'When to Use',
        order: 1,
        contentType: 'prose',
        guidance: `Briefly describe when this skill should be activated: ${description}`,
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Instructions',
        order: 2,
        contentType: 'list',
        guidance: 'Step-by-step instructions for executing this skill. Be specific and actionable.',
        exampleContent: '1. First step\n2. Second step\n3. Third step',
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Examples',
        order: 3,
        contentType: 'code-block',
        guidance: 'Provide concrete examples of how to use this skill. Include input and expected output.',
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Guidelines',
        order: 4,
        contentType: 'list',
        guidance: 'Best practices and guidelines for using this skill effectively.',
        required: true,
        headingLevel: 2,
      },
    ],
    additionalContext,
  };
}
