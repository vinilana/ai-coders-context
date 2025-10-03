import { DocumentationTemplateContext } from './types';

export function renderGlossary(_context: DocumentationTemplateContext): string {

  return `
# Glossary & Domain Concepts

List project-specific terminology, acronyms, domain entities, and user personas.

## Core Terms
- **Term** — Definition, relevance, and where it surfaces in the codebase.
- **Term** — Definition, domain context, related modules.

## Acronyms & Abbreviations
- **ABC** — Expanded form; why we use it; associated services or APIs.

## Personas / Actors
- **Persona Name** — Goals, key workflows, pain points addressed by the system.

## Domain Rules & Invariants
- Capture business rules, validation constraints, or compliance requirements that the code enforces.
- Note any region, localization, or regulatory nuances.

## Update Checklist
1. Harvest terminology from recent PRs, issues, and discussions.
2. Confirm definitions with product or domain experts when uncertain.
3. Link terms to relevant docs or modules for deeper context.
4. Remove or archive outdated concepts; flag unknown terms for follow-up.

## Recommended Sources
- Product requirement docs, RFCs, user research, or support tickets.
- Service contracts, API schemas, data dictionaries.
- Conversations with domain experts (summarize outcomes if applicable).

`;
}
