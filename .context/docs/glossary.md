# Glossary & Domain Concepts

List project-specific terminology, acronyms, domain entities, and user personas.

## Type Definitions
- **AgentCompleteEvent** (interface) — [`AgentCompleteEvent`](src/services/ai/agentEvents.ts#L31)
- **AgentEventCallbacks** (interface) — [`AgentEventCallbacks`](src/services/ai/agentEvents.ts#L37)
- **AgentFileInfo** (interface) — [`AgentFileInfo`](src/services/sync/types.ts#L47)
- **AgentPlaybook** (type) — [`AgentPlaybook`](src/services/ai/schemas.ts#L238)
- **AgentPrompt** (interface) — [`AgentPrompt`](src/types.ts#L54)
- **AgentStartEvent** (interface) — [`AgentStartEvent`](src/services/ai/agentEvents.ts#L7)
- **AgentStepEvent** (interface) — [`AgentStepEvent`](src/services/ai/agentEvents.ts#L12)
- **AgentTemplateContext** (interface) — [`AgentTemplateContext`](src/generators/agents/templates/types.ts#L16)
- **AgentType** (type) — [`AgentType`](src/services/ai/agentEvents.ts#L5)
- **AgentType** (type) — [`AgentType`](src/generators/agents/agentTypes.ts#L18)
- **AIProvider** (type) — [`AIProvider`](src/types.ts#L31)
- **AnalyzerOptions** (interface) — [`AnalyzerOptions`](src/services/semantic/types.ts#L120)
- **AnalyzeSymbolsInput** (type) — [`AnalyzeSymbolsInput`](src/services/ai/schemas.ts#L231)
- **AnalyzeSymbolsOutput** (type) — [`AnalyzeSymbolsOutput`](src/services/ai/schemas.ts#L232)
- **ArchitectureInfo** (interface) — [`ArchitectureInfo`](src/services/semantic/types.ts#L80)
- **ArchitectureLayer** (interface) — [`ArchitectureLayer`](src/services/semantic/types.ts#L60)
- **CLIOptions** (interface) — [`CLIOptions`](src/types.ts#L40)
- **CodebaseSnapshot** (interface) — [`CodebaseSnapshot`](src/generators/plans/templates/types.ts#L11)
- **ContextBuilderOptions** (interface) — [`ContextBuilderOptions`](src/services/semantic/contextBuilder.ts#L18)
- **ContextFormat** (type) — [`ContextFormat`](src/services/semantic/contextBuilder.ts#L29)
- **DependencyInfo** (interface) — [`DependencyInfo`](src/services/semantic/types.ts#L75)
- **DetectedPattern** (interface) — [`DetectedPattern`](src/services/semantic/types.ts#L68)
- **DevelopmentPlan** (type) — [`DevelopmentPlan`](src/services/ai/schemas.ts#L239)
- **DirectoryStat** (interface) — [`DirectoryStat`](src/generators/documentation/templates/types.ts#L11)
- **DocTouchpoint** (interface) — [`DocTouchpoint`](src/generators/agents/templates/types.ts#L4)
- **DocumentationAgentOptions** (interface) — [`DocumentationAgentOptions`](src/services/ai/agents/documentationAgent.ts#L12)
- **DocumentationAgentResult** (interface) — [`DocumentationAgentResult`](src/services/ai/agents/documentationAgent.ts#L25)
- **DocumentationOutput** (type) — [`DocumentationOutput`](src/services/ai/schemas.ts#L237)
- **DocumentationTemplateContext** (interface) — [`DocumentationTemplateContext`](src/generators/documentation/templates/types.ts#L16)
- **ExportInfo** (interface) — [`ExportInfo`](src/services/semantic/types.ts#L45)

## Enumerations
- *No enums detected.*

## Core Terms
- **Term** — Definition, relevance, and where it surfaces in the codebase.

## Acronyms & Abbreviations
- **ABC** — Expanded form; why we use it; associated services or APIs.

## Personas / Actors
- **Persona Name** — Goals, key workflows, pain points addressed by the system.

## Domain Rules & Invariants
- Capture business rules, validation constraints, or compliance requirements that the code enforces.
- Note any region, localization, or regulatory nuances.
