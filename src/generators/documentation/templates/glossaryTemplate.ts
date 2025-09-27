import { createFrontMatter } from './frontMatter';
import { DocumentationTemplateContext } from './types';

export function renderGlossary(_context: DocumentationTemplateContext): string {
  const frontMatter = createFrontMatter({
    id: 'glossary',
    goal: 'Capture shared language, acronyms, domain entities, and user personas so newcomers and agents understand the problem space.',
    requiredInputs: [
      'Business or product briefs that define the problem domain',
      'Onboarding notes or internal wiki entries with terminology',
      'Examples from issues/PRs where domain language appears'
    ],
    successCriteria: [
      'Each term includes a concise definition plus why it matters to the codebase',
      'Acronyms are expanded on first mention and linked to their origin',
      'Personas or actors include their goals and interactions with the system'
    ],
    relatedAgents: ['documentation-writer', 'feature-developer']
  });

  return `${frontMatter}
<!-- ai-task:glossary -->
# Glossary & Domain Concepts

List project-specific terminology, acronyms, domain entities, and user personas.

## Core Terms
- <!-- ai-slot:term-one -->**Term** — Definition, relevance, and where it surfaces in the codebase.<!-- /ai-slot -->
- <!-- ai-slot:term-two -->**Term** — Definition, domain context, related modules.<!-- /ai-slot -->

## Acronyms & Abbreviations
- <!-- ai-slot:acronym -->**ABC** — Expanded form; why we use it; associated services or APIs.<!-- /ai-slot -->

## Personas / Actors
- <!-- ai-slot:persona -->**Persona Name** — Goals, key workflows, pain points addressed by the system.<!-- /ai-slot -->

## Domain Rules & Invariants
- Capture business rules, validation constraints, or compliance requirements that the code enforces.
- Note any region, localization, or regulatory nuances.

## AI Update Checklist
1. Harvest terminology from recent PRs, issues, and discussions.
2. Confirm definitions with product or domain experts when uncertain.
3. Link terms to relevant docs or modules for deeper context.
4. Remove or archive outdated concepts; flag unknown terms for follow-up.

## Acceptable Sources
- Product requirement docs, RFCs, user research, or support tickets.
- Service contracts, API schemas, data dictionaries.
- Conversations with domain experts (summarize outcomes if applicable).

<!-- /ai-task -->
`;
}
