/**
 * Semantic analysis types for codebase understanding
 */

export type SymbolKind = 'class' | 'interface' | 'function' | 'type' | 'variable' | 'enum' | 'method';

export interface SymbolLocation {
  file: string;
  line: number;
  column: number;
}

export interface ParameterInfo {
  name: string;
  type?: string;
  optional?: boolean;
  defaultValue?: string;
}

export interface ExtractedSymbol {
  name: string;
  kind: SymbolKind;
  location: SymbolLocation;
  exported: boolean;
  documentation?: string;
  extends?: string;
  implements?: string[];
  parameters?: ParameterInfo[];
  returnType?: string;
  members?: ExtractedSymbol[];
  // LSP-enhanced properties (populated when useLSP is enabled)
  typeInfo?: TypeInfo;
  references?: ReferenceLocation[];
  implementations?: ReferenceLocation[];
}

export interface ImportInfo {
  source: string;
  specifiers: string[];
  isDefault: boolean;
  isNamespace: boolean;
  alias?: string;
}

export interface ExportInfo {
  name: string;
  isDefault: boolean;
  isReExport: boolean;
  originalSource?: string;
}

export interface FileAnalysis {
  filePath: string;
  symbols: ExtractedSymbol[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  language: string;
}

export interface ArchitectureLayer {
  name: string;
  description: string;
  directories: string[];
  symbols: ExtractedSymbol[];
  dependsOn: string[];
}

export interface DetectedPattern {
  name: string;
  confidence: number;
  locations: Array<{ file: string; symbol: string }>;
  description: string;
}

export interface DependencyInfo {
  graph: Map<string, string[]>;
  reverseGraph: Map<string, string[]>;
}

export interface ArchitectureInfo {
  layers: ArchitectureLayer[];
  patterns: DetectedPattern[];
  entryPoints: string[];
  publicAPI: ExtractedSymbol[];
}

export interface SemanticStats {
  totalFiles: number;
  totalSymbols: number;
  languageBreakdown: Record<string, number>;
  analysisTimeMs: number;
}

export interface SemanticContext {
  symbols: {
    classes: ExtractedSymbol[];
    interfaces: ExtractedSymbol[];
    functions: ExtractedSymbol[];
    types: ExtractedSymbol[];
    enums: ExtractedSymbol[];
  };
  dependencies: DependencyInfo;
  architecture: ArchitectureInfo;
  stats: SemanticStats;
}

export interface TypeInfo {
  name: string;
  fullType: string;
  documentation?: string;
}

export interface ReferenceLocation {
  file: string;
  line: number;
  column: number;
  context?: string;
}

export interface AnalyzerOptions {
  useLSP?: boolean;
  languages?: string[];
  exclude?: string[];
  include?: string[];
  maxFiles?: number;
  cacheEnabled?: boolean;
}

export interface LSPServerConfig {
  command: string;
  args: string[];
  rootPatterns?: string[];
}

export type SupportedLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'go'
  | 'rust'
  | 'java';

export const LANGUAGE_EXTENSIONS: Record<string, SupportedLanguage> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
};

export const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules',
  'dist',
  'build',
  '.git',
  'vendor',
  '__pycache__',
  '.next',
  '.nuxt',
  'coverage',
  '.cache',
  'target',
];
