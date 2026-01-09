import { DocumentationTemplateContext } from './types';
import { formatDirectoryStats, formatSymbolRef, buildSymbolTable, formatCodeLocation, wrapWithFrontMatter } from './common';
import * as path from 'path';

function renderSemanticLayers(context: DocumentationTemplateContext): string {
  const { semantics } = context;
  if (!semantics || !semantics.architecture.layers.length) {
    return '- *No architectural layers detected.*';
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

    // List exported symbols
    const topSymbols = layer.symbols
      .filter(s => s.exported);

    if (topSymbols.length > 0) {
      lines.push(`- **Key exports**:`);
      const repoRoot = context.repoStructure.rootPath;
      for (const sym of topSymbols) {
        const ref = formatSymbolRef(sym, repoRoot);
        const doc = sym.documentation ? ` — ${sym.documentation}` : '';
        lines.push(`  - ${ref} (${sym.kind})${doc}`);
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

  const repoRoot = context.repoStructure.rootPath;
  const lines: string[] = ['| Pattern | Confidence | Locations | Description |', '|---------|------------|-----------|-------------|'];

  for (const pattern of semantics.architecture.patterns) {
    const confidence = Math.round(pattern.confidence * 100);
    // Format locations with file refs
    const locationRefs = pattern.locations.map(l => {
      const relPath = path.relative(repoRoot, l.file);
      return `\`${l.symbol}\` ([${path.basename(l.file)}](${relPath}))`;
    });
    lines.push(`| ${pattern.name} | ${confidence}% | ${locationRefs.join(', ')} | ${pattern.description} |`);
  }

  return lines.join('\n');
}

function renderPublicAPI(context: DocumentationTemplateContext): string {
  const { semantics } = context;
  if (!semantics || !semantics.architecture.publicAPI.length) {
    return '- *No public API detected.*';
  }

  const repoRoot = context.repoStructure.rootPath;

  // Use buildSymbolTable for consistent formatting
  return buildSymbolTable(semantics.architecture.publicAPI, repoRoot, ['name', 'kind', 'location']);
}

function renderEntryPoints(context: DocumentationTemplateContext): string {
  const { semantics } = context;
  if (!semantics || !semantics.architecture.entryPoints.length) {
    return '- *No entry points detected.*';
  }

  const repoRoot = context.repoStructure.rootPath;
  return semantics.architecture.entryPoints.map(ep => {
    const relPath = path.relative(repoRoot, ep);
    return `- [\`${relPath}\`](${relPath})`;
  }).join('\n');
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
    : '- *No design patterns detected.*';

  const publicAPISection = hasSemantics
    ? renderPublicAPI(context)
    : '- *No public API detected.*';

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

  const content = `# Architecture Notes

Describe how the system is assembled and why the current design exists.
${semanticSection}
## System Architecture Overview

Summarize the top-level topology (monolith, modular service, microservices) and deployment model. Highlight how requests traverse the system and where control pivots between layers.

## Architectural Layers
${layersSection}

## Detected Design Patterns
${patternsSection}

## Entry Points
${entryPointsSection}

## Public API
${publicAPISection}

## Internal System Boundaries

Document seams between domains, bounded contexts, or service ownership. Note data ownership, synchronization strategies, and shared contract enforcement.

## External Service Dependencies

List SaaS platforms, third-party APIs, or infrastructure services the system relies on. Describe authentication methods, rate limits, and failure considerations for each dependency.

## Key Decisions & Trade-offs

Summarize architectural decisions, experiments, or ADR outcomes that shape the current design. Reference supporting documents and explain why selected approaches won over alternatives.

## Diagrams

Link architectural diagrams or add mermaid definitions here.

## Risks & Constraints

Document performance constraints, scaling considerations, or external system assumptions.

## Top Directories Snapshot
${directorySnapshot}

## Related Resources

- [Project Overview](./project-overview.md)
- Update [agents/README.md](../agents/README.md) when architecture changes.
`;

  return wrapWithFrontMatter(content);
}
