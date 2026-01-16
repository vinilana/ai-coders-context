/**
 * Scaffold Structure Definitions
 *
 * This file defines the structure specifications for all scaffolded files.
 * Instead of embedding template content with TODOs, we define what each
 * document should contain, and AI generates complete content from these specs.
 *
 * Structure = Data, Content = AI-Generated
 */

import { ScaffoldFileType } from '../../types/scaffoldFrontmatter';
import { PrevcPhase } from '../../workflow/types';

/**
 * Content type for a section
 */
export type ScaffoldContentType =
  | 'prose'        // Paragraph text
  | 'list'         // Bullet/numbered list
  | 'code-block'   // Code snippet
  | 'table'        // Markdown table
  | 'checklist'    // Task list with checkboxes
  | 'diagram';     // Mermaid or ASCII diagram

/**
 * Tone for document generation
 */
export type ScaffoldTone =
  | 'technical'        // Precise, detailed technical language
  | 'conversational'   // Friendly, accessible
  | 'formal'           // Professional, structured
  | 'instructional';   // Step-by-step, directive

/**
 * Target audience
 */
export type ScaffoldAudience =
  | 'developers'   // Software engineers working on the codebase
  | 'ai-agents'    // AI assistants using the playbooks
  | 'architects'   // Technical leads and architects
  | 'mixed';       // Multiple audiences

/**
 * A section within a scaffold structure
 */
export interface ScaffoldSection {
  /** Section heading (H2 or H3) */
  heading: string;
  /** Display order (1-based) */
  order: number;
  /** What type of content this section should contain */
  contentType: ScaffoldContentType;
  /** Instructions for AI on what to include */
  guidance: string;
  /** Optional example of expected content */
  exampleContent?: string;
  /** Whether this section is required */
  required: boolean;
  /** Heading level (2 = H2, 3 = H3) */
  headingLevel?: 2 | 3;
}

/**
 * Complete scaffold structure definition
 */
export interface ScaffoldStructure {
  /** File type */
  fileType: ScaffoldFileType;
  /** Document identifier (e.g., 'project-overview', 'code-reviewer') */
  documentName: string;
  /** Display title for the document */
  title: string;
  /** Brief description of document purpose */
  description: string;
  /** Writing tone */
  tone: ScaffoldTone;
  /** Target audience */
  audience: ScaffoldAudience;
  /** Ordered sections */
  sections: ScaffoldSection[];
  /** Related documents to cross-link */
  linkTo?: string[];
  /** Additional context for AI generation */
  additionalContext?: string;
}

// ============================================================================
// DOCUMENTATION STRUCTURES
// ============================================================================

const projectOverviewStructure: ScaffoldStructure = {
  fileType: 'doc',
  documentName: 'project-overview',
  title: 'Project Overview',
  description: 'High-level overview of the project, its purpose, and key components',
  tone: 'conversational',
  audience: 'mixed',
  sections: [
    {
      heading: 'Project Overview',
      order: 1,
      contentType: 'prose',
      guidance: 'Summarize in 2-3 sentences what problem this project solves and who benefits from it. Focus on the value proposition.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Quick Facts',
      order: 2,
      contentType: 'list',
      guidance: 'List root directory path, primary languages (with file counts), and key entry points.',
      exampleContent: '- Root: `/path/to/repo`\n- Languages: TypeScript (150 files), Python (20 files)\n- Entry: `src/index.ts`',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Entry Points',
      order: 3,
      contentType: 'list',
      guidance: 'List main entry points with links (CLI, server, library exports). Use markdown links with line numbers.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Key Exports',
      order: 4,
      contentType: 'list',
      guidance: 'List major exported classes and interfaces with links. Group by type (Classes, Interfaces).',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'File Structure & Code Organization',
      order: 5,
      contentType: 'list',
      guidance: 'List top-level directories with brief descriptions of their purpose.',
      exampleContent: '- `src/` \u2014 TypeScript source files and CLI entrypoints.\n- `tests/` \u2014 Automated tests and fixtures.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Technology Stack Summary',
      order: 6,
      contentType: 'prose',
      guidance: 'Outline primary runtimes, languages, and platforms in use. Note build tooling, linting, and formatting infrastructure.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Core Framework Stack',
      order: 7,
      contentType: 'prose',
      guidance: 'Document core frameworks per layer (backend, frontend, data, messaging). Mention architectural patterns enforced by these frameworks.',
      required: false,
      headingLevel: 2,
    },
    {
      heading: 'UI & Interaction Libraries',
      order: 8,
      contentType: 'prose',
      guidance: 'List UI kits, CLI interaction helpers, or design system dependencies. Note theming, accessibility, or localization considerations.',
      required: false,
      headingLevel: 2,
    },
    {
      heading: 'Development Tools Overview',
      order: 9,
      contentType: 'prose',
      guidance: 'Highlight essential CLIs, scripts, or developer environments. Link to Tooling guide for deeper setup.',
      required: false,
      headingLevel: 2,
    },
    {
      heading: 'Getting Started Checklist',
      order: 10,
      contentType: 'checklist',
      guidance: 'Provide numbered steps to get a new developer productive. Include install, run, and verify steps.',
      exampleContent: '1. Install dependencies with `npm install`.\n2. Explore the CLI by running `npm run dev`.\n3. Review Development Workflow for day-to-day tasks.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Next Steps',
      order: 11,
      contentType: 'prose',
      guidance: 'Capture product positioning, key stakeholders, and links to external documentation or product specs.',
      required: false,
      headingLevel: 2,
    },
  ],
  linkTo: ['architecture.md', 'development-workflow.md', 'tooling.md'],
};

const architectureStructure: ScaffoldStructure = {
  fileType: 'doc',
  documentName: 'architecture',
  title: 'Architecture Notes',
  description: 'System architecture, layers, patterns, and design decisions',
  tone: 'technical',
  audience: 'architects',
  sections: [
    {
      heading: 'Architecture Notes',
      order: 1,
      contentType: 'prose',
      guidance: 'Describe how the system is assembled and why the current design exists.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'System Architecture Overview',
      order: 2,
      contentType: 'prose',
      guidance: 'Summarize the top-level topology (monolith, modular service, microservices) and deployment model. Highlight how requests traverse the system and where control pivots between layers.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Architectural Layers',
      order: 3,
      contentType: 'list',
      guidance: 'For each layer, describe its purpose, directories, symbol count, key exports, and dependencies on other layers. Use H3 for each layer.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Detected Design Patterns',
      order: 4,
      contentType: 'table',
      guidance: 'Table with Pattern, Confidence, Locations, and Description columns. Link to actual implementations.',
      exampleContent: '| Pattern | Confidence | Locations | Description |\n|---------|------------|-----------|-------------|\n| Factory | 85% | `LLMClientFactory` | Creates LLM client instances |',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Entry Points',
      order: 5,
      contentType: 'list',
      guidance: 'List entry points with markdown links to the actual files.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Public API',
      order: 6,
      contentType: 'table',
      guidance: 'Table of exported symbols with Symbol, Type, and Location columns.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Internal System Boundaries',
      order: 7,
      contentType: 'prose',
      guidance: 'Document seams between domains, bounded contexts, or service ownership. Note data ownership, synchronization strategies, and shared contract enforcement.',
      required: false,
      headingLevel: 2,
    },
    {
      heading: 'External Service Dependencies',
      order: 8,
      contentType: 'list',
      guidance: 'List SaaS platforms, third-party APIs, or infrastructure services. Describe authentication methods, rate limits, and failure considerations.',
      required: false,
      headingLevel: 2,
    },
    {
      heading: 'Key Decisions & Trade-offs',
      order: 9,
      contentType: 'prose',
      guidance: 'Summarize architectural decisions, experiments, or ADR outcomes. Explain why selected approaches won over alternatives.',
      required: false,
      headingLevel: 2,
    },
    {
      heading: 'Diagrams',
      order: 10,
      contentType: 'diagram',
      guidance: 'Link architectural diagrams or add mermaid definitions showing system components and their relationships.',
      required: false,
      headingLevel: 2,
    },
    {
      heading: 'Risks & Constraints',
      order: 11,
      contentType: 'prose',
      guidance: 'Document performance constraints, scaling considerations, or external system assumptions.',
      required: false,
      headingLevel: 2,
    },
    {
      heading: 'Top Directories Snapshot',
      order: 12,
      contentType: 'list',
      guidance: 'List top directories with approximate file counts.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Related Resources',
      order: 13,
      contentType: 'list',
      guidance: 'Link to Project Overview and other relevant documentation.',
      required: true,
      headingLevel: 2,
    },
  ],
  linkTo: ['project-overview.md', 'data-flow.md'],
};

const developmentWorkflowStructure: ScaffoldStructure = {
  fileType: 'doc',
  documentName: 'development-workflow',
  title: 'Development Workflow',
  description: 'Day-to-day engineering processes, branching, and contribution guidelines',
  tone: 'instructional',
  audience: 'developers',
  sections: [
    {
      heading: 'Development Workflow',
      order: 1,
      contentType: 'prose',
      guidance: 'Outline the day-to-day engineering process for this repository.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Branching & Releases',
      order: 2,
      contentType: 'list',
      guidance: 'Describe the branching model (trunk-based, Git Flow, etc.). Note release cadence and tagging conventions.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Local Development',
      order: 3,
      contentType: 'list',
      guidance: 'Commands to install dependencies, run locally, and build for distribution. Use code blocks for commands.',
      exampleContent: '- Install: `npm install`\n- Run: `npm run dev`\n- Build: `npm run build`',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Code Review Expectations',
      order: 4,
      contentType: 'prose',
      guidance: 'Summarize review checklists and required approvals. Reference AGENTS.md for agent collaboration tips.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Onboarding Tasks',
      order: 5,
      contentType: 'prose',
      guidance: 'Point newcomers to first issues or starter tickets. Link to internal runbooks or dashboards.',
      required: false,
      headingLevel: 2,
    },
  ],
  linkTo: ['testing-strategy.md', 'tooling.md'],
};

const testingStrategyStructure: ScaffoldStructure = {
  fileType: 'doc',
  documentName: 'testing-strategy',
  title: 'Testing Strategy',
  description: 'Test frameworks, patterns, coverage requirements, and quality gates',
  tone: 'instructional',
  audience: 'developers',
  sections: [
    {
      heading: 'Testing Strategy',
      order: 1,
      contentType: 'prose',
      guidance: 'Document how quality is maintained across the codebase.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Test Types',
      order: 2,
      contentType: 'list',
      guidance: 'For Unit, Integration, and E2E tests: list frameworks, file naming conventions, and required tooling.',
      exampleContent: '- **Unit**: Jest, files named `*.test.ts`\n- **Integration**: Describe scenarios\n- **E2E**: Note harnesses or environments',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Running Tests',
      order: 3,
      contentType: 'list',
      guidance: 'Commands for running all tests, watch mode, and coverage. Use code blocks.',
      exampleContent: '- All tests: `npm run test`\n- Watch mode: `npm run test -- --watch`\n- Coverage: `npm run test -- --coverage`',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Quality Gates',
      order: 4,
      contentType: 'list',
      guidance: 'Define minimum coverage expectations. Capture linting or formatting requirements before merging.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Troubleshooting',
      order: 5,
      contentType: 'prose',
      guidance: 'Document flaky suites, long-running tests, or environment quirks.',
      required: false,
      headingLevel: 2,
    },
  ],
  linkTo: ['development-workflow.md'],
};

const toolingStructure: ScaffoldStructure = {
  fileType: 'doc',
  documentName: 'tooling',
  title: 'Tooling & Productivity Guide',
  description: 'Scripts, IDE settings, automation, and developer productivity tips',
  tone: 'instructional',
  audience: 'developers',
  sections: [
    {
      heading: 'Tooling & Productivity Guide',
      order: 1,
      contentType: 'prose',
      guidance: 'Collect the scripts, automation, and editor settings that keep contributors efficient.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Required Tooling',
      order: 2,
      contentType: 'list',
      guidance: 'List tools with installation instructions, version requirements, and what they power.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Recommended Automation',
      order: 3,
      contentType: 'prose',
      guidance: 'Document pre-commit hooks, linting/formatting commands, code generators, or scaffolding scripts. Include shortcuts or watch modes.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'IDE / Editor Setup',
      order: 4,
      contentType: 'list',
      guidance: 'List extensions or plugins that catch issues early. Share snippets, templates, or workspace settings.',
      required: false,
      headingLevel: 2,
    },
    {
      heading: 'Productivity Tips',
      order: 5,
      contentType: 'prose',
      guidance: 'Document terminal aliases, container workflows, or local emulators. Link to shared scripts or dotfiles.',
      required: false,
      headingLevel: 2,
    },
  ],
  linkTo: ['development-workflow.md'],
};

const securityStructure: ScaffoldStructure = {
  fileType: 'doc',
  documentName: 'security',
  title: 'Security & Compliance Notes',
  description: 'Security policies, authentication, secrets management, and compliance requirements',
  tone: 'formal',
  audience: 'developers',
  sections: [
    {
      heading: 'Security & Compliance Notes',
      order: 1,
      contentType: 'prose',
      guidance: 'Capture the policies and guardrails that keep this project secure and compliant.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Authentication & Authorization',
      order: 2,
      contentType: 'prose',
      guidance: 'Describe identity providers, token formats, session strategies, and role/permission models.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Secrets & Sensitive Data',
      order: 3,
      contentType: 'prose',
      guidance: 'Document storage locations (vaults, parameter stores), rotation cadence, encryption practices, and data classifications.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Compliance & Policies',
      order: 4,
      contentType: 'list',
      guidance: 'List applicable standards (GDPR, SOC2, HIPAA, internal policies) and evidence requirements.',
      required: false,
      headingLevel: 2,
    },
    {
      heading: 'Incident Response',
      order: 5,
      contentType: 'prose',
      guidance: 'Note on-call contacts, escalation steps, and tooling for detection, triage, and post-incident analysis.',
      required: false,
      headingLevel: 2,
    },
  ],
  linkTo: ['architecture.md'],
};

const glossaryStructure: ScaffoldStructure = {
  fileType: 'doc',
  documentName: 'glossary',
  title: 'Glossary & Domain Concepts',
  description: 'Project terminology, type definitions, domain entities, and business rules',
  tone: 'technical',
  audience: 'mixed',
  sections: [
    {
      heading: 'Glossary & Domain Concepts',
      order: 1,
      contentType: 'prose',
      guidance: 'List project-specific terminology, acronyms, domain entities, and user personas.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Type Definitions',
      order: 2,
      contentType: 'list',
      guidance: 'List exported type definitions and interfaces with links to their locations.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Enumerations',
      order: 3,
      contentType: 'list',
      guidance: 'List exported enums with links to their locations.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Core Terms',
      order: 4,
      contentType: 'list',
      guidance: 'Define key terms, their relevance, and where they surface in the codebase.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Acronyms & Abbreviations',
      order: 5,
      contentType: 'list',
      guidance: 'Expand abbreviations and note associated services or APIs.',
      required: false,
      headingLevel: 2,
    },
    {
      heading: 'Personas / Actors',
      order: 6,
      contentType: 'prose',
      guidance: 'Describe user goals, key workflows, and pain points addressed by the system.',
      required: false,
      headingLevel: 2,
    },
    {
      heading: 'Domain Rules & Invariants',
      order: 7,
      contentType: 'prose',
      guidance: 'Capture business rules, validation constraints, or compliance requirements. Note region/localization nuances.',
      required: false,
      headingLevel: 2,
    },
  ],
  linkTo: ['project-overview.md'],
};

const dataFlowStructure: ScaffoldStructure = {
  fileType: 'doc',
  documentName: 'data-flow',
  title: 'Data Flow & Integrations',
  description: 'How data moves through the system and external integrations',
  tone: 'technical',
  audience: 'architects',
  sections: [
    {
      heading: 'Data Flow & Integrations',
      order: 1,
      contentType: 'prose',
      guidance: 'Explain how data enters, moves through, and exits the system, including interactions with external services.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Module Dependencies',
      order: 2,
      contentType: 'list',
      guidance: 'List cross-module dependencies showing which modules depend on which.',
      exampleContent: '- **src/** \u2192 `utils`, `config`\n- **services/** \u2192 `utils`',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Service Layer',
      order: 3,
      contentType: 'list',
      guidance: 'List service classes with links to their implementations.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'High-level Flow',
      order: 4,
      contentType: 'prose',
      guidance: 'Summarize the primary pipeline from input to output. Reference diagrams or embed Mermaid definitions.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Internal Movement',
      order: 5,
      contentType: 'prose',
      guidance: 'Describe how modules collaborate (queues, events, RPC calls, shared databases).',
      required: false,
      headingLevel: 2,
    },
    {
      heading: 'External Integrations',
      order: 6,
      contentType: 'list',
      guidance: 'Document each integration with purpose, authentication, payload shapes, and retry strategy.',
      required: false,
      headingLevel: 2,
    },
    {
      heading: 'Observability & Failure Modes',
      order: 7,
      contentType: 'prose',
      guidance: 'Describe metrics, traces, or logs that monitor the flow. Note backoff, dead-letter, or compensating actions.',
      required: false,
      headingLevel: 2,
    },
  ],
  linkTo: ['architecture.md'],
};

// ============================================================================
// AGENT STRUCTURES
// ============================================================================

/**
 * Base structure for all agent playbooks
 */
function createAgentStructure(
  agentType: string,
  title: string,
  description: string,
  additionalContext?: string
): ScaffoldStructure {
  return {
    fileType: 'agent',
    documentName: agentType,
    title: `${title} Agent Playbook`,
    description,
    tone: 'instructional',
    audience: 'ai-agents',
    sections: [
      {
        heading: 'Mission',
        order: 1,
        contentType: 'prose',
        guidance: `Describe how the ${title.toLowerCase()} agent supports the team and when to engage it.`,
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Responsibilities',
        order: 2,
        contentType: 'list',
        guidance: 'List specific responsibilities this agent handles. Be concrete about what tasks it performs.',
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Best Practices',
        order: 3,
        contentType: 'list',
        guidance: 'List best practices and guidelines for this agent to follow.',
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Key Project Resources',
        order: 4,
        contentType: 'list',
        guidance: 'Link to documentation index, agent handbook, AGENTS.md, and contributor guide.',
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Repository Starting Points',
        order: 5,
        contentType: 'list',
        guidance: 'List top-level directories relevant to this agent with brief descriptions.',
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Key Files',
        order: 6,
        contentType: 'list',
        guidance: 'List entry points, pattern implementations, and service files relevant to this agent.',
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Architecture Context',
        order: 7,
        contentType: 'list',
        guidance: 'For each architectural layer, describe directories, symbol counts, and key exports.',
        required: false,
        headingLevel: 2,
      },
      {
        heading: 'Key Symbols for This Agent',
        order: 8,
        contentType: 'list',
        guidance: 'List symbols (classes, functions, types) most relevant to this agent with links.',
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Documentation Touchpoints',
        order: 9,
        contentType: 'list',
        guidance: 'Link to relevant documentation files this agent should reference.',
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Collaboration Checklist',
        order: 10,
        contentType: 'checklist',
        guidance: 'Numbered checklist for agent workflow: confirm assumptions, review PRs, update docs, capture learnings.',
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Hand-off Notes',
        order: 11,
        contentType: 'prose',
        guidance: 'Summarize outcomes, remaining risks, and suggested follow-up actions after the agent completes work.',
        required: false,
        headingLevel: 2,
      },
    ],
    linkTo: ['../docs/README.md', 'README.md', '../../AGENTS.md'],
    additionalContext,
  };
}

const codeReviewerStructure = createAgentStructure(
  'code-reviewer',
  'Code Reviewer',
  'Reviews code changes for quality, style, and best practices',
  'Focus on code quality, maintainability, security issues, and adherence to project conventions.'
);

const bugFixerStructure = createAgentStructure(
  'bug-fixer',
  'Bug Fixer',
  'Analyzes bug reports and implements targeted fixes',
  'Focus on root cause analysis, minimal side effects, and regression prevention.'
);

const featureDeveloperStructure = createAgentStructure(
  'feature-developer',
  'Feature Developer',
  'Implements new features according to specifications',
  'Focus on clean architecture, integration with existing code, and comprehensive testing.'
);

const refactoringSpecialistStructure = createAgentStructure(
  'refactoring-specialist',
  'Refactoring Specialist',
  'Identifies code smells and improves code structure',
  'Focus on incremental changes, test coverage, and preserving functionality.'
);

const testWriterStructure = createAgentStructure(
  'test-writer',
  'Test Writer',
  'Writes comprehensive tests and maintains test coverage',
  'Focus on unit tests, integration tests, edge cases, and test maintainability.'
);

const documentationWriterStructure = createAgentStructure(
  'documentation-writer',
  'Documentation Writer',
  'Creates and maintains documentation',
  'Focus on clarity, practical examples, and keeping docs in sync with code.'
);

const performanceOptimizerStructure = createAgentStructure(
  'performance-optimizer',
  'Performance Optimizer',
  'Identifies bottlenecks and optimizes performance',
  'Focus on measurement, actual bottlenecks, and caching strategies.'
);

const securityAuditorStructure = createAgentStructure(
  'security-auditor',
  'Security Auditor',
  'Identifies security vulnerabilities and implements best practices',
  'Focus on OWASP top 10, dependency scanning, and principle of least privilege.'
);

const backendSpecialistStructure = createAgentStructure(
  'backend-specialist',
  'Backend Specialist',
  'Designs and implements server-side architecture',
  'Focus on APIs, microservices, database optimization, and authentication.'
);

const frontendSpecialistStructure = createAgentStructure(
  'frontend-specialist',
  'Frontend Specialist',
  'Designs and implements user interfaces',
  'Focus on responsive design, accessibility, state management, and performance.'
);

const architectSpecialistStructure = createAgentStructure(
  'architect-specialist',
  'Architect Specialist',
  'Designs overall system architecture and patterns',
  'Focus on scalability, maintainability, and technical standards.'
);

const devopsSpecialistStructure = createAgentStructure(
  'devops-specialist',
  'DevOps Specialist',
  'Designs CI/CD pipelines and infrastructure',
  'Focus on automation, infrastructure as code, and monitoring.'
);

const databaseSpecialistStructure = createAgentStructure(
  'database-specialist',
  'Database Specialist',
  'Designs and optimizes database schemas',
  'Focus on schema design, query optimization, and data integrity.'
);

const mobileSpecialistStructure = createAgentStructure(
  'mobile-specialist',
  'Mobile Specialist',
  'Develops mobile applications',
  'Focus on native/cross-platform development, performance, and app store requirements.'
);

// ============================================================================
// SKILL STRUCTURES
// ============================================================================

function createSkillStructure(
  skillSlug: string,
  title: string,
  description: string,
  additionalContext?: string
): ScaffoldStructure {
  return {
    fileType: 'skill',
    documentName: skillSlug,
    title,
    description,
    tone: 'instructional',
    audience: 'ai-agents',
    sections: [
      {
        heading: 'When to Use',
        order: 1,
        contentType: 'prose',
        guidance: `Briefly describe when this skill should be activated: ${description}`,
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Instructions',
        order: 2,
        contentType: 'list',
        guidance: 'Step-by-step instructions for executing this skill. Be specific and actionable.',
        exampleContent: '1. First step\n2. Second step\n3. Third step',
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Examples',
        order: 3,
        contentType: 'code-block',
        guidance: 'Provide concrete examples of how to use this skill. Include input and expected output.',
        required: true,
        headingLevel: 2,
      },
      {
        heading: 'Guidelines',
        order: 4,
        contentType: 'list',
        guidance: 'Best practices and guidelines for using this skill effectively.',
        required: true,
        headingLevel: 2,
      },
    ],
    additionalContext,
  };
}

const commitMessageSkillStructure = createSkillStructure(
  'commit-message',
  'Commit Message',
  'Generates conventional commit messages following project conventions',
  'Focus on conventional commits format, clear descriptions, and linking to issues.'
);

const prReviewSkillStructure = createSkillStructure(
  'pr-review',
  'PR Review',
  'Reviews pull requests for quality, completeness, and adherence to standards',
  'Focus on code quality, test coverage, documentation, and potential issues.'
);

const codeReviewSkillStructure = createSkillStructure(
  'code-review',
  'Code Review',
  'Reviews code changes for quality and best practices',
  'Focus on maintainability, performance, security, and style consistency.'
);

const testGenerationSkillStructure = createSkillStructure(
  'test-generation',
  'Test Generation',
  'Generates comprehensive tests for code',
  'Focus on unit tests, edge cases, mocking strategies, and test organization.'
);

const documentationSkillStructure = createSkillStructure(
  'documentation',
  'Documentation',
  'Creates and updates documentation',
  'Focus on clarity, examples, API documentation, and keeping docs current.'
);

const refactoringSkillStructure = createSkillStructure(
  'refactoring',
  'Refactoring',
  'Refactors code to improve structure and maintainability',
  'Focus on small incremental changes, test coverage, and preserving behavior.'
);

const bugInvestigationSkillStructure = createSkillStructure(
  'bug-investigation',
  'Bug Investigation',
  'Investigates and diagnoses bugs',
  'Focus on reproduction, root cause analysis, and fix verification.'
);

const featureBreakdownSkillStructure = createSkillStructure(
  'feature-breakdown',
  'Feature Breakdown',
  'Breaks down features into implementable tasks',
  'Focus on clear requirements, dependencies, and estimation.'
);

const apiDesignSkillStructure = createSkillStructure(
  'api-design',
  'API Design',
  'Designs APIs following best practices',
  'Focus on RESTful design, versioning, error handling, and documentation.'
);

const securityAuditSkillStructure = createSkillStructure(
  'security-audit',
  'Security Audit',
  'Audits code for security vulnerabilities',
  'Focus on OWASP top 10, input validation, authentication, and authorization.'
);

// ============================================================================
// PLAN STRUCTURES
// ============================================================================

const planStructure: ScaffoldStructure = {
  fileType: 'plan',
  documentName: 'implementation-plan',
  title: 'Implementation Plan',
  description: 'Detailed implementation plan for a feature or task',
  tone: 'instructional',
  audience: 'developers',
  sections: [
    {
      heading: 'Overview',
      order: 1,
      contentType: 'prose',
      guidance: 'Summarize the goal and scope of this implementation plan.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Codebase Context',
      order: 2,
      contentType: 'prose',
      guidance: 'Describe the relevant parts of the codebase, architecture layers, and key components.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Implementation Phases',
      order: 3,
      contentType: 'list',
      guidance: 'Break down implementation into phases mapped to PREVC (Planning, Review, Execution, Validation, Confirmation).',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Agent Assignments',
      order: 4,
      contentType: 'list',
      guidance: 'List which agents are responsible for which phases.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Documentation Updates',
      order: 5,
      contentType: 'list',
      guidance: 'List documentation files that need to be updated.',
      required: false,
      headingLevel: 2,
    },
    {
      heading: 'Risks & Mitigations',
      order: 6,
      contentType: 'list',
      guidance: 'Identify potential risks and mitigation strategies.',
      required: false,
      headingLevel: 2,
    },
  ],
};

// ============================================================================
// STRUCTURE REGISTRY
// ============================================================================

/**
 * All scaffold structures indexed by document name
 */
export const SCAFFOLD_STRUCTURES: Record<string, ScaffoldStructure> = {
  // Documentation
  'project-overview': projectOverviewStructure,
  'architecture': architectureStructure,
  'development-workflow': developmentWorkflowStructure,
  'testing-strategy': testingStrategyStructure,
  'tooling': toolingStructure,
  'security': securityStructure,
  'glossary': glossaryStructure,
  'data-flow': dataFlowStructure,

  // Agents
  'code-reviewer': codeReviewerStructure,
  'bug-fixer': bugFixerStructure,
  'feature-developer': featureDeveloperStructure,
  'refactoring-specialist': refactoringSpecialistStructure,
  'test-writer': testWriterStructure,
  'documentation-writer': documentationWriterStructure,
  'performance-optimizer': performanceOptimizerStructure,
  'security-auditor': securityAuditorStructure,
  'backend-specialist': backendSpecialistStructure,
  'frontend-specialist': frontendSpecialistStructure,
  'architect-specialist': architectSpecialistStructure,
  'devops-specialist': devopsSpecialistStructure,
  'database-specialist': databaseSpecialistStructure,
  'mobile-specialist': mobileSpecialistStructure,

  // Skills
  'commit-message': commitMessageSkillStructure,
  'pr-review': prReviewSkillStructure,
  'code-review': codeReviewSkillStructure,
  'test-generation': testGenerationSkillStructure,
  'documentation': documentationSkillStructure,
  'refactoring': refactoringSkillStructure,
  'bug-investigation': bugInvestigationSkillStructure,
  'feature-breakdown': featureBreakdownSkillStructure,
  'api-design': apiDesignSkillStructure,
  'security-audit': securityAuditSkillStructure,

  // Plans
  'implementation-plan': planStructure,
};

/**
 * Get scaffold structure by name
 */
export function getScaffoldStructure(name: string): ScaffoldStructure | undefined {
  return SCAFFOLD_STRUCTURES[name];
}

/**
 * Get all structures of a specific file type
 */
export function getStructuresByType(fileType: ScaffoldFileType): ScaffoldStructure[] {
  return Object.values(SCAFFOLD_STRUCTURES).filter(s => s.fileType === fileType);
}

/**
 * Serialize a scaffold structure to a readable format for AI context
 */
export function serializeStructureForAI(structure: ScaffoldStructure): string {
  const lines: string[] = [];

  lines.push(`# Document Structure: ${structure.title}`);
  lines.push('');
  lines.push(`**Type:** ${structure.fileType}`);
  lines.push(`**Tone:** ${structure.tone}`);
  lines.push(`**Audience:** ${structure.audience}`);
  lines.push(`**Description:** ${structure.description}`);

  if (structure.additionalContext) {
    lines.push(`**Additional Context:** ${structure.additionalContext}`);
  }

  lines.push('');
  lines.push('## Required Sections');
  lines.push('');

  const sortedSections = [...structure.sections].sort((a, b) => a.order - b.order);

  for (const section of sortedSections) {
    const requiredLabel = section.required ? '(REQUIRED)' : '(optional)';
    const level = section.headingLevel || 2;
    const headingPrefix = '#'.repeat(level);

    lines.push(`### ${section.order}. ${headingPrefix} ${section.heading} ${requiredLabel}`);
    lines.push(`- **Content Type:** ${section.contentType}`);
    lines.push(`- **Guidance:** ${section.guidance}`);

    if (section.exampleContent) {
      lines.push('- **Example:**');
      lines.push('```');
      lines.push(section.exampleContent);
      lines.push('```');
    }

    lines.push('');
  }

  if (structure.linkTo && structure.linkTo.length > 0) {
    lines.push('## Cross-References');
    lines.push('Link to these related documents where appropriate:');
    for (const link of structure.linkTo) {
      lines.push(`- ${link}`);
    }
  }

  return lines.join('\n');
}

/**
 * Validate that a structure is well-formed
 */
export function validateStructure(structure: ScaffoldStructure): string[] {
  const errors: string[] = [];

  if (!structure.documentName) {
    errors.push('Missing documentName');
  }

  if (!structure.title) {
    errors.push('Missing title');
  }

  if (!structure.sections || structure.sections.length === 0) {
    errors.push('No sections defined');
  }

  const orders = new Set<number>();
  for (const section of structure.sections) {
    if (!section.heading) {
      errors.push(`Section ${section.order} missing heading`);
    }
    if (!section.guidance) {
      errors.push(`Section "${section.heading}" missing guidance`);
    }
    if (orders.has(section.order)) {
      errors.push(`Duplicate order ${section.order}`);
    }
    orders.add(section.order);
  }

  return errors;
}

/**
 * Validate all structures in the registry
 */
export function validateAllStructures(): Map<string, string[]> {
  const results = new Map<string, string[]>();

  for (const [name, structure] of Object.entries(SCAFFOLD_STRUCTURES)) {
    const errors = validateStructure(structure);
    if (errors.length > 0) {
      results.set(name, errors);
    }
  }

  return results;
}
