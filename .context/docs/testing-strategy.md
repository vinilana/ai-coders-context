---
id: testing-strategy
ai_update_goal: "Explain how the project maintains quality, from unit coverage to release gates."
required_inputs:
  - "Testing framework configuration (jest.config.js, etc.)"
  - "CI requirements for merges/releases"
  - "Known flaky suites or troubleshooting notes"
success_criteria:
  - "Test types list frameworks and ownership at a glance"
  - "Commands match package scripts and CI usage"
  - "Quality gates describe pass/fail expectations with numbers when possible"
related_agents:
  - "test-writer"
  - "code-reviewer"
---

<!-- agent-update:start:testing-strategy -->
# Testing Strategy

Document how quality is maintained across the codebase.

## Test Types
- **Unit**: Uses Jest as the primary framework for testing individual functions, components, and utilities. Files follow the naming convention `*.test.ts` or `*.spec.ts` colocated with source files in the `src/` directory. Ownership: Individual developers are responsible for writing and maintaining unit tests for their code changes.
- **Integration**: Leverages Jest with minimal mocking to test interactions between modules, such as prompt processing and source code generation workflows. Scenarios include API integrations within the `src/` modules and prompt chaining. Required tooling: Jest setup with TypeScript support via `ts-jest`. Ownership: Feature owners ensure integration tests cover cross-module dependencies.
- **End-to-end**: Not currently implemented due to the project's focus on backend logic and AI scaffolding. Future plans may include Playwright for full workflow testing if UI components are added. Ownership: N/A at present; monitored by release engineers.

## Running Tests
- Execute all tests with `npm run test`.
- Use watch mode locally: `npm run test -- --watch`.
- Add coverage runs before releases: `npm run test -- --coverage`.

## Quality Gates
- Minimum code coverage must be at least 80% for new code changes, enforced via CI checks (e.g., Jest coverage thresholds in `jest.config.js`).
- Linting requirements: All code must pass ESLint checks (`npm run lint`) with no errors or warnings; auto-fixes applied via Prettier (`npm run format`).
- Before merging PRs, CI must pass all test suites, including unit and integration, with no flaky failures. Releases require 90% overall coverage and successful dry-run builds.

## Troubleshooting
- Flaky suites: Occasional timeouts in integration tests involving async prompt evaluations; mitigate by increasing Jest timeouts to 30s (`testTimeout: 30000` in config) and re-running failed tests up to 3 times in CI.
- Long-running tests: Unit tests in `src/prompts/` can exceed 10s due to mock setups; optimize by isolating heavy computations or using `jest.skip` for CI-only skips.
- Environment quirks: Ensure Node.js version >=18 for consistent TypeScript compilation; check CI logs for dependency resolution issues in `package.json`. Link to open issues: [#42](https://github.com/example/repo/issues/42) for ongoing flaky test tracking.

<!-- agent-readonly:guidance -->
## AI Update Checklist
1. Review test scripts and CI workflows to confirm command accuracy.
2. Update Quality Gates with current thresholds (coverage %, lint rules, required checks).
3. Document new test categories or suites introduced since the last update.
4. Record known flaky areas and link to open issues for visibility.
5. Confirm troubleshooting steps remain valid with current tooling.

<!-- agent-readonly:sources -->
## Acceptable Sources
- `package.json` scripts and testing configuration files.
- CI job definitions (GitHub Actions, CircleCI, etc.).
- Issue tracker items labelled “testing” or “flaky” with maintainer confirmation.

<!-- agent-update:end -->
