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
import { formatSymbolRef, wrapWithFrontMatter } from './common';

function renderTypeDefinitions(context: DocumentationTemplateContext): string {
  const { semantics, repoStructure } = context;
  if (!semantics) {
    return '- *No exported type definitions found.*';
  }

  const repoRoot = repoStructure.rootPath;

  // Combine types and interfaces, sort by name
  const typeSymbols = [
    ...semantics.symbols.types,
    ...semantics.symbols.interfaces,
  ]
    .filter(s => s.exported)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (typeSymbols.length === 0) {
    return '- *No exported type definitions found.*';
  }

  return typeSymbols.map(sym => {
    const ref = formatSymbolRef(sym, repoRoot);
    const doc = sym.documentation ? ` — ${sym.documentation}` : '';
    return `- **${sym.name}** (${sym.kind}) — ${ref}${doc}`;
  }).join('\n');
}

function renderEnumDefinitions(context: DocumentationTemplateContext): string {
  const { semantics, repoStructure } = context;
  if (!semantics || semantics.symbols.enums.length === 0) {
    return '- *No enums detected.*';
  }

  const repoRoot = repoStructure.rootPath;

  return semantics.symbols.enums
    .filter(s => s.exported)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(sym => {
      const ref = formatSymbolRef(sym, repoRoot);
      const doc = sym.documentation ? ` — ${sym.documentation}` : '';
      return `- **${sym.name}** — ${ref}${doc}`;
    }).join('\n') || '- *No exported enums found.*';
}

export function renderGlossary(context: DocumentationTemplateContext): string {
  const typeDefinitions = renderTypeDefinitions(context);
  const enumDefinitions = renderEnumDefinitions(context);

  const content = `# Glossary & Domain Concepts

List project-specific terminology, acronyms, domain entities, and user personas.

## Type Definitions
${typeDefinitions}

## Enumerations
${enumDefinitions}

## Core Terms

Define key terms, their relevance, and where they surface in the codebase.

## Acronyms & Abbreviations

Expand abbreviations and note associated services or APIs.

## Personas / Actors

Describe user goals, key workflows, and pain points addressed by the system.

## Domain Rules & Invariants

Capture business rules, validation constraints, or compliance requirements. Note any region, localization, or regulatory nuances.
`;

  return wrapWithFrontMatter(content);
}
