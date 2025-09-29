import { createFrontMatter } from './frontMatter';
import { buildDocumentMapTable, formatDirectoryList } from './common';
import { DocumentationTemplateContext } from './types';

export function renderIndex(context: DocumentationTemplateContext): string {
  const frontMatter = createFrontMatter({
    id: 'docs-index',
    goal: 'Keep the documentation map accurate so contributors and agents land on the right guide quickly.',
    requiredInputs: [
      'Current docs and agents directory listings',
      'Recent additions or removals across documentation assets',
      'Latest roadmap or release summary (if available)'
    ],
    successCriteria: [
      'Each linked guide exists and reflects its stated purpose',
      'Repository snapshot matches the real top-level structure',
      'Update checklist is confirmed before closing the task'
    ],
    relatedAgents: ['documentation-writer', 'architect-specialist']
  });

  const directoryList = formatDirectoryList(context, false);
  const documentMap = buildDocumentMapTable(context.guides);
  const navigationList = context.guides
    .map(guide => `- [${guide.title}](./${guide.file})`)
    .join('\n') || '- *No guides selected.*';

  return `${frontMatter}
<!-- agent-update:start:docs-index -->
# Documentation Index

Welcome to the repository knowledge base. Start with the project overview, then dive into specific guides as needed.

## Core Guides
${navigationList}

## Repository Snapshot
${directoryList || '*Top-level directories will appear here once the repository contains subfolders.*'}

## Document Map
${documentMap}

<!-- agent-readonly:guidance -->
## AI Update Checklist
1. Gather context with \`git status -sb\` plus the latest commits touching \`docs/\` or \`agents/\`.
2. Compare the current directory tree against the table above; add or retire rows accordingly.
3. Update cross-links if guides moved or were renamed; keep anchor text concise.
4. Record sources consulted inside the commit or PR description for traceability.

<!-- agent-readonly:sources -->
## Acceptable Sources
- Repository tree and \`package.json\` scripts for canonical command names.
- Maintainer-approved issues, RFCs, or product briefs referenced in the repo.
- Release notes or changelog entries that announce documentation changes.

<!-- agent-update:end -->
`;
}
