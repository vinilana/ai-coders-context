/**
 * PREVC Role Configuration
 *
 * Defines responsibilities, outputs, and specialists for each PREVC role.
 */

import { PrevcRole, RoleDefinition } from './types';

/**
 * Complete configuration for all PREVC roles
 */
export const ROLE_CONFIG: Record<PrevcRole, RoleDefinition> = {
  planejador: {
    phase: 'P',
    responsibilities: [
      'Conduzir discovery e levantamento de requisitos',
      'Criar especificações e escopo do projeto',
      'Definir critérios de aceite',
      'Gerar PRD ou Tech Spec',
      'Identificar riscos e dependências',
    ],
    outputs: ['prd', 'tech-spec', 'requisitos'],
    specialists: [],
  },

  designer: {
    phase: ['P', 'R'],
    responsibilities: [
      'Criar wireframes e protótipos',
      'Definir design system e componentes',
      'Garantir acessibilidade e usabilidade',
      'Documentar padrões de UI/UX',
      'Validar fluxos de usuário',
    ],
    outputs: ['wireframes', 'design-spec', 'ui-components'],
    specialists: ['frontend-specialist'],
  },

  arquiteto: {
    phase: 'R',
    responsibilities: [
      'Definir arquitetura do sistema',
      'Criar ADRs (Architecture Decision Records)',
      'Escolher tecnologias e padrões',
      'Garantir escalabilidade e manutenibilidade',
      'Revisar impacto técnico das decisões',
    ],
    outputs: ['architecture', 'adr', 'tech-decisions'],
    specialists: ['architect-specialist'],
  },

  desenvolvedor: {
    phase: 'E',
    responsibilities: [
      'Implementar código conforme especificações',
      'Seguir padrões e arquitetura definidos',
      'Criar testes unitários básicos',
      'Documentar código quando necessário',
      'Resolver problemas técnicos',
    ],
    outputs: ['code', 'unit-tests'],
    specialists: [
      'feature-developer',
      'bug-fixer',
      'backend-specialist',
      'frontend-specialist',
      'mobile-specialist',
      'database-specialist',
      'devops-specialist',
    ],
  },

  qa: {
    phase: 'V',
    responsibilities: [
      'Criar e executar testes de integração',
      'Validar segurança e performance',
      'Garantir quality gates',
      'Reportar e rastrear bugs',
      'Validar critérios de aceite',
    ],
    outputs: ['test-report', 'qa-approval', 'bug-report'],
    specialists: ['test-writer', 'security-auditor', 'performance-optimizer'],
  },

  revisor: {
    phase: 'V',
    responsibilities: [
      'Revisar código e arquitetura',
      'Garantir conformidade com padrões',
      'Sugerir melhorias e otimizações',
      'Validar boas práticas',
      'Aprovar ou solicitar mudanças',
    ],
    outputs: ['review-comments', 'approval'],
    specialists: ['code-reviewer'],
  },

  documentador: {
    phase: 'C',
    responsibilities: [
      'Criar documentação técnica',
      'Atualizar README e APIs',
      'Preparar handoff para produção',
      'Gerar changelog e release notes',
      'Documentar decisões importantes',
    ],
    outputs: ['documentation', 'changelog', 'readme'],
    specialists: ['documentation-writer'],
  },

  'solo-dev': {
    phase: ['P', 'R', 'E', 'V', 'C'],
    responsibilities: [
      'Executar fluxo completo para tarefas pequenas',
      'Bug fixes e refactorings rápidos',
      'Features de baixa complexidade',
      'Manutenção de código existente',
      'Ajustes e tweaks pontuais',
    ],
    outputs: ['code', 'tests', 'docs'],
    specialists: ['refactoring-specialist', 'bug-fixer'],
  },
};

/**
 * Get the configuration for a specific role
 */
export function getRoleConfig(role: PrevcRole): RoleDefinition {
  return ROLE_CONFIG[role];
}

/**
 * Get all roles that participate in a specific phase
 */
export function getRolesForPhase(phase: string): PrevcRole[] {
  return (Object.entries(ROLE_CONFIG) as [PrevcRole, RoleDefinition][])
    .filter(([, config]) => {
      if (Array.isArray(config.phase)) {
        return config.phase.includes(phase as 'P' | 'R' | 'E' | 'V' | 'C');
      }
      return config.phase === phase;
    })
    .map(([role]) => role);
}

/**
 * Get all outputs for a specific role
 */
export function getOutputsForRole(role: PrevcRole): string[] {
  return ROLE_CONFIG[role]?.outputs || [];
}

/**
 * Get all responsibilities for a specific role
 */
export function getResponsibilitiesForRole(role: PrevcRole): string[] {
  return ROLE_CONFIG[role]?.responsibilities || [];
}
