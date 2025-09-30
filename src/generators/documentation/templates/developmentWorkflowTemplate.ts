export function renderDevelopmentWorkflow(): string {
  return `<!-- agent-update:start:development-workflow -->
# Development Workflow

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

<!-- agent-readonly:guidance -->
## AI Update Checklist
1. Confirm branching/release steps with CI configuration and recent tags.
2. Verify local commands against \`package.json\`; ensure flags and scripts still exist.
3. Capture review requirements (approvers, checks) from contributing docs or repository settings.
4. Refresh onboarding links (boards, dashboards) to their latest URLs.
5. Highlight any manual steps that should become automation follow-ups.

<!-- agent-readonly:sources -->
## Acceptable Sources
- CONTRIBUTING guidelines and \`AGENTS.md\`.
- Build pipelines, branch protection rules, or release scripts.
- Issue tracker boards used for onboarding or triage.

<!-- agent-update:end -->
`;
}
