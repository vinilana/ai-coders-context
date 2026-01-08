import * as path from 'path';
import { DocumentationTemplateContext } from './types';
import { formatDirectoryList, formatSymbolRef, buildSymbolList } from './common';

function renderEntryPointsSection(context: DocumentationTemplateContext): string {
  const { semantics, repoStructure } = context;
  if (!semantics || !semantics.architecture.entryPoints.length) {
    return '- *No entry points detected.*';
  }

  const repoRoot = repoStructure.rootPath;
  return semantics.architecture.entryPoints.map(ep => {
    const relPath = path.relative(repoRoot, ep);
    return `- [\`${relPath}\`](${relPath})`;
  }).join('\n');
}

function renderKeyExportsSection(context: DocumentationTemplateContext): string {
  const { semantics, repoStructure } = context;
  if (!semantics) {
    return '- *No key exports detected.*';
  }

  const repoRoot = repoStructure.rootPath;

  // Get top exported classes and interfaces
  const classes = semantics.symbols.classes
    .filter(s => s.exported)
    .slice(0, 5);

  const interfaces = semantics.symbols.interfaces
    .filter(s => s.exported)
    .slice(0, 5);

  const lines: string[] = [];

  if (classes.length > 0) {
    lines.push('**Classes:**');
    lines.push(buildSymbolList(classes, repoRoot, false));
  }

  if (interfaces.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('**Interfaces:**');
    lines.push(buildSymbolList(interfaces, repoRoot, false));
  }

  if (lines.length === 0) {
    return '- *No major exports detected.*';
  }

  return lines.join('\n');
}

export function renderProjectOverview(context: DocumentationTemplateContext): string {

  const directoryList = formatDirectoryList(context, true);
  const languageSummary = context.primaryLanguages.length > 0
    ? context.primaryLanguages.map(lang => `- ${lang.extension} (${lang.count} files)`).join('\n')
    : '- Language mix pending analysis.';

  const entryPointsSection = renderEntryPointsSection(context);
  const keyExportsSection = renderKeyExportsSection(context);

  return `
<!-- agent-update:start:project-overview -->
# Project Overview

> TODO: Summarize the problem this project solves and who benefits from it.

## Quick Facts
- Root path: \`${context.repoStructure.rootPath}\`
- Primary languages detected:
${languageSummary}

## Entry Points
${entryPointsSection}

## Key Exports
${keyExportsSection}

## File Structure & Code Organization
${directoryList || '*Add a short description for each relevant directory.*'}

## Technology Stack Summary
- Outline primary runtimes, languages, and platforms in use.
- Note build tooling, linting, and formatting infrastructure the team relies on.

## Core Framework Stack
- Document core frameworks per layer (backend, frontend, data, messaging).
- Mention architectural patterns enforced by these frameworks.

## UI & Interaction Libraries
- List UI kits, CLI interaction helpers, or design system dependencies.
- Note theming, accessibility, or localization considerations contributors must follow.

## Development Tools Overview
- Highlight essential CLIs, scripts, or developer environments.
- Link to [Tooling & Productivity Guide](./tooling.md) for deeper setup instructions.

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
3. Refresh the File Structure & Code Organization section to reflect new or retired modules; keep guidance actionable.
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
