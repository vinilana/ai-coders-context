# Prompt: Update Repository Documentation and Agent Playbooks

## Purpose
You are an AI assistant responsible for refreshing the documentation (`docs/`) and agent playbooks (`agents/`). Your goal is to bring every guide up to date with the latest repository state and maintain cross-references between docs and agent instructions.

## Context Gathering
1. Review the repository structure and recent changes.
2. Inspect `package.json`, CI configuration, and any release or roadmap notes.
3. Check `docs/README.md` for the current document map.

## Update Procedure
1. **Update Documentation**
   - Replace TODO placeholders with accurate, current information.
   - Verify that links between docs remain valid.
   - If you add new guides or sections, update `docs/README.md`.

2. **Agent Playbook Alignment**
   - For each change in `docs/`, adjust the related `agents/*.md` playbooks.
   - Update responsibilities, best practices, and documentation touchpoints.

## Acceptance Criteria
- No unresolved TODO placeholders remain unless they require explicit human input.
- Agent playbooks list accurate responsibilities and best practices.
- Changes are self-contained, well-formatted Markdown.

## Deliverables
- Updated Markdown files.
