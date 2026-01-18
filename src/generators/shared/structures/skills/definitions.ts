/**
 * Skill structure definitions
 */

import { createSkillStructure } from './factory';

export const commitMessageSkillStructure = createSkillStructure(
  'commit-message',
  'Commit Message',
  'Generates conventional commit messages following project conventions',
  'Focus on conventional commits format, clear descriptions, and linking to issues.'
);

export const prReviewSkillStructure = createSkillStructure(
  'pr-review',
  'PR Review',
  'Reviews pull requests for quality, completeness, and adherence to standards',
  'Focus on code quality, test coverage, documentation, and potential issues.'
);

export const codeReviewSkillStructure = createSkillStructure(
  'code-review',
  'Code Review',
  'Reviews code changes for quality and best practices',
  'Focus on maintainability, performance, security, and style consistency.'
);

export const testGenerationSkillStructure = createSkillStructure(
  'test-generation',
  'Test Generation',
  'Generates comprehensive tests for code',
  'Focus on unit tests, edge cases, mocking strategies, and test organization.'
);

export const documentationSkillStructure = createSkillStructure(
  'documentation',
  'Documentation',
  'Creates and updates documentation',
  'Focus on clarity, examples, API documentation, and keeping docs current.'
);

export const refactoringSkillStructure = createSkillStructure(
  'refactoring',
  'Refactoring',
  'Refactors code to improve structure and maintainability',
  'Focus on small incremental changes, test coverage, and preserving behavior.'
);

export const bugInvestigationSkillStructure = createSkillStructure(
  'bug-investigation',
  'Bug Investigation',
  'Investigates and diagnoses bugs',
  'Focus on reproduction, root cause analysis, and fix verification.'
);

export const featureBreakdownSkillStructure = createSkillStructure(
  'feature-breakdown',
  'Feature Breakdown',
  'Breaks down features into implementable tasks',
  'Focus on clear requirements, dependencies, and estimation.'
);

export const apiDesignSkillStructure = createSkillStructure(
  'api-design',
  'API Design',
  'Designs APIs following best practices',
  'Focus on RESTful design, versioning, error handling, and documentation.'
);

export const securityAuditSkillStructure = createSkillStructure(
  'security-audit',
  'Security Audit',
  'Audits code for security vulnerabilities',
  'Focus on OWASP top 10, input validation, authentication, and authorization.'
);
