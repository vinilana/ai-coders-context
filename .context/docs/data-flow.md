---
id: data-flow
ai_update_goal: "Describe how information moves through the system and where it integrates with external services."
required_inputs:
  - "Architecture diagrams or sequence flows"
  - "Integration specs (APIs, queues, webhooks, third-party services)"
  - "Notes on batch jobs, schedulers, or ETL processes"
success_criteria:
  - "Highlights inbound, internal, and outbound flows"
  - "Documents transformation points and trust boundaries"
  - "Identifies failure modes and retry/backoff behaviour"
related_agents:
  - "architect-specialist"
  - "backend-specialist"
---

<!-- agent-update:start:data-flow -->
# Data Flow & Integrations

Explain how data enters, moves through, and exits the system, including interactions with external services.

## High-level Flow
The primary pipeline begins with inbound repository data ingestion, such as Git status, file scans, and configuration files (e.g., `package.json`, `tsconfig.json`). This raw data is transformed by AI-driven agents in the `src/` directory, using prompt templates from `prompts/`, to generate updated documentation in `docs/` and agent playbooks in `agents/`. Outputs are validated against success criteria and committed back to the repository.

Inbound: Repository metadata and code files (e.g., via `git status -sb` and file enumeration).
Transformation: AI processing applies context gathering checklists and update procedures.
Outbound: Generated Markdown files and changelog summaries.

No embedded diagrams are available; refer to [architecture overview in docs/architecture.md](architecture.md) for visual sequence flows if added in future updates.

## Internal Movement
Modules within the `src/` directory collaborate via synchronous function calls and shared state management. Prompt templates from `prompts/` are loaded into the core scaffolding engine (e.g., entry points like `src/index.ts` or equivalent processors). These interact with testing utilities (`jest.config.js`) for validation and configuration loaders (`tsconfig.json`, `package.json`) for environment setup.

- **Queues/Events**: No dedicated queues; processing is event-driven via Node.js async/await patterns for sequential updates.
- **RPC Calls**: Internal modularity uses direct imports; no remote RPC.
- **Shared Databases**: File-based persistence (e.g., JSON configs); no external DB. Trust boundaries are enforced at module level (e.g., read-only access to repo files during scans).
Transformation points include parsing repo summaries (e.g., directories, file counts) into structured inputs for AI agents, with validation against `AGENTS.md` and `README.md` for context alignment.

Cross-references: See [agent playbooks in agents/architect-specialist.md](../agents/architect-specialist.md) for detailed module responsibilities.

## External Integrations
- **Git Integration** — Purpose: Ingest repository state (e.g., status, commits, file lists) to inform context gathering. Authentication: Local CLI access (no remote auth needed for `git status`). Payload shapes: Plain text outputs (e.g., branch info, modified files). Retry strategy: None required, as operations are local and synchronous; failures (e.g., unclean repo) trigger human review notes.
- **npm/yarn (Package Management)** — Purpose: Resolve dependencies and inspect `package.json` for build/config details. Authentication: Token-based for private registries if applicable (stored in `.npmrc`). Payload shapes: JSON manifests. Retry strategy: Exponential backoff on network fetches (built into npm), with fallback to cached `package-lock.json`.
- **AI Provider API (e.g., OpenAI)** — Purpose: Execute prompt-based generation for doc updates and playbook alignment. Authentication: API key via environment variables. Payload shapes: JSON with prompt text, context (repo summary), and parameters (e.g., model, temperature). Retry strategy: Exponential backoff (initial 1s, max 60s) on 429 rate limits or 5xx errors; dead-letter to logs after 3 attempts.

No batch jobs or schedulers; all flows are on-demand during update procedures. ETL-like processes occur in-memory during file scanning and AI inference.

## Observability & Failure Modes
- **Metrics/Traces/Logs**: Console logging for key steps (e.g., input collection, update completion); Jest reports for test coverage on transformations. No distributed tracing (e.g., no OpenTelemetry integration yet); future enhancements could add structured logs via Winston.
- **Failure Modes**: 
  - Inbound: Incomplete repo scans (e.g., large files >0.43 MB limit) — fallback to partial data with maintainer notes.
  - Internal: AI generation inconsistencies — validated against `success_criteria` in YAML front matter; retry prompt refinements.
  - Outbound/External: API rate limits or auth failures — exponential backoff as noted; compensating actions include skipping non-critical integrations (e.g., defer npm fetch) and logging incidents for postmortems.
  - Dead-letter: Unresolved placeholders (e.g., agent-fill blocks) route to explicit human follow-up comments in Markdown.

Refer to [runbooks in docs/troubleshooting.md](troubleshooting.md) for triage dashboards (if implemented).

<!-- agent-readonly:guidance -->
## AI Update Checklist
1. Validate flows against the latest integration contracts or diagrams.
2. Update authentication, scopes, or rate limits when they change.
3. Capture recent incidents or lessons learned that influenced reliability.
4. Link to runbooks or dashboards used during triage.

<!-- agent-readonly:sources -->
## Acceptable Sources
- Architecture diagrams, ADRs, integration playbooks.
- API specs, queue/topic definitions, infrastructure code.
- Postmortems or incident reviews impacting data movement.

<!-- agent-update:end -->

</file>
