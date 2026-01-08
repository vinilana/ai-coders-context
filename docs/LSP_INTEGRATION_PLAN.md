# Plano de Melhoria: Integração Tree-sitter + LSP para Geração de Contexto

## Resumo Executivo

Este documento propõe a implementação de análise semântica de código no ai-coders-context usando uma **abordagem híbrida**: Tree-sitter para parsing sintático rápido e LSP (Language Server Protocol) seletivo para análise semântica avançada. O objetivo é melhorar significativamente a qualidade e precisão da geração de planos, playbooks de agentes e documentação.

---

## Problema Atual

### Limitações do FileMapper Atual

O `FileMapper` atual (`src/utils/fileMapper.ts`) oferece apenas análise superficial:

```typescript
// O que temos hoje:
- Lista de arquivos e extensões
- Contagem de arquivos por diretório
- Tamanho de arquivos
- Estrutura de diretórios top-level
```

**O que está faltando:**
- Símbolos do código (classes, funções, interfaces, tipos)
- Relacionamentos entre componentes (imports, dependências)
- Hierarquia de tipos (herança, implementações)
- Referências cruzadas (quem usa o quê)
- Estrutura semântica do código

### Impacto nas Gerações Atuais

| Componente | Limitação |
|------------|-----------|
| **Planos** | Não conhecem a estrutura real do código, geram fases genéricas |
| **Agentes** | Playbooks baseados apenas em diretórios, sem contexto de APIs/interfaces |
| **Docs** | Architecture.md é placeholder, não reflete componentes reais |

---

## Solução: Híbrido Tree-sitter + LSP Seletivo

### Conceito Central

Usar **duas ferramentas complementares** para diferentes propósitos:

```
┌─────────────────────────────────────────────────────────────┐
│                    ANÁLISE DE CÓDIGO                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Tree-sitter (90% dos casos)    │   LSP (10% dos casos)    │
│   ─────────────────────────────  │  ─────────────────────── │
│   • Parsing sintático            │  • Resolução de tipos    │
│   • Extração de símbolos         │  • Go to definition      │
│   • Estrutura de arquivos        │  • Find all references   │
│   • Imports/Exports              │  • Type inference        │
│   • Comentários/Docs             │  • Refactoring seguro    │
│                                  │                          │
│   ⚡ MUITO RÁPIDO                │  🎯 MUITO PRECISO        │
│   (parsing local, sem servidor)  │  (requer language server)│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Por que esta abordagem?

| Aspecto | Benefício |
|---------|-----------|
| **Performance** | Tree-sitter processa 500 arquivos em ~100ms |
| **Offline** | Funciona sem servidores externos (Tree-sitter) |
| **Precisão** | LSP garante resolução correta de tipos quando necessário |
| **Flexibilidade** | LSP é opcional, pode ser desabilitado |
| **Extensibilidade** | Fácil adicionar novas linguagens |
| **Cache** | ASTs podem ser cacheados e reutilizados |

---

## O que é Tree-sitter?

Tree-sitter é um **parser incremental** criado pelo GitHub (usado no Atom, Neovim, Helix, Zed):

```
Código Fonte                    AST (Abstract Syntax Tree)
─────────────                   ──────────────────────────

class Foo {            →        (class_declaration
  bar(): string {                 name: (identifier) "Foo"
    return "hello";               body: (class_body
  }                                 (method_definition
}                                     name: (identifier) "bar"
                                      return_type: (type_annotation
                                        (predefined_type) "string")
                                      body: (statement_block
                                        (return_statement
                                          (string) "hello")))))
```

**Características:**
- **Parsing local**: Não precisa de servidor externo rodando
- **Incremental**: Re-parseia apenas o que mudou
- **100+ linguagens**: TypeScript, Python, Go, Rust, Java, C/C++, etc.
- **Queries**: Linguagem própria para extrair padrões do AST

### Limitações do Tree-sitter (por que precisamos de LSP também)

Tree-sitter faz **análise sintática**, não **análise semântica**:

```typescript
// Tree-sitter CONSEGUE extrair:
import { Foo } from './foo';     // ✅ Sabe que importa "Foo" de "./foo"

class Bar extends Foo {          // ✅ Sabe que Bar extends "Foo"
  doSomething() {
    this.helperMethod();         // ✅ Sabe que chama "helperMethod"
  }
}

// Tree-sitter NÃO CONSEGUE resolver:
// ❌ Qual é o tipo de retorno de helperMethod()?
// ❌ helperMethod vem de Foo ou de Bar?
// ❌ Quais classes implementam a interface X?
// ❌ Onde está a definição real de Foo (pode ser re-exportado)?
```

**Para essas perguntas semânticas**, usamos LSP sob demanda.

---

## Arquitetura Detalhada

```
┌──────────────────────────────────────────────────────────────────┐
│                      ai-coders-context                            │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   CodebaseAnalyzer                           │ │
│  │                   (Orquestrador)                             │ │
│  └──────────────────────────┬──────────────────────────────────┘ │
│                             │                                     │
│           ┌─────────────────┼─────────────────┐                  │
│           │                 │                 │                  │
│           ▼                 ▼                 ▼                  │
│  ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐        │
│  │ TreeSitterLayer │ │  LSPLayer   │ │   CacheLayer    │        │
│  │                 │ │  (Lazy)     │ │                 │        │
│  │ - parseFile()   │ │             │ │ - symbolCache   │        │
│  │ - extractSymbols│ │ - getType() │ │ - astCache      │        │
│  │ - getImports()  │ │ - findRefs()│ │ - invalidate()  │        │
│  │ - getExports()  │ │ - getDef()  │ │                 │        │
│  └────────┬────────┘ └──────┬──────┘ └─────────────────┘        │
│           │                 │                                    │
│           │    ┌────────────┘                                    │
│           │    │                                                 │
│           ▼    ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    SemanticContext                           │ │
│  │                                                              │ │
│  │  symbols: ClassSymbol[], FunctionSymbol[], InterfaceSymbol[] │ │
│  │  imports: Map<file, ImportInfo[]>                            │ │
│  │  exports: Map<file, ExportInfo[]>                            │ │
│  │  dependencies: DependencyGraph                               │ │
│  │  architecture: LayerInfo[]                                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                             │                                     │
│                             ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Generators (Doc, Agent, Plan)                   │ │
│  │              Recebem contexto enriquecido                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Análise

```
1. SCAN INICIAL (Tree-sitter - rápido)
   ────────────────────────────────────

   Para cada arquivo:
   ├── Parse AST
   ├── Extrair: classes, functions, interfaces, types
   ├── Extrair: imports, exports
   ├── Extrair: decorators, comments, JSDoc
   └── Cachear resultados

   Tempo: ~100ms para projeto médio (500 arquivos)


2. CONSTRUÇÃO DO GRAFO (Tree-sitter)
   ──────────────────────────────────

   Com os dados extraídos:
   ├── Montar grafo de dependências (quem importa quem)
   ├── Identificar camadas arquiteturais
   ├── Detectar padrões (Factory, Singleton, etc.)
   └── Identificar entry points

   Tempo: ~50ms


3. ENRIQUECIMENTO SEMÂNTICO (LSP - sob demanda)
   ─────────────────────────────────────────────

   Apenas quando necessário:
   ├── Resolver tipos complexos
   ├── Encontrar implementações de interfaces
   ├── Rastrear herança completa
   └── Validar referências cruzadas

   Tempo: ~500ms-2s (apenas para símbolos específicos)
```

### Quando usar cada camada?

```
┌────────────────────────────────────────────────────────────────┐
│                    DECISÃO DE USO                               │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Pergunta                          │  Ferramenta               │
│  ─────────────────────────────────────────────────────────────│
│                                                                 │
│  "Quais classes existem?"          │  Tree-sitter ⚡           │
│  "Quais funções este arquivo tem?" │  Tree-sitter ⚡           │
│  "O que este arquivo importa?"     │  Tree-sitter ⚡           │
│  "Qual a estrutura do projeto?"    │  Tree-sitter ⚡           │
│                                                                 │
│  "Qual o tipo de retorno real?"    │  LSP 🎯                   │
│  "Quem implementa esta interface?" │  LSP 🎯                   │
│  "Onde está a definição original?" │  LSP 🎯                   │
│  "Este método está deprecated?"    │  LSP 🎯                   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Estrutura de Arquivos

```
src/
├── services/
│   └── semantic/
│       ├── index.ts                    # Exports públicos
│       ├── types.ts                    # Tipos compartilhados
│       ├── codebaseAnalyzer.ts         # Orquestrador principal
│       ├── treeSitter/
│       │   ├── treeSitterLayer.ts      # Parsing com Tree-sitter
│       │   ├── queries/
│       │   │   ├── typescript.ts       # Queries para TS/JS
│       │   │   ├── python.ts           # Queries para Python
│       │   │   └── go.ts               # Queries para Go
│       │   └── extractors.ts           # Extratores de símbolos
│       ├── lsp/
│       │   ├── lspLayer.ts             # Cliente LSP genérico
│       │   ├── serverConfigs.ts        # Configs dos language servers
│       │   └── lspCache.ts             # Cache de resultados LSP
│       └── analysis/
│           ├── dependencyGraph.ts      # Grafo de dependências
│           ├── architectureDetector.ts # Detecção de camadas
│           └── patternDetector.ts      # Detecção de padrões
├── generators/
│   ├── documentation/
│   │   └── documentationGenerator.ts   # Integrar contexto semântico
│   ├── agents/
│   │   └── agentGenerator.ts           # Integrar contexto semântico
│   └── plans/
│       └── planGenerator.ts            # Integrar contexto semântico
└── types.ts                            # Estender com SemanticContext
```

---

## Implementação Detalhada

### Tipos Compartilhados

```typescript
// src/services/semantic/types.ts

export interface ExtractedSymbol {
  name: string;
  kind: 'class' | 'interface' | 'function' | 'type' | 'variable' | 'enum';
  location: { file: string; line: number; column: number };
  exported: boolean;
  documentation?: string;
  // Relacionamentos básicos (sintáticos)
  extends?: string;
  implements?: string[];
  parameters?: ParameterInfo[];
  returnType?: string;
}

export interface ImportInfo {
  source: string;           // './foo' ou 'lodash'
  specifiers: string[];     // ['Bar', 'Baz']
  isDefault: boolean;
  isNamespace: boolean;     // import * as X
}

export interface ExportInfo {
  name: string;
  isDefault: boolean;
  isReExport: boolean;
  originalSource?: string;  // para re-exports
}

export interface FileAnalysis {
  filePath: string;
  symbols: ExtractedSymbol[];
  imports: ImportInfo[];
  exports: ExportInfo[];
}

export interface SemanticContext {
  symbols: {
    classes: ExtractedSymbol[];
    interfaces: ExtractedSymbol[];
    functions: ExtractedSymbol[];
    types: ExtractedSymbol[];
    enums: ExtractedSymbol[];
  };
  dependencies: {
    graph: Map<string, string[]>;
    reverseGraph: Map<string, string[]>;
  };
  architecture: {
    layers: ArchitectureLayer[];
    patterns: DetectedPattern[];
    entryPoints: string[];
    publicAPI: ExtractedSymbol[];
  };
  stats: {
    totalFiles: number;
    totalSymbols: number;
    languageBreakdown: Record<string, number>;
  };
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
  locations: { file: string; symbol: string }[];
  description: string;
}
```

---

### TreeSitterLayer

```typescript
// src/services/semantic/treeSitter/treeSitterLayer.ts

import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import Python from 'tree-sitter-python';
import Go from 'tree-sitter-go';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ExtractedSymbol, ImportInfo, ExportInfo, FileAnalysis } from '../types';

export class TreeSitterLayer {
  private parsers: Map<string, Parser> = new Map();
  private cache: Map<string, { mtime: number; analysis: FileAnalysis }> = new Map();

  constructor() {
    this.initializeParsers();
  }

  private initializeParsers(): void {
    // TypeScript/JavaScript
    const tsParser = new Parser();
    tsParser.setLanguage(TypeScript.typescript);
    this.parsers.set('.ts', tsParser);
    this.parsers.set('.tsx', tsParser);

    const jsParser = new Parser();
    jsParser.setLanguage(TypeScript.javascript);
    this.parsers.set('.js', jsParser);
    this.parsers.set('.jsx', jsParser);

    // Python
    const pyParser = new Parser();
    pyParser.setLanguage(Python);
    this.parsers.set('.py', pyParser);

    // Go
    const goParser = new Parser();
    goParser.setLanguage(Go);
    this.parsers.set('.go', goParser);
  }

  async analyzeFile(filePath: string): Promise<FileAnalysis> {
    const stat = await fs.stat(filePath);
    const mtime = stat.mtimeMs;

    // Verifica cache
    const cached = this.cache.get(filePath);
    if (cached && cached.mtime === mtime) {
      return cached.analysis;
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath);
    const parser = this.parsers.get(ext);

    if (!parser) {
      return { filePath, symbols: [], imports: [], exports: [] };
    }

    const tree = parser.parse(content);
    const analysis = this.extractFromTree(tree, filePath, ext);

    this.cache.set(filePath, { mtime, analysis });
    return analysis;
  }

  private extractFromTree(
    tree: Parser.Tree,
    filePath: string,
    ext: string
  ): FileAnalysis {
    const symbols: ExtractedSymbol[] = [];
    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = [];

    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      this.extractTypeScript(tree, filePath, symbols, imports, exports);
    } else if (ext === '.py') {
      this.extractPython(tree, filePath, symbols, imports, exports);
    } else if (ext === '.go') {
      this.extractGo(tree, filePath, symbols, imports, exports);
    }

    return { filePath, symbols, imports, exports };
  }

  private extractTypeScript(
    tree: Parser.Tree,
    filePath: string,
    symbols: ExtractedSymbol[],
    imports: ImportInfo[],
    exports: ExportInfo[]
  ): void {
    const cursor = tree.walk();

    const visit = (): void => {
      const node = cursor.currentNode;

      switch (node.type) {
        case 'class_declaration':
          symbols.push(this.extractClass(node, filePath));
          break;
        case 'interface_declaration':
          symbols.push(this.extractInterface(node, filePath));
          break;
        case 'function_declaration':
          symbols.push(this.extractFunction(node, filePath));
          break;
        case 'type_alias_declaration':
          symbols.push(this.extractTypeAlias(node, filePath));
          break;
        case 'enum_declaration':
          symbols.push(this.extractEnum(node, filePath));
          break;
        case 'import_statement':
          imports.push(this.extractImport(node));
          break;
        case 'export_statement':
          const exportInfo = this.extractExport(node);
          if (exportInfo) exports.push(exportInfo);
          break;
      }

      if (cursor.gotoFirstChild()) {
        do { visit(); } while (cursor.gotoNextSibling());
        cursor.gotoParent();
      }
    };

    visit();
  }

  private extractClass(node: Parser.SyntaxNode, filePath: string): ExtractedSymbol {
    const nameNode = node.childForFieldName('name');
    const heritageClause = node.children.find(c => c.type === 'class_heritage');

    let extendsName: string | undefined;
    const implementsNames: string[] = [];

    if (heritageClause) {
      const extendsClause = heritageClause.children.find(c => c.type === 'extends_clause');
      if (extendsClause) {
        const identifier = extendsClause.children.find(c =>
          c.type === 'identifier' || c.type === 'type_identifier'
        );
        extendsName = identifier?.text;
      }

      const implementsClause = heritageClause.children.find(c => c.type === 'implements_clause');
      if (implementsClause) {
        implementsClause.children
          .filter(c => c.type === 'type_identifier')
          .forEach(c => implementsNames.push(c.text));
      }
    }

    return {
      name: nameNode?.text || 'anonymous',
      kind: 'class',
      location: {
        file: filePath,
        line: node.startPosition.row + 1,
        column: node.startPosition.column,
      },
      exported: this.isExported(node),
      documentation: this.extractJSDoc(node),
      extends: extendsName,
      implements: implementsNames.length > 0 ? implementsNames : undefined,
    };
  }

  private extractInterface(node: Parser.SyntaxNode, filePath: string): ExtractedSymbol {
    const nameNode = node.childForFieldName('name');
    const extendsClause = node.children.find(c => c.type === 'extends_type_clause');

    const extendsNames: string[] = [];
    if (extendsClause) {
      extendsClause.children
        .filter(c => c.type === 'type_identifier')
        .forEach(c => extendsNames.push(c.text));
    }

    return {
      name: nameNode?.text || 'anonymous',
      kind: 'interface',
      location: {
        file: filePath,
        line: node.startPosition.row + 1,
        column: node.startPosition.column,
      },
      exported: this.isExported(node),
      documentation: this.extractJSDoc(node),
      extends: extendsNames[0],
    };
  }

  private extractFunction(node: Parser.SyntaxNode, filePath: string): ExtractedSymbol {
    const nameNode = node.childForFieldName('name');
    const paramsNode = node.childForFieldName('parameters');
    const returnTypeNode = node.childForFieldName('return_type');

    return {
      name: nameNode?.text || 'anonymous',
      kind: 'function',
      location: {
        file: filePath,
        line: node.startPosition.row + 1,
        column: node.startPosition.column,
      },
      exported: this.isExported(node),
      documentation: this.extractJSDoc(node),
      returnType: returnTypeNode?.text?.replace(/^:\s*/, ''),
    };
  }

  private extractTypeAlias(node: Parser.SyntaxNode, filePath: string): ExtractedSymbol {
    const nameNode = node.childForFieldName('name');

    return {
      name: nameNode?.text || 'anonymous',
      kind: 'type',
      location: {
        file: filePath,
        line: node.startPosition.row + 1,
        column: node.startPosition.column,
      },
      exported: this.isExported(node),
      documentation: this.extractJSDoc(node),
    };
  }

  private extractEnum(node: Parser.SyntaxNode, filePath: string): ExtractedSymbol {
    const nameNode = node.childForFieldName('name');

    return {
      name: nameNode?.text || 'anonymous',
      kind: 'enum',
      location: {
        file: filePath,
        line: node.startPosition.row + 1,
        column: node.startPosition.column,
      },
      exported: this.isExported(node),
      documentation: this.extractJSDoc(node),
    };
  }

  private extractImport(node: Parser.SyntaxNode): ImportInfo {
    const sourceNode = node.children.find(c => c.type === 'string');
    const source = sourceNode?.text?.replace(/['"]/g, '') || '';

    const specifiers: string[] = [];
    let isDefault = false;
    let isNamespace = false;

    const importClause = node.children.find(c => c.type === 'import_clause');
    if (importClause) {
      // Default import: import Foo from 'bar'
      const defaultImport = importClause.children.find(c => c.type === 'identifier');
      if (defaultImport) {
        specifiers.push(defaultImport.text);
        isDefault = true;
      }

      // Named imports: import { Foo, Bar } from 'baz'
      const namedImports = importClause.children.find(c => c.type === 'named_imports');
      if (namedImports) {
        namedImports.children
          .filter(c => c.type === 'import_specifier')
          .forEach(spec => {
            const name = spec.childForFieldName('name') || spec.children.find(c => c.type === 'identifier');
            if (name) specifiers.push(name.text);
          });
      }

      // Namespace import: import * as Foo from 'bar'
      const namespaceImport = importClause.children.find(c => c.type === 'namespace_import');
      if (namespaceImport) {
        const name = namespaceImport.children.find(c => c.type === 'identifier');
        if (name) specifiers.push(name.text);
        isNamespace = true;
      }
    }

    return { source, specifiers, isDefault, isNamespace };
  }

  private extractExport(node: Parser.SyntaxNode): ExportInfo | null {
    // export default X
    const isDefault = node.children.some(c => c.type === 'default');

    // export { X, Y }
    const exportClause = node.children.find(c => c.type === 'export_clause');
    if (exportClause) {
      const specifiers = exportClause.children
        .filter(c => c.type === 'export_specifier')
        .map(spec => {
          const name = spec.childForFieldName('name') || spec.children.find(c => c.type === 'identifier');
          return name?.text || '';
        })
        .filter(Boolean);

      if (specifiers.length > 0) {
        return { name: specifiers[0], isDefault: false, isReExport: false };
      }
    }

    // export class/function/etc
    const declaration = node.children.find(c =>
      ['class_declaration', 'function_declaration', 'interface_declaration',
       'type_alias_declaration', 'enum_declaration', 'variable_declaration'].includes(c.type)
    );
    if (declaration) {
      const nameNode = declaration.childForFieldName('name');
      return {
        name: nameNode?.text || 'default',
        isDefault,
        isReExport: false
      };
    }

    return null;
  }

  private isExported(node: Parser.SyntaxNode): boolean {
    let parent = node.parent;
    while (parent) {
      if (parent.type === 'export_statement') return true;
      parent = parent.parent;
    }
    return false;
  }

  private extractJSDoc(node: Parser.SyntaxNode): string | undefined {
    const prev = node.previousNamedSibling;
    if (prev?.type === 'comment' && prev.text.startsWith('/**')) {
      return prev.text
        .replace(/^\/\*\*\s*/, '')
        .replace(/\s*\*\/$/, '')
        .replace(/^\s*\*\s?/gm, '')
        .trim();
    }
    return undefined;
  }

  private extractPython(
    tree: Parser.Tree,
    filePath: string,
    symbols: ExtractedSymbol[],
    imports: ImportInfo[],
    exports: ExportInfo[]
  ): void {
    // Similar implementation for Python
    // Uses different node types: class_definition, function_definition, import_statement, etc.
  }

  private extractGo(
    tree: Parser.Tree,
    filePath: string,
    symbols: ExtractedSymbol[],
    imports: ImportInfo[],
    exports: ExportInfo[]
  ): void {
    // Similar implementation for Go
    // Uses different node types: type_declaration, function_declaration, import_declaration, etc.
  }

  clearCache(): void {
    this.cache.clear();
  }
}
```

---

### LSPLayer (Lazy Loading)

```typescript
// src/services/semantic/lsp/lspLayer.ts

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as readline from 'readline';

interface LSPMessage {
  jsonrpc: '2.0';
  id?: number;
  method?: string;
  params?: any;
  result?: any;
  error?: any;
}

interface TypeInfo {
  name: string;
  fullType: string;
  documentation?: string;
}

interface ReferenceLocation {
  file: string;
  line: number;
  column: number;
  context?: string;
}

interface ServerConfig {
  command: string;
  args: string[];
}

export class LSPLayer {
  private servers: Map<string, ChildProcess> = new Map();
  private messageId: number = 0;
  private pendingRequests: Map<number, { resolve: Function; reject: Function }> = new Map();
  private initialized: Map<string, boolean> = new Map();

  private getServerConfig(language: string): ServerConfig | null {
    const configs: Record<string, ServerConfig> = {
      typescript: {
        command: 'typescript-language-server',
        args: ['--stdio'],
      },
      javascript: {
        command: 'typescript-language-server',
        args: ['--stdio'],
      },
      python: {
        command: 'pylsp',
        args: [],
      },
      go: {
        command: 'gopls',
        args: ['serve'],
      },
      rust: {
        command: 'rust-analyzer',
        args: [],
      },
    };
    return configs[language] || null;
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath);
    const mapping: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
    };
    return mapping[ext] || 'unknown';
  }

  async ensureServer(language: string, projectPath: string): Promise<void> {
    if (this.initialized.get(language)) return;

    const config = this.getServerConfig(language);
    if (!config) {
      throw new Error(`No LSP server configured for ${language}`);
    }

    const serverProcess = spawn(config.command, config.args, {
      cwd: projectPath,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.servers.set(language, serverProcess);

    // Setup message handling
    let buffer = '';
    serverProcess.stdout?.on('data', (data: Buffer) => {
      buffer += data.toString();

      while (true) {
        const headerMatch = buffer.match(/Content-Length: (\d+)\r\n\r\n/);
        if (!headerMatch) break;

        const contentLength = parseInt(headerMatch[1], 10);
        const headerEnd = headerMatch.index! + headerMatch[0].length;

        if (buffer.length < headerEnd + contentLength) break;

        const content = buffer.slice(headerEnd, headerEnd + contentLength);
        buffer = buffer.slice(headerEnd + contentLength);

        try {
          const message: LSPMessage = JSON.parse(content);
          this.handleMessage(message);
        } catch (e) {
          console.error('Failed to parse LSP message:', e);
        }
      }
    });

    // Initialize the server
    await this.sendRequest(language, 'initialize', {
      processId: process.pid,
      rootUri: `file://${projectPath}`,
      capabilities: {
        textDocument: {
          hover: { contentFormat: ['markdown', 'plaintext'] },
          definition: { linkSupport: true },
          references: {},
          implementation: {},
        },
      },
    });

    await this.sendNotification(language, 'initialized', {});
    this.initialized.set(language, true);
  }

  private sendRequest(language: string, method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      this.pendingRequests.set(id, { resolve, reject });

      const message: LSPMessage = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      this.sendMessage(language, message);
    });
  }

  private sendNotification(language: string, method: string, params: any): void {
    const message: LSPMessage = {
      jsonrpc: '2.0',
      method,
      params,
    };
    this.sendMessage(language, message);
  }

  private sendMessage(language: string, message: LSPMessage): void {
    const server = this.servers.get(language);
    if (!server?.stdin) return;

    const content = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n`;
    server.stdin.write(header + content);
  }

  private handleMessage(message: LSPMessage): void {
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result);
      }
    }
  }

  async getTypeInfo(
    filePath: string,
    line: number,
    column: number,
    projectPath: string
  ): Promise<TypeInfo | null> {
    const language = this.detectLanguage(filePath);
    await this.ensureServer(language, projectPath);

    try {
      const result = await this.sendRequest(language, 'textDocument/hover', {
        textDocument: { uri: `file://${filePath}` },
        position: { line: line - 1, character: column },
      });

      if (result?.contents) {
        return this.parseHoverResult(result.contents);
      }
    } catch (e) {
      console.warn(`LSP hover failed for ${filePath}:${line}:${column}`, e);
    }

    return null;
  }

  async findReferences(
    filePath: string,
    line: number,
    column: number,
    projectPath: string
  ): Promise<ReferenceLocation[]> {
    const language = this.detectLanguage(filePath);
    await this.ensureServer(language, projectPath);

    try {
      const result = await this.sendRequest(language, 'textDocument/references', {
        textDocument: { uri: `file://${filePath}` },
        position: { line: line - 1, character: column },
        context: { includeDeclaration: true },
      });

      return (result || []).map((ref: any) => ({
        file: ref.uri.replace('file://', ''),
        line: ref.range.start.line + 1,
        column: ref.range.start.character,
      }));
    } catch (e) {
      console.warn(`LSP references failed for ${filePath}:${line}:${column}`, e);
      return [];
    }
  }

  async getDefinition(
    filePath: string,
    line: number,
    column: number,
    projectPath: string
  ): Promise<ReferenceLocation | null> {
    const language = this.detectLanguage(filePath);
    await this.ensureServer(language, projectPath);

    try {
      const result = await this.sendRequest(language, 'textDocument/definition', {
        textDocument: { uri: `file://${filePath}` },
        position: { line: line - 1, character: column },
      });

      if (result && result.length > 0) {
        const def = result[0];
        return {
          file: def.uri.replace('file://', ''),
          line: def.range.start.line + 1,
          column: def.range.start.character,
        };
      }
    } catch (e) {
      console.warn(`LSP definition failed for ${filePath}:${line}:${column}`, e);
    }

    return null;
  }

  async findImplementations(
    filePath: string,
    line: number,
    column: number,
    projectPath: string
  ): Promise<ReferenceLocation[]> {
    const language = this.detectLanguage(filePath);
    await this.ensureServer(language, projectPath);

    try {
      const result = await this.sendRequest(language, 'textDocument/implementation', {
        textDocument: { uri: `file://${filePath}` },
        position: { line: line - 1, character: column },
      });

      return (result || []).map((impl: any) => ({
        file: impl.uri.replace('file://', ''),
        line: impl.range.start.line + 1,
        column: impl.range.start.character,
      }));
    } catch (e) {
      console.warn(`LSP implementations failed for ${filePath}:${line}:${column}`, e);
      return [];
    }
  }

  private parseHoverResult(contents: any): TypeInfo {
    let text = '';

    if (typeof contents === 'string') {
      text = contents;
    } else if (Array.isArray(contents)) {
      text = contents.map(c => typeof c === 'string' ? c : c.value).join('\n');
    } else if (contents.value) {
      text = contents.value;
    }

    // Extract type from markdown code blocks
    const codeMatch = text.match(/```\w*\n?([\s\S]*?)\n?```/);
    const typeText = codeMatch ? codeMatch[1] : text;

    return {
      name: typeText.split('\n')[0] || 'unknown',
      fullType: typeText,
      documentation: text.replace(/```[\s\S]*?```/g, '').trim() || undefined,
    };
  }

  async shutdown(): Promise<void> {
    for (const [language, server] of this.servers) {
      try {
        await this.sendRequest(language, 'shutdown', null);
        this.sendNotification(language, 'exit', null);
      } catch (e) {
        // Ignore shutdown errors
      }
      server.kill();
    }
    this.servers.clear();
    this.initialized.clear();
  }
}
```

---

### CodebaseAnalyzer (Orquestrador)

```typescript
// src/services/semantic/codebaseAnalyzer.ts

import { glob } from 'glob';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TreeSitterLayer } from './treeSitter/treeSitterLayer';
import { LSPLayer } from './lsp/lspLayer';
import {
  SemanticContext,
  FileAnalysis,
  ExtractedSymbol,
  ArchitectureLayer,
  DetectedPattern,
} from './types';

export interface AnalyzerOptions {
  useLSP?: boolean;
  languages?: string[];
  exclude?: string[];
}

export class CodebaseAnalyzer {
  private treeSitter: TreeSitterLayer;
  private lsp: LSPLayer;
  private options: AnalyzerOptions;

  constructor(options: AnalyzerOptions = {}) {
    this.treeSitter = new TreeSitterLayer();
    this.lsp = new LSPLayer();
    this.options = {
      useLSP: false,
      languages: ['typescript', 'javascript', 'python', 'go'],
      exclude: ['node_modules', 'dist', 'build', '.git', 'vendor', '__pycache__'],
      ...options,
    };
  }

  async analyze(projectPath: string): Promise<SemanticContext> {
    // 1. Encontrar arquivos de código
    const files = await this.findCodeFiles(projectPath);

    // 2. Análise com Tree-sitter (rápida)
    const fileAnalyses = await this.analyzeWithTreeSitter(files);

    // 3. Construir contexto base
    const context = this.buildBaseContext(fileAnalyses, projectPath);

    // 4. Detectar arquitetura e padrões
    context.architecture = this.detectArchitecture(fileAnalyses, projectPath);

    // 5. Enriquecer com LSP se habilitado
    if (this.options.useLSP) {
      await this.enrichWithLSP(context, projectPath);
    }

    return context;
  }

  private async findCodeFiles(projectPath: string): Promise<string[]> {
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java'];
    const patterns = extensions.map(ext => `**/*${ext}`);

    const ignorePatterns = this.options.exclude!.map(p => `**/${p}/**`);

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: projectPath,
        ignore: ignorePatterns,
        absolute: true,
      });
      files.push(...matches);
    }

    return files;
  }

  private async analyzeWithTreeSitter(
    files: string[]
  ): Promise<Map<string, FileAnalysis>> {
    const analyses = new Map<string, FileAnalysis>();

    // Processa em paralelo (batches de 50)
    const batchSize = 50;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(file => this.treeSitter.analyzeFile(file))
      );
      results.forEach(analysis => {
        analyses.set(analysis.filePath, analysis);
      });
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
      // Contagem por linguagem
      const ext = path.extname(file);
      languageCount[ext] = (languageCount[ext] || 0) + 1;

      // Categoriza símbolos
      for (const symbol of analysis.symbols) {
        const list = symbols[symbol.kind + 's' as keyof typeof symbols];
        if (list) list.push(symbol);
      }

      // Constrói grafo de dependências
      const importedFiles = analysis.imports
        .map(imp => this.resolveImportPath(file, imp.source, projectPath))
        .filter(Boolean) as string[];

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
      },
    };
  }

  private resolveImportPath(
    fromFile: string,
    importSource: string,
    projectPath: string
  ): string | null {
    // Ignora imports de pacotes externos
    if (!importSource.startsWith('.') && !importSource.startsWith('/')) {
      return null;
    }

    const dir = path.dirname(fromFile);
    let resolved = path.resolve(dir, importSource);

    // Tenta adicionar extensões comuns
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js'];
    for (const ext of extensions) {
      const withExt = resolved + ext;
      if (this.fileExists(withExt)) {
        return withExt;
      }
    }

    return null;
  }

  private fileExists(filePath: string): boolean {
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

    // Calcula dependências entre layers
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
        patterns: [/services?/i, /use-?cases?/i],
        description: 'Business logic and orchestration',
      },
      {
        name: 'Controllers',
        patterns: [/controllers?/i, /handlers?/i, /routes?/i],
        description: 'Request handling and routing',
      },
      {
        name: 'Models',
        patterns: [/models?/i, /entities/i, /domain/i],
        description: 'Data structures and domain objects',
      },
      {
        name: 'Repositories',
        patterns: [/repositor/i, /data/i, /database/i],
        description: 'Data access and persistence',
      },
      {
        name: 'Utils',
        patterns: [/utils?/i, /helpers?/i, /lib/i, /common/i],
        description: 'Shared utilities and helpers',
      },
      {
        name: 'Generators',
        patterns: [/generators?/i, /builders?/i, /factories?/i],
        description: 'Content and object generation',
      },
    ];

    const layers: ArchitectureLayer[] = [];
    const filesByLayer = new Map<string, string[]>();

    for (const [file] of analyses) {
      const relativePath = path.relative(projectPath, file);

      for (const heuristic of layerHeuristics) {
        if (heuristic.patterns.some(p => p.test(relativePath))) {
          if (!filesByLayer.has(heuristic.name)) {
            filesByLayer.set(heuristic.name, []);
          }
          filesByLayer.get(heuristic.name)!.push(file);
          break;
        }
      }
    }

    for (const [layerName, files] of filesByLayer) {
      const heuristic = layerHeuristics.find(h => h.name === layerName)!;
      const layerSymbols: ExtractedSymbol[] = [];
      const directories = new Set<string>();

      for (const file of files) {
        const analysis = analyses.get(file)!;
        layerSymbols.push(...analysis.symbols);
        directories.add(path.dirname(path.relative(projectPath, file)));
      }

      layers.push({
        name: layerName,
        description: heuristic.description,
        directories: [...directories],
        symbols: layerSymbols,
        dependsOn: [],
      });
    }

    return layers;
  }

  private detectPatterns(analyses: Map<string, FileAnalysis>): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const allSymbols = [...analyses.values()].flatMap(a => a.symbols);

    // Factory Pattern
    const factories = allSymbols.filter(
      s => /Factory$/.test(s.name) && s.kind === 'class'
    );
    if (factories.length > 0) {
      patterns.push({
        name: 'Factory',
        confidence: 0.9,
        locations: factories.map(s => ({ file: s.location.file, symbol: s.name })),
        description: 'Creates instances of related objects without specifying concrete classes',
      });
    }

    // Singleton Pattern
    const singletons = allSymbols.filter(
      s => s.kind === 'class' && /Singleton|Instance/.test(s.name)
    );
    if (singletons.length > 0) {
      patterns.push({
        name: 'Singleton',
        confidence: 0.7,
        locations: singletons.map(s => ({ file: s.location.file, symbol: s.name })),
        description: 'Ensures a class has only one instance',
      });
    }

    // Repository Pattern
    const repositories = allSymbols.filter(
      s => /Repository$/.test(s.name) && (s.kind === 'class' || s.kind === 'interface')
    );
    if (repositories.length > 0) {
      patterns.push({
        name: 'Repository',
        confidence: 0.9,
        locations: repositories.map(s => ({ file: s.location.file, symbol: s.name })),
        description: 'Abstracts data access logic',
      });
    }

    // Service Pattern
    const services = allSymbols.filter(
      s => /Service$/.test(s.name) && s.kind === 'class'
    );
    if (services.length > 0) {
      patterns.push({
        name: 'Service Layer',
        confidence: 0.85,
        locations: services.map(s => ({ file: s.location.file, symbol: s.name })),
        description: 'Encapsulates business logic in service classes',
      });
    }

    return patterns;
  }

  private findEntryPoints(
    analyses: Map<string, FileAnalysis>,
    projectPath: string
  ): string[] {
    const entryPoints: string[] = [];

    for (const [file] of analyses) {
      const relativePath = path.relative(projectPath, file);
      const basename = path.basename(file);

      // Arquivos típicos de entry point
      if (
        /^(index|main|app|server|cli)\.(ts|js)$/.test(basename) ||
        /src\/(index|main|app)\.(ts|js)$/.test(relativePath)
      ) {
        entryPoints.push(relativePath);
      }
    }

    return entryPoints;
  }

  private findPublicAPI(analyses: Map<string, FileAnalysis>): ExtractedSymbol[] {
    const publicSymbols: ExtractedSymbol[] = [];

    for (const [, analysis] of analyses) {
      for (const symbol of analysis.symbols) {
        if (symbol.exported && (symbol.kind === 'class' || symbol.kind === 'interface')) {
          publicSymbols.push(symbol);
        }
      }
    }

    return publicSymbols;
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

  private async enrichWithLSP(
    context: SemanticContext,
    projectPath: string
  ): Promise<void> {
    // Enriquece apenas símbolos importantes
    const importantSymbols = [
      ...context.architecture.publicAPI,
      ...context.symbols.interfaces.filter(i => i.exported),
    ].slice(0, 30); // Limita para performance

    for (const symbol of importantSymbols) {
      try {
        const typeInfo = await this.lsp.getTypeInfo(
          symbol.location.file,
          symbol.location.line,
          symbol.location.column,
          projectPath
        );

        if (typeInfo) {
          (symbol as any).resolvedType = typeInfo;
        }

        if (symbol.kind === 'interface') {
          const implementations = await this.lsp.findImplementations(
            symbol.location.file,
            symbol.location.line,
            symbol.location.column,
            projectPath
          );
          (symbol as any).implementations = implementations;
        }
      } catch (error) {
        // LSP pode falhar, continua sem enriquecimento
      }
    }
  }

  async shutdown(): Promise<void> {
    await this.lsp.shutdown();
  }
}
```

---

## Integração com Generators

### Modificações no DocumentationGenerator

```typescript
// src/generators/documentation/documentationGenerator.ts

import { CodebaseAnalyzer, SemanticContext } from '../../services/semantic';

export interface EnhancedDocContext extends DocumentationTemplateContext {
  semantics?: SemanticContext;
}

export class DocumentationGenerator {
  private analyzer?: CodebaseAnalyzer;

  constructor(
    private basePath: string,
    private options: { useSemantics?: boolean } = {}
  ) {
    if (options.useSemantics) {
      this.analyzer = new CodebaseAnalyzer({ useLSP: false });
    }
  }

  async generateDocumentation(/* ... */): Promise<DocumentationResult> {
    // Análise existente
    const repoStructure = await this.analyzeRepository();

    // Nova análise semântica
    let semantics: SemanticContext | undefined;
    if (this.analyzer) {
      semantics = await this.analyzer.analyze(this.basePath);
    }

    const context: EnhancedDocContext = {
      ...existingContext,
      semantics,
    };

    return this.renderTemplates(context);
  }
}
```

### Novos Templates com Contexto Semântico

```typescript
// src/generators/documentation/templates/architectureTemplate.ts

export function renderArchitecture(context: EnhancedDocContext): string {
  if (!context.semantics) {
    return renderGenericArchitecture(context);
  }

  const { architecture, symbols, stats } = context.semantics;

  return `# Architecture

## Overview

- **Total Files**: ${stats.totalFiles}
- **Total Symbols**: ${stats.totalSymbols}
- **Languages**: ${Object.entries(stats.languageBreakdown)
    .map(([ext, count]) => `${ext} (${count})`)
    .join(', ')}

## Layers

${architecture.layers.map(layer => `
### ${layer.name}

${layer.description}

**Directories**: ${layer.directories.map(d => `\`${d}\``).join(', ')}

**Key Symbols**:
${layer.symbols
  .filter(s => s.exported)
  .slice(0, 10)
  .map(s => `- \`${s.name}\` (${s.kind}) - ${s.location.file}:${s.location.line}`)
  .join('\n')}

**Depends On**: ${layer.dependsOn.length > 0 ? layer.dependsOn.join(', ') : 'None'}
`).join('\n')}

## Detected Patterns

| Pattern | Confidence | Locations |
|---------|------------|-----------|
${architecture.patterns.map(p =>
  `| ${p.name} | ${Math.round(p.confidence * 100)}% | ${p.locations.map(l => l.symbol).join(', ')} |`
).join('\n')}

## Entry Points

${architecture.entryPoints.map(ep => `- \`${ep}\``).join('\n')}

## Public API

| Symbol | Kind | Location |
|--------|------|----------|
${architecture.publicAPI.slice(0, 20).map(s =>
  `| \`${s.name}\` | ${s.kind} | ${s.location.file}:${s.location.line} |`
).join('\n')}
`;
}
```

---

## Configuração e CLI

### Novas opções de CLI

```bash
# Habilitar análise semântica (Tree-sitter apenas)
npx ai-coders-context init --semantic

# Habilitar análise semântica com LSP
npx ai-coders-context init --semantic --lsp

# Especificar linguagens
npx ai-coders-context init --semantic --languages typescript,python

# Desabilitar análise semântica (padrão atual)
npx ai-coders-context init --no-semantic
```

### Configuração em .aicodersrc

```json
{
  "semantic": {
    "enabled": true,
    "useLSP": false,
    "languages": ["typescript", "javascript", "python"],
    "exclude": ["node_modules", "dist", "build"],
    "cache": true
  }
}
```

---

## Dependências

```json
{
  "dependencies": {
    "tree-sitter": "^0.21.0",
    "tree-sitter-typescript": "^0.21.0",
    "tree-sitter-javascript": "^0.21.0",
    "tree-sitter-python": "^0.21.0",
    "tree-sitter-go": "^0.21.0"
  },
  "optionalDependencies": {
    "tree-sitter-rust": "^0.21.0",
    "tree-sitter-java": "^0.21.0"
  }
}
```

**Language Servers (para LSP, opcionais):**
```bash
# TypeScript/JavaScript
npm install -g typescript-language-server typescript

# Python
pip install python-lsp-server

# Go
go install golang.org/x/tools/gopls@latest

# Rust
rustup component add rust-analyzer
```

---

## Fases de Implementação

### Fase 1: Tree-sitter Core (2 semanas)

**Entregas:**
1. `TreeSitterLayer` com suporte a TypeScript/JavaScript
2. Extração de símbolos básicos (classes, interfaces, funções)
3. Extração de imports/exports
4. Testes unitários

**Arquivos:**
- `src/services/semantic/types.ts`
- `src/services/semantic/treeSitter/treeSitterLayer.ts`
- `src/services/semantic/index.ts`

### Fase 2: CodebaseAnalyzer (1 semana)

**Entregas:**
1. `CodebaseAnalyzer` orquestrador
2. Grafo de dependências
3. Detecção de camadas arquiteturais
4. Detecção de padrões de design

**Arquivos:**
- `src/services/semantic/codebaseAnalyzer.ts`
- `src/services/semantic/analysis/dependencyGraph.ts`
- `src/services/semantic/analysis/architectureDetector.ts`
- `src/services/semantic/analysis/patternDetector.ts`

### Fase 3: Integração com Generators (1 semana)

**Entregas:**
1. Integração com `DocumentationGenerator`
2. Integração com `AgentGenerator`
3. Integração com `PlanGenerator`
4. Novos templates com contexto semântico

**Arquivos:**
- Modificações em `src/generators/*/`
- Novos templates em `src/generators/*/templates/`

### Fase 4: LSP Layer (1-2 semanas, opcional)

**Entregas:**
1. `LSPLayer` com suporte a TypeScript
2. Enriquecimento de tipos
3. Find implementations
4. Suporte a Python e Go

**Arquivos:**
- `src/services/semantic/lsp/lspLayer.ts`
- `src/services/semantic/lsp/serverConfigs.ts`

---

## Métricas de Sucesso

| Métrica | Baseline (Atual) | Target |
|---------|-----------------|--------|
| Símbolos identificados | 0 | 100% das classes/interfaces |
| Dependências mapeadas | 0 | 100% dos imports internos |
| Padrões detectados | 0 | Top 5 padrões comuns |
| TODOs em docs geradas | ~80% | <30% |
| Precisão de arquitetura | Genérica | Específica ao projeto |
| Tempo de análise (500 arquivos) | N/A | <500ms |

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Tree-sitter bindings falham | Baixa | Alto | Fallback para análise regex |
| Performance lenta | Média | Médio | Cache + processamento incremental |
| Linguagem não suportada | Baixa | Baixo | Graceful degradation |
| LSP server não instalado | Média | Baixo | LSP é opcional, funciona sem |

---

## Referências

- [Tree-sitter](https://tree-sitter.github.io/)
- [Tree-sitter Node Bindings](https://github.com/tree-sitter/node-tree-sitter)
- [Language Server Protocol Spec](https://microsoft.github.io/language-server-protocol/)
- [TypeScript Language Server](https://github.com/typescript-language-server/typescript-language-server)
