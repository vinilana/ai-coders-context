export function renderTestingStrategy(): string {
  return `# Testing Strategy

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
`;
}
