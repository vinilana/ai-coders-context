# Plano: Simplificação da Documentação e Comando Sync

**Status:** Draft
**Criado em:** 2026-01-09
**Objetivo:** Tornar engenharia de contexto "estupidamente simples" com 3 passos

---

## Visão Geral

### Missão
Transformar o `@ai-coders/context` em uma ferramenta que qualquer desenvolvedor possa usar em **3 passos simples**:

```
1. INICIALIZAR  →  2. PREENCHER  →  3. PLANEJAR
     (init)           (fill)          (plan)
```

Após inicializado, manter atualizado com um único comando:

```
sync  →  Detecta mudanças e sugere atualizações
```

---

## 1. Simplificação do README

### Estado Atual
- README com 437 linhas
- 20+ flags e opções documentadas
- Múltiplos exemplos de uso avançado
- Confuso para novos usuários

### Novo README (Proposta)

```markdown
# @ai-coders/context

Engenharia de contexto para AI Coders. Estupidamente simples.

## 3 Passos

### 1. Inicializar
npx @ai-coders/context init .

### 2. Preencher
npx @ai-coders/context fill .

### 3. Planejar
npx @ai-coders/context plan minha-feature

## Manter Atualizado
npx @ai-coders/context sync

---

Para opções avançadas: docs/ADVANCED.md
```

### Estrutura Proposta de Docs

```
README.md              # Ultra simples (< 50 linhas)
docs/
├── GETTING_STARTED.md # Guia completo de início
├── ADVANCED.md        # Todas as opções e flags
├── PROVIDERS.md       # Configuração de LLM providers
├── MCP.md             # Integração Claude Code
└── API.md             # Referência completa da API
```

---

## 2. Novo Comando: `sync`

### Conceito

O comando `sync` é o **diferencial** do produto. Ele:

1. **Captura um snapshot** do código usando tree-sitter
2. **Compara com snapshot anterior** (salvo em `.context/.snapshot`)
3. **Identifica mudanças** (novos arquivos, símbolos alterados, etc.)
4. **Sugere atualizações** na documentação

### Fluxo do Comando

```
┌─────────────────────────────────────────────────────────────┐
│                      ai-context sync                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Carregar snapshot anterior (.context/.snapshot/last.json)│
│                          ↓                                   │
│  2. Analisar código atual com tree-sitter                   │
│                          ↓                                   │
│  3. Comparar snapshots (diff semântico)                     │
│     - Novos arquivos/símbolos                               │
│     - Símbolos removidos                                    │
│     - Assinaturas alteradas                                 │
│     - Dependências modificadas                              │
│                          ↓                                   │
│  4. Mapear mudanças para documentação                       │
│     - Qual doc é afetada por cada mudança                   │
│                          ↓                                   │
│  5. Gerar relatório de sugestões                            │
│                          ↓                                   │
│  6. (Opcional) Auto-atualizar com --fill                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Interface CLI Proposta

```bash
# Modo básico: mostra o que mudou
npx @ai-coders/context sync

# Output:
# ┌─────────────────────────────────────────────┐
# │ 📊 Análise de Mudanças                      │
# ├─────────────────────────────────────────────┤
# │ Arquivos modificados: 5                     │
# │ Novos símbolos: 3                           │
# │ Símbolos removidos: 1                       │
# │ Assinaturas alteradas: 2                    │
# ├─────────────────────────────────────────────┤
# │ 📄 Documentos que precisam de revisão:      │
# │   • architecture.md (3 mudanças)            │
# │   • project-overview.md (1 mudança)         │
# │   • data-flow.md (2 mudanças)               │
# ├─────────────────────────────────────────────┤
# │ 🤖 Playbooks afetados:                      │
# │   • feature-developer.md                    │
# │   • test-writer.md                          │
# └─────────────────────────────────────────────┘

# Modo detalhado: mostra cada mudança
npx @ai-coders/context sync --verbose

# Auto-atualizar com LLM
npx @ai-coders/context sync --fill

# Apenas capturar novo snapshot (após git pull, por exemplo)
npx @ai-coders/context sync --snapshot
```

---

## 3. Arquitetura Técnica do Sync

### 3.1 Estrutura do Snapshot

```typescript
// src/services/sync/types.ts

interface CodeSnapshot {
  version: string;           // Versão do schema
  timestamp: string;         // ISO timestamp
  projectPath: string;       // Raiz do projeto
  gitHash?: string;          // Hash do commit (se disponível)

  files: FileSnapshot[];     // Análise por arquivo
  symbols: SymbolIndex;      // Índice global de símbolos
  dependencies: DependencyGraph;
  stats: SnapshotStats;
}

interface FileSnapshot {
  path: string;              // Caminho relativo
  hash: string;              // SHA256 do conteúdo
  mtime: number;             // Timestamp de modificação
  language: string;          // Linguagem detectada
  symbols: ExtractedSymbol[];
  imports: ImportInfo[];
  exports: ExportInfo[];
}

interface SymbolIndex {
  // Mapa rápido: nome do símbolo -> localização
  [symbolName: string]: {
    kind: SymbolKind;
    file: string;
    line: number;
    exported: boolean;
    signature?: string;      // Para funções/métodos
  }[];
}

interface SnapshotStats {
  totalFiles: number;
  totalSymbols: number;
  languageBreakdown: Record<string, number>;
  analysisTimeMs: number;
}
```

### 3.2 Estrutura do Diff

```typescript
// src/services/sync/diffTypes.ts

interface SnapshotDiff {
  timestamp: string;
  from: {
    timestamp: string;
    gitHash?: string;
  };
  to: {
    timestamp: string;
    gitHash?: string;
  };

  files: {
    added: string[];
    removed: string[];
    modified: string[];
  };

  symbols: {
    added: SymbolChange[];
    removed: SymbolChange[];
    modified: SymbolChange[];  // Assinatura mudou
    moved: SymbolMove[];       // Movido para outro arquivo
  };

  dependencies: {
    added: DependencyChange[];
    removed: DependencyChange[];
  };

  impact: ImpactAnalysis;
}

interface SymbolChange {
  name: string;
  kind: SymbolKind;
  file: string;
  line: number;
  previousSignature?: string;
  newSignature?: string;
}

interface ImpactAnalysis {
  // Quais docs são afetadas por cada mudança
  documentationImpact: {
    file: string;            // Ex: "architecture.md"
    changes: string[];       // Lista de mudanças que afetam
    severity: 'low' | 'medium' | 'high';
    suggestedAction: string;
  }[];

  // Quais playbooks são afetados
  playbookImpact: {
    file: string;
    changes: string[];
    severity: 'low' | 'medium' | 'high';
    suggestedAction: string;
  }[];
}
```

### 3.3 Serviço de Sync

```typescript
// src/services/sync/codeSync/codeSyncService.ts

export class CodeSyncService {
  private treeSitter: TreeSitterLayer;
  private snapshotPath: string;

  constructor(options: CodeSyncOptions) {
    this.treeSitter = new TreeSitterLayer();
    this.snapshotPath = path.join(options.contextDir, '.snapshot');
  }

  /**
   * Cria um novo snapshot do código atual
   */
  async createSnapshot(projectPath: string): Promise<CodeSnapshot>;

  /**
   * Carrega o snapshot anterior
   */
  async loadPreviousSnapshot(): Promise<CodeSnapshot | null>;

  /**
   * Salva um snapshot
   */
  async saveSnapshot(snapshot: CodeSnapshot): Promise<void>;

  /**
   * Compara dois snapshots e retorna as diferenças
   */
  diff(previous: CodeSnapshot, current: CodeSnapshot): SnapshotDiff;

  /**
   * Analisa o impacto das mudanças na documentação
   */
  analyzeImpact(diff: SnapshotDiff, contextDir: string): ImpactAnalysis;

  /**
   * Executa o fluxo completo de sync
   */
  async run(options: SyncRunOptions): Promise<SyncResult>;
}
```

### 3.4 Mapeamento Mudança → Documentação

A lógica de mapeamento conecta mudanças de código a documentos específicos:

```typescript
// src/services/sync/codeSync/impactMapper.ts

const IMPACT_RULES: ImpactRule[] = [
  // Mudanças em services/ afetam architecture.md
  {
    pattern: /^src\/services\//,
    documents: ['architecture.md', 'data-flow.md'],
    playbooks: ['backend-specialist.md', 'feature-developer.md']
  },

  // Novos exports públicos afetam API docs
  {
    condition: (change) => change.kind === 'added' && change.exported,
    documents: ['api-reference.md', 'project-overview.md'],
    playbooks: ['documentation-writer.md']
  },

  // Mudanças em tipos/interfaces afetam arquitetura
  {
    condition: (change) => ['interface', 'type'].includes(change.symbolKind),
    documents: ['architecture.md', 'glossary.md'],
    playbooks: ['architect-specialist.md']
  },

  // Mudanças em testes afetam testing strategy
  {
    pattern: /\.(test|spec)\.(ts|js)$/,
    documents: ['testing-strategy.md'],
    playbooks: ['test-writer.md']
  },

  // Novas dependências afetam tooling
  {
    condition: (change) => change.type === 'dependency' && change.action === 'added',
    documents: ['tooling.md', 'development-workflow.md'],
    playbooks: ['feature-developer.md']
  }
];
```

---

## 4. Implementação Faseada

### Fase 1: Simplificação README (1 dia)
- [ ] Criar novo README minimalista
- [ ] Mover conteúdo avançado para `docs/ADVANCED.md`
- [ ] Criar `docs/GETTING_STARTED.md`
- [ ] Atualizar CLAUDE.md e AGENTS.md

### Fase 2: Snapshot System (2-3 dias)
- [ ] Criar tipos em `src/services/sync/codeSync/types.ts`
- [ ] Implementar `SnapshotService` para criar/salvar snapshots
- [ ] Integrar com `TreeSitterLayer` existente
- [ ] Criar storage em `.context/.snapshot/`
- [ ] Testes unitários

### Fase 3: Diff Engine (2-3 dias)
- [ ] Implementar `SnapshotDiffer` para comparar snapshots
- [ ] Detectar mudanças de arquivos (added/removed/modified)
- [ ] Detectar mudanças de símbolos
- [ ] Detectar mudanças de dependências
- [ ] Testes unitários

### Fase 4: Impact Analyzer (2 dias)
- [ ] Criar regras de mapeamento mudança → doc
- [ ] Implementar `ImpactAnalyzer`
- [ ] Gerar sugestões de atualização
- [ ] Testes unitários

### Fase 5: CLI Integration (1-2 dias)
- [ ] Adicionar comando `sync` no CLI
- [ ] Implementar flags (`--verbose`, `--fill`, `--snapshot`)
- [ ] Criar output formatado
- [ ] Integrar com `FillService` para auto-update
- [ ] Testes e2e

### Fase 6: Documentação (1 dia)
- [ ] Documentar novo comando
- [ ] Atualizar exemplos
- [ ] Criar tutorial de uso

---

## 5. Estrutura de Arquivos Proposta

```
src/services/sync/
├── index.ts                    # Exports públicos
├── syncService.ts              # (existente - renomear para agentSyncService)
├── codeSync/
│   ├── index.ts
│   ├── types.ts                # Tipos do snapshot e diff
│   ├── snapshotService.ts      # Criar/salvar snapshots
│   ├── snapshotDiffer.ts       # Comparar snapshots
│   ├── impactAnalyzer.ts       # Mapear mudanças → docs
│   └── codeSyncService.ts      # Orquestrador principal
├── presets.ts                  # (existente)
├── symlinkHandler.ts           # (existente)
└── markdownReferenceHandler.ts # (existente)
```

---

## 6. Exemplo de Uso Final

### Workflow Típico

```bash
# 1. Primeiro setup do projeto
npx @ai-coders/context init .
npx @ai-coders/context fill .

# 2. Trabalhar no código normalmente...
# ... dias depois ...

# 3. Verificar o que mudou e atualizar docs
npx @ai-coders/context sync

# Output:
# ┌─────────────────────────────────────────────┐
# │ 📊 Mudanças desde 2026-01-05               │
# ├─────────────────────────────────────────────┤
# │ ✚ 2 novos arquivos                         │
# │ ✎ 5 arquivos modificados                   │
# │ ✚ 4 novos símbolos exportados              │
# │ ✎ 2 assinaturas alteradas                  │
# ├─────────────────────────────────────────────┤
# │ 📄 Docs que precisam de revisão:           │
# │   • architecture.md (alta prioridade)      │
# │     → Nova classe UserAuthService          │
# │     → Interface AuthProvider alterada      │
# │   • api-reference.md (média prioridade)    │
# │     → 2 novos endpoints exportados         │
# └─────────────────────────────────────────────┘
#
# Executar 'sync --fill' para atualizar automaticamente

# 4. Auto-atualizar com LLM
npx @ai-coders/context sync --fill

# 5. Planejar nova feature usando docs atualizadas
npx @ai-coders/context plan auth-improvements
```

---

## 7. Métricas de Sucesso

1. **Simplicidade**: README < 50 linhas
2. **Adoção**: Tempo do primeiro "fill" < 2 minutos
3. **Manutenção**: `sync` executa em < 5 segundos para projetos médios
4. **Precisão**: > 80% das sugestões de atualização são relevantes

---

## 8. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Snapshots muito grandes | Comprimir, armazenar apenas hash de arquivos grandes |
| Falsos positivos no diff | Adicionar opção `--ignore-pattern` |
| Tree-sitter não disponível | Usar fallback regex (já implementado) |
| Performance em monorepos | Suporte a `--include`/`--exclude` patterns |

---

## Próximos Passos

1. ✅ Aprovar este plano
2. 🔲 Iniciar Fase 1 (Simplificação README)
3. 🔲 Criar branch `feature/code-sync`
4. 🔲 Implementar fases 2-6

---

**Autor:** Claude
**Revisores:** Equipe
