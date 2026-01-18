/**
 * Serialization functions for scaffold structures
 */

import { ScaffoldStructure } from './types';

/**
 * Serialize a scaffold structure to a readable format for AI context
 */
export function serializeStructureForAI(structure: ScaffoldStructure): string {
  const lines: string[] = [];

  lines.push(`# Document Structure: ${structure.title}`);
  lines.push('');
  lines.push(`**Type:** ${structure.fileType}`);
  lines.push(`**Tone:** ${structure.tone}`);
  lines.push(`**Audience:** ${structure.audience}`);
  lines.push(`**Description:** ${structure.description}`);

  if (structure.additionalContext) {
    lines.push(`**Additional Context:** ${structure.additionalContext}`);
  }

  lines.push('');
  lines.push('## Required Sections');
  lines.push('');

  const sortedSections = [...structure.sections].sort((a, b) => a.order - b.order);

  for (const section of sortedSections) {
    const requiredLabel = section.required ? '(REQUIRED)' : '(optional)';
    const level = section.headingLevel || 2;
    const headingPrefix = '#'.repeat(level);

    lines.push(`### ${section.order}. ${headingPrefix} ${section.heading} ${requiredLabel}`);
    lines.push(`- **Content Type:** ${section.contentType}`);
    lines.push(`- **Guidance:** ${section.guidance}`);

    if (section.exampleContent) {
      lines.push('- **Example:**');
      lines.push('```');
      lines.push(section.exampleContent);
      lines.push('```');
    }

    lines.push('');
  }

  if (structure.linkTo && structure.linkTo.length > 0) {
    lines.push('## Cross-References');
    lines.push('Link to these related documents where appropriate:');
    for (const link of structure.linkTo) {
      lines.push(`- ${link}`);
    }
  }

  return lines.join('\n');
}
