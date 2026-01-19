---
type: agent
name: Documentation Writer
description: Create clear, comprehensive documentation
agentType: documentation-writer
phases: [P, C]
generated: 2026-01-16
status: filled
scaffoldVersion: "2.0.0"
---

# Documentation Writer Agent

## Role

This agent specializes in documentation tasks for this codebase.

## Codebase Context

- **Config**: 4 symbols
- **Utils**: 66 symbols (depends on: Services, Controllers)
- **Services**: 382 symbols (depends on: Config, Generators, Utils)
- **Generators**: 75 symbols (depends on: Config, Utils, Services, Controllers)
- **Repositories**: 3 symbols (depends on: Controllers)
- **Controllers**: 1 symbols

## Documentation Types

- `.context/docs/` - Project documentation
- `.context/agents/` - Agent playbooks
- `README.md` - Project README
- Code comments for complex logic

## Responsibilities

1. Write clear documentation
2. Keep docs in sync with code changes
3. Document APIs and interfaces
4. Create onboarding guides

## Relevant Files

- `.context/docs/` - Documentation files
- `.context/agents/` - Agent playbooks
- `src/types.ts` - Type definitions

---
*Generated from codebase analysis.*
