export const UPDATE_SCAFFOLD_PROMPT_FALLBACK = `# Prompt: Update Repository Documentation and Agent Playbooks

## Purpose
You are an AI assistant responsible for refreshing the documentation (\`docs/\`) and agent playbooks (\`agents/\`). Your goal is to bring every guide up to date with the latest repository state and maintain cross-references between docs and agent instructions.

## Context Gathering
1. Review the repository structure and recent changes.
2. Inspect \`package.json\`, CI configuration, and any release or roadmap notes.
3. Check \`docs/README.md\` for the current document map.

## Update Procedure
1. **Update Documentation**
   - Replace TODO placeholders with accurate, current information.
   - Verify that links between docs remain valid.
   - If you add new guides or sections, update \`docs/README.md\`.

2. **Agent Playbook Alignment**
   - For each change in \`docs/\`, adjust the related \`agents/*.md\` playbooks.
   - Update responsibilities, best practices, and documentation touchpoints.

## Acceptance Criteria
- No unresolved TODO placeholders remain unless they require explicit human input.
- Agent playbooks list accurate responsibilities and best practices.
- Changes are self-contained, well-formatted Markdown.

## Deliverables
- Updated Markdown files.
`;

export const UPDATE_PLAN_PROMPT_FALLBACK = `# Prompt: Update Collaboration Plans

## Purpose
You are an AI assistant responsible for refining collaboration plans. Each plan orchestrates work across documentation guides (\`docs/\`) and agent playbooks (\`agents/\`). Your goal is to replace TODOs with actionable guidance.

## Update Procedure
1. **Task Snapshot**
   - Summarize the primary goal and success signal in concrete terms.
   - List authoritative references (docs, issues, specs).

2. **Agent Alignment**
   - For each agent in the lineup, describe why they are involved.
   - Ensure playbook links match the referenced agent files.

3. **Documentation Touchpoints**
   - Map each plan stage to the docs excerpts provided.

4. **Working Phases**
   - Break the work into sequential phases with numbered steps and deliverables.
   - Reference documentation and agent resources for each phase.

5. **Evidence & Follow-up**
   - Specify artefacts to capture (PR links, test runs, change logs).
   - Record any follow-up actions.

## Acceptance Criteria
- TODOs are resolved with concrete information.
- Tables reference existing files.
- Phases provide actionable guidance.

## Deliverables
- Updated plan Markdown returned verbatim.
`;
