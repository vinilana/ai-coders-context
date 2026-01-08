/**
 * CodebaseAnalyzer - Main orchestrator for semantic code analysis
 *
 * Combines Tree-sitter for fast syntactic analysis with optional LSP
 * for deeper semantic understanding.
 */

import { glob } from 'glob';
import * as path from 'path';
import { TreeSitterLayer } from './treeSitter/treeSitterLayer';
import { LSPLayer } from './lsp/lspLayer';
import {
  SemanticContext,
  FileAnalysis,
  ExtractedSymbol,
  ArchitectureLayer,
  DetectedPattern,
  AnalyzerOptions,
  DependencyInfo,
  DEFAULT_EXCLUDE_PATTERNS,
  LANGUAGE_EXTENSIONS,
} from './types';

const DEFAULT_OPTIONS: Required<AnalyzerOptions> = {
  useLSP: false,
  languages: ['typescript', 'javascript', 'python', 'go'],
  exclude: DEFAULT_EXCLUDE_PATTERNS,
  include: [],
  maxFiles: 5000,
  cacheEnabled: true,
};

export class CodebaseAnalyzer {
  private treeSitter: TreeSitterLayer;
  private lspLayer?: LSPLayer;
  private options: Required<AnalyzerOptions>;

  constructor(options: AnalyzerOptions = {}) {
    this.treeSitter = new TreeSitterLayer();
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // Create LSPLayer if LSP mode is enabled
    if (this.options.useLSP) {
      this.lspLayer = new LSPLayer();
    }
  }

  async analyze(projectPath: string): Promise<SemanticContext> {
    const startTime = Date.now();

    // 1. Find all code files
    const files = await this.findCodeFiles(projectPath);

    // 2. Analyze with Tree-sitter
    const fileAnalyses = await this.analyzeFiles(files);

    // 3. Build base context
    const context = this.buildBaseContext(fileAnalyses, projectPath);

    // 4. Enhance with LSP if enabled (adds type info, references)
    if (this.lspLayer) {
      await this.enhanceWithLSP(context, projectPath);
    }

    // 5. Detect architecture and patterns
    context.architecture = this.detectArchitecture(fileAnalyses, projectPath);

    // 6. Calculate stats
    context.stats.analysisTimeMs = Date.now() - startTime;

    return context;
  }

  private async findCodeFiles(projectPath: string): Promise<string[]> {
    const extensions = Object.keys(LANGUAGE_EXTENSIONS);
    const patterns = extensions.map((ext) => `**/*${ext}`);

    const ignorePatterns = this.options.exclude.map((p) => `**/${p}/**`);

    const allFiles: string[] = [];

    for (const pattern of patterns) {
      try {
        const matches = await glob(pattern, {
          cwd: projectPath,
          ignore: ignorePatterns,
          absolute: true,
          nodir: true,
        });
        allFiles.push(...matches);
      } catch {
        // Ignore glob errors for individual patterns
      }
    }

    // Apply include filter if specified
    let filteredFiles = allFiles;
    if (this.options.include.length > 0) {
      filteredFiles = allFiles.filter((file) =>
        this.options.include.some((pattern) => file.includes(pattern))
      );
    }

    // Limit number of files
    return filteredFiles.slice(0, this.options.maxFiles);
  }

  private async analyzeFiles(files: string[]): Promise<Map<string, FileAnalysis>> {
    const analyses = new Map<string, FileAnalysis>();
    const batchSize = 50;

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((file) => this.treeSitter.analyzeFile(file))
      );

      for (const analysis of results) {
        analyses.set(analysis.filePath, analysis);
      }
    }

    return analyses;
  }

  private buildBaseContext(
    analyses: Map<string, FileAnalysis>,
    projectPath: string
  ): SemanticContext {
    const symbols = {
      classes: [] as ExtractedSymbol[],
      interfaces: [] as ExtractedSymbol[],
      functions: [] as ExtractedSymbol[],
      types: [] as ExtractedSymbol[],
      enums: [] as ExtractedSymbol[],
    };

    const dependencyGraph = new Map<string, string[]>();
    const reverseDependencyGraph = new Map<string, string[]>();
    const languageCount: Record<string, number> = {};

    for (const [file, analysis] of analyses) {
      // Count by language
      const ext = path.extname(file);
      languageCount[ext] = (languageCount[ext] || 0) + 1;

      // Categorize symbols
      for (const symbol of analysis.symbols) {
        switch (symbol.kind) {
          case 'class':
            symbols.classes.push(symbol);
            break;
          case 'interface':
            symbols.interfaces.push(symbol);
            break;
          case 'function':
            symbols.functions.push(symbol);
            break;
          case 'type':
            symbols.types.push(symbol);
            break;
          case 'enum':
            symbols.enums.push(symbol);
            break;
        }
      }

      // Build dependency graph
      const importedFiles = analysis.imports
        .map((imp) => this.resolveImportPath(file, imp.source, projectPath))
        .filter((f): f is string => f !== null);

      dependencyGraph.set(file, importedFiles);

      for (const importedFile of importedFiles) {
        if (!reverseDependencyGraph.has(importedFile)) {
          reverseDependencyGraph.set(importedFile, []);
        }
        reverseDependencyGraph.get(importedFile)!.push(file);
      }
    }

    return {
      symbols,
      dependencies: {
        graph: dependencyGraph,
        reverseGraph: reverseDependencyGraph,
      },
      architecture: {
        layers: [],
        patterns: [],
        entryPoints: [],
        publicAPI: [],
      },
      stats: {
        totalFiles: analyses.size,
        totalSymbols: Object.values(symbols).flat().length,
        languageBreakdown: languageCount,
        analysisTimeMs: 0,
      },
    };
  }

  private resolveImportPath(
    fromFile: string,
    importSource: string,
    projectPath: string
  ): string | null {
    // Skip external packages
    if (!importSource.startsWith('.') && !importSource.startsWith('/')) {
      return null;
    }

    const dir = path.dirname(fromFile);
    const resolved = path.resolve(dir, importSource);

    // Try common extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js', '.py', '.go'];

    for (const ext of extensions) {
      const withExt = resolved + ext;
      if (this.fileExistsSync(withExt)) {
        return withExt;
      }
    }

    // Try without extension (might already have it)
    if (this.fileExistsSync(resolved)) {
      return resolved;
    }

    return null;
  }

  private fileExistsSync(filePath: string): boolean {
    try {
      require('fs').accessSync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private detectArchitecture(
    analyses: Map<string, FileAnalysis>,
    projectPath: string
  ): SemanticContext['architecture'] {
    const layers = this.detectLayers(analyses, projectPath);
    const patterns = this.detectPatterns(analyses);
    const entryPoints = this.findEntryPoints(analyses, projectPath);
    const publicAPI = this.findPublicAPI(analyses);

    // Calculate layer dependencies
    this.calculateLayerDependencies(layers, analyses, projectPath);

    return { layers, patterns, entryPoints, publicAPI };
  }

  private detectLayers(
    analyses: Map<string, FileAnalysis>,
    projectPath: string
  ): ArchitectureLayer[] {
    const layerHeuristics = [
      {
        name: 'Services',
        patterns: [/services?/i, /use-?cases?/i, /application/i],
        description: 'Business logic and orchestration',
      },
      {
        name: 'Controllers',
        patterns: [/controllers?/i, /handlers?/i, /routes?/i, /api/i],
        description: 'Request handling and routing',
      },
      {
        name: 'Models',
        patterns: [/models?/i, /entities/i, /domain/i, /schemas?/i],
        description: 'Data structures and domain objects',
      },
      {
        name: 'Repositories',
        patterns: [/repositor/i, /data/i, /database/i, /persistence/i],
        description: 'Data access and persistence',
      },
      {
        name: 'Utils',
        patterns: [/utils?/i, /helpers?/i, /lib/i, /common/i, /shared/i],
        description: 'Shared utilities and helpers',
      },
      {
        name: 'Generators',
        patterns: [/generators?/i, /builders?/i, /factories?/i],
        description: 'Content and object generation',
      },
      {
        name: 'Components',
        patterns: [/components?/i, /views?/i, /pages?/i, /screens?/i],
        description: 'UI components and views',
      },
      {
        name: 'Config',
        patterns: [/config/i, /settings?/i, /constants?/i],
        description: 'Configuration and constants',
      },
    ];

    const layers: ArchitectureLayer[] = [];
    const filesByLayer = new Map<string, string[]>();

    for (const [file] of analyses) {
      const relativePath = path.relative(projectPath, file);

      for (const heuristic of layerHeuristics) {
        if (heuristic.patterns.some((p) => p.test(relativePath))) {
          if (!filesByLayer.has(heuristic.name)) {
            filesByLayer.set(heuristic.name, []);
          }
          filesByLayer.get(heuristic.name)!.push(file);
          break;
        }
      }
    }

    for (const [layerName, files] of filesByLayer) {
      const heuristic = layerHeuristics.find((h) => h.name === layerName)!;
      const layerSymbols: ExtractedSymbol[] = [];
      const directories = new Set<string>();

      for (const file of files) {
        const analysis = analyses.get(file);
        if (analysis) {
          layerSymbols.push(...analysis.symbols);
          directories.add(path.dirname(path.relative(projectPath, file)));
        }
      }

      if (layerSymbols.length > 0) {
        layers.push({
          name: layerName,
          description: heuristic.description,
          directories: [...directories],
          symbols: layerSymbols,
          dependsOn: [],
        });
      }
    }

    return layers;
  }

  private detectPatterns(analyses: Map<string, FileAnalysis>): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const allSymbols = [...analyses.values()].flatMap((a) => a.symbols);

    // Factory Pattern
    const factories = allSymbols.filter(
      (s) => /Factory$/i.test(s.name) && s.kind === 'class'
    );
    if (factories.length > 0) {
      patterns.push({
        name: 'Factory',
        confidence: 0.9,
        locations: factories.map((s) => ({ file: s.location.file, symbol: s.name })),
        description: 'Creates instances of related objects without specifying concrete classes',
      });
    }

    // Singleton Pattern
    const singletons = allSymbols.filter(
      (s) => s.kind === 'class' && /Singleton|Instance/i.test(s.name)
    );
    if (singletons.length > 0) {
      patterns.push({
        name: 'Singleton',
        confidence: 0.7,
        locations: singletons.map((s) => ({ file: s.location.file, symbol: s.name })),
        description: 'Ensures a class has only one instance',
      });
    }

    // Repository Pattern
    const repositories = allSymbols.filter(
      (s) => /Repository$/i.test(s.name) && (s.kind === 'class' || s.kind === 'interface')
    );
    if (repositories.length > 0) {
      patterns.push({
        name: 'Repository',
        confidence: 0.9,
        locations: repositories.map((s) => ({ file: s.location.file, symbol: s.name })),
        description: 'Abstracts data access logic',
      });
    }

    // Service Layer Pattern
    const services = allSymbols.filter(
      (s) => /Service$/i.test(s.name) && s.kind === 'class'
    );
    if (services.length > 0) {
      patterns.push({
        name: 'Service Layer',
        confidence: 0.85,
        locations: services.map((s) => ({ file: s.location.file, symbol: s.name })),
        description: 'Encapsulates business logic in service classes',
      });
    }

    // Controller Pattern
    const controllers = allSymbols.filter(
      (s) => /Controller$/i.test(s.name) && s.kind === 'class'
    );
    if (controllers.length > 0) {
      patterns.push({
        name: 'Controller',
        confidence: 0.9,
        locations: controllers.map((s) => ({ file: s.location.file, symbol: s.name })),
        description: 'Handles incoming requests and returns responses',
      });
    }

    // Builder Pattern
    const builders = allSymbols.filter(
      (s) => /Builder$/i.test(s.name) && s.kind === 'class'
    );
    if (builders.length > 0) {
      patterns.push({
        name: 'Builder',
        confidence: 0.85,
        locations: builders.map((s) => ({ file: s.location.file, symbol: s.name })),
        description: 'Separates object construction from its representation',
      });
    }

    // Observer Pattern (event emitters)
    const observers = allSymbols.filter(
      (s) =>
        (s.kind === 'class' || s.kind === 'interface') &&
        /Observer|Listener|Emitter|Handler$/i.test(s.name)
    );
    if (observers.length > 0) {
      patterns.push({
        name: 'Observer',
        confidence: 0.75,
        locations: observers.map((s) => ({ file: s.location.file, symbol: s.name })),
        description: 'Defines a subscription mechanism to notify multiple objects',
      });
    }

    return patterns;
  }

  private findEntryPoints(
    analyses: Map<string, FileAnalysis>,
    projectPath: string
  ): string[] {
    const entryPoints: string[] = [];
    const entryPatterns = [
      /^(index|main|app|server|cli)\.(ts|js|tsx|jsx)$/,
      /src\/(index|main|app)\.(ts|js)$/,
      /^bin\//,
    ];

    for (const [file] of analyses) {
      const relativePath = path.relative(projectPath, file);
      const basename = path.basename(file);

      if (entryPatterns.some((p) => p.test(basename) || p.test(relativePath))) {
        entryPoints.push(relativePath);
      }
    }

    return entryPoints;
  }

  private findPublicAPI(analyses: Map<string, FileAnalysis>): ExtractedSymbol[] {
    const publicSymbols: ExtractedSymbol[] = [];

    for (const [, analysis] of analyses) {
      for (const symbol of analysis.symbols) {
        if (
          symbol.exported &&
          (symbol.kind === 'class' ||
            symbol.kind === 'interface' ||
            symbol.kind === 'function' ||
            symbol.kind === 'type')
        ) {
          publicSymbols.push(symbol);
        }
      }
    }

    // Sort by name for consistency
    return publicSymbols.sort((a, b) => a.name.localeCompare(b.name));
  }

  private calculateLayerDependencies(
    layers: ArchitectureLayer[],
    analyses: Map<string, FileAnalysis>,
    projectPath: string
  ): void {
    const fileToLayer = new Map<string, string>();

    for (const layer of layers) {
      for (const dir of layer.directories) {
        for (const [file] of analyses) {
          const relFile = path.relative(projectPath, file);
          if (relFile.startsWith(dir)) {
            fileToLayer.set(file, layer.name);
          }
        }
      }
    }

    for (const layer of layers) {
      const dependsOn = new Set<string>();

      for (const symbol of layer.symbols) {
        const file = symbol.location.file;
        const analysis = analyses.get(file);
        if (!analysis) continue;

        for (const imp of analysis.imports) {
          const resolved = this.resolveImportPath(file, imp.source, projectPath);
          if (resolved) {
            const depLayer = fileToLayer.get(resolved);
            if (depLayer && depLayer !== layer.name) {
              dependsOn.add(depLayer);
            }
          }
        }
      }

      layer.dependsOn = [...dependsOn];
    }
  }

  /**
   * Get a summary suitable for documentation generation
   */
  getSummary(context: SemanticContext, projectPath: string): string {
    const { symbols, architecture, stats } = context;

    const lines: string[] = [
      `## Codebase Analysis Summary\n`,
      `**Total Files**: ${stats.totalFiles}`,
      `**Total Symbols**: ${stats.totalSymbols}`,
      `**Analysis Time**: ${stats.analysisTimeMs}ms\n`,
      `### Language Breakdown\n`,
    ];

    for (const [ext, count] of Object.entries(stats.languageBreakdown)) {
      lines.push(`- ${ext}: ${count} files`);
    }

    if (architecture.layers.length > 0) {
      lines.push(`\n### Architecture Layers\n`);
      for (const layer of architecture.layers) {
        const symbolCount = layer.symbols.length;
        const deps = layer.dependsOn.length > 0 ? ` → ${layer.dependsOn.join(', ')}` : '';
        lines.push(`- **${layer.name}** (${symbolCount} symbols)${deps}`);
        lines.push(`  - ${layer.description}`);
      }
    }

    if (architecture.patterns.length > 0) {
      lines.push(`\n### Detected Patterns\n`);
      for (const pattern of architecture.patterns) {
        const confidence = Math.round(pattern.confidence * 100);
        lines.push(
          `- **${pattern.name}** (${confidence}% confidence): ${pattern.locations.length} occurrences`
        );
      }
    }

    if (architecture.entryPoints.length > 0) {
      lines.push(`\n### Entry Points\n`);
      for (const ep of architecture.entryPoints) {
        lines.push(`- \`${ep}\``);
      }
    }

    return lines.join('\n');
  }

  clearCache(): void {
    this.treeSitter.clearCache();
  }

  /**
   * Shutdown LSP servers gracefully
   */
  async shutdown(): Promise<void> {
    if (this.lspLayer) {
      await this.lspLayer.shutdown();
    }
  }

  /**
   * Enhance Tree-sitter analysis with LSP semantic information
   * Adds type info, references, and implementations to key symbols
   */
  private async enhanceWithLSP(
    context: SemanticContext,
    projectPath: string
  ): Promise<void> {
    const allSymbols = [
      ...context.symbols.classes,
      ...context.symbols.interfaces,
      ...context.symbols.functions,
      ...context.symbols.types,
    ];

    // Prioritize symbols to enhance (exported and important ones first)
    const prioritizedSymbols = allSymbols
      .filter((s) => s.exported)
      .slice(0, 100); // Limit to avoid excessive LSP calls

    for (const symbol of prioritizedSymbols) {
      try {
        // Get type information via LSP hover
        const typeInfo = await this.lspLayer!.getTypeInfo(
          symbol.location.file,
          symbol.location.line,
          symbol.location.column || 0,
          projectPath
        );

        if (typeInfo) {
          symbol.typeInfo = typeInfo;
        }

        // For interfaces and classes, find implementations
        if (symbol.kind === 'interface' || symbol.kind === 'class') {
          const implementations = await this.lspLayer!.findImplementations(
            symbol.location.file,
            symbol.location.line,
            symbol.location.column || 0,
            projectPath
          );

          if (implementations.length > 0) {
            symbol.implementations = implementations;
          }
        }

        // Find references for exported symbols
        const references = await this.lspLayer!.findReferences(
          symbol.location.file,
          symbol.location.line,
          symbol.location.column || 0,
          projectPath
        );

        if (references.length > 0) {
          symbol.references = references;
        }
      } catch {
        // LSP errors are non-fatal, continue with other symbols
      }
    }
  }
}
