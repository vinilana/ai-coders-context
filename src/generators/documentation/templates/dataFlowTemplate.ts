import * as path from 'path';
import { DocumentationTemplateContext } from './types';
import { formatInlineDirectoryList } from './common';

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
    .filter(s => s.name.endsWith('Service') && s.exported)
    .slice(0, 10);

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

  return `<!-- agent-update:start:data-flow -->
# Data Flow & Integrations

Explain how data enters, moves through, and exits the system, including interactions with external services.

## Module Dependencies
${moduleDependencies}

## Service Layer
${serviceLayer}

## High-level Flow
- Summarize the primary pipeline from input to output. Reference diagrams or embed Mermaid definitions when available.

## Internal Movement
- Describe how modules within ${formatInlineDirectoryList(context.topLevelDirectories)} collaborate (queues, events, RPC calls, shared databases).

## External Integrations
- <!-- agent-fill:integration -->**Integration** — Purpose, authentication, payload shapes, retry strategy.<!-- /agent-fill -->

## Observability & Failure Modes
- Metrics, traces, or logs that monitor the flow.
- Backoff, dead-letter, or compensating actions when downstream systems fail.

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
`;
}
