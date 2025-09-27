import * as path from 'path';
import { RepoStructure } from '../../types';
import { GeneratorUtils } from '../shared';

interface DocSection {
  fileName: string;
  content: (context: DocumentationContext) => string;
}

interface DocumentationContext {
  repoStructure: RepoStructure;
  topLevelDirectories: string[];
  primaryLanguages: Array<{ extension: string; count: number }>;
  directoryStats: Array<{ name: string; fileCount: number }>;
}

interface FrontMatterConfig {
  id: string;
  goal: string;
  requiredInputs: string[];
  successCriteria: string[];
  relatedAgents?: string[];
}

interface GuideMeta {
  title: string;
  file: string;
  marker: string;
  primaryInputs: string;
}

export class DocumentationGenerator {
  private readonly guides: GuideMeta[] = [
    {
      title: 'Project Overview',
      file: 'project-overview.md',
      marker: 'ai-task:project-overview',
      primaryInputs: 'Roadmap, README, stakeholder notes'
    },
    {
      title: 'Architecture Notes',
      file: 'architecture.md',
      marker: 'ai-task:architecture-notes',
      primaryInputs: 'ADRs, service boundaries, dependency graphs'
    },
    {
      title: 'Development Workflow',
      file: 'development-workflow.md',
      marker: 'ai-task:development-workflow',
      primaryInputs: 'Branching rules, CI config, contributing guide'
    },
    {
      title: 'Testing Strategy',
      file: 'testing-strategy.md',
      marker: 'ai-task:testing-strategy',
      primaryInputs: 'Test configs, CI gates, known flaky suites'
    }
  ];

  constructor(..._legacyArgs: unknown[]) {}

  async generateDocumentation(
    repoStructure: RepoStructure,
    outputDir: string,
    _config: Record<string, unknown> = {},
    verbose: boolean = false
  ): Promise<number> {
    const docsDir = path.join(outputDir, 'docs');
    await GeneratorUtils.ensureDirectoryAndLog(docsDir, verbose, 'Generating documentation scaffold in');

    const context = this.buildContext(repoStructure);
    const sections = this.getDocSections();

    let created = 0;
    for (const section of sections) {
      const targetPath = path.join(docsDir, section.fileName);
      const content = section.content(context);
      await GeneratorUtils.writeFileWithLogging(targetPath, content, verbose, `Created ${section.fileName}`);
      created += 1;
    }

    return created;
  }

  private buildContext(repoStructure: RepoStructure): DocumentationContext {
    const directorySet = new Set<string>();

    repoStructure.directories.forEach(dir => {
      const [firstSegment] = dir.relativePath.split(/[\\/]/).filter(Boolean);
      if (firstSegment) {
        directorySet.add(firstSegment);
      }
    });

    const topLevelDirectories = Array.from(directorySet).sort();
    const directoryStats = topLevelDirectories.map(name => ({
      name,
      fileCount: repoStructure.files.filter(file => file.relativePath.startsWith(`${name}/`)).length
    }));
    const primaryLanguages = GeneratorUtils.getTopFileExtensions(repoStructure, 5)
      .filter(([ext]) => !!ext)
      .map(([extension, count]) => ({ extension, count }));

    return {
      repoStructure,
      topLevelDirectories,
      primaryLanguages,
      directoryStats
    };
  }

  private getDocSections(): DocSection[] {
    return [
      {
        fileName: 'README.md',
        content: context => this.buildIndex(context)
      },
      {
        fileName: 'project-overview.md',
        content: context => this.buildProjectOverview(context)
      },
      {
        fileName: 'architecture.md',
        content: context => this.buildArchitectureNotes(context)
      },
      {
        fileName: 'development-workflow.md',
        content: context => this.buildDevelopmentWorkflow(context)
      },
      {
        fileName: 'testing-strategy.md',
        content: context => this.buildTestingStrategy(context)
      }
    ];
  }


  private buildIndex(context: DocumentationContext): string {
    const directoryList = this.formatDirectoryList(context.topLevelDirectories);
    const frontMatter = this.createFrontMatter({
      id: 'docs-index',
      goal: 'Keep the documentation map accurate so contributors and agents land on the right guide quickly.',
      requiredInputs: [
        'Current docs and agents directory listings',
        'Recent additions or removals across documentation assets',
        'Latest roadmap or release summary (if available)'
      ],
      successCriteria: [
        'Each linked guide exists and reflects its stated purpose',
        'Repository snapshot matches the real top-level structure',
        'Update checklist is confirmed before closing the task'
      ],
      relatedAgents: ['documentation-writer', 'architect-specialist']
    });

    return `${frontMatter}
<!-- ai-task:docs-index -->
# Documentation Index

Welcome to the repository knowledge base. Start with the project overview, then dive into specific guides as needed.

## Core Guides
- [Project Overview](./project-overview.md)
- [Architecture Notes](./architecture.md)
- [Development Workflow](./development-workflow.md)
- [Testing Strategy](./testing-strategy.md)

## Repository Snapshot
${directoryList || '*Top-level directories will appear here once the repository contains subfolders.*'}

## Document Map
${this.buildDocumentMapTable()}

## AI Update Checklist
1. Gather context with \`git status -sb\` plus the latest commits touching \`docs/\` or \`agents/\`.
2. Compare the current directory tree against the table above; add or retire rows accordingly.
3. Update cross-links if guides moved or were renamed; keep anchor text concise.
4. Record sources consulted inside the commit or PR description for traceability.

## Acceptable Sources
- Repository tree and \`package.json\` scripts for canonical command names.
- Maintainer-approved issues, RFCs, or product briefs referenced in the repo.
- Release notes or changelog entries that announce documentation changes.

<!-- /ai-task -->
`;
  }

  private buildProjectOverview(context: DocumentationContext): string {
    const { repoStructure, topLevelDirectories, primaryLanguages } = context;
    const directoryList = this.formatDirectoryList(topLevelDirectories, true);
    const languageSummary = primaryLanguages.length > 0
      ? primaryLanguages.map(lang => `- ${lang.extension} (${lang.count} files)`).join('\n')
      : '- Language mix pending analysis.';
    const frontMatter = this.createFrontMatter({
      id: 'project-overview',
      goal: 'Explain why the project exists, who it serves, and how to get productive quickly.',
      requiredInputs: [
        'Latest product or roadmap brief',
        'README highlights and repository metadata',
        'List of stakeholders or domain experts for verification'
      ],
      successCriteria: [
        'Quick Facts mirror current tooling, stack, and entry points',
        'Directory map explains where primary capabilities live',
        'Next steps point to authoritative specs or dashboards'
      ],
      relatedAgents: ['documentation-writer', 'architect-specialist']
    });

    return `${frontMatter}
<!-- ai-task:project-overview -->
# Project Overview

> TODO: Summarize the problem this project solves and who benefits from it.

## Quick Facts
- Root path: \`${repoStructure.rootPath}\`
- Primary languages detected:
${languageSummary}

## Directory Map
${directoryList || '*Add a short description for each relevant directory.*'}

## Technology Signals
- Highlight frameworks, runtimes, state management patterns, data layers, and cross-service communication patterns detected in the repository.
- Note build tooling, linting, and formatting infrastructure they should be aware of.
- Call out external services (APIs, queues, cloud resources) and their integration points.

## Getting Started Checklist
1. Install dependencies with \`npm install\`.
2. Explore the CLI by running \`npm run dev\`.
3. Review [Development Workflow](./development-workflow.md) for day-to-day tasks.

## Next Steps
Capture product positioning, key stakeholders, and links to external documentation or product specs here.

## AI Update Checklist
1. Review roadmap items or issues labelled “release” to confirm current goals.
2. Cross-check Quick Facts against \`package.json\` and environment docs.
3. Refresh the Directory Map to reflect new or retired modules; keep guidance actionable.
4. Link critical dashboards, specs, or runbooks used by the team.
5. Flag any details that require human confirmation (e.g., stakeholder ownership).

## Acceptable Sources
- Recent commits, release notes, or ADRs describing high-level changes.
- Product requirement documents linked from this repository.
- Confirmed statements from maintainers or product leads.

<!-- /ai-task -->
`;
  }

  private buildArchitectureNotes(context: DocumentationContext): string {
    const defaultSections = [
      'System boundaries and integration points',
      'Primary modules and their responsibilities',
      'Data flow between major components',
      'Dependencies worth highlighting'
    ];

    const frontMatter = this.createFrontMatter({
      id: 'architecture-notes',
      goal: 'Describe how the system is assembled, key trade-offs, and active constraints.',
      requiredInputs: [
        'Recent architectural decisions or ADRs',
        'Observed service/module boundaries in the codebase',
        'Dependency graphs or build tooling insights'
      ],
      successCriteria: [
        'Decision list covers the most influential trade-offs',
        'Risks capture active constraints or technical debt',
        'Links to diagrams or monitors are up to date'
      ],
      relatedAgents: ['architect-specialist', 'backend-specialist']
    });

    const decisions = defaultSections.map(item => `- ${item}`).join('\n');

    return `${frontMatter}
<!-- ai-task:architecture-notes -->
# Architecture Notes

> TODO: Describe how the system is assembled and why the current design exists.

## Decisions To Record
${decisions}

## Diagrams
- Link architectural diagrams or add mermaid definitions here.

## Risks & Constraints
- Document performance constraints, scaling considerations, or external system assumptions.

## Top Directories Snapshot
${this.formatDirectoryStats(context.directoryStats)}

## AI Update Checklist
1. Review ADRs, design docs, or major PRs for architectural changes.
2. Verify that each documented decision still holds; mark superseded choices clearly.
3. Capture upstream/downstream impacts (APIs, events, data flows).
4. Update Risks & Constraints with active incident learnings or TODO debt.
5. Link any new diagrams or dashboards referenced in recent work.

## Acceptable Sources
- ADR folders, \`/docs/architecture\` notes, or RFC threads.
- Dependency visualisations from build tooling or scripts.
- Issue tracker discussions vetted by maintainers.

## Related Resources
- [Project Overview](./project-overview.md)
- Update [agents/README.md](../agents/README.md) when architecture changes.

<!-- /ai-task -->
`;
  }

  private buildDevelopmentWorkflow(_context: DocumentationContext): string {
    const frontMatter = this.createFrontMatter({
      id: 'development-workflow',
      goal: 'Document how the team builds, reviews, and ships code every day.',
      requiredInputs: [
        'Branching and release policies',
        'Package.json scripts and CI workflows',
        'Code review expectations agreed upon by the team'
      ],
      successCriteria: [
        'Branching guidance mirrors the default git strategy or CI configuration',
        'Local development commands are copy/paste ready',
        'Onboarding links point to living sources (boards, runbooks)'
      ],
      relatedAgents: ['documentation-writer', 'code-reviewer']
    });

    return `${frontMatter}
<!-- ai-task:development-workflow -->
# Development Workflow

Outline the day-to-day engineering process for this repository.

## Branching & Releases
- Describe the branching model (e.g., trunk-based, Git Flow).
- Note release cadence and tagging conventions.

## Local Development
- Commands to install dependencies: \`npm install\`
- Run the CLI locally: \`npm run dev\`
- Build for distribution: \`npm run build\`

## Code Review Expectations
- Summarize review checklists and required approvals.
- Reference [AGENTS.md](../AGENTS.md) for agent collaboration tips.

## Onboarding Tasks
- Point newcomers to first issues or starter tickets.
- Link to internal runbooks or dashboards.

## AI Update Checklist
1. Confirm branching/release steps with CI configuration and recent tags.
2. Verify local commands against \`package.json\`; ensure flags and scripts still exist.
3. Capture review requirements (approvers, checks) from contributing docs or repository settings.
4. Refresh onboarding links (boards, dashboards) to their latest URLs.
5. Highlight any manual steps that should become automation follow-ups.

## Acceptable Sources
- CONTRIBUTING guidelines and \`AGENTS.md\`.
- Build pipelines, branch protection rules, or release scripts.
- Issue tracker boards used for onboarding or triage.

<!-- /ai-task -->
`;
  }

  private buildTestingStrategy(_context: DocumentationContext): string {
    const frontMatter = this.createFrontMatter({
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

  private formatDirectoryList(topLevelDirectories: string[], includePlaceholders: boolean = false): string {
    if (topLevelDirectories.length === 0) {
      return '';
    }

    const knownDescriptions: Record<string, string> = {
      src: 'TypeScript source files and CLI entrypoints.',
      dist: 'Compiled JavaScript output generated by the build step.',
      docs: 'Living documentation produced by this tool.',
      agents: 'AI agent playbooks and prompts.',
      tests: 'Automated tests and fixtures.',
      packages: 'Workspace packages or modules.'
    };

    return topLevelDirectories.map(dir => {
      const description = knownDescriptions[dir];
      if (description) {
        return `- \`${dir}/\` — ${description}`;
      }

      if (!includePlaceholders) {
        return `- \`${dir}/\``;
      }

      const slotId = this.slugify(dir);
      return `- <!-- ai-slot:directory-${slotId} -->\`${dir}/\` — TODO: Describe the purpose of this directory.<!-- /ai-slot -->`;
    }).join('\n');
  }

  private buildDocumentMapTable(): string {
    const rows = this.guides.map(meta => `| ${meta.title} | \`${meta.file}\` | ${meta.marker} | ${meta.primaryInputs} |`);
    return ['| Guide | File | Task Marker | Primary Inputs |', '| --- | --- | --- | --- |', ...rows].join('\n');
  }

  private createFrontMatter(config: FrontMatterConfig): string {
    const lines: string[] = ['---'];
    lines.push(`id: ${config.id}`);
    lines.push(`ai_update_goal: "${this.escapeYaml(config.goal)}"`);
    lines.push('required_inputs:');
    config.requiredInputs.forEach(item => {
      lines.push(`  - "${this.escapeYaml(item)}"`);
    });
    lines.push('success_criteria:');
    config.successCriteria.forEach(item => {
      lines.push(`  - "${this.escapeYaml(item)}"`);
    });
    if (config.relatedAgents && config.relatedAgents.length > 0) {
      lines.push('related_agents:');
      config.relatedAgents.forEach(agent => {
        lines.push(`  - "${this.escapeYaml(agent)}"`);
      });
    }
    lines.push('---\n');
    return lines.join('\n');
  }

  private escapeYaml(value: string): string {
    return value.replace(/"/g, '\\"');
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private formatDirectoryStats(stats: Array<{ name: string; fileCount: number }>): string {
    if (!stats.length) {
      return '*No directories detected.*';
    }

    return stats
      .map(stat => `- \`${stat.name}/\` — approximately ${stat.fileCount} files`)
      .join('\n');
  }
}
