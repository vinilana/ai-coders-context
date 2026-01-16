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

export function renderToolingGuide(): string {
  const content = `# Tooling & Productivity Guide

Collect the scripts, automation, and editor settings that keep contributors efficient.

## Required Tooling

List tools with installation instructions, version requirements, and what they power.

## Recommended Automation

Document pre-commit hooks, linting/formatting commands, code generators, or scaffolding scripts. Include shortcuts or watch modes for local development loops.

## IDE / Editor Setup

List extensions or plugins that catch issues early. Share snippets, templates, or workspace settings.

## Productivity Tips

Document terminal aliases, container workflows, or local emulators mirroring production. Link to shared scripts or dotfiles used across the team.
`;

  return wrapWithFrontMatter(content);
}
