import { tool } from 'ai';
import { TreeSitterLayer } from '../../semantic/treeSitter/treeSitterLayer';
import { AnalyzeSymbolsInputSchema, type AnalyzeSymbolsInput } from '../schemas';

// Singleton instance for caching
let treeSitterInstance: TreeSitterLayer | null = null;

function getTreeSitterLayer(): TreeSitterLayer {
  if (!treeSitterInstance) {
    treeSitterInstance = new TreeSitterLayer();
  }
  return treeSitterInstance;
}

export const analyzeSymbolsTool = tool({
  description:
    'Extract symbols (classes, functions, interfaces, types, enums) from a source file using semantic analysis',
  inputSchema: AnalyzeSymbolsInputSchema,
  execute: async (input: AnalyzeSymbolsInput) => {
    const { filePath, symbolTypes } = input;
    try {
      const treeSitter = getTreeSitterLayer();
      const analysis = await treeSitter.analyzeFile(filePath);

      let symbols = analysis.symbols;
      if (symbolTypes && symbolTypes.length > 0) {
        symbols = symbols.filter((s) =>
          symbolTypes.includes(s.kind as 'class' | 'interface' | 'function' | 'type' | 'enum')
        );
      }

      return {
        success: true,
        filePath,
        language: analysis.language,
        symbols: symbols.map((s) => ({
          name: s.name,
          kind: s.kind,
          line: s.location.line,
          exported: s.exported,
          documentation: s.documentation
        })),
        imports: analysis.imports.map((i) => ({
          source: i.source,
          specifiers: i.specifiers
        })),
        exports: analysis.exports.map((e) => ({
          name: e.name,
          isDefault: e.isDefault
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        filePath
      };
    }
  }
});
