import { createFrontMatter } from './frontMatter';
import { DocumentationTemplateContext } from './types';
import { formatDirectoryList } from './common';

export function renderProjectOverview(context: DocumentationTemplateContext): string {
  const frontMatter = createFrontMatter({
    id: 'project-overview',
    goal: 'Explain why the project exists, who it serves, and how to get productive quickly.',
    requiredInputs: [
      'Latest product or roadmap brief',
      'Repository metadata (README highlights, package manifests)',
      'List of stakeholders or domain experts for verification'
    ],
    successCriteria: [
      'Quick Facts mirror current tooling, stack, and entry points',
      'Directory map explains where primary capabilities live',
      'Next steps point to authoritative specs or dashboards'
    ],
    relatedAgents: ['documentation-writer', 'architect-specialist']
  });

  const directoryList = formatDirectoryList(context, true);
  const languageSummary = context.primaryLanguages.length > 0
    ? context.primaryLanguages.map(lang => `- ${lang.extension} (${lang.count} files)`).join('\n')
    : '- Language mix pending analysis.';

  return `${frontMatter}
<!-- agent-update:start:project-overview -->
# Project Overview

> TODO: Summarize the problem this project solves and who benefits from it.

## Quick Facts
- Root path: \`${context.repoStructure.rootPath}\`
- Primary languages detected:
${languageSummary}

## Directory Map
${directoryList || '*Add a short description for each relevant directory.*'}

## Technology Signals
- Highlight frameworks, runtimes, state management patterns, data layers, and cross-service communication patterns detected in the repository.
- Note build tooling, linting, and formatting infrastructure they should be aware of.
- Call out external services (APIs, queues, cloud resources) and their integration points.

## Getting Started Checklist
1. Install dependencies with \`npm install\`.
2. Explore the CLI by running \`npm run dev\`.
3. Review [Development Workflow](./development-workflow.md) for day-to-day tasks.

## Next Steps
Capture product positioning, key stakeholders, and links to external documentation or product specs here.

<!-- agent-readonly:guidance -->
## AI Update Checklist
1. Review roadmap items or issues labelled “release” to confirm current goals.
2. Cross-check Quick Facts against \`package.json\` and environment docs.
3. Refresh the Directory Map to reflect new or retired modules; keep guidance actionable.
4. Link critical dashboards, specs, or runbooks used by the team.
5. Flag any details that require human confirmation (e.g., stakeholder ownership).

<!-- agent-readonly:sources -->
## Acceptable Sources
- Recent commits, release notes, or ADRs describing high-level changes.
- Product requirement documents linked from this repository.
- Confirmed statements from maintainers or product leads.

<!-- agent-update:end -->
`;
}
