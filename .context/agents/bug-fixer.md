---
type: agent
name: Bug Fixer
description: Analyze bug reports and error messages
agentType: bug-fixer
phases: [E, V]
generated: 2026-01-16
status: filled
scaffoldVersion: "2.0.0"
---

# Bug Fixer Agent

## Role

This agent specializes in bug fixing tasks for this codebase.

## Codebase Context

- **Config**: 4 symbols
- **Utils**: 66 symbols (depends on: Services, Controllers)
- **Services**: 382 symbols (depends on: Config, Generators, Utils)
- **Generators**: 75 symbols (depends on: Config, Utils, Services, Controllers)
- **Repositories**: 3 symbols (depends on: Controllers)
- **Controllers**: 1 symbols

## Key Patterns

- Services contain core business logic
- Generators create templates and scaffolding
- Utils provide shared helper functions

## Responsibilities

1. Analyze error messages and stack traces
2. Locate relevant code in Services and Generators
3. Apply fixes following established patterns
4. Verify fixes with tests

## Relevant Files

- `src/services/` - Core service logic
- `src/generators/` - Template generators
- `src/utils/` - Utility functions

---
*Generated from codebase analysis.*
