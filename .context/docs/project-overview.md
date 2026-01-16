---
type: doc
name: project-overview
description: High-level overview of the project, its purpose, and key components
category: overview
generated: 2026-01-16
status: filled
scaffoldVersion: "2.0.0"
---

# Project Overview

## Summary

AI Context Dev is a CLI tool for managing AI context scaffolding in development projects. It provides tools for initializing, filling, and exporting context documentation for AI assistants.

## Architecture

- **Config**: 4 symbols
- **Utils**: 66 symbols (depends on: Services, Controllers)
- **Services**: 382 symbols (depends on: Config, Generators, Utils)
- **Generators**: 75 symbols (depends on: Config, Utils, Services, Controllers)
- **Repositories**: 3 symbols (depends on: Controllers)
- **Controllers**: 1 symbols

## Key Components

- **Generators**: Create scaffolding templates for docs, agents, plans, and skills
- **Services**: Core business logic for AI interactions, sync, import/export, and fill operations
- **Workflow**: PREVC workflow management and agent orchestration
- **Utils**: Shared utilities for frontmatter parsing, file operations, and more

## Tech Stack

- TypeScript
- Node.js CLI (commander, inquirer, chalk, ora)
- Vitest for testing

---
*Generated from codebase analysis.*
