/**
 * Semantic Analysis Service
 *
 * Provides code analysis capabilities using Tree-sitter for fast syntactic
 * analysis and optional LSP integration for deeper semantic understanding.
 */

export { CodebaseAnalyzer } from './codebaseAnalyzer';
export { TreeSitterLayer } from './treeSitter';
export { LSPLayer } from './lsp';

export * from './types';
