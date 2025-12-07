import { MARKER_IDS, wrapDocument } from '../../shared';

/**
 * Testing Strategy Template
 *
 * REFACTORED: Now uses centralized marker registry and template sections.
 * - Marker ID comes from MARKER_IDS (no more string literals)
 * - Guidance/Sources use presets (no more copy-paste)
 * - wrapDocument() ensures consistent structure
 */
export function renderTestingStrategy(): string {
  const content = `# Testing Strategy

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
- Document flaky suites, long-running tests, or environment quirks.`;

  return wrapDocument({
    markerId: MARKER_IDS.docs.testingStrategy,
    content,
    guidance: 'testing',
    sources: 'testing',
  });
}
