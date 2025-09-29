import { createFrontMatter } from './frontMatter';

export function renderToolingGuide(): string {
  const frontMatter = createFrontMatter({
    id: 'tooling-guide',
    goal: 'Help contributors set up local environments, automation, and productivity tooling quickly.',
    requiredInputs: [
      'Project-specific CLI commands or scripts',
      'Preferred IDE/editor configurations',
      'Automation hooks (pre-commit, CI helpers, generators)'
    ],
    successCriteria: [
      'Includes copy/paste-ready commands for installation and diagnostics',
      'Highlights required extensions or plugins',
      'Links to automation or productivity aids maintained by the team'
    ],
    relatedAgents: ['feature-developer', 'documentation-writer']
  });

  return `${frontMatter}
<!-- agent-update:start:tooling -->
# Tooling & Productivity Guide

Collect the scripts, automation, and editor settings that keep contributors efficient.

## Required Tooling
- <!-- agent-fill:tool-required -->Tool name — How to install, version requirements, what it powers.<!-- /agent-fill -->

## Recommended Automation
- Pre-commit hooks, linting/formatting commands, code generators, or scaffolding scripts.
- Shortcuts or watch modes for local development loops.

## IDE / Editor Setup
- Extensions or plugins that catch issues early.
- Snippets, templates, or workspace settings worth sharing.

## Productivity Tips
- Terminal aliases, container workflows, or local emulators mirroring production.
- Links to shared scripts or dotfiles used across the team.

<!-- agent-readonly:guidance -->
## AI Update Checklist
1. Verify commands align with the latest scripts and build tooling.
2. Remove instructions for deprecated tools and add replacements.
3. Highlight automation that saves time during reviews or releases.
4. Cross-link to runbooks or README sections that provide deeper context.

<!-- agent-readonly:sources -->
## Acceptable Sources
- Onboarding docs, internal wikis, and team retrospectives.
- Script directories, package manifests, CI configuration.
- Maintainer recommendations gathered during pairing or code reviews.

<!-- agent-update:end -->
`;
}
