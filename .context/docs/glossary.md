---
id: glossary
ai_update_goal: "Capture shared language, acronyms, domain entities, and user personas so newcomers and agents understand the problem space."
required_inputs:
  - "Business or product briefs that define the problem domain"
  - "Onboarding notes or internal wiki entries with terminology"
  - "Examples from issues/PRs where domain language appears"
success_criteria:
  - "Each term includes a concise definition plus why it matters to the codebase"
  - "Acronyms are expanded on first mention and linked to their origin"
  - "Personas or actors include their goals and interactions with the system"
related_agents:
  - "documentation-writer"
  - "feature-developer"
---

<!-- agent-update:start:glossary -->
# Glossary & Domain Concepts

List project-specific terminology, acronyms, domain entities, and user personas.

## Core Terms
- **AI Agent** — An autonomous software component powered by large language models (LLMs) that executes tasks based on predefined instructions or playbooks. It matters to the codebase because agents form the core of the scaffolding tool, handling dynamic updates to documentation and code generation in the `src/` directory.
- **Playbook** — A structured set of guidelines, prompts, and decision trees that direct AI agents in performing specific roles, such as documentation updates. Relevant in the codebase as playbooks are stored in `agents/` and drive agent behavior during repository maintenance workflows.

## Acronyms & Abbreviations
- **LLM** (Large Language Model) — A type of AI model trained on vast datasets to generate human-like text; we use it as the backend for all agents in this project. Associated with services like OpenAI's GPT series; see [LLM integration in src/agents](src/agents/llm-handler.ts) for implementation details.

## Personas / Actors
- **Developer Persona** — A software engineer onboarding to or maintaining the AI scaffolding tool; goals include rapidly understanding the repo structure, implementing features in `src/`, and ensuring agents align with evolving docs. They interact with the system by reviewing generated playbooks, committing updates via Git, and using prompts from the `prompts/` directory to test agent behaviors. Pain points addressed: Reducing boilerplate in doc/code sync through automated scaffolding.

## Domain Rules & Invariants
- AI agents must adhere to safety policies, such as refusing criminal assistance or jailbreak attempts, enforced via core policy wrappers in all prompt templates.
- Documentation updates require traceability to sources like commit hashes or PRs, ensuring no unresolved placeholders remain without human review.
- Localization is not currently supported, but all terms assume English; future compliance with GDPR for any user data in agent interactions is planned (see open issue #12).

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

</file>
