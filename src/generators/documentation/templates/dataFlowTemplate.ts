/**
 * REFERENCE ONLY - This file is not used by generators anymore.
 *
 * Scaffold structures are now defined in:
 * src/generators/shared/scaffoldStructures.ts
 *
 * This file serves as historical reference for the structure/content
 * that should be generated for this document type.
 *
 * @deprecated Since v2.0.0 scaffold system
 */
import * as path from 'path';
import { DocumentationTemplateContext } from './types';
import { formatInlineDirectoryList, wrapWithFrontMatter } from './common';

function renderModuleDependencies(context: DocumentationTemplateContext): string {
  const { semantics, repoStructure } = context;
  if (!semantics || !semantics.dependencies?.graph) {
    return '- *No module dependencies detected.*';
  }

  const repoRoot = repoStructure.rootPath;
  const graph = semantics.dependencies.graph;

  if (graph.size === 0) {
    return '- *No module dependencies detected.*';
  }

  // Group dependencies by top-level directory
  const moduleGroups = new Map<string, Set<string>>();

  for (const [source, targets] of graph) {
    const relSource = path.relative(repoRoot, source);
    const sourceDir = relSource.split('/')[0] || relSource;

    for (const target of targets) {
      const relTarget = path.relative(repoRoot, target);
      const targetDir = relTarget.split('/')[0] || relTarget;

      if (sourceDir !== targetDir) {
        const key = sourceDir;
        const deps = moduleGroups.get(key) || new Set();
        deps.add(targetDir);
        moduleGroups.set(key, deps);
      }
    }
  }

  if (moduleGroups.size === 0) {
    return '- *No cross-module dependencies detected.*';
  }

  const lines: string[] = [];
  for (const [module, deps] of moduleGroups) {
    const depList = Array.from(deps).sort().map(d => `\`${d}\``).join(', ');
    lines.push(`- **${module}/** → ${depList}`);
  }

  return lines.join('\n');
}

function renderServiceLayer(context: DocumentationTemplateContext): string {
  const { semantics, repoStructure } = context;
  if (!semantics) {
    return '- *No service classes detected.*';
  }

  const repoRoot = repoStructure.rootPath;

  // Find service classes (classes ending in Service)
  const services = semantics.symbols.classes
    .filter(s => s.name.endsWith('Service') && s.exported);

  if (services.length === 0) {
    return '- *No service classes detected.*';
  }

  return services.map(sym => {
    const relPath = path.relative(repoRoot, sym.location.file);
    const doc = sym.documentation ? ` — ${sym.documentation}` : '';
    return `- [\`${sym.name}\`](${relPath}#L${sym.location.line})${doc}`;
  }).join('\n');
}

export function renderDataFlow(context: DocumentationTemplateContext): string {
  const moduleDependencies = renderModuleDependencies(context);
  const serviceLayer = renderServiceLayer(context);

  const content = `# Data Flow & Integrations

Explain how data enters, moves through, and exits the system, including interactions with external services.

## Module Dependencies
${moduleDependencies}

## Service Layer
${serviceLayer}

## High-level Flow

Summarize the primary pipeline from input to output. Reference diagrams or embed Mermaid definitions when available.

## Internal Movement

Describe how modules within ${formatInlineDirectoryList(context.topLevelDirectories)} collaborate (queues, events, RPC calls, shared databases).

## External Integrations

Document each integration with purpose, authentication, payload shapes, and retry strategy.

## Observability & Failure Modes

Describe metrics, traces, or logs that monitor the flow. Note backoff, dead-letter, or compensating actions when downstream systems fail.
`;

  return wrapWithFrontMatter(content);
}
