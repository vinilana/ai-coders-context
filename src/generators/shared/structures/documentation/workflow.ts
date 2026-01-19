import { ScaffoldStructure } from '../types';

export const developmentWorkflowStructure: ScaffoldStructure = {
  fileType: 'doc',
  documentName: 'development-workflow',
  title: 'Development Workflow',
  description: 'Day-to-day engineering processes, branching, and contribution guidelines',
  tone: 'instructional',
  audience: 'developers',
  sections: [
    {
      heading: 'Development Workflow',
      order: 1,
      contentType: 'prose',
      guidance: 'Outline the day-to-day engineering process for this repository.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Branching & Releases',
      order: 2,
      contentType: 'list',
      guidance: 'Describe the branching model (trunk-based, Git Flow, etc.). Note release cadence and tagging conventions.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Local Development',
      order: 3,
      contentType: 'list',
      guidance: 'Commands to install dependencies, run locally, and build for distribution. Use code blocks for commands.',
      exampleContent: '- Install: `npm install`\n- Run: `npm run dev`\n- Build: `npm run build`',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Code Review Expectations',
      order: 4,
      contentType: 'prose',
      guidance: 'Summarize review checklists and required approvals. Reference AGENTS.md for agent collaboration tips.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Onboarding Tasks',
      order: 5,
      contentType: 'prose',
      guidance: 'Point newcomers to first issues or starter tickets. Link to internal runbooks or dashboards.',
      required: false,
      headingLevel: 2,
    },
  ],
  linkTo: ['testing-strategy.md', 'tooling.md'],
};
