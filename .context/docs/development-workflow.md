---
type: doc
name: development-workflow
description: Day-to-day engineering processes, branching, and contribution guidelines
category: workflow
generated: 2026-01-16
status: filled
scaffoldVersion: "2.0.0"
---

# Development Workflow

## Architecture Overview

- **Config**: 4 symbols
- **Utils**: 66 symbols (depends on: Services, Controllers)
- **Services**: 382 symbols (depends on: Config, Generators, Utils)
- **Generators**: 75 symbols (depends on: Config, Utils, Services, Controllers)
- **Repositories**: 3 symbols (depends on: Controllers)
- **Controllers**: 1 symbols

## Branching Strategy

- `main` - Production-ready code
- `fix/*` - Bug fixes
- `feat/*` - New features
- `chore/*` - Maintenance tasks

## Development Process

1. Create a branch from `main`
2. Implement changes following project conventions
3. Run tests with `npm test`
4. Build with `npm run build`
5. Create PR for review

## Key Commands

```bash
npm run build    # Build the project
npm test         # Run tests
npm run lint     # Run linter
```

---
*Generated from codebase analysis.*
