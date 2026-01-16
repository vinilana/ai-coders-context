---
status: filled
generated: 2026-01-16
agents:
  - type: "feature-developer"
    role: "Implementar MCPInstallService e comando CLI"
  - type: "test-writer"
    role: "Escrever testes unitários e de integração"
  - type: "code-reviewer"
    role: "Revisar código e garantir consistência com padrões existentes"
docs:
  - "project-overview.md"
  - "tooling.md"
phases:
  - id: "phase-1"
    name: "Discovery & Design"
    prevc: "P"
    status: "completed"
  - id: "phase-2"
    name: "Implementation"
    prevc: "E"
    status: "pending"
  - id: "phase-3"
    name: "Validation & Testing"
    prevc: "V"
    status: "pending"
---

# MCP Install Command Plan

> Implementar comando na CLI interativa para instalar o MCP facilmente em qualquer ferramenta de AI

## Task Snapshot

- **Primary goal:** Criar comando `mcp:install` que configura automaticamente o servidor MCP do ai-context em ferramentas de AI (Claude Code, Cursor, VS Code, etc.)
- **Success signal:** Usuário consegue executar `ai-context mcp:install claude` e ter o MCP configurado automaticamente
- **Key references:**
  - [Tool Registry](../../src/services/shared/toolRegistry.ts) - Configurações das ferramentas
  - [MCP Server](../../src/services/mcp/mcpServer.ts) - Servidor MCP existente
  - [Export Rules Service](../../src/services/export/exportRulesService.ts) - Padrão de export

## Escopo

### Incluído
- Comando `mcp:install [tool]` na CLI
- Suporte para ferramentas: Claude Code, Cursor, VS Code (Cline/Continue), Windsurf
- Modo interativo para seleção de ferramenta
- Detecção automática de ferramentas instaladas
- Geração de configuração MCP apropriada para cada ferramenta
- Opção `--dry-run` para preview
- Opção `--global` para instalação global vs local

### Excluído
- Instalação automática das ferramentas de AI
- Configuração de autenticação/API keys
- Suporte para ferramentas que não têm MCP

## Arquitetura

### Ferramentas Suportadas e Configurações

| Ferramenta | Config Path (Global) | Config Path (Local) | Formato |
|------------|---------------------|---------------------|---------|
| Claude Code | `~/.claude/mcp_servers.json` | `.claude/mcp_servers.json` | JSON |
| Cursor | `~/.cursor/mcp.json` | `.cursor/mcp.json` | JSON |
| VS Code (Cline) | `~/.vscode/settings.json` | `.vscode/settings.json` | JSON |
| Windsurf | `~/.windsurf/mcp.json` | `.windsurf/mcp.json` | JSON |

### Estrutura de Configuração MCP

```json
{
  "mcpServers": {
    "ai-context": {
      "command": "npx",
      "args": ["ai-context-dev", "mcp"],
      "env": {}
    }
  }
}
```

### Novos Arquivos

```
src/services/mcp/
├── mcpServer.ts          # (existente)
├── mcpInstallService.ts  # NOVO - Lógica de instalação
└── mcpConfigTemplates.ts # NOVO - Templates de configuração
```

## Agent Lineup

| Agent | Role in this plan | Playbook | First responsibility focus |
| --- | --- | --- | --- |
| Feature Developer | Implementar MCPInstallService e integração CLI | [Feature Developer](../agents/feature-developer.md) | Criar service seguindo padrões existentes |
| Test Writer | Criar testes para MCPInstallService | [Test Writer](../agents/test-writer.md) | Testes unitários e mocks |
| Code Reviewer | Garantir qualidade e consistência | [Code Reviewer](../agents/code-reviewer.md) | Review final antes de merge |

## Working Phases

### Phase 1 — Discovery & Design ✅

**Completado:**
1. Análise da estrutura CLI existente (Commander.js + Inquirer)
2. Mapeamento do Tool Registry e ferramentas suportadas
3. Identificação dos padrões de service (BaseDependencies, UI helpers)
4. Definição da arquitetura do MCPInstallService

**Decisões:**
- Usar mesmo padrão de service com BaseDependencies
- Reutilizar TOOL_REGISTRY para detecção de ferramentas
- Suportar instalação global (home) e local (projeto)
- Adicionar ao menu interativo existente

### Phase 2 — Implementation

**Steps:**

1. **Criar MCPConfigTemplates** (`src/services/mcp/mcpConfigTemplates.ts`)
   - Templates de configuração para cada ferramenta
   - Funções para merge com configs existentes
   - Owner: Feature Developer

2. **Criar MCPInstallService** (`src/services/mcp/mcpInstallService.ts`)
   - Interface `MCPInstallOptions`
   - Método `run()` seguindo padrão existente
   - Detecção automática de ferramentas
   - Geração e escrita de configs
   - Suporte dry-run
   - Owner: Feature Developer

3. **Adicionar comando CLI** (`src/index.ts`)
   - Comando `mcp:install [tool]`
   - Opções: `--global`, `--dry-run`, `--verbose`
   - Integração com menu interativo
   - Owner: Feature Developer

4. **Adicionar traduções** (`src/utils/i18n/locales/`)
   - Mensagens em EN e PT-BR
   - Owner: Feature Developer

**Commit Checkpoint:**
```bash
git commit -m "feat(mcp): add mcp:install command for easy MCP setup"
```

### Phase 3 — Validation & Testing

**Steps:**

1. **Testes unitários** (`src/services/mcp/mcpInstallService.test.ts`)
   - Mock de sistema de arquivos
   - Teste de cada ferramenta suportada
   - Teste de merge de configurações
   - Teste de dry-run
   - Owner: Test Writer

2. **Testes de integração**
   - Teste end-to-end do comando
   - Verificação de configs geradas
   - Owner: Test Writer

3. **Code Review**
   - Verificar aderência aos padrões
   - Verificar tratamento de erros
   - Owner: Code Reviewer

4. **Atualizar documentação**
   - README com novo comando
   - CHANGELOG
   - Owner: Feature Developer

**Commit Checkpoint:**
```bash
git commit -m "test(mcp): add tests for mcp:install command"
git commit -m "docs: update README with mcp:install command"
```

## Interfaces Principais

```typescript
// src/services/mcp/mcpInstallService.ts

interface MCPInstallOptions {
  tool?: string;           // Ferramenta específica ou undefined para interativo
  global?: boolean;        // Instalação global vs local
  dryRun?: boolean;        // Preview sem escrita
  verbose?: boolean;       // Log detalhado
  repoPath?: string;       // Path do repositório (para local)
}

interface MCPInstallResult {
  success: boolean;
  tool: string;
  configPath: string;
  action: 'created' | 'updated' | 'skipped';
  dryRun: boolean;
}

class MCPInstallService {
  constructor(deps: BaseDependencies);

  async run(options: MCPInstallOptions): Promise<MCPInstallResult[]>;
  async detectInstalledTools(): Promise<string[]>;
  async generateConfig(tool: string): Promise<object>;
  async writeConfig(tool: string, config: object, options: MCPInstallOptions): Promise<MCPInstallResult>;
}
```

## Fluxo Interativo

```
$ ai-context mcp:install

? Selecione a ferramenta para instalar o MCP:
  ❯ Claude Code (detectado)
    Cursor
    VS Code (Cline)
    Windsurf
    Todas as detectadas

? Tipo de instalação:
  ❯ Global (~/.claude/)
    Local (.claude/)

✓ MCP configurado com sucesso para Claude Code
  Config: ~/.claude/mcp_servers.json

  Para usar, reinicie o Claude Code.
```

## Risk Assessment

### Identified Risks

| Risk | Probability | Impact | Mitigation Strategy |
| --- | --- | --- | --- |
| Config já existe com outras entradas | Alta | Médio | Merge inteligente preservando entradas existentes |
| Formato de config muda entre versões | Baixa | Alto | Abstrair templates, facilitar atualização |
| Ferramenta não instalada | Média | Baixo | Mensagem clara informando como instalar |

### Dependencies

- **Internal:** Tool Registry, CLI UI helpers, i18n system
- **External:** Nenhuma (apenas escrita de arquivos)
- **Technical:** Node.js fs-extra para operações de arquivo

### Assumptions

- Usuário tem permissão de escrita no diretório de config
- Formato JSON é válido para todas as ferramentas suportadas
- Ferramentas respeitam o padrão MCP servers

## Rollback Plan

### Rollback Procedures

#### Phase 2 Rollback
- Action: `git revert` dos commits de implementação
- Data Impact: Nenhum (apenas código novo)
- Estimated Time: < 30 min

### Post-Rollback Actions
1. Documentar motivo do rollback
2. Criar issue para correção
3. Re-planejar implementação

## Evidence & Follow-up

**Artifacts a coletar:**
- [ ] PR link com implementação
- [ ] Screenshot do comando funcionando
- [ ] Output dos testes passando
- [ ] Config gerada para cada ferramenta

**Follow-up:**
- Adicionar mais ferramentas conforme demanda
- Considerar comando `mcp:uninstall`
- Integrar com `ai-context start` wizard
