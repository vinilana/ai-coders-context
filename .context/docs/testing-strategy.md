---
type: doc
name: testing-strategy
description: Test frameworks, patterns, coverage requirements, and quality gates
category: testing
generated: 2026-01-16
status: filled
scaffoldVersion: "2.0.0"
---

# Testing Strategy

## Framework

- **Vitest** - Primary test framework
- Test files: `*.test.ts` colocated with source files

## Running Tests

```bash
npm test           # Run all tests
npm run test:watch # Watch mode
```

## Test Patterns

- Unit tests for generators and services
- Integration tests for CLI commands
- Mock external AI services

## Coverage Requirements

Ensure adequate coverage for:
- Generators (`src/generators/`)
- Services (`src/services/`)
- Utils (`src/utils/`)

---
*Generated from codebase analysis.*
