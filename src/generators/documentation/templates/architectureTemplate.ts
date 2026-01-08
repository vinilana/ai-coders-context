import { DocumentationTemplateContext } from './types';
import { formatDirectoryStats } from './common';
import * as path from 'path';

function renderSemanticLayers(context: DocumentationTemplateContext): string {
  const { semantics } = context;
  if (!semantics || !semantics.architecture.layers.length) {
    return '- *No architectural layers detected. Add analysis with `--semantic` flag.*';
  }

  const lines: string[] = [];
  for (const layer of semantics.architecture.layers) {
    const symbolCount = layer.symbols.length;
    const exportedCount = layer.symbols.filter(s => s.exported).length;
    const deps = layer.dependsOn.length > 0 ? ` → depends on: ${layer.dependsOn.join(', ')}` : '';

    lines.push(`### ${layer.name}`);
    lines.push(`${layer.description}`);
    lines.push(`- **Directories**: ${layer.directories.map(d => `\`${d}\``).join(', ')}`);
    lines.push(`- **Symbols**: ${symbolCount} total, ${exportedCount} exported${deps}`);

    // List top exported symbols
    const topSymbols = layer.symbols
      .filter(s => s.exported)
      .slice(0, 5);

    if (topSymbols.length > 0) {
      lines.push(`- **Key exports**:`);
      for (const sym of topSymbols) {
        const relPath = path.basename(sym.location.file);
        lines.push(`  - \`${sym.name}\` (${sym.kind}) - ${relPath}:${sym.location.line}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

function renderDetectedPatterns(context: DocumentationTemplateContext): string {
  const { semantics } = context;
  if (!semantics || !semantics.architecture.patterns.length) {
    return '- *No design patterns detected yet.*';
  }

  const lines: string[] = ['| Pattern | Confidence | Occurrences | Description |', '|---------|------------|-------------|-------------|'];

  for (const pattern of semantics.architecture.patterns) {
    const confidence = Math.round(pattern.confidence * 100);
    const symbols = pattern.locations.map(l => l.symbol).slice(0, 3).join(', ');
    const more = pattern.locations.length > 3 ? ` (+${pattern.locations.length - 3} more)` : '';
    lines.push(`| ${pattern.name} | ${confidence}% | ${symbols}${more} | ${pattern.description} |`);
  }

  return lines.join('\n');
}

function renderPublicAPI(context: DocumentationTemplateContext): string {
  const { semantics } = context;
  if (!semantics || !semantics.architecture.publicAPI.length) {
    return '- *No public API detected.*';
  }

  const lines: string[] = ['| Symbol | Kind | Location |', '|--------|------|----------|'];

  const topAPI = semantics.architecture.publicAPI.slice(0, 20);
  for (const sym of topAPI) {
    const relPath = path.basename(sym.location.file);
    lines.push(`| \`${sym.name}\` | ${sym.kind} | ${relPath}:${sym.location.line} |`);
  }

  if (semantics.architecture.publicAPI.length > 20) {
    lines.push(`| ... | | +${semantics.architecture.publicAPI.length - 20} more |`);
  }

  return lines.join('\n');
}

function renderEntryPoints(context: DocumentationTemplateContext): string {
  const { semantics } = context;
  if (!semantics || !semantics.architecture.entryPoints.length) {
    return '- *No entry points detected.*';
  }

  return semantics.architecture.entryPoints.map(ep => `- \`${ep}\``).join('\n');
}

function renderSemanticStats(context: DocumentationTemplateContext): string {
  const { semantics } = context;
  if (!semantics) {
    return '';
  }

  const { stats, symbols } = semantics;
  const lines: string[] = [
    `- **Total Files Analyzed**: ${stats.totalFiles}`,
    `- **Total Symbols**: ${stats.totalSymbols}`,
    `- **Classes**: ${symbols.classes.length}`,
    `- **Interfaces**: ${symbols.interfaces.length}`,
    `- **Functions**: ${symbols.functions.length}`,
    `- **Types**: ${symbols.types.length}`,
    `- **Enums**: ${symbols.enums.length}`,
    `- **Analysis Time**: ${stats.analysisTimeMs}ms`,
  ];

  if (Object.keys(stats.languageBreakdown).length > 0) {
    lines.push('', '**Languages**:');
    for (const [ext, count] of Object.entries(stats.languageBreakdown)) {
      lines.push(`- ${ext}: ${count} files`);
    }
  }

  return lines.join('\n');
}

export function renderArchitectureNotes(context: DocumentationTemplateContext): string {
  const directorySnapshot = formatDirectoryStats(context.directoryStats);
  const hasSemantics = !!context.semantics;

  // Use semantic data if available, otherwise fall back to directory stats
  const layersSection = hasSemantics
    ? renderSemanticLayers(context)
    : directorySnapshot || '- *Add notes for each core component or module.*';

  const patternsSection = hasSemantics
    ? renderDetectedPatterns(context)
    : '- *Run with `--semantic` flag to detect design patterns.*';

  const publicAPISection = hasSemantics
    ? renderPublicAPI(context)
    : '- *Run with `--semantic` flag to discover public API.*';

  const entryPointsSection = hasSemantics
    ? renderEntryPoints(context)
    : '- *Document the main entry points of the application.*';

  const statsSection = hasSemantics
    ? renderSemanticStats(context)
    : '';

  const semanticSection = hasSemantics ? `
## Codebase Analysis
${statsSection}
` : '';

  return `<!-- agent-update:start:architecture-notes -->
# Architecture Notes

> TODO: Describe how the system is assembled and why the current design exists.
${semanticSection}
## System Architecture Overview
- Summarize the top-level topology (monolith, modular service, microservices) and deployment model.
- Highlight how requests traverse the system and where control pivots between layers.

## Architectural Layers
${layersSection}

## Detected Design Patterns
${patternsSection}

## Entry Points
${entryPointsSection}

## Public API
${publicAPISection}

## Internal System Boundaries
- Document seams between domains, bounded contexts, or service ownership.
- Note data ownership, synchronization strategies, and shared contract enforcement.

## External Service Dependencies
- List SaaS platforms, third-party APIs, or infrastructure services the system relies on.
- Describe authentication methods, rate limits, and failure considerations for each dependency.

## Key Decisions & Trade-offs
- Summarize architectural decisions, experiments, or ADR outcomes that shape the current design.
- Reference supporting documents and explain why selected approaches won over alternatives.

## Diagrams
- Link architectural diagrams or add mermaid definitions here.

## Risks & Constraints
- Document performance constraints, scaling considerations, or external system assumptions.

## Top Directories Snapshot
${directorySnapshot}

<!-- agent-readonly:guidance -->
## AI Update Checklist
1. Review ADRs, design docs, or major PRs for architectural changes.
2. Verify that each documented decision still holds; mark superseded choices clearly.
3. Capture upstream/downstream impacts (APIs, events, data flows).
4. Update Risks & Constraints with active incident learnings or TODO debt.
5. Link any new diagrams or dashboards referenced in recent work.

<!-- agent-readonly:sources -->
## Acceptable Sources
- ADR folders, \`/docs/architecture\` notes, or RFC threads.
- Dependency visualisations from build tooling or scripts.
- Issue tracker discussions vetted by maintainers.

## Related Resources
- [Project Overview](./project-overview.md)
- Update [agents/README.md](../agents/README.md) when architecture changes.

<!-- agent-update:end -->
`;
}
