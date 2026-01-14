/**
 * Skill Registry
 *
 * Centralized management for skill discovery and metadata retrieval.
 * Supports both built-in and custom skills.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  Skill,
  SkillMetadata,
  DiscoveredSkills,
  BUILT_IN_SKILLS,
  BuiltInSkillType,
  isBuiltInSkill,
  SKILL_TO_PHASES,
} from './types';

export class SkillRegistry {
  private readonly repoPath: string;
  private readonly contextPath: string;
  private cache: DiscoveredSkills | null = null;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.contextPath = path.join(repoPath, '.context', 'skills');
  }

  /**
   * Discover all available skills (built-in + custom)
   */
  async discoverAll(): Promise<DiscoveredSkills> {
    if (this.cache) {
      return this.cache;
    }

    const builtIn = await this.discoverBuiltInSkills();
    const custom = await this.discoverCustomSkills();

    this.cache = {
      builtIn,
      custom,
      all: [...builtIn, ...custom],
    };

    return this.cache;
  }

  /**
   * Get skill metadata by slug
   */
  async getSkillMetadata(slug: string): Promise<Skill | null> {
    const discovered = await this.discoverAll();
    return discovered.all.find((s) => s.slug === slug) || null;
  }

  /**
   * Get skill content (full SKILL.md)
   */
  async getSkillContent(slug: string): Promise<string | null> {
    const skill = await this.getSkillMetadata(slug);
    if (!skill) return null;

    try {
      return fs.readFileSync(skill.path, 'utf-8');
    } catch {
      return null;
    }
  }

  /**
   * Get skills for a PREVC phase
   */
  async getSkillsForPhase(phase: string): Promise<Skill[]> {
    const discovered = await this.discoverAll();
    return discovered.all.filter((skill) => skill.metadata.phases?.includes(phase as any));
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Discover built-in skills from templates
   */
  private async discoverBuiltInSkills(): Promise<Skill[]> {
    const skills: Skill[] = [];

    for (const skillType of BUILT_IN_SKILLS) {
      // Check if skill exists in .context/skills/
      const skillPath = path.join(this.contextPath, skillType, 'SKILL.md');

      if (fs.existsSync(skillPath)) {
        const skill = await this.parseSkillFile(skillPath, skillType, true);
        if (skill) {
          skills.push(skill);
        }
      } else {
        // Create virtual skill from built-in template
        const skill = this.createBuiltInSkill(skillType);
        skills.push(skill);
      }
    }

    return skills;
  }

  /**
   * Discover custom skills from .context/skills/
   */
  private async discoverCustomSkills(): Promise<Skill[]> {
    const skills: Skill[] = [];

    if (!fs.existsSync(this.contextPath)) {
      return skills;
    }

    const entries = fs.readdirSync(this.contextPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const slug = entry.name;

      // Skip built-in skills (already handled)
      if (isBuiltInSkill(slug)) continue;

      const skillPath = path.join(this.contextPath, slug, 'SKILL.md');

      if (fs.existsSync(skillPath)) {
        const skill = await this.parseSkillFile(skillPath, slug, false);
        if (skill) {
          skills.push(skill);
        }
      }
    }

    return skills;
  }

  /**
   * Parse a SKILL.md file
   */
  private async parseSkillFile(
    skillPath: string,
    slug: string,
    isBuiltIn: boolean
  ): Promise<Skill | null> {
    try {
      const content = fs.readFileSync(skillPath, 'utf-8');
      const { metadata, body } = this.parseFrontmatter(content);

      if (!metadata.name || !metadata.description) {
        return null;
      }

      // Discover resources in skill directory
      const skillDir = path.dirname(skillPath);
      const resources = this.discoverResources(skillDir);

      return {
        slug,
        path: skillPath,
        metadata,
        content: body,
        resources,
        isBuiltIn,
      };
    } catch {
      return null;
    }
  }

  /**
   * Parse YAML frontmatter from SKILL.md
   */
  private parseFrontmatter(content: string): { metadata: SkillMetadata; body: string } {
    const defaultMetadata: SkillMetadata = {
      name: '',
      description: '',
    };

    if (!content.startsWith('---')) {
      return { metadata: defaultMetadata, body: content };
    }

    const endIndex = content.indexOf('---', 3);
    if (endIndex === -1) {
      return { metadata: defaultMetadata, body: content };
    }

    const frontmatter = content.substring(3, endIndex).trim();
    const body = content.substring(endIndex + 3).trim();

    const metadata: SkillMetadata = { ...defaultMetadata };

    for (const line of frontmatter.split('\n')) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      switch (key) {
        case 'name':
          metadata.name = value.replace(/^["']|["']$/g, '');
          break;
        case 'description':
          metadata.description = value.replace(/^["']|["']$/g, '');
          break;
        case 'mode':
          metadata.mode = value === 'true';
          break;
        case 'disable-model-invocation':
        case 'disableModelInvocation':
          metadata.disableModelInvocation = value === 'true';
          break;
        case 'phases':
          // Parse array format: [P, R, E]
          const phasesMatch = value.match(/\[(.*)\]/);
          if (phasesMatch) {
            metadata.phases = phasesMatch[1].split(',').map((p) => p.trim().replace(/["']/g, '')) as any;
          }
          break;
      }
    }

    return { metadata, body };
  }

  /**
   * Discover resource files in skill directory
   */
  private discoverResources(skillDir: string): string[] {
    const resources: string[] = [];

    try {
      const entries = fs.readdirSync(skillDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name === 'SKILL.md') continue;

        if (entry.isFile()) {
          resources.push(path.join(skillDir, entry.name));
        } else if (entry.isDirectory()) {
          // Recursively find resources in subdirectories
          const subResources = this.discoverResourcesRecursive(path.join(skillDir, entry.name));
          resources.push(...subResources);
        }
      }
    } catch {
      // Ignore errors
    }

    return resources;
  }

  private discoverResourcesRecursive(dir: string): string[] {
    const resources: string[] = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile()) {
          resources.push(fullPath);
        } else if (entry.isDirectory()) {
          resources.push(...this.discoverResourcesRecursive(fullPath));
        }
      }
    } catch {
      // Ignore errors
    }

    return resources;
  }

  /**
   * Create a virtual built-in skill (not yet scaffolded)
   */
  private createBuiltInSkill(skillType: BuiltInSkillType): Skill {
    const templates = getBuiltInSkillTemplates();
    const template = templates[skillType];

    return {
      slug: skillType,
      path: path.join(this.contextPath, skillType, 'SKILL.md'),
      metadata: {
        name: skillType,
        description: template.description,
        phases: SKILL_TO_PHASES[skillType],
      },
      content: template.content,
      resources: [],
      isBuiltIn: true,
    };
  }
}

/**
 * Built-in skill templates
 */
interface SkillTemplate {
  description: string;
  content: string;
}

function getBuiltInSkillTemplates(): Record<BuiltInSkillType, SkillTemplate> {
  return {
    'commit-message': {
      description: 'Generate commit messages following conventional commits with scope detection',
      content: `# Commit Message Generator

## When to Use
Use this skill when creating commit messages or when the user asks to commit changes.

## Instructions
1. Analyze staged changes with \`git diff --staged\`
2. Identify the type: feat, fix, refactor, docs, test, chore, style, perf
3. Detect scope from the most changed directory or module
4. Write a concise message focusing on "why" not "what"

## Format
\`\`\`
<type>(<scope>): <description>

[optional body explaining why, not what]

[optional footer: BREAKING CHANGE, Closes #issue]
\`\`\`

## Examples
- \`feat(auth): add OAuth2 login with Google provider\`
- \`fix(api): handle null response from payment gateway\`
- \`refactor(db): extract connection pooling to separate module\`
- \`docs(readme): add installation instructions for Windows\`

## Guidelines
- Keep subject line under 72 characters
- Use imperative mood ("add" not "added")
- Don't end subject with period
- Separate subject from body with blank line`,
    },

    'pr-review': {
      description: 'Review pull requests against team standards and best practices',
      content: `# Pull Request Review

## When to Use
Use this skill when reviewing a pull request or when asked to review changes.

## Review Checklist

### 1. Context Understanding
- [ ] PR description explains the "why"
- [ ] Linked issue or ticket exists
- [ ] Scope is appropriate (not too large)

### 2. Code Quality
- [ ] Code follows project conventions
- [ ] No unnecessary complexity
- [ ] DRY principle respected
- [ ] Error handling is appropriate

### 3. Testing
- [ ] Tests cover new functionality
- [ ] Edge cases are handled
- [ ] No flaky tests introduced

### 4. Security
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] No SQL injection risks
- [ ] Authentication/authorization correct

### 5. Performance
- [ ] No N+1 queries
- [ ] Appropriate caching
- [ ] No memory leaks

## Review Format
\`\`\`markdown
## Summary
[1-2 sentence overview]

## What I Reviewed
- [List of files/areas reviewed]

## Findings
### Must Fix
- [ ] Issue 1
- [ ] Issue 2

### Suggestions
- Consider...
- Nice to have...

## Verdict
[APPROVE / REQUEST_CHANGES / COMMENT]
\`\`\``,
    },

    'code-review': {
      description: 'Review code quality, patterns, and best practices',
      content: `# Code Review

## When to Use
Use this skill when reviewing code files or when asked to analyze code quality.

## Review Dimensions

### 1. Readability
- Clear naming conventions
- Appropriate comments (why, not what)
- Consistent formatting
- Logical code organization

### 2. Maintainability
- Single Responsibility Principle
- Low coupling, high cohesion
- No magic numbers/strings
- Configuration externalized

### 3. Correctness
- Logic errors
- Off-by-one errors
- Null/undefined handling
- Type safety

### 4. Performance
- Algorithm complexity
- Resource management
- Caching opportunities
- Unnecessary computations

### 5. Security
- Input validation
- Output encoding
- Authentication checks
- Authorization checks

## Output Format
\`\`\`markdown
## File: [filename]

### Issues Found
| Line | Severity | Issue | Suggestion |
|------|----------|-------|------------|
| 42 | High | SQL injection risk | Use parameterized query |

### Positive Observations
- Good use of...
- Well-structured...

### Refactoring Opportunities
- Extract method for...
- Consider using pattern...
\`\`\``,
    },

    'test-generation': {
      description: 'Generate comprehensive test cases for code',
      content: `# Test Generation

## When to Use
Use this skill when writing tests or when asked to add test coverage.

## Test Categories

### 1. Unit Tests
- Test individual functions/methods
- Mock dependencies
- Cover edge cases

### 2. Integration Tests
- Test component interactions
- Real dependencies when possible
- Database transactions

### 3. Edge Cases to Cover
- Empty inputs
- Null/undefined values
- Maximum/minimum values
- Invalid types
- Concurrent access
- Network failures

## Test Structure (AAA Pattern)
\`\`\`
// Arrange - Set up test data and conditions
// Act - Execute the code under test
// Assert - Verify the results
\`\`\`

## Naming Convention
\`\`\`
[methodName]_[scenario]_[expectedResult]
\`\`\`

Example: \`calculateTotal_emptyCart_returnsZero\`

## Coverage Goals
- Statements: 80%+
- Branches: 75%+
- Functions: 90%+
- Lines: 80%+`,
    },

    'documentation': {
      description: 'Generate and update technical documentation',
      content: `# Documentation Generator

## When to Use
Use this skill when writing or updating documentation.

## Documentation Types

### 1. API Documentation
- Endpoint description
- Request/response examples
- Error codes
- Authentication requirements

### 2. README
- Project overview
- Installation steps
- Quick start guide
- Configuration options

### 3. Architecture Docs
- System overview
- Component diagram
- Data flow
- Decision records

### 4. Code Comments
- Why, not what
- Complex algorithm explanations
- Public API documentation

## Format Guidelines
- Use clear headings hierarchy
- Include code examples
- Add diagrams where helpful
- Keep it up to date with code

## Template: Function Documentation
\`\`\`typescript
/**
 * Brief description of what the function does.
 *
 * @param paramName - Description of parameter
 * @returns Description of return value
 * @throws ErrorType - When this error occurs
 *
 * @example
 * const result = functionName(arg);
 */
\`\`\``,
    },

    'refactoring': {
      description: 'Safe code refactoring with step-by-step approach',
      content: `# Refactoring Guide

## When to Use
Use this skill when refactoring code or improving code structure.

## Refactoring Principles

### 1. Safety First
- Ensure tests exist before refactoring
- Make small, incremental changes
- Commit after each successful step
- Keep functionality identical

### 2. Common Refactorings

#### Extract Method
When: Code block does one thing and can be named
\`\`\`
Before: Long method with multiple responsibilities
After: Small methods with clear names
\`\`\`

#### Extract Variable
When: Complex expression needs explanation
\`\`\`
Before: if (user.age >= 18 && user.country === 'US' && user.verified)
After: const canPurchase = user.age >= 18 && user.country === 'US' && user.verified;
\`\`\`

#### Replace Conditional with Polymorphism
When: Switch/if statements based on type
\`\`\`
Before: switch(type) { case 'A': ... case 'B': ... }
After: type.process() // Each type implements process()
\`\`\`

### 3. Step-by-Step Process
1. Identify code smell
2. Write characterization tests if missing
3. Apply refactoring
4. Run tests
5. Commit
6. Repeat

## Code Smells to Watch
- Long methods (>20 lines)
- Long parameter lists (>3 params)
- Duplicate code
- Feature envy
- Data clumps
- Primitive obsession`,
    },

    'bug-investigation': {
      description: 'Systematic bug investigation and root cause analysis',
      content: `# Bug Investigation

## When to Use
Use this skill when investigating bugs or unexpected behavior.

## Investigation Process

### 1. Reproduce
- Get exact steps to reproduce
- Identify environment (OS, version, config)
- Create minimal reproduction case

### 2. Isolate
- Binary search through code/commits
- Disable features to narrow scope
- Check if issue exists in isolation

### 3. Understand
- Read the relevant code carefully
- Check recent changes (git log, blame)
- Review related tests

### 4. Hypothesize
- Form theories about root cause
- Rank by likelihood
- Design tests for each hypothesis

### 5. Verify
- Add logging/debugging
- Write failing test
- Confirm fix addresses root cause

## Debugging Checklist
- [ ] Can I reproduce consistently?
- [ ] When did it start? (git bisect)
- [ ] What changed recently?
- [ ] Are there related error logs?
- [ ] Does it happen in all environments?
- [ ] Is it data-dependent?

## Root Cause Categories
- Logic error
- Race condition
- Resource leak
- Configuration issue
- Dependency problem
- Data corruption

## Report Format
\`\`\`markdown
## Bug: [Title]

### Symptoms
[What the user sees]

### Root Cause
[Technical explanation]

### Fix
[What was changed and why]

### Prevention
[How to prevent similar bugs]
\`\`\``,
    },

    'feature-breakdown': {
      description: 'Break down features into implementable tasks',
      content: `# Feature Breakdown

## When to Use
Use this skill when planning a new feature or breaking down requirements.

## Breakdown Process

### 1. Understand the Goal
- What problem does this solve?
- Who is the user?
- What does success look like?

### 2. Identify Components
- UI changes needed
- API endpoints required
- Database changes
- External integrations
- Background jobs

### 3. Define Tasks
Each task should be:
- **Small**: Completable in <4 hours
- **Independent**: Minimal dependencies
- **Testable**: Clear acceptance criteria
- **Valuable**: Delivers partial value

### 4. Order by Dependencies
\`\`\`
1. Database schema changes
2. Backend API endpoints
3. Frontend components
4. Integration tests
5. Documentation
\`\`\`

## Task Template
\`\`\`markdown
### Task: [Name]

**Description**: [What to implement]

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2

**Technical Notes**:
- Approach: [How to implement]
- Files: [Which files to modify]
- Dependencies: [What must be done first]

**Estimate**: [S/M/L]
\`\`\`

## Sizing Guide
- **S (Small)**: <2 hours, single file change
- **M (Medium)**: 2-4 hours, few files
- **L (Large)**: 4-8 hours, multiple components`,
    },

    'api-design': {
      description: 'Design RESTful APIs following best practices',
      content: `# API Design

## When to Use
Use this skill when designing new APIs or reviewing API designs.

## REST Principles

### 1. Resource Naming
- Use nouns, not verbs: \`/users\` not \`/getUsers\`
- Use plural: \`/users\` not \`/user\`
- Use hyphens: \`/user-profiles\` not \`/userProfiles\`
- Nest for relationships: \`/users/{id}/orders\`

### 2. HTTP Methods
| Method | Purpose | Idempotent |
|--------|---------|------------|
| GET | Read | Yes |
| POST | Create | No |
| PUT | Replace | Yes |
| PATCH | Update | Yes |
| DELETE | Remove | Yes |

### 3. Status Codes
- 200: OK
- 201: Created
- 204: No Content
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 422: Unprocessable Entity
- 500: Internal Server Error

### 4. Response Format
\`\`\`json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "total": 100
  },
  "errors": []
}
\`\`\`

### 5. Versioning
- URL path: \`/v1/users\`
- Header: \`Accept: application/vnd.api+json;version=1\`

## Design Checklist
- [ ] Resources clearly defined
- [ ] Consistent naming convention
- [ ] Proper HTTP methods used
- [ ] Error responses standardized
- [ ] Pagination implemented
- [ ] Authentication specified
- [ ] Rate limiting defined`,
    },

    'security-audit': {
      description: 'Security review checklist for code and infrastructure',
      content: `# Security Audit

## When to Use
Use this skill when reviewing code for security or performing security audits.

## OWASP Top 10 Checklist

### 1. Injection
- [ ] SQL queries use parameterized statements
- [ ] OS commands avoid user input
- [ ] LDAP queries are sanitized

### 2. Broken Authentication
- [ ] Passwords hashed with bcrypt/argon2
- [ ] Session tokens are secure random
- [ ] MFA available for sensitive operations

### 3. Sensitive Data Exposure
- [ ] Data encrypted at rest
- [ ] TLS for data in transit
- [ ] Secrets not in code/logs

### 4. XML External Entities (XXE)
- [ ] XML parsing disables external entities
- [ ] JSON preferred over XML

### 5. Broken Access Control
- [ ] Authorization checked on every request
- [ ] Direct object references validated
- [ ] CORS configured correctly

### 6. Security Misconfiguration
- [ ] Debug mode disabled in production
- [ ] Default credentials changed
- [ ] Security headers set

### 7. Cross-Site Scripting (XSS)
- [ ] Output encoding applied
- [ ] Content Security Policy set
- [ ] Input validation present

### 8. Insecure Deserialization
- [ ] User input not deserialized directly
- [ ] Integrity checks on serialized data

### 9. Using Components with Known Vulnerabilities
- [ ] Dependencies up to date
- [ ] Vulnerability scanning in CI
- [ ] SBOM maintained

### 10. Insufficient Logging & Monitoring
- [ ] Security events logged
- [ ] Logs don't contain sensitive data
- [ ] Alerting configured

## Report Format
\`\`\`markdown
## Security Audit: [Component]

### Scope
[What was reviewed]

### Findings
| ID | Severity | Issue | Remediation |
|----|----------|-------|-------------|
| S1 | Critical | [Issue] | [Fix] |

### Recommendations
1. [Priority recommendation]
2. [Secondary recommendation]
\`\`\``,
    },
  };
}

/**
 * Factory function
 */
export function createSkillRegistry(repoPath: string): SkillRegistry {
  return new SkillRegistry(repoPath);
}

export { getBuiltInSkillTemplates };
