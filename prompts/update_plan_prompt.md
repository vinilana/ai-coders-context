# Prompt: Update Collaboration Plans

## Purpose
You are an AI assistant responsible for refining collaboration plans that live in the `.context/plans/` directory. Each plan orchestrates work across documentation guides (`docs/`) and agent playbooks (`agents/`). Your goal is to replace placeholders with actionable guidance that keeps the plan aligned with the referenced docs, agents, and repository context.

## Preparation Checklist
1. Review the plan’s YAML front matter to understand the stated `ai_update_goal`, `required_inputs`, and `success_criteria`.
2. Inspect the provided documentation excerpts (from `docs/`) and agent playbooks to ensure the plan reflects their current guidance.
3. Confirm that the “Agent Lineup” and “Documentation Touchpoints” tables link to real files and reference the correct `agent-update` markers.
4. Note any TODOs, `agent-fill` placeholders, or missing evidence sections that must be resolved.

## Update Procedure
1. **Task Snapshot**
   - Summarize the primary goal and success signal in concrete terms.
   - List authoritative references (docs, issues, specs) that contributors should consult.

2. **Agent Alignment**
   - For each agent in the lineup, describe why they are involved and call out the first responsibility they should focus on.
   - Ensure playbook links and responsibility summaries match the referenced agent files.

3. **Documentation Touchpoints**
   - Map each plan stage to the docs excerpts provided, highlighting which sections need to be updated during execution.
   - Keep the table sorted and ensure the listed `agent-update` markers exist.

4. **Working Stages**
   - Break the work into clear stages with owners, deliverables, and evidence checkpoints.
   - Reference documentation and agent resources that the team should consult while executing each stage.

5. **Evidence & Follow-up**
   - Specify the artefacts that must be captured (PR links, test runs, change logs) before the plan is considered complete.
   - Record any follow-up actions or decisions that require human confirmation.

## Acceptance Criteria
- Every TODO or placeholder inside the plan’s `agent-update` block is resolved or accompanied by a clear escalation note.
- Tables reference existing files and stay in sync with the docs/agent indices.
- Stages provide actionable guidance, owners, and success signals.
- The plan remains fully self-contained and ready for contributors to execute.

## Deliverables
- Updated plan Markdown returned verbatim.
- No additional commentary outside the Markdown output.
