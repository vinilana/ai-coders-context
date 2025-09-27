import { createFrontMatter } from './frontMatter';

export function renderTestingStrategy(): string {
  const frontMatter = createFrontMatter({
    id: 'testing-strategy',
    goal: 'Explain how the project maintains quality, from unit coverage to release gates.',
    requiredInputs: [
      'Testing framework configuration (jest.config.js, etc.)',
      'CI requirements for merges/releases',
      'Known flaky suites or troubleshooting notes'
    ],
    successCriteria: [
      'Test types list frameworks and ownership at a glance',
      'Commands match package scripts and CI usage',
      'Quality gates describe pass/fail expectations with numbers when possible'
    ],
    relatedAgents: ['test-writer', 'code-reviewer']
  });

  return `${frontMatter}
<!-- ai-task:testing-strategy -->
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

## AI Update Checklist
1. Review test scripts and CI workflows to confirm command accuracy.
2. Update Quality Gates with current thresholds (coverage %, lint rules, required checks).
3. Document new test categories or suites introduced since the last update.
4. Record known flaky areas and link to open issues for visibility.
5. Confirm troubleshooting steps remain valid with current tooling.

## Acceptable Sources
- \`package.json\` scripts and testing configuration files.
- CI job definitions (GitHub Actions, CircleCI, etc.).
- Issue tracker items labelled “testing” or “flaky” with maintainer confirmation.

<!-- /ai-task -->
`;
}
