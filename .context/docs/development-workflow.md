---
id: development-workflow
ai_update_goal: "Document how the team builds, reviews, and ships code every day."
required_inputs:
  - "Branching and release policies"
  - "Package scripts and CI workflows"
  - "Code review expectations agreed upon by the team"
success_criteria:
  - "Branching guidance mirrors the default git strategy or CI configuration"
  - "Local development commands are copy/paste ready"
  - "Onboarding links point to living sources (boards, runbooks)"
related_agents:
  - "documentation-writer"
  - "code-reviewer"
---

<!-- agent-update:start:development-workflow -->
# Development Workflow

Outline the day-to-day engineering process for this repository.

## Branching & Releases
This repository follows a trunk-based development model, where all feature work is done in short-lived branches off the `main` branch. Pull requests (PRs) are required for merging changes into `main`, enforced by branch protection rules in the repository settings.

- **Branching Strategy**: 
  - Create feature branches with names like `feature/user-auth` or `fix/bug-123`.
  - For hotfixes, use `hotfix/issue-description`.
  - Merge via PRs; rebase or squash commits for a clean history.
- **Release Cadence and Tagging**: Releases are triggered on-demand via GitHub Actions CI when a PR merges to `main` and passes all checks. Use semantic versioning (e.g., `v1.2.0`) for tags. Automated changelog generation via conventional commits is supported; run `npm run release` locally to draft a new version.

Branch protection on `main` requires status checks (lint, test, build) and at least one approval.

## Local Development
Set up your environment with Node.js (v18+ recommended). The project uses npm for package management.

- Commands to install dependencies: `npm install`
- Run the CLI locally in development mode: `npm run dev` (starts with hot-reloading; access at http://localhost:3000 if applicable)
- Run tests: `npm test` (includes unit and integration tests with Jest)
- Build for distribution: `npm run build` (outputs to `dist/`; TypeScript compilation and bundling)
- Lint and format code: `npm run lint` (ESLint) and `npm run format` (Prettier)

Ensure your local setup matches the CI environment by using the same Node version as specified in `.nvmrc` or CI config.

## Code Review Expectations
Code reviews ensure quality, maintainability, and alignment with project standards. All PRs must be reviewed before merging.

- **Review Checklists**:
  - Does the code follow TypeScript/ESLint/Prettier rules? (Automated via CI)
  - Are there sufficient tests covering new/changed functionality? (Aim for 80%+ coverage)
  - Does it adhere to the repository's architecture (e.g., separation of `src/` and `prompts/` directories)?
  - Any security or performance concerns addressed?
  - Documentation updated if API or workflow changes?
- **Required Approvals**: At least one approval from a core contributor (excluding the author). Use `/assign` in PR comments to request specific reviewers.
- Reference [AGENTS.md](../AGENTS.md) for agent collaboration tips, such as using the `code-reviewer` agent for automated feedback.

Reviews should be constructive and completed within 2 business days.

## Onboarding Tasks
New contributors should start with low-hanging fruit to get familiar with the codebase.

- **First Issues**: Look for tickets labeled "good first issue" or "help wanted" in the issue tracker: [GitHub Issues](https://github.com/[your-org]/[your-repo]/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22).
- **Starter Runbooks**: 
  - Review the [CONTRIBUTING.md](../CONTRIBUTING.md) for setup and etiquette.
  - Join the project board for triage: [GitHub Projects](https://github.com/[your-org]/[your-repo]/projects/1) (update with actual URL if using a specific board).
  - Explore the `prompts/` and `src/` directories to understand the AI scaffolding structure.

If you're new, ping a maintainer in the PR or issues for guidance.

<!-- agent-readonly:guidance -->
## AI Update Checklist
1. Confirm branching/release steps with CI configuration and recent tags.
2. Verify local commands against `package.json`; ensure flags and scripts still exist.
3. Capture review requirements (approvers, checks) from contributing docs or repository settings.
4. Refresh onboarding links (boards, dashboards) to their latest URLs.
5. Highlight any manual steps that should become automation follow-ups.

<!-- agent-readonly:sources -->
## Acceptable Sources
- CONTRIBUTING guidelines and `AGENTS.md`.
- Build pipelines, branch protection rules, or release scripts.
- Issue tracker boards used for onboarding or triage.

<!-- agent-update:end -->
