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
import * as path from 'path';
import { DocumentationTemplateContext } from './types';
import { formatDirectoryList, formatSymbolRef, buildSymbolList, wrapWithFrontMatter } from './common';

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

  // Get exported classes and interfaces
  const classes = semantics.symbols.classes
    .filter(s => s.exported);

  const interfaces = semantics.symbols.interfaces
    .filter(s => s.exported);

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

  const content = `# Project Overview

Summarize the problem this project solves and who benefits from it.

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

Outline primary runtimes, languages, and platforms in use. Note build tooling, linting, and formatting infrastructure the team relies on.

## Core Framework Stack

Document core frameworks per layer (backend, frontend, data, messaging). Mention architectural patterns enforced by these frameworks.

## UI & Interaction Libraries

List UI kits, CLI interaction helpers, or design system dependencies. Note theming, accessibility, or localization considerations contributors must follow.

## Development Tools Overview

Highlight essential CLIs, scripts, or developer environments. Link to [Tooling & Productivity Guide](./tooling.md) for deeper setup instructions.

## Getting Started Checklist

1. Install dependencies with \`npm install\`.
2. Explore the CLI by running \`npm run dev\`.
3. Review [Development Workflow](./development-workflow.md) for day-to-day tasks.

## Next Steps

Capture product positioning, key stakeholders, and links to external documentation or product specs here.
`;

  return wrapWithFrontMatter(content);
}
