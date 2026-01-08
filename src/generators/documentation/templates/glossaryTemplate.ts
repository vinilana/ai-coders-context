import * as path from 'path';
import { DocumentationTemplateContext } from './types';
import { formatSymbolRef } from './common';

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
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 30); // Limit to 30

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

  return `
<!-- agent-update:start:glossary -->
# Glossary & Domain Concepts

List project-specific terminology, acronyms, domain entities, and user personas.

## Type Definitions
${typeDefinitions}

## Enumerations
${enumDefinitions}

## Core Terms
- <!-- agent-fill:term-one -->**Term** — Definition, relevance, and where it surfaces in the codebase.<!-- /agent-fill -->
- <!-- agent-fill:term-two -->**Term** — Definition, domain context, related modules.<!-- /agent-fill -->

## Acronyms & Abbreviations
- <!-- agent-fill:acronym -->**ABC** — Expanded form; why we use it; associated services or APIs.<!-- /agent-fill -->

## Personas / Actors
- <!-- agent-fill:persona -->**Persona Name** — Goals, key workflows, pain points addressed by the system.<!-- /agent-fill -->

## Domain Rules & Invariants
- Capture business rules, validation constraints, or compliance requirements that the code enforces.
- Note any region, localization, or regulatory nuances.

<!-- agent-readonly:guidance -->
## AI Update Checklist
1. Harvest terminology from recent PRs, issues, and discussions.
2. Confirm definitions with product or domain experts when uncertain.
3. Link terms to relevant docs or modules for deeper context.
4. Remove or archive outdated concepts; flag unknown terms for follow-up.

<!-- agent-readonly:sources -->
## Acceptable Sources
- Product requirement docs, RFCs, user research, or support tickets.
- Service contracts, API schemas, data dictionaries.
- Conversations with domain experts (summarize outcomes if applicable).

<!-- agent-update:end -->
`;
}
