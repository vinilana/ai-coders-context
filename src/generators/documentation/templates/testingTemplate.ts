
export function renderTestingStrategy(): string {

  return `
# Testing Strategy

Document how quality is maintained across the codebase.

## Test Types
- Unit: List frameworks (e.g., Jest) and file naming conventions.
- Integration: Describe scenarios and required tooling.
- End-to-end: Note harnesses or environments if applicable.

## Running Tests
- Execute all tests with \`npm run test\`.
- Use watch mode locally: \`npm run test -- --watch\`.
- Add coverage runs before releases: \`npm run test -- --coverage\`.

## Quality Gates
- Define minimum coverage expectations.
- Capture linting or formatting requirements before merging.

## Troubleshooting
- Document flaky suites, long-running tests, or environment quirks.

## Update Checklist
1. Review test scripts and CI workflows to confirm command accuracy.
2. Update Quality Gates with current thresholds (coverage %, lint rules, required checks).
3. Document new test categories or suites introduced since the last update.
4. Record known flaky areas and link to open issues for visibility.
5. Confirm troubleshooting steps remain valid with current tooling.

## Recommended Sources
- \`package.json\` scripts and testing configuration files.
- CI job definitions (GitHub Actions, CircleCI, etc.).
- Issue tracker items labelled “testing” or “flaky” with maintainer confirmation.

`;
}
