/**
 * REFERENCE ONLY - This file is not used by generators anymore.
 *
 * Scaffold structures are now defined in:
 * src/generators/shared/scaffoldStructures.ts
 *
 * This file serves as historical reference for the structure/content
 * that should be generated for this document type.
 *
 * @deprecated Since v2.0.0 scaffold system
 */
import { wrapWithFrontMatter } from './common';

export function renderDevelopmentWorkflow(): string {
  const content = `# Development Workflow

Outline the day-to-day engineering process for this repository.

## Branching & Releases
- Describe the branching model (e.g., trunk-based, Git Flow).
- Note release cadence and tagging conventions.

## Local Development
- Commands to install dependencies: \`npm install\`
- Run the CLI locally: \`npm run dev\`
- Build for distribution: \`npm run build\`

## Code Review Expectations
- Summarize review checklists and required approvals.
- Reference [AGENTS.md](../../AGENTS.md) for agent collaboration tips.

## Onboarding Tasks

Point newcomers to first issues or starter tickets. Link to internal runbooks or dashboards.
`;

  return wrapWithFrontMatter(content);
}
