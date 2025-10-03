import { buildDocumentMapTable, formatDirectoryList } from './common';
import { DocumentationTemplateContext } from './types';

export function renderIndex(context: DocumentationTemplateContext): string {

  const directoryList = formatDirectoryList(context, false);
  const documentMap = buildDocumentMapTable(context.guides);
  const navigationList = context.guides
    .map(guide => `- [${guide.title}](./${guide.file})`)
    .join('\n') || '- *No guides selected.*';

  return `
# Documentation Index

Welcome to the repository knowledge base. Start with the project overview, then dive into specific guides as needed.

## Core Guides
${navigationList}

## Repository Snapshot
${directoryList || '*Top-level directories will appear here once the repository contains subfolders.*'}

## Document Map
${documentMap}

## JSON Context Pack
- \`../context.json\` — Repository-wide summary for AI agents and documentation runs.
- \`../features/\` — Feature-level JSON context files for targeted tasks.

## Update Checklist
1. Gather context with \`git status -sb\` plus the latest commits touching \`docs/\` or \`agents/\`.
2. Compare the current directory tree against the table above; add or retire rows accordingly.
3. Update cross-links if guides moved or were renamed; keep anchor text concise.
4. Record sources consulted inside the commit or PR description for traceability.

## Recommended Sources
- Repository tree and \`package.json\` scripts for canonical command names.
- Maintainer-approved issues, RFCs, or product briefs referenced in the repo.
- Release notes or changelog entries that announce documentation changes.

`;
}
