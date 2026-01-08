export function renderDevelopmentWorkflow(): string {
  return `# Development Workflow

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
- Point newcomers to first issues or starter tickets.
- Link to internal runbooks or dashboards.
`;
}
