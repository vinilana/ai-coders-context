/**
 * Agent structure definitions
 */

import { createAgentStructure } from './factory';

export const codeReviewerStructure = createAgentStructure(
  'code-reviewer',
  'Code Reviewer',
  'Reviews code changes for quality, style, and best practices',
  'Focus on code quality, maintainability, security issues, and adherence to project conventions.'
);

export const bugFixerStructure = createAgentStructure(
  'bug-fixer',
  'Bug Fixer',
  'Analyzes bug reports and implements targeted fixes',
  'Focus on root cause analysis, minimal side effects, and regression prevention.'
);

export const featureDeveloperStructure = createAgentStructure(
  'feature-developer',
  'Feature Developer',
  'Implements new features according to specifications',
  'Focus on clean architecture, integration with existing code, and comprehensive testing.'
);

export const refactoringSpecialistStructure = createAgentStructure(
  'refactoring-specialist',
  'Refactoring Specialist',
  'Identifies code smells and improves code structure',
  'Focus on incremental changes, test coverage, and preserving functionality.'
);

export const testWriterStructure = createAgentStructure(
  'test-writer',
  'Test Writer',
  'Writes comprehensive tests and maintains test coverage',
  'Focus on unit tests, integration tests, edge cases, and test maintainability.'
);

export const documentationWriterStructure = createAgentStructure(
  'documentation-writer',
  'Documentation Writer',
  'Creates and maintains documentation',
  'Focus on clarity, practical examples, and keeping docs in sync with code.'
);

export const performanceOptimizerStructure = createAgentStructure(
  'performance-optimizer',
  'Performance Optimizer',
  'Identifies bottlenecks and optimizes performance',
  'Focus on measurement, actual bottlenecks, and caching strategies.'
);

export const securityAuditorStructure = createAgentStructure(
  'security-auditor',
  'Security Auditor',
  'Identifies security vulnerabilities and implements best practices',
  'Focus on OWASP top 10, dependency scanning, and principle of least privilege.'
);

export const backendSpecialistStructure = createAgentStructure(
  'backend-specialist',
  'Backend Specialist',
  'Designs and implements server-side architecture',
  'Focus on APIs, microservices, database optimization, and authentication.'
);

export const frontendSpecialistStructure = createAgentStructure(
  'frontend-specialist',
  'Frontend Specialist',
  'Designs and implements user interfaces',
  'Focus on responsive design, accessibility, state management, and performance.'
);

export const architectSpecialistStructure = createAgentStructure(
  'architect-specialist',
  'Architect Specialist',
  'Designs overall system architecture and patterns',
  'Focus on scalability, maintainability, and technical standards.'
);

export const devopsSpecialistStructure = createAgentStructure(
  'devops-specialist',
  'DevOps Specialist',
  'Designs CI/CD pipelines and infrastructure',
  'Focus on automation, infrastructure as code, and monitoring.'
);

export const databaseSpecialistStructure = createAgentStructure(
  'database-specialist',
  'Database Specialist',
  'Designs and optimizes database schemas',
  'Focus on schema design, query optimization, and data integrity.'
);

export const mobileSpecialistStructure = createAgentStructure(
  'mobile-specialist',
  'Mobile Specialist',
  'Develops mobile applications',
  'Focus on native/cross-platform development, performance, and app store requirements.'
);
