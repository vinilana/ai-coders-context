import { ScaffoldStructure } from '../types';

export const toolingStructure: ScaffoldStructure = {
  fileType: 'doc',
  documentName: 'tooling',
  title: 'Tooling & Productivity Guide',
  description: 'Scripts, IDE settings, automation, and developer productivity tips',
  tone: 'instructional',
  audience: 'developers',
  sections: [
    {
      heading: 'Tooling & Productivity Guide',
      order: 1,
      contentType: 'prose',
      guidance: 'Collect the scripts, automation, and editor settings that keep contributors efficient.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Required Tooling',
      order: 2,
      contentType: 'list',
      guidance: 'List tools with installation instructions, version requirements, and what they power.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Recommended Automation',
      order: 3,
      contentType: 'prose',
      guidance: 'Document pre-commit hooks, linting/formatting commands, code generators, or scaffolding scripts. Include shortcuts or watch modes.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'IDE / Editor Setup',
      order: 4,
      contentType: 'list',
      guidance: 'List extensions or plugins that catch issues early. Share snippets, templates, or workspace settings.',
      required: false,
      headingLevel: 2,
    },
    {
      heading: 'Productivity Tips',
      order: 5,
      contentType: 'prose',
      guidance: 'Document terminal aliases, container workflows, or local emulators. Link to shared scripts or dotfiles.',
      required: false,
      headingLevel: 2,
    },
  ],
  linkTo: ['development-workflow.md'],
};
