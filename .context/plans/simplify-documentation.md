# Plano: Simplificação - Comando Único Inteligente

**Status:** Draft v2
**Criado em:** 2026-01-09
**Atualizado em:** 2026-01-09
**Objetivo:** Tornar engenharia de contexto "estupidamente simples"

---

## Filosofia

> **Zero comandos para decorar. Um wizard que faz a coisa certa.**

O usuário digita apenas:

```bash
npx @ai-coders/context
```

E a ferramenta **detecta automaticamente** o que precisa ser feito.

---

## Como Funciona

```
┌─────────────────────────────────────────────────────────────┐
│                  npx @ai-coders/context                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Detectar estado do projeto                                 │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Não tem .context?                                    │   │
│  │ → "Vamos criar a documentação do seu projeto"       │   │
│  │ → Executa init + fill automaticamente               │   │
│  └─────────────────────────────────────────────────────┘   │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Tem .context mas está vazio/template?               │   │
│  │ → "Documentação não preenchida. Preencher agora?"   │   │
│  │ → Executa fill                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Tem .context preenchido?                            │   │
│  │ → "O que você quer fazer?"                          │   │
│  │   • Atualizar documentação (detecta mudanças)       │   │
│  │   • Criar um plano de trabalho                      │   │
│  │   • Sincronizar playbooks                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Estados do Projeto

| Estado | Detecção | Ação Automática |
|--------|----------|-----------------|
| **Novo** | Não existe `.context/` | Pergunta se quer inicializar |
| **Não preenchido** | Arquivo tem `@status: unfilled` na primeira linha | Oferece preencher |
| **Pronto** | Arquivo não tem marcação de status | Menu de opções |
| **Desatualizado** | `.context/` mais antigo que código | Sugere atualizar |

---

## Marcação de Estado nos Arquivos

### Problema Atual
Os templates têm `TODO:` espalhados pelo conteúdo. Para saber se um arquivo precisa ser preenchido, a IA precisa **ler o arquivo inteiro**.

### Solução: Marcação na Primeira Linha

Cada arquivo gerado pelo `init` começa com um YAML front matter indicando o estado:

```markdown
---
status: unfilled
generated: 2026-01-09
---

# Architecture Notes

> Fill this section with your system architecture...
```

### Detecção Instantânea

```typescript
// Ler apenas primeira linha do arquivo
async function needsFill(filePath: string): Promise<boolean> {
  const firstLine = await readFirstLine(filePath);
  return firstLine.includes('status: unfilled');
}

// Listar todos que precisam preencher
async function getUnfilledFiles(contextDir: string): Promise<string[]> {
  const files = await glob(`${contextDir}/**/*.md`);
  const results = await Promise.all(
    files.map(async f => ({ file: f, unfilled: await needsFill(f) }))
  );
  return results.filter(r => r.unfilled).map(r => r.file);
}
```

**Vantagens:**
- Detecção sem ler conteúdo (só primeira linha)
- IA não precisa interpretar "está preenchido?"
- Remove ambiguidade
- Fácil de automatizar em CI

### Fluxo de Vida do Arquivo

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  init                    fill                   update       │
│    │                       │                       │         │
│    ▼                       ▼                       ▼         │
│ ┌──────────┐         ┌──────────┐           ┌──────────┐    │
│ │ status:  │ ──────► │ (sem     │ ──────►   │ (sem     │    │
│ │ unfilled │  preen- │ status)  │  atualiza │ status)  │    │
│ └──────────┘  cher   └──────────┘           └──────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Remoção de TODOs Inline

Com a marcação de status, **removemos todos os `TODO:` do conteúdo**. O arquivo template fica mais limpo:

**Antes:**
```markdown
# Architecture Notes

> TODO: Describe how the system is assembled...

## System Architecture Overview
- TODO: Summarize the top-level topology...
```

**Depois:**
```markdown
---
status: unfilled
---

# Architecture Notes

## System Architecture Overview
Summarize the top-level topology (monolith, microservices) and deployment model.

## Architectural Layers
...
```

O conteúdo vira **guia de preenchimento**, não marcadores para IA buscar.

---

### Detecção de "Desatualizado"

Simples: compara `mtime` dos arquivos em `.context/` com `mtime` dos arquivos de código.

```typescript
// Pseudo-código
const contextMtime = getNewestMtime('.context/');
const codeMtime = getNewestMtime('src/');

if (codeMtime > contextMtime) {
  status = 'desatualizado';
  daysBehind = (codeMtime - contextMtime) / DAY_MS;
}
```

**Sem snapshots. Sem complexidade. Apenas timestamps e front matter.**

---

## Interface do Usuário

### Primeiro Uso (Projeto Novo)

```
$ npx @ai-coders/context

  @ai-coders/context v0.5.0

  📁 Projeto: /home/user/meu-projeto
  📊 Detectado: TypeScript, 42 arquivos

  Não encontrei documentação de contexto neste projeto.

  ? Criar documentação agora? (Y/n)

  ✔ Criando estrutura...
  ✔ Analisando código...
  ✔ Gerando documentação...

  ✅ Pronto! Documentação criada em .context/

  Próximos passos:
    • Revise os arquivos gerados
    • Commite: git add .context && git commit -m "docs: add context"
```

### Uso Subsequente (Projeto Pronto)

```
$ npx @ai-coders/context

  @ai-coders/context v0.5.0

  📁 Projeto: /home/user/meu-projeto
  📊 Contexto: 8 docs, 11 playbooks
  ⚠️  Código modificado há 3 dias (docs não atualizadas)

  ? O que você quer fazer?

  ❯ Atualizar documentação
    Criar plano de trabalho
    Sincronizar playbooks
    Sair
```

### Atualização Inteligente

```
$ npx @ai-coders/context

  ? O que você quer fazer? Atualizar documentação

  Analisando mudanças desde 2026-01-06...

  📝 Arquivos de código modificados: 5
     src/services/auth/authService.ts
     src/services/auth/types.ts
     src/utils/validation.ts
     src/index.ts
     tests/auth.test.ts

  📄 Documentos que podem precisar de atualização:
     • architecture.md (authService é mencionado)
     • project-overview.md (exports públicos mudaram)

  ? Atualizar esses documentos? (Y/n)

  ✔ architecture.md atualizado
  ✔ project-overview.md atualizado

  ✅ Documentação sincronizada!
```

---

## CLI para Automação

Para scripts e CI/CD, os comandos diretos continuam funcionando:

```bash
# Equivalentes explícitos
npx @ai-coders/context init .          # Só inicializar
npx @ai-coders/context fill .          # Só preencher
npx @ai-coders/context plan feature-x  # Criar plano
npx @ai-coders/context update          # Atualizar (novo!)

# Flags úteis
npx @ai-coders/context --yes           # Aceita tudo automaticamente
npx @ai-coders/context --check         # Só verifica, não modifica (para CI)
```

### Exemplo para CI

```yaml
# .github/workflows/docs.yml
name: Check Documentation
on: [pull_request]

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx @ai-coders/context --check
        # Falha se docs estão desatualizadas
```

---

## Detecção de Mudanças (Simplificada)

Em vez de snapshots complexos com tree-sitter, usamos uma abordagem pragmática:

### 1. Comparação por Timestamp

```typescript
interface ChangeDetection {
  codeLastModified: Date;
  docsLastModified: Date;
  isOutdated: boolean;
  daysBehind: number;
}
```

### 2. Grep nos Docs

Para saber quais docs atualizar, fazemos grep simples:

```typescript
// Se authService.ts mudou, quais docs mencionam "authService"?
const affectedDocs = docs.filter(doc =>
  doc.content.includes('authService') ||
  doc.content.includes('AuthService')
);
```

### 3. Git Diff (Opcional)

Se disponível, usar `git diff --name-only HEAD~10` para lista precisa de arquivos modificados.

**Resultado: Mesma funcionalidade útil, 90% menos código.**

---

## Novo README

```markdown
# @ai-coders/context

Engenharia de contexto para AI. Estupidamente simples.

## Uso

\`\`\`bash
npx @ai-coders/context
\`\`\`

É só isso. O wizard detecta o que precisa ser feito.

## O que ele faz

1. **Cria documentação** estruturada do seu código
2. **Gera playbooks** para agentes de AI (Claude, GPT, etc.)
3. **Mantém atualizado** detectando mudanças no código

## Para automação

\`\`\`bash
npx @ai-coders/context init .     # Criar estrutura
npx @ai-coders/context fill .     # Preencher com AI
npx @ai-coders/context update     # Atualizar docs
npx @ai-coders/context plan nome  # Criar plano
\`\`\`

## Requisitos

- Node.js 20+
- API key de um provider (OpenRouter, OpenAI, Anthropic, Google)

## Documentação

- [Guia Completo](./docs/GUIDE.md)
- [Configuração de Providers](./docs/PROVIDERS.md)
- [Integração com Claude Code](./docs/MCP.md)

## Licença

MIT
```

**~50 linhas. Direto ao ponto.**

---

## Implementação

### Fase 0: Migrar Templates para Front Matter (1 dia)

- [ ] Adicionar YAML front matter `status: unfilled` em todos os templates
- [ ] Remover `TODO:` e `<!-- -->` do conteúdo dos templates
- [ ] Transformar instruções em texto guia (não marcadores)
- [ ] Atualizar `FillService` para remover front matter após preencher
- [ ] Criar helper `needsFill(filePath)` que lê só primeira linha

**Templates a modificar:**
```
src/generators/
├── documentation/templates/
│   ├── architectureTemplate.ts
│   ├── projectOverviewTemplate.ts
│   ├── developmentWorkflowTemplate.ts
│   ├── testingTemplate.ts
│   ├── glossaryTemplate.ts
│   ├── dataFlowTemplate.ts
│   ├── securityTemplate.ts
│   ├── toolingTemplate.ts
│   └── ... (8+ arquivos)
├── agents/templates/
│   └── playbookTemplate.ts
└── plans/templates/
    └── planTemplate.ts
```

### Fase 1: Refatorar Wizard (1-2 dias)

- [ ] Criar `StateDetector` usando `needsFill()`
- [ ] Unificar fluxo interativo em `runInteractive()`
- [ ] Adicionar detecção de "desatualizado" por mtime
- [ ] Implementar flag `--yes` para modo não-interativo
- [ ] Implementar flag `--check` para CI

### Fase 2: Comando `update` (1 dia)

- [ ] Criar novo comando que combina detecção + fill seletivo
- [ ] Integrar com git diff quando disponível
- [ ] Usar grep para sugerir quais docs atualizar

### Fase 3: Simplificar README (1 dia)

- [ ] Reescrever README minimalista (~50 linhas)
- [ ] Criar `docs/GUIDE.md` com conteúdo detalhado
- [ ] Mover configuração de providers para `docs/PROVIDERS.md`
- [ ] Atualizar CLAUDE.md e AGENTS.md

### Fase 4: Testes e Polish (1 dia)

- [ ] Testes para `needsFill()`
- [ ] Testes e2e do fluxo wizard
- [ ] Teste de CI com `--check`

---

## Arquivos a Modificar

```
src/
├── index.ts                    # Refatorar runInteractive()
├── generators/
│   ├── documentation/templates/*.ts  # Adicionar front matter
│   ├── agents/templates/*.ts         # Adicionar front matter
│   └── plans/templates/*.ts          # Adicionar front matter
├── services/
│   ├── state/
│   │   └── stateDetector.ts    # NOVO: Detecta estado via front matter
│   ├── fill/
│   │   └── fillService.ts      # Atualizar para remover front matter
│   └── update/
│       └── updateService.ts    # NOVO: Atualização seletiva
└── utils/
    ├── frontMatter.ts          # NOVO: Parse/remove YAML front matter
    └── prompts.ts              # Atualizar prompts do wizard

docs/
├── GUIDE.md                    # NOVO: Guia completo
├── PROVIDERS.md                # NOVO: Config de providers
└── MCP.md                      # NOVO: Integração Claude

README.md                       # Reescrever (minimalista)
```

---

## Métricas de Sucesso

| Métrica | Antes | Depois |
|---------|-------|--------|
| README | 437 linhas | ~50 linhas |
| Comandos para decorar | 5+ | 0 (wizard) |
| Primeiro uso | "qual comando uso?" | "npx @ai-coders/context" |
| Detectar "não preenchido" | Ler arquivo inteiro | Ler 1 linha |
| Marcações no template | `TODO:` espalhados | 1 front matter |

---

## O Que NÃO Vamos Fazer

- ❌ Snapshots com tree-sitter (complexo demais)
- ❌ Diff semântico de símbolos (over-engineering)
- ❌ Mapeamento automático mudança→doc (heurísticas frágeis)
- ❌ Armazenar estado em `.context/.snapshot/` (overhead)
- ❌ Múltiplos `TODO:` ou `<!-- -->` no conteúdo (substituído por front matter)

---

## Resumo

**Antes:**
```bash
npx @ai-coders/context init .
npx @ai-coders/context fill .
npx @ai-coders/context plan feature
# + 437 linhas de README para entender opções
```

**Depois:**
```bash
npx @ai-coders/context
# O wizard faz o resto
```

---

**Autor:** Claude
**Revisão:** v2 - Abordagem simplificada
