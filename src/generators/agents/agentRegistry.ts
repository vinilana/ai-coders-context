/**
 * Unified Agent Registry
 *
 * PROBLEMS SOLVED:
 * - Agent config was split across multiple files (agentTypes.ts, agentConfig.ts)
 * - Responsibilities and best practices were duplicated in playbooks
 * - No way to query agents by capability or domain
 * - Adding a new agent required changes in 3+ files
 *
 * NOW:
 * - Single source of truth for all agent definitions
 * - Rich metadata enables smart agent selection
 * - Adding an agent requires ONE change in ONE place
 * - Built-in validation ensures completeness
 */

// ============================================================================
// AGENT DOMAIN TYPES
// ============================================================================

export type AgentDomain =
  | 'quality'      // Code review, testing, security
  | 'development'  // Feature dev, bug fixing, refactoring
  | 'operations'   // DevOps, databases, infrastructure
  | 'architecture' // Design, documentation, planning
  | 'platform';    // Frontend, backend, mobile

export type AgentCapability =
  | 'code-analysis'
  | 'code-generation'
  | 'testing'
  | 'documentation'
  | 'deployment'
  | 'monitoring'
  | 'security'
  | 'optimization';

// ============================================================================
// AGENT DEFINITION INTERFACE
// ============================================================================

export interface AgentDefinition {
  id: string;
  title: string;
  domain: AgentDomain;
  capabilities: AgentCapability[];
  responsibilities: string[];
  bestPractices: string[];
  docTouchpoints: string[]; // Which doc guides this agent should reference
  description: string;
}

// ============================================================================
// UNIFIED AGENT REGISTRY
// ============================================================================

export const AGENT_REGISTRY: AgentDefinition[] = [
  // ---------------------------------------------------------------------------
  // QUALITY DOMAIN
  // ---------------------------------------------------------------------------
  {
    id: 'code-reviewer',
    title: 'Code Reviewer',
    domain: 'quality',
    capabilities: ['code-analysis', 'documentation'],
    responsibilities: [
      'Review code changes for quality, style, and best practices',
      'Identify potential bugs and security issues',
      'Ensure code follows project conventions',
      'Provide constructive feedback and suggestions',
    ],
    bestPractices: [
      'Focus on maintainability and readability',
      'Consider the broader impact of changes',
      'Be constructive and specific in feedback',
    ],
    docTouchpoints: ['development-workflow', 'testing-strategy', 'architecture'],
    description: 'Ensures code quality through systematic review',
  },
  {
    id: 'test-writer',
    title: 'Test Writer',
    domain: 'quality',
    capabilities: ['testing', 'code-generation'],
    responsibilities: [
      'Write comprehensive unit and integration tests',
      'Ensure good test coverage across the codebase',
      'Create test utilities and fixtures',
      'Maintain and update existing tests',
    ],
    bestPractices: [
      'Write tests that are clear and maintainable',
      'Test both happy path and edge cases',
      'Use descriptive test names',
    ],
    docTouchpoints: ['testing-strategy', 'development-workflow'],
    description: 'Creates and maintains test suites',
  },
  {
    id: 'security-auditor',
    title: 'Security Auditor',
    domain: 'quality',
    capabilities: ['security', 'code-analysis'],
    responsibilities: [
      'Identify security vulnerabilities',
      'Implement security best practices',
      'Review dependencies for security issues',
      'Ensure data protection and privacy compliance',
    ],
    bestPractices: [
      'Follow security best practices',
      'Stay updated on common vulnerabilities',
      'Consider the principle of least privilege',
    ],
    docTouchpoints: ['security', 'api-reference', 'architecture'],
    description: 'Audits code and infrastructure for security issues',
  },

  // ---------------------------------------------------------------------------
  // DEVELOPMENT DOMAIN
  // ---------------------------------------------------------------------------
  {
    id: 'feature-developer',
    title: 'Feature Developer',
    domain: 'development',
    capabilities: ['code-generation', 'testing'],
    responsibilities: [
      'Implement new features according to specifications',
      'Design clean, maintainable code architecture',
      'Integrate features with existing codebase',
      'Write comprehensive tests for new functionality',
    ],
    bestPractices: [
      'Follow existing patterns and conventions',
      'Consider edge cases and error handling',
      'Write tests alongside implementation',
    ],
    docTouchpoints: ['project-overview', 'architecture', 'development-workflow'],
    description: 'Builds new features from specifications',
  },
  {
    id: 'bug-fixer',
    title: 'Bug Fixer',
    domain: 'development',
    capabilities: ['code-analysis', 'code-generation', 'testing'],
    responsibilities: [
      'Analyze bug reports and error messages',
      'Identify root causes of issues',
      'Implement targeted fixes with minimal side effects',
      'Test fixes thoroughly before deployment',
    ],
    bestPractices: [
      'Reproduce the bug before fixing',
      'Write tests to prevent regression',
      'Document the fix for future reference',
    ],
    docTouchpoints: ['troubleshooting', 'testing-strategy', 'development-workflow'],
    description: 'Diagnoses and fixes bugs efficiently',
  },
  {
    id: 'refactoring-specialist',
    title: 'Refactoring Specialist',
    domain: 'development',
    capabilities: ['code-analysis', 'code-generation', 'optimization'],
    responsibilities: [
      'Identify code smells and improvement opportunities',
      'Refactor code while maintaining functionality',
      'Improve code organization and structure',
      'Optimize performance where applicable',
    ],
    bestPractices: [
      'Make small, incremental changes',
      'Ensure tests pass after each refactor',
      'Preserve existing functionality exactly',
    ],
    docTouchpoints: ['architecture', 'testing-strategy'],
    description: 'Improves code structure without changing behavior',
  },
  {
    id: 'performance-optimizer',
    title: 'Performance Optimizer',
    domain: 'development',
    capabilities: ['optimization', 'monitoring', 'code-analysis'],
    responsibilities: [
      'Identify performance bottlenecks',
      'Optimize code for speed and efficiency',
      'Implement caching strategies',
      'Monitor and improve resource usage',
    ],
    bestPractices: [
      'Measure before optimizing',
      'Focus on actual bottlenecks',
      'Don\'t sacrifice readability unnecessarily',
    ],
    docTouchpoints: ['architecture', 'data-flow', 'troubleshooting'],
    description: 'Optimizes application performance',
  },

  // ---------------------------------------------------------------------------
  // PLATFORM DOMAIN
  // ---------------------------------------------------------------------------
  {
    id: 'backend-specialist',
    title: 'Backend Specialist',
    domain: 'platform',
    capabilities: ['code-generation', 'security', 'optimization'],
    responsibilities: [
      'Design and implement server-side architecture',
      'Create and maintain APIs and microservices',
      'Optimize database queries and data models',
      'Implement authentication and authorization',
      'Handle server deployment and scaling',
    ],
    bestPractices: [
      'Design APIs according to project specification',
      'Implement proper error handling and logging',
      'Use appropriate design patterns and clean architecture',
      'Consider scalability and performance from the start',
      'Implement comprehensive testing for business logic',
    ],
    docTouchpoints: ['api-reference', 'architecture', 'data-flow', 'security'],
    description: 'Specializes in server-side development',
  },
  {
    id: 'frontend-specialist',
    title: 'Frontend Specialist',
    domain: 'platform',
    capabilities: ['code-generation', 'optimization'],
    responsibilities: [
      'Design and implement user interfaces',
      'Create responsive and accessible web applications',
      'Optimize client-side performance and bundle sizes',
      'Implement state management and routing',
      'Ensure cross-browser compatibility',
    ],
    bestPractices: [
      'Follow modern frontend development patterns',
      'Optimize for accessibility and user experience',
      'Implement responsive design principles',
      'Use component-based architecture effectively',
      'Optimize performance and loading times',
    ],
    docTouchpoints: ['architecture', 'tooling', 'development-workflow'],
    description: 'Specializes in client-side development',
  },
  {
    id: 'mobile-specialist',
    title: 'Mobile Specialist',
    domain: 'platform',
    capabilities: ['code-generation', 'optimization'],
    responsibilities: [
      'Develop native and cross-platform mobile applications',
      'Optimize mobile app performance and battery usage',
      'Implement mobile-specific UI/UX patterns',
      'Handle app store deployment and updates',
      'Integrate push notifications and offline capabilities',
    ],
    bestPractices: [
      'Test on real devices, not just simulators',
      'Optimize for battery life and data usage',
      'Follow platform-specific design guidelines',
      'Implement proper offline-first strategies',
      'Plan for app store review requirements early',
    ],
    docTouchpoints: ['architecture', 'api-reference', 'security'],
    description: 'Specializes in mobile application development',
  },

  // ---------------------------------------------------------------------------
  // OPERATIONS DOMAIN
  // ---------------------------------------------------------------------------
  {
    id: 'devops-specialist',
    title: 'DevOps Specialist',
    domain: 'operations',
    capabilities: ['deployment', 'monitoring', 'security'],
    responsibilities: [
      'Design and maintain CI/CD pipelines',
      'Implement infrastructure as code',
      'Configure monitoring and alerting systems',
      'Manage container orchestration and deployments',
      'Optimize cloud resources and cost efficiency',
    ],
    bestPractices: [
      'Automate everything that can be automated',
      'Implement infrastructure as code for reproducibility',
      'Monitor system health proactively',
      'Design for failure and implement proper fallbacks',
      'Keep security and compliance in every deployment',
    ],
    docTouchpoints: ['tooling', 'development-workflow', 'troubleshooting', 'security'],
    description: 'Manages infrastructure and deployment pipelines',
  },
  {
    id: 'database-specialist',
    title: 'Database Specialist',
    domain: 'operations',
    capabilities: ['optimization', 'security'],
    responsibilities: [
      'Design and optimize database schemas',
      'Create and manage database migrations',
      'Optimize query performance and indexing',
      'Ensure data integrity and consistency',
      'Implement backup and recovery strategies',
    ],
    bestPractices: [
      'Always benchmark queries before and after optimization',
      'Plan migrations with rollback strategies',
      'Use appropriate indexing strategies for workloads',
      'Maintain data consistency across transactions',
      'Document schema changes and their business impact',
    ],
    docTouchpoints: ['data-flow', 'migration', 'architecture'],
    description: 'Manages database design and optimization',
  },

  // ---------------------------------------------------------------------------
  // ARCHITECTURE DOMAIN
  // ---------------------------------------------------------------------------
  {
    id: 'architect-specialist',
    title: 'Architect Specialist',
    domain: 'architecture',
    capabilities: ['code-analysis', 'documentation'],
    responsibilities: [
      'Design overall system architecture and patterns',
      'Define technical standards and best practices',
      'Evaluate and recommend technology choices',
      'Plan system scalability and maintainability',
      'Create architectural documentation and diagrams',
    ],
    bestPractices: [
      'Consider long-term maintainability and scalability',
      'Balance technical debt with business requirements',
      'Document architectural decisions and rationale',
      'Promote code reusability and modularity',
      'Stay updated on industry trends and technologies',
    ],
    docTouchpoints: ['architecture', 'project-overview', 'data-flow', 'glossary'],
    description: 'Designs system architecture and technical standards',
  },
  {
    id: 'documentation-writer',
    title: 'Documentation Writer',
    domain: 'architecture',
    capabilities: ['documentation'],
    responsibilities: [
      'Create clear, comprehensive documentation',
      'Update existing documentation as code changes',
      'Write helpful code comments and examples',
      'Maintain README and API documentation',
    ],
    bestPractices: [
      'Keep documentation up-to-date with code',
      'Write from the user\'s perspective',
      'Include practical examples',
    ],
    docTouchpoints: ['project-overview', 'api-reference', 'onboarding', 'glossary'],
    description: 'Creates and maintains project documentation',
  },
];

// ============================================================================
// AGENT TYPE LITERALS
// ============================================================================

/**
 * Explicit list of agent IDs for type safety.
 * This must be kept in sync with AGENT_REGISTRY.
 */
export const AGENT_TYPE_IDS = [
  'code-reviewer',
  'test-writer',
  'security-auditor',
  'feature-developer',
  'bug-fixer',
  'refactoring-specialist',
  'performance-optimizer',
  'backend-specialist',
  'frontend-specialist',
  'mobile-specialist',
  'devops-specialist',
  'database-specialist',
  'architect-specialist',
  'documentation-writer',
] as const;

export type AgentType = (typeof AGENT_TYPE_IDS)[number];

// Alias for backwards compatibility
export const AGENT_TYPES: readonly AgentType[] = AGENT_TYPE_IDS;

// Backwards-compatible config objects
export const AGENT_RESPONSIBILITIES: Record<string, string[]> = Object.fromEntries(
  AGENT_REGISTRY.map(agent => [agent.id, agent.responsibilities])
);

export const AGENT_BEST_PRACTICES: Record<string, string[]> = Object.fromEntries(
  AGENT_REGISTRY.map(agent => [agent.id, agent.bestPractices])
);

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get agent by ID
 */
export function getAgentById(id: string): AgentDefinition | undefined {
  return AGENT_REGISTRY.find(agent => agent.id === id);
}

/**
 * Get agents by domain
 */
export function getAgentsByDomain(domain: AgentDomain): AgentDefinition[] {
  return AGENT_REGISTRY.filter(agent => agent.domain === domain);
}

/**
 * Get agents by capability
 */
export function getAgentsByCapability(capability: AgentCapability): AgentDefinition[] {
  return AGENT_REGISTRY.filter(agent => agent.capabilities.includes(capability));
}

/**
 * Get agents relevant to a specific document
 */
export function getAgentsForDocument(docKey: string): AgentDefinition[] {
  return AGENT_REGISTRY.filter(agent => agent.docTouchpoints.includes(docKey));
}

/**
 * Validate that an agent ID exists
 */
export function isValidAgentId(id: string): id is AgentType {
  return (AGENT_TYPES as readonly string[]).includes(id);
}

// ============================================================================
// IMPORTANT FILES (unchanged for compatibility)
// ============================================================================

export const IMPORTANT_FILES = [
  'package.json',
  'tsconfig.json',
  'webpack.config.js',
  'next.config.js',
  'tailwind.config.js',
  'README.md',
  '.gitignore',
  'Dockerfile',
  'docker-compose.yml',
];
