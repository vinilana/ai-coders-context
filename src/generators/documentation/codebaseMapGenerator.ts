/**
 * Codebase Map Generator
 *
 * Generates a JSON file that serves as a quick LLM-readable summary
 * of the entire codebase structure, symbols, and architecture.
 */

import * as path from 'path';
import { RepoStructure } from '../../types';
import { SemanticContext, ExtractedSymbol } from '../../services/semantic';
import { StackInfo } from '../../services/stack';

// ============================================================================
// Types
// ============================================================================

export interface SymbolSummary {
  name: string;
  kind: string;
  file: string;
  line: number;
  exported: boolean;
  signature?: string;
  description?: string;
}

export interface CodebaseMap {
  version: string;
  generated: string;

  stack: {
    primaryLanguage: string | null;
    languages: string[];
    frameworks: string[];
    buildTools: string[];
    testFrameworks: string[];
    packageManager: string | null;
    isMonorepo: boolean;
    hasDocker: boolean;
    hasCI: boolean;
  };

  structure: {
    totalFiles: number;
    topDirectories: Array<{ name: string; fileCount: number }>;
    languageDistribution: Array<{ extension: string; count: number }>;
  };

  architecture: {
    layers: Array<{
      name: string;
      description: string;
      directories: string[];
      symbolCount: number;
      dependsOn: string[];
    }>;
    patterns: Array<{
      name: string;
      confidence: number;
      description: string;
      occurrences: number;
    }>;
    entryPoints: string[];
  };

  symbols: {
    classes: SymbolSummary[];
    interfaces: SymbolSummary[];
    functions: SymbolSummary[];
    types: SymbolSummary[];
    enums: SymbolSummary[];
  };

  publicAPI: SymbolSummary[];

  dependencies: {
    mostImported: Array<{ file: string; importedBy: number }>;
  };

  stats: {
    totalSymbols: number;
    exportedSymbols: number;
    analysisTimeMs: number;
  };
}

export interface CodebaseMapOptions {
  maxSymbolsPerCategory?: number;
}

// ============================================================================
// Generator
// ============================================================================

export class CodebaseMapGenerator {
  private maxSymbols: number;

  constructor(options: CodebaseMapOptions = {}) {
    this.maxSymbols = options.maxSymbolsPerCategory ?? 50;
  }

  generate(
    repoStructure: RepoStructure,
    semantics?: SemanticContext,
    stackInfo?: StackInfo
  ): CodebaseMap {
    return {
      version: '1.0.0',
      generated: new Date().toISOString(),
      stack: this.buildStackSection(stackInfo),
      structure: this.buildStructureSection(repoStructure),
      architecture: this.buildArchitectureSection(repoStructure.rootPath, semantics),
      symbols: this.buildSymbolsSection(repoStructure.rootPath, semantics),
      publicAPI: this.buildPublicAPISection(repoStructure.rootPath, semantics),
      dependencies: this.buildDependenciesSection(semantics),
      stats: this.buildStatsSection(semantics),
    };
  }

  private buildStackSection(stackInfo?: StackInfo): CodebaseMap['stack'] {
    if (!stackInfo) {
      return {
        primaryLanguage: null,
        languages: [],
        frameworks: [],
        buildTools: [],
        testFrameworks: [],
        packageManager: null,
        isMonorepo: false,
        hasDocker: false,
        hasCI: false,
      };
    }

    return {
      primaryLanguage: stackInfo.primaryLanguage,
      languages: stackInfo.languages,
      frameworks: stackInfo.frameworks,
      buildTools: stackInfo.buildTools,
      testFrameworks: stackInfo.testFrameworks,
      packageManager: stackInfo.packageManager,
      isMonorepo: stackInfo.isMonorepo,
      hasDocker: stackInfo.hasDocker,
      hasCI: stackInfo.hasCI,
    };
  }

  private buildStructureSection(repoStructure: RepoStructure): CodebaseMap['structure'] {
    const topDirectories = (repoStructure.topLevelDirectoryStats ?? []).map(stat => ({
      name: stat.name,
      fileCount: stat.fileCount,
    }));

    // Build language distribution from files
    const extensionCounts = new Map<string, number>();
    for (const file of repoStructure.files) {
      const ext = path.extname(file.relativePath).toLowerCase();
      if (ext) {
        extensionCounts.set(ext, (extensionCounts.get(ext) ?? 0) + 1);
      }
    }

    const languageDistribution = Array.from(extensionCounts.entries())
      .map(([extension, count]) => ({ extension, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalFiles: repoStructure.totalFiles,
      topDirectories,
      languageDistribution,
    };
  }

  private buildArchitectureSection(
    repoRoot: string,
    semantics?: SemanticContext
  ): CodebaseMap['architecture'] {
    if (!semantics) {
      return {
        layers: [],
        patterns: [],
        entryPoints: [],
      };
    }

    const layers = semantics.architecture.layers.map(layer => ({
      name: layer.name,
      description: layer.description,
      directories: layer.directories.map(d => this.relativePath(repoRoot, d)),
      symbolCount: layer.symbols.length,
      dependsOn: layer.dependsOn,
    }));

    const patterns = semantics.architecture.patterns.map(pattern => ({
      name: pattern.name,
      confidence: pattern.confidence,
      description: pattern.description,
      occurrences: pattern.locations.length,
    }));

    const entryPoints = semantics.architecture.entryPoints.map(ep =>
      this.relativePath(repoRoot, ep)
    );

    return { layers, patterns, entryPoints };
  }

  private buildSymbolsSection(
    repoRoot: string,
    semantics?: SemanticContext
  ): CodebaseMap['symbols'] {
    if (!semantics) {
      return {
        classes: [],
        interfaces: [],
        functions: [],
        types: [],
        enums: [],
      };
    }

    return {
      classes: this.extractSymbols(semantics.symbols.classes, repoRoot),
      interfaces: this.extractSymbols(semantics.symbols.interfaces, repoRoot),
      functions: this.extractSymbols(semantics.symbols.functions, repoRoot),
      types: this.extractSymbols(semantics.symbols.types, repoRoot),
      enums: this.extractSymbols(semantics.symbols.enums, repoRoot),
    };
  }

  private buildPublicAPISection(
    repoRoot: string,
    semantics?: SemanticContext
  ): SymbolSummary[] {
    if (!semantics) {
      return [];
    }

    return this.extractSymbols(semantics.architecture.publicAPI, repoRoot);
  }

  private buildDependenciesSection(semantics?: SemanticContext): CodebaseMap['dependencies'] {
    if (!semantics) {
      return { mostImported: [] };
    }

    // Calculate import counts from reverse dependency graph
    const importCounts: Array<{ file: string; importedBy: number }> = [];

    for (const [file, importers] of semantics.dependencies.reverseGraph.entries()) {
      importCounts.push({
        file,
        importedBy: importers.length,
      });
    }

    // Sort by most imported and take top 20
    const mostImported = importCounts
      .sort((a, b) => b.importedBy - a.importedBy)
      .slice(0, 20);

    return { mostImported };
  }

  private buildStatsSection(semantics?: SemanticContext): CodebaseMap['stats'] {
    if (!semantics) {
      return {
        totalSymbols: 0,
        exportedSymbols: 0,
        analysisTimeMs: 0,
      };
    }

    // Count exported symbols
    const allSymbols = [
      ...semantics.symbols.classes,
      ...semantics.symbols.interfaces,
      ...semantics.symbols.functions,
      ...semantics.symbols.types,
      ...semantics.symbols.enums,
    ];

    const exportedCount = allSymbols.filter(s => s.exported).length;

    return {
      totalSymbols: semantics.stats.totalSymbols,
      exportedSymbols: exportedCount,
      analysisTimeMs: semantics.stats.analysisTimeMs,
    };
  }

  private extractSymbols(symbols: ExtractedSymbol[], repoRoot: string): SymbolSummary[] {
    // Sort by exported first, then alphabetically
    const sorted = [...symbols].sort((a, b) => {
      if (a.exported !== b.exported) {
        return a.exported ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return sorted.slice(0, this.maxSymbols).map(symbol => this.toSymbolSummary(symbol, repoRoot));
  }

  private toSymbolSummary(symbol: ExtractedSymbol, repoRoot: string): SymbolSummary {
    const summary: SymbolSummary = {
      name: symbol.name,
      kind: symbol.kind,
      file: this.relativePath(repoRoot, symbol.location.file),
      line: symbol.location.line,
      exported: symbol.exported,
    };

    // Add signature for functions
    if (symbol.kind === 'function' && symbol.parameters) {
      const params = symbol.parameters
        .map(p => (p.type ? `${p.name}: ${p.type}` : p.name))
        .join(', ');
      const returnType = symbol.returnType ?? 'void';
      summary.signature = `(${params}): ${returnType}`;
    }

    // Add first line of documentation
    if (symbol.documentation) {
      const firstLine = symbol.documentation.split('\n')[0].trim();
      if (firstLine.length > 0) {
        summary.description = firstLine.length > 100
          ? firstLine.slice(0, 100) + '...'
          : firstLine;
      }
    }

    return summary;
  }

  private relativePath(repoRoot: string, filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return path.relative(repoRoot, filePath);
    }
    return filePath;
  }
}
