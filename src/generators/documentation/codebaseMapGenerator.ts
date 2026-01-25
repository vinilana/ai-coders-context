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

export interface KeyFile {
  path: string;
  description: string;
  category: 'entrypoint' | 'config' | 'types' | 'service' | 'generator' | 'util';
}

export interface NavigationHints {
  tests: string;
  config: string[];
  types: string[];
  mainLogic: string[];
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
    nodeVersion?: string;
    runtimeEnvironment?: 'node' | 'browser' | 'both';
  };

  structure: {
    totalFiles: number;
    rootPath?: string;
    topDirectories: Array<{ name: string; fileCount: number; description?: string }>;
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
    mainEntryPoints?: string[];
    moduleExports?: string[];
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
    mostImported: Array<{ file: string; importedBy: number; description?: string }>;
  };

  stats: {
    totalSymbols: number;
    exportedSymbols: number;
    analysisTimeMs: number;
  };

  keyFiles?: KeyFile[];
  navigation?: NavigationHints;
}

export interface CodebaseMapOptions {
  maxSymbolsPerCategory?: number;
}

// ============================================================================
// Generator
// ============================================================================

// Directory description heuristics
const DIRECTORY_DESCRIPTIONS: Record<string, string> = {
  'src': 'Source code root',
  'services': 'Business logic and orchestration services',
  'generators': 'Content and scaffold generation',
  'utils': 'Shared utilities and helpers',
  'types': 'TypeScript type definitions',
  'tests': 'Test files and fixtures',
  '__tests__': 'Unit and integration tests',
  'components': 'UI components',
  'hooks': 'React hooks',
  'api': 'API endpoints and handlers',
  'config': 'Configuration files',
  'models': 'Data models and entities',
  'controllers': 'Request handlers',
  'middleware': 'Request/response middleware',
  'routes': 'Route definitions',
  'views': 'View templates',
  'assets': 'Static assets (images, fonts)',
  'styles': 'CSS/SCSS stylesheets',
  'lib': 'Shared library code',
  'core': 'Core application logic',
  'shared': 'Shared code across modules',
  'workflow': 'Workflow and orchestration',
  'mcp': 'MCP server implementation',
  'ai': 'AI/LLM integration',
  'semantic': 'Semantic code analysis',
  'plans': 'Development plans',
  'agents': 'AI agent definitions',
  'skills': 'Skill definitions',
  'docs': 'Documentation files',
  'scripts': 'Build and utility scripts',
  'prompts': 'Prompt templates',
  'public': 'Public static assets',
  'dist': 'Build output directory',
  'build': 'Build output directory',
  'bin': 'CLI binaries and executables',
  'test': 'Test files',
  'spec': 'Test specifications',
  'fixtures': 'Test fixtures and mock data',
  'mocks': 'Mock implementations',
  'pages': 'Page components (Next.js/Nuxt)',
  'app': 'Application entry (Next.js app router)',
  'store': 'State management',
  'reducers': 'Redux reducers',
  'actions': 'Redux actions',
  'selectors': 'Redux selectors',
  'contexts': 'React contexts',
  'providers': 'Context providers',
  'layouts': 'Layout components',
  'templates': 'Template files',
  'i18n': 'Internationalization',
  'locales': 'Locale files',
  'translations': 'Translation files',
};

// Key file pattern matchers
const KEY_FILE_PATTERNS: Array<{ pattern: RegExp; description: string; category: KeyFile['category'] }> = [
  { pattern: /^src\/index\.(ts|js)$/, description: 'Main library entry point', category: 'entrypoint' },
  { pattern: /^src\/main\.(ts|js)$/, description: 'Application entry point', category: 'entrypoint' },
  { pattern: /^src\/cli\.(ts|js)$/, description: 'CLI entry point', category: 'entrypoint' },
  { pattern: /^src\/server\.(ts|js)$/, description: 'Server entry point', category: 'entrypoint' },
  { pattern: /^src\/app\.(ts|js)$/, description: 'Application entry point', category: 'entrypoint' },
  { pattern: /^bin\//, description: 'CLI executable', category: 'entrypoint' },
  { pattern: /^index\.(ts|js)$/, description: 'Package entry point', category: 'entrypoint' },
  { pattern: /types?\.(ts|d\.ts)$/, description: 'Type definitions', category: 'types' },
  { pattern: /tsconfig.*\.json$/, description: 'TypeScript configuration', category: 'config' },
  { pattern: /^package\.json$/, description: 'Package manifest', category: 'config' },
  { pattern: /\.config\.(ts|js|mjs|cjs)$/, description: 'Tool configuration', category: 'config' },
  { pattern: /^\.env/, description: 'Environment variables', category: 'config' },
  { pattern: /Service\.(ts|js)$/, description: 'Service class', category: 'service' },
  { pattern: /Generator\.(ts|js)$/, description: 'Generator class', category: 'generator' },
  { pattern: /utils?\.(ts|js)$/, description: 'Utility functions', category: 'util' },
  { pattern: /helpers?\.(ts|js)$/, description: 'Helper functions', category: 'util' },
];

export class CodebaseMapGenerator {
  private maxSymbols: number;

  constructor(options: CodebaseMapOptions = {}) {
    this.maxSymbols = options.maxSymbolsPerCategory ?? 30;
  }

  generate(
    repoStructure: RepoStructure,
    semantics?: SemanticContext,
    stackInfo?: StackInfo
  ): CodebaseMap {
    const architecture = this.buildArchitectureSection(repoStructure.rootPath, semantics);

    return {
      version: '1.0.0',
      generated: new Date().toISOString(),
      stack: this.buildStackSection(stackInfo, repoStructure.rootPath),
      structure: this.buildStructureSection(repoStructure),
      architecture,
      symbols: this.buildSymbolsSection(repoStructure.rootPath, semantics),
      publicAPI: this.buildPublicAPISection(repoStructure.rootPath, semantics),
      dependencies: this.buildDependenciesSection(repoStructure.rootPath, semantics),
      stats: this.buildStatsSection(semantics),
      keyFiles: this.buildKeyFilesSection(repoStructure, semantics),
      navigation: this.buildNavigationSection(repoStructure, stackInfo),
    };
  }

  private buildStackSection(stackInfo?: StackInfo, repoRoot?: string): CodebaseMap['stack'] {
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

    // Detect node version and runtime environment from package.json
    let nodeVersion: string | undefined;
    let runtimeEnvironment: 'node' | 'browser' | 'both' | undefined;

    if (repoRoot) {
      try {
        const packageJsonPath = path.join(repoRoot, 'package.json');
        const fs = require('fs-extra');
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = fs.readJsonSync(packageJsonPath);

          // Get node version from engines
          if (packageJson.engines?.node) {
            nodeVersion = packageJson.engines.node;
          }

          // Determine runtime environment
          const hasBrowserField = !!packageJson.browser;
          const hasMainField = !!packageJson.main || !!packageJson.exports;
          const hasBinField = !!packageJson.bin;

          // Check for browser-specific frameworks
          const isBrowserFramework = stackInfo.frameworks.some(f =>
            ['nextjs', 'nuxt', 'vue', 'angular', 'svelte', 'react', 'gatsby', 'astro'].includes(f)
          );

          // Check for Node-specific indicators
          const isNodeFramework = stackInfo.frameworks.some(f =>
            ['nestjs', 'express', 'fastify', 'koa', 'hapi'].includes(f)
          ) || hasBinField || stackInfo.frameworks.includes('cli');

          if (isBrowserFramework && isNodeFramework) {
            runtimeEnvironment = 'both';
          } else if (isBrowserFramework || hasBrowserField) {
            runtimeEnvironment = 'browser';
          } else if (isNodeFramework || hasMainField) {
            runtimeEnvironment = 'node';
          }
        }
      } catch {
        // Ignore errors reading package.json
      }
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
      ...(nodeVersion && { nodeVersion }),
      ...(runtimeEnvironment && { runtimeEnvironment }),
    };
  }

  private buildStructureSection(repoStructure: RepoStructure): CodebaseMap['structure'] {
    // Filter to only include actual directories (items with multiple files or subdirectories)
    // and exclude files at the root level
    const topDirectories = (repoStructure.topLevelDirectoryStats ?? [])
      .filter(stat => {
        // Check if this is actually a directory by seeing if we have files under it
        const hasFilesUnder = repoStructure.files.some(f =>
          f.relativePath.startsWith(stat.name + '/') || f.relativePath.startsWith(stat.name + '\\')
        );
        // Also check if it's a directory entry itself
        const isDirectory = repoStructure.directories.some(d =>
          d.relativePath === stat.name || path.basename(d.relativePath) === stat.name
        );
        // It's a directory if it has files under it or is marked as directory
        // Also check: if fileCount > 1, it's likely a directory
        return hasFilesUnder || isDirectory || stat.fileCount > 1;
      })
      .map(stat => ({
        name: stat.name,
        fileCount: stat.fileCount,
        description: this.getDirectoryDescription(stat.name),
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
      rootPath: '.',
      topDirectories,
      languageDistribution,
    };
  }

  private getDirectoryDescription(dirName: string): string {
    // Check direct match first
    const lowerName = dirName.toLowerCase();
    if (DIRECTORY_DESCRIPTIONS[lowerName]) {
      return DIRECTORY_DESCRIPTIONS[lowerName];
    }

    // Check partial matches
    for (const [key, desc] of Object.entries(DIRECTORY_DESCRIPTIONS)) {
      if (lowerName.includes(key) || key.includes(lowerName)) {
        return desc;
      }
    }

    // Infer from naming patterns
    if (lowerName.includes('test')) return 'Test files';
    if (lowerName.includes('spec')) return 'Test specifications';
    if (lowerName.endsWith('s') && !['utils', 'types', 'tests'].includes(lowerName)) {
      const singular = lowerName.slice(0, -1);
      return `${singular.charAt(0).toUpperCase() + singular.slice(1)} definitions`;
    }

    return 'Module directory';
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
        mainEntryPoints: [],
        moduleExports: [],
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

    // Convert all entry points to relative paths
    const allEntryPoints = semantics.architecture.entryPoints.map(ep =>
      this.relativePath(repoRoot, ep)
    );

    // Separate main entry points from barrel exports (module exports)
    const { mainEntryPoints, moduleExports } = this.categorizeEntryPoints(allEntryPoints);

    return {
      layers,
      patterns,
      entryPoints: allEntryPoints, // Keep for backward compatibility
      mainEntryPoints,
      moduleExports,
    };
  }

  /**
   * Categorize entry points into main (actual CLI/server/library) vs barrel exports
   */
  private categorizeEntryPoints(entryPoints: string[]): {
    mainEntryPoints: string[];
    moduleExports: string[];
  } {
    const mainEntryPoints: string[] = [];
    const moduleExports: string[] = [];

    // Patterns that indicate a MAIN entry point (not just a barrel export)
    const mainPatterns = [
      /^src\/index\.(ts|js)$/,           // Root src/index is the library entry
      /^index\.(ts|js)$/,                // Root index is package entry
      /^src\/main\.(ts|js)$/,            // main.ts is usually app entry
      /^src\/cli\.(ts|js)$/,             // CLI entry point
      /^src\/server\.(ts|js)$/,          // Server entry point
      /^src\/app\.(ts|js)$/,             // App entry point
      /^bin\//,                          // Anything in bin/
      /^cli\.(ts|js)$/,                  // Root CLI file
      /^server\.(ts|js)$/,               // Root server file
      /^app\.(ts|js)$/,                  // Root app file
      /^main\.(ts|js)$/,                 // Root main file
    ];

    // Patterns that indicate a barrel export (just re-exports)
    const barrelPatterns = [
      /\/index\.(ts|js)$/,               // Any nested index file is typically a barrel
    ];

    for (const ep of entryPoints) {
      const isMain = mainPatterns.some(p => p.test(ep));
      const isBarrel = barrelPatterns.some(p => p.test(ep)) && !isMain;

      if (isMain) {
        mainEntryPoints.push(ep);
      } else if (isBarrel) {
        moduleExports.push(ep);
      } else {
        // Default: if it's a top-level file, consider it main; otherwise barrel
        const depth = ep.split('/').length;
        if (depth <= 2) {
          mainEntryPoints.push(ep);
        } else {
          moduleExports.push(ep);
        }
      }
    }

    return { mainEntryPoints, moduleExports };
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

  private buildDependenciesSection(repoRoot: string, semantics?: SemanticContext): CodebaseMap['dependencies'] {
    if (!semantics) {
      return { mostImported: [] };
    }

    // Calculate import counts from reverse dependency graph
    const importCounts: Array<{ file: string; importedBy: number; description?: string }> = [];

    for (const [file, importers] of semantics.dependencies.reverseGraph.entries()) {
      const relativePath = this.relativePath(repoRoot, file);
      importCounts.push({
        file: relativePath,
        importedBy: importers.length,
        description: this.inferFileDescription(relativePath),
      });
    }

    // Sort by most imported and take top 20
    const mostImported = importCounts
      .sort((a, b) => b.importedBy - a.importedBy)
      .slice(0, 20);

    return { mostImported };
  }

  /**
   * Infer a description for a file based on its path and name
   */
  private inferFileDescription(filePath: string): string | undefined {
    const basename = path.basename(filePath, path.extname(filePath));
    const dirname = path.dirname(filePath);

    // Check common naming patterns
    if (basename === 'index') {
      const parentDir = path.basename(dirname);
      if (parentDir && DIRECTORY_DESCRIPTIONS[parentDir.toLowerCase()]) {
        return `${parentDir} module exports`;
      }
      return 'Module exports';
    }

    if (basename === 'types' || basename === 'type') {
      return 'Type definitions';
    }

    if (basename.endsWith('Service')) {
      return `${basename.replace(/Service$/, '')} service`;
    }

    if (basename.endsWith('Generator')) {
      return `${basename.replace(/Generator$/, '')} generator`;
    }

    if (basename.endsWith('Utils') || basename.endsWith('Util')) {
      return 'Utility functions';
    }

    if (basename === 'constants' || basename === 'config') {
      return 'Configuration and constants';
    }

    // Check directory context
    const dirName = path.basename(dirname).toLowerCase();
    if (DIRECTORY_DESCRIPTIONS[dirName]) {
      return DIRECTORY_DESCRIPTIONS[dirName];
    }

    return undefined;
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

  /**
   * Build key files section with descriptions and categories
   */
  private buildKeyFilesSection(repoStructure: RepoStructure, semantics?: SemanticContext): KeyFile[] {
    const keyFiles: KeyFile[] = [];
    const seenPaths = new Set<string>();

    // Process all files and check against key file patterns
    for (const file of repoStructure.files) {
      const relativePath = file.relativePath;

      for (const { pattern, description, category } of KEY_FILE_PATTERNS) {
        if (pattern.test(relativePath) && !seenPaths.has(relativePath)) {
          seenPaths.add(relativePath);
          keyFiles.push({
            path: relativePath,
            description: this.enhanceFileDescription(relativePath, description, semantics),
            category,
          });
          break;
        }
      }
    }

    // Add entry points that aren't already included
    if (semantics) {
      for (const ep of semantics.architecture.entryPoints) {
        const relativePath = this.relativePath(repoStructure.rootPath, ep);
        if (!seenPaths.has(relativePath)) {
          seenPaths.add(relativePath);
          const category = this.inferCategory(relativePath);
          keyFiles.push({
            path: relativePath,
            description: this.inferFileDescription(relativePath) || 'Entry point',
            category,
          });
        }
      }
    }

    // Sort by category priority then by path
    const categoryPriority: Record<string, number> = {
      'entrypoint': 0,
      'config': 1,
      'types': 2,
      'service': 3,
      'generator': 4,
      'util': 5,
    };

    return keyFiles
      .sort((a, b) => {
        const aPriority = categoryPriority[a.category] ?? 99;
        const bPriority = categoryPriority[b.category] ?? 99;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return a.path.localeCompare(b.path);
      })
      .slice(0, 30); // Limit to 30 key files
  }

  /**
   * Enhance a file description with semantic context if available
   */
  private enhanceFileDescription(
    filePath: string,
    defaultDescription: string,
    semantics?: SemanticContext
  ): string {
    if (!semantics) return defaultDescription;

    // Try to find symbols in this file to provide more context
    const allSymbols = [
      ...semantics.symbols.classes,
      ...semantics.symbols.interfaces,
      ...semantics.symbols.functions,
    ];

    const fileSymbols = allSymbols.filter(s =>
      s.location.file.endsWith(filePath) || filePath.endsWith(path.basename(s.location.file))
    );

    if (fileSymbols.length > 0) {
      const mainSymbol = fileSymbols.find(s => s.exported) || fileSymbols[0];
      if (mainSymbol.documentation) {
        const firstLine = mainSymbol.documentation.split('\n')[0].trim();
        if (firstLine.length > 0 && firstLine.length <= 100) {
          return firstLine;
        }
      }
    }

    return defaultDescription;
  }

  /**
   * Infer category from file path
   */
  private inferCategory(filePath: string): KeyFile['category'] {
    const lowerPath = filePath.toLowerCase();

    if (lowerPath.includes('service')) return 'service';
    if (lowerPath.includes('generator')) return 'generator';
    if (lowerPath.includes('util') || lowerPath.includes('helper')) return 'util';
    if (lowerPath.includes('type') || lowerPath.endsWith('.d.ts')) return 'types';
    if (lowerPath.includes('config') || lowerPath.endsWith('.json')) return 'config';

    // Check for entry point patterns
    const basename = path.basename(filePath).toLowerCase();
    if (['index', 'main', 'cli', 'server', 'app'].some(n => basename.startsWith(n))) {
      return 'entrypoint';
    }

    return 'util'; // Default category
  }

  /**
   * Build navigation hints section
   */
  private buildNavigationSection(repoStructure: RepoStructure, stackInfo?: StackInfo): NavigationHints {
    const files = repoStructure.files.map(f => f.relativePath);

    // Detect test pattern
    let testPattern = 'src/**/*.test.ts';
    if (files.some(f => f.includes('__tests__'))) {
      testPattern = '**/__tests__/**/*.ts';
    } else if (files.some(f => f.includes('.spec.'))) {
      testPattern = '**/*.spec.ts';
    } else if (files.some(f => f.endsWith('.test.ts') || f.endsWith('.test.js'))) {
      testPattern = '**/*.test.{ts,js}';
    }

    // Detect config files
    const configPatterns = [
      'package.json',
      'tsconfig.json',
      'tsconfig.*.json',
      'jest.config.js',
      'jest.config.ts',
      'vitest.config.ts',
      '.eslintrc.js',
      '.eslintrc.json',
      'eslint.config.js',
      '.prettierrc',
      '.prettierrc.json',
      'vite.config.ts',
      'webpack.config.js',
      'next.config.js',
      'next.config.ts',
    ];

    const configFiles = configPatterns.filter(pattern => {
      if (pattern.includes('*')) {
        return files.some(f => {
          const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
          return regex.test(f);
        });
      }
      return files.some(f => f === pattern || f.endsWith('/' + pattern));
    });

    // Detect type definition files
    const typeFiles: string[] = [];
    for (const file of files) {
      if (
        file.endsWith('.d.ts') ||
        file.endsWith('/types.ts') ||
        file.endsWith('/types/index.ts') ||
        file === 'src/types.ts'
      ) {
        typeFiles.push(file);
      }
    }

    // Detect main logic directories
    const mainLogicPatterns = ['src/services', 'src/core', 'src/lib', 'lib', 'src/modules'];
    const mainLogic = mainLogicPatterns.filter(pattern =>
      files.some(f => f.startsWith(pattern + '/'))
    );

    // Add detected layers from stack info if available
    if (stackInfo) {
      if (stackInfo.frameworks.includes('nestjs') && !mainLogic.includes('src/modules')) {
        if (files.some(f => f.startsWith('src/modules/'))) {
          mainLogic.push('src/modules');
        }
      }
    }

    return {
      tests: testPattern,
      config: configFiles.slice(0, 10),
      types: typeFiles.slice(0, 10),
      mainLogic: mainLogic.length > 0 ? mainLogic : ['src'],
    };
  }
}
