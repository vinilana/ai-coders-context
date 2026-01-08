/**
 * SemanticContextBuilder - Generates optimized context strings for LLM prompts
 *
 * Uses pre-computed semantic analysis to provide rich context without
 * requiring the LLM to explore the codebase with tools.
 */

import * as path from 'path';
import { CodebaseAnalyzer } from './codebaseAnalyzer';
import type {
  SemanticContext,
  ExtractedSymbol,
  ArchitectureLayer,
  DetectedPattern,
  AnalyzerOptions,
} from './types';

export interface ContextBuilderOptions extends AnalyzerOptions {
  /** Maximum symbols to include per category */
  maxSymbolsPerCategory?: number;
  /** Include full documentation strings */
  includeDocumentation?: boolean;
  /** Include parameter and return type info */
  includeSignatures?: boolean;
  /** Maximum total context length (chars) */
  maxContextLength?: number;
}

export type ContextFormat = 'documentation' | 'playbook' | 'plan' | 'compact';

const DEFAULT_OPTIONS: Required<ContextBuilderOptions> = {
  useLSP: false,
  languages: ['typescript', 'javascript', 'python', 'go'],
  exclude: ['node_modules', 'dist', 'build', '.git', 'coverage'],
  include: [],
  maxFiles: 5000,
  cacheEnabled: true,
  maxSymbolsPerCategory: 50,
  includeDocumentation: true,
  includeSignatures: true,
  maxContextLength: 32000,
};

export class SemanticContextBuilder {
  private analyzer: CodebaseAnalyzer;
  private options: Required<ContextBuilderOptions>;
  private cachedContext: SemanticContext | null = null;
  private cachedProjectPath: string | null = null;

  constructor(options: ContextBuilderOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.analyzer = new CodebaseAnalyzer(this.options);
  }

  /**
   * Analyze the codebase and cache the result
   */
  async analyze(projectPath: string): Promise<SemanticContext> {
    if (this.cachedContext && this.cachedProjectPath === projectPath) {
      return this.cachedContext;
    }

    this.cachedContext = await this.analyzer.analyze(projectPath);
    this.cachedProjectPath = projectPath;
    return this.cachedContext;
  }

  /**
   * Build context string for documentation generation
   */
  async buildDocumentationContext(
    projectPath: string,
    targetFile?: string
  ): Promise<string> {
    const context = await this.analyze(projectPath);
    const sections: string[] = [];

    // Header
    sections.push('# Codebase Context for Documentation\n');

    // Stats
    sections.push(this.formatStats(context));

    // Architecture overview
    sections.push(this.formatArchitectureOverview(context));

    // Public API (most important for docs)
    sections.push(this.formatPublicAPI(context, projectPath));

    // If target file specified, add focused context
    if (targetFile) {
      sections.push(this.formatTargetFileContext(context, targetFile, projectPath));
    }

    // Key symbols by category
    sections.push(this.formatSymbolIndex(context, projectPath));

    // Dependency overview
    sections.push(this.formatDependencyOverview(context, projectPath));

    return this.truncateToLimit(sections.join('\n'));
  }

  /**
   * Build context string for agent playbook generation
   */
  async buildPlaybookContext(
    projectPath: string,
    agentType: string
  ): Promise<string> {
    const context = await this.analyze(projectPath);
    const sections: string[] = [];

    // Header
    sections.push(`# Codebase Context for ${agentType} Agent\n`);

    // Stats
    sections.push(this.formatStats(context));

    // Relevant layers for this agent type
    const relevantLayers = this.getRelevantLayersForAgent(agentType, context);
    sections.push(this.formatRelevantLayers(relevantLayers, projectPath));

    // Relevant patterns
    const relevantPatterns = this.getRelevantPatternsForAgent(agentType, context);
    sections.push(this.formatRelevantPatterns(relevantPatterns));

    // Key files for this agent type
    sections.push(this.formatKeyFilesForAgent(agentType, context, projectPath));

    // Relevant symbols
    sections.push(this.formatRelevantSymbolsForAgent(agentType, context, projectPath));

    return this.truncateToLimit(sections.join('\n'));
  }

  /**
   * Build context string for development plan generation
   */
  async buildPlanContext(
    projectPath: string,
    planGoal?: string
  ): Promise<string> {
    const context = await this.analyze(projectPath);
    const sections: string[] = [];

    // Header
    sections.push('# Codebase Context for Development Planning\n');
    if (planGoal) {
      sections.push(`**Plan Goal**: ${planGoal}\n`);
    }

    // Stats
    sections.push(this.formatStats(context));

    // Full architecture overview
    sections.push(this.formatFullArchitecture(context, projectPath));

    // Detected patterns
    sections.push(this.formatAllPatterns(context));

    // Entry points
    sections.push(this.formatEntryPoints(context));

    // Layer dependencies (important for planning)
    sections.push(this.formatLayerDependencies(context));

    // Symbol summary by layer
    sections.push(this.formatSymbolsByLayer(context, projectPath));

    return this.truncateToLimit(sections.join('\n'));
  }

  /**
   * Build a compact context suitable for any purpose
   */
  async buildCompactContext(projectPath: string): Promise<string> {
    const context = await this.analyze(projectPath);
    const sections: string[] = [];

    sections.push('# Codebase Summary\n');
    sections.push(this.formatStats(context));
    sections.push(this.formatArchitectureOverview(context));
    sections.push(this.formatCompactSymbolList(context, projectPath));

    return this.truncateToLimit(sections.join('\n'));
  }

  /**
   * Get raw semantic context for custom processing
   */
  async getSemanticContext(projectPath: string): Promise<SemanticContext> {
    return this.analyze(projectPath);
  }

  // ============ Formatting Methods ============

  private formatStats(context: SemanticContext): string {
    const { stats } = context;
    const lines = [
      '## Overview\n',
      `- **Files**: ${stats.totalFiles}`,
      `- **Symbols**: ${stats.totalSymbols}`,
      `- **Languages**: ${Object.entries(stats.languageBreakdown)
        .map(([ext, count]) => `${ext}(${count})`)
        .join(', ')}`,
      '',
    ];
    return lines.join('\n');
  }

  private formatArchitectureOverview(context: SemanticContext): string {
    const { architecture } = context;
    if (architecture.layers.length === 0) {
      return '';
    }

    const lines = ['## Architecture\n'];

    for (const layer of architecture.layers.slice(0, 8)) {
      const deps = layer.dependsOn.length > 0
        ? ` (depends on: ${layer.dependsOn.join(', ')})`
        : '';
      lines.push(`- **${layer.name}**: ${layer.symbols.length} symbols${deps}`);
    }

    lines.push('');
    return lines.join('\n');
  }

  private formatPublicAPI(context: SemanticContext, projectPath: string): string {
    const { architecture } = context;
    if (architecture.publicAPI.length === 0) {
      return '';
    }

    const lines = ['## Public API\n'];
    const limited = architecture.publicAPI.slice(0, this.options.maxSymbolsPerCategory);

    for (const symbol of limited) {
      lines.push(this.formatSymbolLine(symbol, projectPath));
    }

    if (architecture.publicAPI.length > limited.length) {
      lines.push(`... and ${architecture.publicAPI.length - limited.length} more exports`);
    }

    lines.push('');
    return lines.join('\n');
  }

  private formatSymbolIndex(context: SemanticContext, projectPath: string): string {
    const { symbols } = context;
    const lines = ['## Symbol Index\n'];

    const categories = [
      { name: 'Classes', items: symbols.classes },
      { name: 'Interfaces', items: symbols.interfaces },
      { name: 'Functions', items: symbols.functions },
      { name: 'Types', items: symbols.types },
      { name: 'Enums', items: symbols.enums },
    ];

    for (const cat of categories) {
      if (cat.items.length === 0) continue;

      lines.push(`### ${cat.name}\n`);
      const limited = cat.items.slice(0, this.options.maxSymbolsPerCategory);

      for (const symbol of limited) {
        lines.push(this.formatSymbolLine(symbol, projectPath));
      }

      if (cat.items.length > limited.length) {
        lines.push(`... and ${cat.items.length - limited.length} more`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private formatSymbolLine(symbol: ExtractedSymbol, projectPath: string): string {
    const relPath = path.relative(projectPath, symbol.location.file);
    const loc = `${relPath}:${symbol.location.line}`;
    const exported = symbol.exported ? ' (exported)' : '';

    let signature = '';
    if (this.options.includeSignatures && symbol.parameters) {
      const params = symbol.parameters
        .map((p) => `${p.name}${p.type ? `: ${p.type}` : ''}`)
        .join(', ');
      const ret = symbol.returnType ? `: ${symbol.returnType}` : '';
      signature = `(${params})${ret}`;
    }

    let doc = '';
    if (this.options.includeDocumentation && symbol.documentation) {
      const shortDoc = symbol.documentation.split('\n')[0].slice(0, 80);
      doc = ` - ${shortDoc}`;
    }

    return `- \`${symbol.name}\`${signature}${exported} @ ${loc}${doc}`;
  }

  private formatTargetFileContext(
    context: SemanticContext,
    targetFile: string,
    projectPath: string
  ): string {
    const lines = [`## Target File: ${targetFile}\n`];

    // Find symbols in or related to target file
    const allSymbols = [
      ...context.symbols.classes,
      ...context.symbols.interfaces,
      ...context.symbols.functions,
      ...context.symbols.types,
      ...context.symbols.enums,
    ];

    const relatedSymbols = allSymbols.filter((s) => {
      const relPath = path.relative(projectPath, s.location.file);
      return relPath.includes(targetFile) || targetFile.includes(relPath);
    });

    if (relatedSymbols.length > 0) {
      lines.push('### Symbols in this file:\n');
      for (const symbol of relatedSymbols) {
        lines.push(this.formatSymbolLine(symbol, projectPath));
      }
    }

    lines.push('');
    return lines.join('\n');
  }

  private formatDependencyOverview(context: SemanticContext, projectPath: string): string {
    const { dependencies } = context;
    const lines = ['## Key Dependencies\n'];

    // Find most imported files
    const importCounts = new Map<string, number>();
    for (const [, importers] of dependencies.reverseGraph) {
      for (const importer of importers) {
        const count = importCounts.get(importer) || 0;
        importCounts.set(importer, count + 1);
      }
    }

    const sorted = [...importCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    for (const [file, count] of sorted) {
      const relPath = path.relative(projectPath, file);
      lines.push(`- \`${relPath}\`: imported by ${count} files`);
    }

    lines.push('');
    return lines.join('\n');
  }

  private formatRelevantLayers(
    layers: ArchitectureLayer[],
    projectPath: string
  ): string {
    if (layers.length === 0) return '';

    const lines = ['## Relevant Layers\n'];

    for (const layer of layers) {
      lines.push(`### ${layer.name}\n`);
      lines.push(`${layer.description}\n`);
      lines.push(`**Directories**: ${layer.directories.join(', ')}`);
      lines.push(`**Key Symbols** (${layer.symbols.length} total):\n`);

      const keySymbols = layer.symbols
        .filter((s) => s.exported)
        .slice(0, 10);

      for (const symbol of keySymbols) {
        lines.push(this.formatSymbolLine(symbol, projectPath));
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private formatRelevantPatterns(patterns: DetectedPattern[]): string {
    if (patterns.length === 0) return '';

    const lines = ['## Detected Patterns\n'];

    for (const pattern of patterns) {
      const confidence = Math.round(pattern.confidence * 100);
      lines.push(`### ${pattern.name} (${confidence}% confidence)\n`);
      lines.push(`${pattern.description}\n`);
      lines.push('**Locations**:');
      for (const loc of pattern.locations.slice(0, 5)) {
        lines.push(`- \`${loc.symbol}\` in ${loc.file}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private formatKeyFilesForAgent(
    agentType: string,
    context: SemanticContext,
    projectPath: string
  ): string {
    const keyPatterns = this.getKeyPatternsForAgent(agentType);
    const allSymbols = [
      ...context.symbols.classes,
      ...context.symbols.interfaces,
      ...context.symbols.functions,
    ];

    const relevantFiles = new Set<string>();
    for (const symbol of allSymbols) {
      const relPath = path.relative(projectPath, symbol.location.file);
      if (keyPatterns.some((p) => p.test(relPath) || p.test(symbol.name))) {
        relevantFiles.add(relPath);
      }
    }

    if (relevantFiles.size === 0) return '';

    const lines = ['## Key Files\n'];
    for (const file of [...relevantFiles].slice(0, 20)) {
      lines.push(`- \`${file}\``);
    }
    lines.push('');

    return lines.join('\n');
  }

  private formatRelevantSymbolsForAgent(
    agentType: string,
    context: SemanticContext,
    projectPath: string
  ): string {
    const keyPatterns = this.getKeyPatternsForAgent(agentType);
    const allSymbols = [
      ...context.symbols.classes,
      ...context.symbols.interfaces,
      ...context.symbols.functions,
    ];

    const relevantSymbols = allSymbols.filter((s) => {
      const relPath = path.relative(projectPath, s.location.file);
      return keyPatterns.some((p) => p.test(relPath) || p.test(s.name));
    });

    if (relevantSymbols.length === 0) return '';

    const lines = ['## Relevant Symbols\n'];
    for (const symbol of relevantSymbols.slice(0, 30)) {
      lines.push(this.formatSymbolLine(symbol, projectPath));
    }
    lines.push('');

    return lines.join('\n');
  }

  private formatFullArchitecture(
    context: SemanticContext,
    projectPath: string
  ): string {
    const { architecture } = context;
    const lines = ['## Architecture\n'];

    if (architecture.layers.length > 0) {
      lines.push('### Layers\n');
      for (const layer of architecture.layers) {
        lines.push(`**${layer.name}**`);
        lines.push(`- ${layer.description}`);
        lines.push(`- Directories: ${layer.directories.join(', ')}`);
        lines.push(`- Symbols: ${layer.symbols.length}`);
        if (layer.dependsOn.length > 0) {
          lines.push(`- Depends on: ${layer.dependsOn.join(', ')}`);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  private formatAllPatterns(context: SemanticContext): string {
    const { architecture } = context;
    if (architecture.patterns.length === 0) return '';

    const lines = ['## Design Patterns\n'];
    for (const pattern of architecture.patterns) {
      const confidence = Math.round(pattern.confidence * 100);
      lines.push(
        `- **${pattern.name}** (${confidence}%): ${pattern.locations.length} occurrences - ${pattern.description}`
      );
    }
    lines.push('');

    return lines.join('\n');
  }

  private formatEntryPoints(context: SemanticContext): string {
    const { architecture } = context;
    if (architecture.entryPoints.length === 0) return '';

    const lines = ['## Entry Points\n'];
    for (const ep of architecture.entryPoints) {
      lines.push(`- \`${ep}\``);
    }
    lines.push('');

    return lines.join('\n');
  }

  private formatLayerDependencies(context: SemanticContext): string {
    const { architecture } = context;
    const layersWithDeps = architecture.layers.filter(
      (l) => l.dependsOn.length > 0
    );

    if (layersWithDeps.length === 0) return '';

    const lines = ['## Layer Dependencies\n'];
    for (const layer of layersWithDeps) {
      lines.push(`- ${layer.name} → ${layer.dependsOn.join(', ')}`);
    }
    lines.push('');

    return lines.join('\n');
  }

  private formatSymbolsByLayer(
    context: SemanticContext,
    projectPath: string
  ): string {
    const { architecture } = context;
    if (architecture.layers.length === 0) return '';

    const lines = ['## Symbols by Layer\n'];

    for (const layer of architecture.layers) {
      lines.push(`### ${layer.name}\n`);

      const exported = layer.symbols.filter((s) => s.exported).slice(0, 15);
      for (const symbol of exported) {
        lines.push(this.formatSymbolLine(symbol, projectPath));
      }

      if (layer.symbols.length > exported.length) {
        lines.push(`... and ${layer.symbols.length - exported.length} more`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private formatCompactSymbolList(
    context: SemanticContext,
    projectPath: string
  ): string {
    const lines = ['## Key Symbols\n'];

    const allExported = [
      ...context.symbols.classes,
      ...context.symbols.interfaces,
      ...context.symbols.functions,
    ].filter((s) => s.exported);

    for (const symbol of allExported.slice(0, 30)) {
      const relPath = path.relative(projectPath, symbol.location.file);
      lines.push(`- ${symbol.kind}: \`${symbol.name}\` @ ${relPath}:${symbol.location.line}`);
    }

    lines.push('');
    return lines.join('\n');
  }

  // ============ Helper Methods ============

  private getRelevantLayersForAgent(
    agentType: string,
    context: SemanticContext
  ): ArchitectureLayer[] {
    const layerPriority: Record<string, string[]> = {
      'code-reviewer': ['Services', 'Controllers', 'Utils'],
      'bug-fixer': ['Services', 'Controllers', 'Utils', 'Models'],
      'feature-developer': ['Services', 'Controllers', 'Models', 'Components'],
      'refactoring-specialist': ['Services', 'Utils', 'Models'],
      'test-writer': ['Services', 'Controllers', 'Utils'],
      'documentation-writer': ['Services', 'Controllers', 'Models', 'Utils'],
      'performance-optimizer': ['Services', 'Repositories', 'Utils'],
      'security-auditor': ['Controllers', 'Services', 'Config'],
      'backend-specialist': ['Services', 'Controllers', 'Repositories', 'Models'],
      'frontend-specialist': ['Components', 'Utils', 'Services'],
      'architect-specialist': ['Services', 'Controllers', 'Models', 'Config'],
      'devops-specialist': ['Config', 'Utils'],
      'database-specialist': ['Repositories', 'Models', 'Services'],
      'mobile-specialist': ['Components', 'Services', 'Utils'],
    };

    const priority = layerPriority[agentType] || ['Services', 'Utils'];
    return context.architecture.layers.filter((l) =>
      priority.includes(l.name)
    );
  }

  private getRelevantPatternsForAgent(
    agentType: string,
    context: SemanticContext
  ): DetectedPattern[] {
    const patternPriority: Record<string, string[]> = {
      'code-reviewer': ['Service Layer', 'Repository', 'Factory'],
      'refactoring-specialist': ['Factory', 'Builder', 'Singleton'],
      'architect-specialist': ['Service Layer', 'Repository', 'Controller', 'Factory'],
      'backend-specialist': ['Service Layer', 'Repository', 'Controller'],
      'database-specialist': ['Repository'],
    };

    const priority = patternPriority[agentType];
    if (!priority) return context.architecture.patterns;

    return context.architecture.patterns.filter((p) =>
      priority.includes(p.name)
    );
  }

  private getKeyPatternsForAgent(agentType: string): RegExp[] {
    const patterns: Record<string, RegExp[]> = {
      'code-reviewer': [/\.(ts|js|tsx|jsx)$/, /service/i, /controller/i],
      'bug-fixer': [/error/i, /exception/i, /handler/i, /\.test\./i],
      'feature-developer': [/service/i, /controller/i, /component/i],
      'refactoring-specialist': [/service/i, /util/i, /helper/i],
      'test-writer': [/\.test\./i, /\.spec\./i, /jest/i, /vitest/i],
      'documentation-writer': [/\.md$/i, /readme/i, /doc/i],
      'performance-optimizer': [/service/i, /repository/i, /cache/i],
      'security-auditor': [/auth/i, /security/i, /credential/i, /\.env/i],
      'backend-specialist': [/service/i, /controller/i, /api/i, /route/i],
      'frontend-specialist': [/component/i, /view/i, /page/i, /\.tsx$/],
      'architect-specialist': [/service/i, /factory/i, /config/i],
      'devops-specialist': [/docker/i, /ci/i, /deploy/i, /config/i],
      'database-specialist': [/model/i, /schema/i, /migration/i, /repository/i],
      'mobile-specialist': [/component/i, /screen/i, /\.tsx$/],
    };

    return patterns[agentType] || [/\.(ts|js)$/];
  }

  private truncateToLimit(content: string): string {
    if (content.length <= this.options.maxContextLength) {
      return content;
    }

    // Truncate at a line boundary
    const truncated = content.slice(0, this.options.maxContextLength);
    const lastNewline = truncated.lastIndexOf('\n');
    return truncated.slice(0, lastNewline) + '\n\n... (truncated)';
  }

  /**
   * Clear cached analysis
   */
  clearCache(): void {
    this.cachedContext = null;
    this.cachedProjectPath = null;
    this.analyzer.clearCache();
  }
}
