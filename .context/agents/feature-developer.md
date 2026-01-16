---
type: agent
name: Feature Developer
description: Implement new features according to specifications
agentType: feature-developer
phases: [P, E]
generated: 2026-01-16
status: filled
scaffoldVersion: "2.0.0"
---

# Feature Developer Agent

## Role

This agent specializes in feature development tasks for this codebase.

## Codebase Context

- **Config**: 4 symbols
- **Utils**: 66 symbols (depends on: Services, Controllers)
- **Services**: 382 symbols (depends on: Config, Generators, Utils)
- **Generators**: 75 symbols (depends on: Config, Utils, Services, Controllers)
- **Repositories**: 3 symbols (depends on: Controllers)
- **Controllers**: 1 symbols

## Development Workflow

1. Understand feature requirements
2. Identify affected components (Services, Generators, Utils)
3. Implement following existing patterns
4. Write tests for new functionality
5. Update documentation

## Responsibilities

1. Implement new features
2. Follow TypeScript best practices
3. Write comprehensive tests
4. Maintain code quality

## Relevant Files

- `src/services/` - Add new service logic
- `src/generators/` - Add new generators
- `src/utils/` - Add utility functions

---
*Generated from codebase analysis.*
