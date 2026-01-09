import { AGENT_RESPONSIBILITIES, AGENT_BEST_PRACTICES } from '../agentConfig';
import { AgentType } from '../agentTypes';
import { formatDirectoryList } from '../../shared/directoryTemplateHelpers';
import { DocTouchpoint, KeySymbolInfo, AgentTemplateContext } from './types';
import { SemanticContext } from '../../../services/semantic';
import { wrapWithFrontMatter } from '../../documentation/templates/common';
import * as path from 'path';

/**
 * Format a symbol as a markdown link with line number
 * Output: [`SymbolName`](src/path/file.ts#L42)
 */
function formatSymbolLink(symbol: KeySymbolInfo, repoRoot: string): string {
  const relPath = path.relative(repoRoot, symbol.file);
  return `[\`${symbol.name}\`](${relPath}#L${symbol.line})`;
}

/**
 * Format a file path as a markdown link
 * Output: [`file.ts`](src/path/file.ts)
 */
function formatFileLink(filePath: string, repoRoot: string): string {
  const relPath = path.relative(repoRoot, filePath);
  return `[\`${relPath}\`](${relPath})`;
}

function renderKeySymbols(symbols: KeySymbolInfo[] | undefined, repoRoot: string): string {
  if (!symbols || symbols.length === 0) {
    return '- *No relevant symbols detected.*';
  }

  return symbols
    .map(s => {
      const ref = formatSymbolLink(s, repoRoot);
      return `- ${ref} (${s.kind})`;
    })
    .join('\n');
}

function renderArchitectureLayers(semantics: SemanticContext | undefined, repoRoot: string): string {
  if (!semantics || !semantics.architecture.layers.length) {
    return '';
  }

  const lines = ['## Architecture Context', ''];
  for (const layer of semantics.architecture.layers) {
    const symbolCount = layer.symbols.length;
    const dirs = layer.directories.map(d => `\`${d}\``).join(', ');
    lines.push(`### ${layer.name}`);
    lines.push(`${layer.description}`);
    lines.push(`- **Directories**: ${dirs}`);
    lines.push(`- **Symbols**: ${symbolCount} total`);

    // Add key exported symbols with links
    const keySymbols = layer.symbols
      .filter(s => s.exported);

    if (keySymbols.length > 0) {
      const symbolRefs = keySymbols.map(s => {
        const relPath = path.relative(repoRoot, s.location.file);
        return `[\`${s.name}\`](${relPath}#L${s.location.line})`;
      });
      lines.push(`- **Key exports**: ${symbolRefs.join(', ')}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function renderKeyFiles(semantics: SemanticContext | undefined, repoRoot: string): string {
  if (!semantics) {
    return '- *No key files detected.*';
  }

  const lines: string[] = [];

  // Entry points
  if (semantics.architecture.entryPoints.length > 0) {
    lines.push('**Entry Points:**');
    for (const ep of semantics.architecture.entryPoints) {
      lines.push(`- ${formatFileLink(ep, repoRoot)}`);
    }
  }

  // Pattern locations
  if (semantics.architecture.patterns.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('**Pattern Implementations:**');
    for (const pattern of semantics.architecture.patterns) {
      const locations = pattern.locations.map(loc => {
        const relPath = path.relative(repoRoot, loc.file);
        return `[\`${loc.symbol}\`](${relPath})`;
      });
      lines.push(`- ${pattern.name}: ${locations.join(', ')}`);
    }
  }

  // Key service files (classes ending in Service)
  const services = semantics.symbols.classes
    .filter(c => c.name.endsWith('Service') && c.exported);

  if (services.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('**Service Files:**');
    for (const svc of services) {
      const relPath = path.relative(repoRoot, svc.location.file);
      lines.push(`- [\`${svc.name}\`](${relPath}#L${svc.location.line})`);
    }
  }

  if (lines.length === 0) {
    return '- *No key files detected.*';
  }

  return lines.join('\n');
}

export function renderAgentPlaybook(
  agentType: AgentType,
  topLevelDirectories: string[],
  touchpoints: DocTouchpoint[],
  semantics?: SemanticContext,
  relevantSymbols?: KeySymbolInfo[],
  repoRoot: string = process.cwd()
): string {
  const title = formatTitle(agentType);
  const responsibilities = AGENT_RESPONSIBILITIES[agentType] || ['Clarify this agent\'s responsibilities.'];
  const bestPractices = AGENT_BEST_PRACTICES[agentType] || ['Document preferred workflows.'];
  const directoryList = formatDirectoryList(topLevelDirectories);

  const touchpointList = touchpoints
    .map(tp => `- [${tp.title}](${tp.path})`)
    .join('\n');

  const keySymbolsSection = renderKeySymbols(relevantSymbols, repoRoot);
  const keyFilesSection = renderKeyFiles(semantics, repoRoot);
  const architectureSection = renderArchitectureLayers(semantics, repoRoot);

  const content = `# ${title} Agent Playbook

## Mission
Describe how the ${title.toLowerCase()} agent supports the team and when to engage it.

## Responsibilities
${formatList(responsibilities)}

## Best Practices
${formatList(bestPractices)}

## Key Project Resources
- Documentation index: [docs/README.md](../docs/README.md)
- Agent handbook: [agents/README.md](./README.md)
- Agent knowledge base: [AGENTS.md](../../AGENTS.md)
- Contributor guide: [CONTRIBUTING.md](../../CONTRIBUTING.md)

## Repository Starting Points
${directoryList || '- Add directory highlights relevant to this agent.'}

## Key Files
${keyFilesSection}

${architectureSection}## Key Symbols for This Agent
${keySymbolsSection}

## Documentation Touchpoints
${touchpointList}

## Collaboration Checklist

1. Confirm assumptions with issue reporters or maintainers.
2. Review open pull requests affecting this area.
3. Update the relevant doc section listed above.
4. Capture learnings back in [docs/README.md](../docs/README.md).

## Hand-off Notes

Summarize outcomes, remaining risks, and suggested follow-up actions after the agent completes its work.
`;

  return wrapWithFrontMatter(content);
}

function formatTitle(agentType: string): string {
  return agentType
    .split('-')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatList(items: string[]): string {
  if (!items.length) {
    return '- _No entries defined yet._';
  }
  return items.map(item => `- ${item}`).join('\n');
}
