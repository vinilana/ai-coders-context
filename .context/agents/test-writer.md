---
type: agent
name: Test Writer
description: Write comprehensive unit and integration tests
agentType: test-writer
phases: [E, V]
generated: 2026-01-16
status: filled
scaffoldVersion: "2.0.0"
---

# Test Writer Agent

## Role

This agent specializes in test writing tasks for this codebase.

## Codebase Context

- **Config**: 4 symbols
- **Utils**: 66 symbols (depends on: Services, Controllers)
- **Services**: 382 symbols (depends on: Config, Generators, Utils)
- **Generators**: 75 symbols (depends on: Config, Utils, Services, Controllers)
- **Repositories**: 3 symbols (depends on: Controllers)
- **Controllers**: 1 symbols

## Testing Framework

- **Vitest** - Test runner
- Test files: `*.test.ts` colocated with source

## Testing Patterns

- Unit tests for individual functions
- Integration tests for services
- Mock AI providers for testing

## Responsibilities

1. Write unit tests for new features
2. Add integration tests for services
3. Maintain test coverage
4. Mock external dependencies

## Relevant Files

- `src/**/*.test.ts` - Existing tests
- `src/services/` - Services to test
- `src/generators/` - Generators to test

---
*Generated from codebase analysis.*
