import * as path from 'path';

import { GeneratorUtils } from '../shared/generatorUtils';
import type {
  AgentReference,
  DocumentationReference,
  RepositoryContextSummary,
  RepoStructure,
  FileInfo,
  TestPlanDocument,
  TestAreaPlan,
  ScenarioCollection,
  TestScenario
} from '../../types';
import type { DocumentationTemplateContext, GuideMeta } from './templates/types';
import { AGENT_TYPES } from '../agents/agentTypes';

interface JsonContextGeneratorOptions {
  documentationContext: DocumentationTemplateContext;
  outputDir: string;
  verbose?: boolean;
}

type CoverageKind = 'frontend' | 'backend';

export class JsonContextGenerator {
  async generate(options: JsonContextGeneratorOptions): Promise<void> {
    const { documentationContext, outputDir, verbose = false } = options;
    const generatedAt = GeneratorUtils.createTimestamp();

    await GeneratorUtils.ensureDirectoryAndLog(outputDir, verbose, 'Preparing JSON context in');

    const testPlan = this.buildTestPlan(documentationContext, generatedAt);

    await this.writeRepositorySummary({
      documentationContext,
      testPlan,
      outputDir,
      generatedAt,
      verbose
    });

    await this.writeTestPlan(outputDir, testPlan, verbose);
  }

  private async writeRepositorySummary(params: {
    documentationContext: DocumentationTemplateContext;
    testPlan: TestPlanDocument;
    outputDir: string;
    generatedAt: string;
    verbose: boolean;
  }): Promise<void> {
    const { documentationContext, testPlan, outputDir, generatedAt, verbose } = params;
    const { repoStructure, guides } = documentationContext;

    const repoName = path.basename(repoStructure.rootPath) || 'repository';

    const repositorySummary: RepositoryContextSummary = {
      id: this.createSlug(repoName),
      name: repoName,
      rootPath: repoStructure.rootPath,
      generatedAt,
      stats: {
        totalFiles: repoStructure.totalFiles,
        totalSize: repoStructure.totalSize,
        sizeHuman: GeneratorUtils.formatBytes(repoStructure.totalSize),
        primaryLanguages: documentationContext.primaryLanguages
      },
      documentation: {
        index: './docs/README.md',
        guides: this.buildDocumentationReferences(guides, './docs')
      },
      agents: {
        index: './agents/README.md',
        playbooks: this.buildAgentReferences('./agents')
      },
      testPlan: {
        path: './test-plan.json',
        areas: testPlan.areas.map(area => ({
          id: area.id,
          name: area.name,
          frontendScenarioCount: area.coverage.frontend.scenarios.length,
          backendScenarioCount: area.coverage.backend.scenarios.length
        }))
      }
    };

    const targetPath = path.join(outputDir, 'context.json');
    await GeneratorUtils.writeFileWithLogging(
      targetPath,
      this.stringify(repositorySummary),
      verbose,
      'Created context.json'
    );
  }

  private async writeTestPlan(outputDir: string, testPlan: TestPlanDocument, verbose: boolean): Promise<void> {
    const targetPath = path.join(outputDir, 'test-plan.json');
    await GeneratorUtils.writeFileWithLogging(
      targetPath,
      this.stringify(testPlan),
      verbose,
      'Created test-plan.json'
    );
  }

  private buildTestPlan(
    documentationContext: DocumentationTemplateContext,
    generatedAt: string
  ): TestPlanDocument {
    const { repoStructure, directoryStats } = documentationContext;
    const repoName = path.basename(repoStructure.rootPath) || 'repository';
    const repositoryId = this.createSlug(repoName);

    const areas: TestAreaPlan[] = (directoryStats.length
      ? directoryStats
      : [{ name: '.', fileCount: 0, totalSize: 0 }]
    ).map(stat =>
      this.createAreaPlan({
        repoStructure,
        directoryName: stat.name,
        fileCount: stat.fileCount,
        totalSize: stat.totalSize
      })
    );

    return {
      repository: {
        id: repositoryId,
        name: repoName,
        rootPath: repoStructure.rootPath,
        generatedAt
      },
      areas,
      testDataGuidance: {
        fixtures: [
          'TODO: Maintain canonical fixtures for high-priority scenarios.',
          'TODO: Version shared fixtures so teams can coordinate updates.'
        ],
        mocks: [
          'TODO: Document reusable mocks or stubs for external integrations.',
          'TODO: Record contracts that mocks must satisfy to remain valid.'
        ],
        datasets: [
          'TODO: Track sample datasets mirroring production behaviour.',
          'TODO: Refresh datasets whenever schemas or API responses change.'
        ],
        notes: [
          'Keep this guidance aligned with the testing strategy documented in `.context/docs/testing-strategy.md`.',
          'Share updates with QA and engineering leads after major releases.'
        ]
      },
      checklists: {
        maintenance: [
          'Verify scenario priorities align with the roadmap each sprint.',
          'Ensure automationStatus reflects the implemented coverage.',
          'Archive scenarios when their corresponding features are deprecated.'
        ],
        planning: [
          'Identify P0 scenarios before starting a new epic.',
          'Pair each scenario with acceptance criteria and owners.',
          'Link scenarios to tracking tickets for traceability.'
        ]
      },
      recommendedSources: [
        'Product requirements, RFCs, or user stories describing the feature set.',
        'Existing Jest or integration tests covering similar behaviour.',
        'Observability dashboards or incident reports highlighting regressions.',
        'Team retrospectives or postmortems exposing gaps in test coverage.'
      ]
    };
  }

  private createAreaPlan(params: {
    repoStructure: RepoStructure;
    directoryName: string;
    fileCount: number;
    totalSize: number;
  }): TestAreaPlan {
    const { repoStructure, directoryName } = params;
    const areaId = this.createSlug(directoryName || 'root');
    const areaLabel = directoryName ? `${directoryName}/` : './';
    const filesInArea = this.getFilesForArea(repoStructure, directoryName);
    const representativeFiles = this.collectRepresentativeFiles(filesInArea);

    return {
      id: areaId,
      name: areaLabel,
      relativePath: areaLabel,
      description: `TODO: Summarize the behaviours covered by \`${areaLabel}\` and how this area contributes to the product.`,
      coverage: {
        frontend: this.buildScenarioCollection(areaId, areaLabel, 'frontend', representativeFiles),
        backend: this.buildScenarioCollection(areaId, areaLabel, 'backend', representativeFiles)
      },
      testDataNeeds: {
        fixtures: [
          `TODO: Identify fixtures required to test flows in \`${areaLabel}\`.`,
          'TODO: Share ownership for keeping these fixtures current.'
        ],
        mocks: [
          `TODO: Document mocks or stubs needed when exercising \`${areaLabel}\`.`
        ],
        datasets: [
          `TODO: Outline dataset samples that represent edge cases for \`${areaLabel}\`.`
        ]
      },
      updateChecklist: [
        'Review scenario user stories after major roadmap updates.',
        `Ensure relatedFiles stay in sync with the contents of \`${areaLabel}\`.`,
        'Confirm automationStatus reflects implemented tests before releases.'
      ],
      recommendedSources: [
        `Inspect recent commits affecting \`${areaLabel}\` for new behaviours.`,
        'Reference CONTRIBUTING.md and testing-strategy guides for expectations.',
        'Sync with QA or product leads to validate acceptance criteria.'
      ]
    };
  }

  private buildScenarioCollection(
    areaId: string,
    areaLabel: string,
    coverage: CoverageKind,
    representativeFiles: string[]
  ): ScenarioCollection {
    const summary =
      coverage === 'frontend'
        ? `TODO: Outline the UI or experience flows tied to \`${areaLabel}\`.`
        : `TODO: Capture the service, API, or data processing responsibilities of \`${areaLabel}\`.`;

    return {
      summary,
      scenarios: [this.buildScenario(areaId, areaLabel, coverage, representativeFiles)]
    };
  }

  private buildScenario(
    areaId: string,
    areaLabel: string,
    coverage: CoverageKind,
    representativeFiles: string[]
  ): TestScenario {
    const prefix = coverage === 'frontend' ? 'FE' : 'BE';
    const scenarioId = `${(areaId || 'area').toUpperCase()}-${prefix}-001`;
    const relatedFiles = representativeFiles.slice(0, 5);

    return {
      scenarioId,
      title: `TODO: Define the ${coverage} behaviour to validate within \`${areaLabel}\`.`,
      userStory: 'TODO: As a <role>, I want <goal> so that <benefit>.',
      preconditions: [
        'TODO: Given the system state or configuration required before executing the test.',
        'TODO: And any data, authentication, or environment prerequisites.'
      ],
      steps: [
        'TODO: When the actor performs the primary action.',
        'TODO: And include any alternative or edge-case paths.'
      ],
      expectedResults: [
        'TODO: Then capture the observable outcomes that must pass.',
        'TODO: And record any side effects, events, or telemetry to assert.'
      ],
      priority: 'P1',
      automationStatus: 'manual',
      relatedFiles: relatedFiles.length
        ? relatedFiles
        : [`TODO: Identify code entry points inside \`${areaLabel}\` that this scenario exercises.`],
      notes: [
        `Use this scenario to drive ${coverage} TDD for \`${areaLabel}\`.`,
        'TODO: Capture open questions, risks, or follow-up tasks.'
      ],
      testData: {
        fixtures: [
          'TODO: List fixtures or builders required for this scenario.'
        ],
        mocks: [
          'TODO: Record mocks, stubs, or fakes that isolate dependencies.'
        ],
        datasets: [
          'TODO: Reference datasets or payloads needed to validate outcomes.'
        ]
      }
    };
  }

  private collectRepresentativeFiles(files: FileInfo[]): string[] {
    const seen = new Set<string>();
    const related: string[] = [];

    for (const file of files) {
      if (file.type !== 'file') {
        continue;
      }

      if (!seen.has(file.relativePath)) {
        seen.add(file.relativePath);
        related.push(file.relativePath);
      }

      if (related.length >= 5) {
        break;
      }
    }

    return related;
  }

  private getFilesForArea(repoStructure: RepoStructure, directoryName: string): FileInfo[] {
    if (!directoryName || directoryName === '.') {
      return repoStructure.files;
    }

    const prefix = `${directoryName.replace(/\\/g, '/')}/`;
    return repoStructure.files.filter(file => file.relativePath.startsWith(prefix));
  }

  private buildDocumentationReferences(guides: GuideMeta[], basePath: string): DocumentationReference[] {
    return guides.map(guide => ({
      title: guide.title,
      path: `${basePath}/${guide.file}`,
      description: guide.primaryInputs
    }));
  }

  private buildAgentReferences(basePath: string): AgentReference[] {
    const preferredAgents: Array<{ type: string; description: string }> = [
      { type: 'documentation-writer', description: 'Maintains documentation scaffolds and Markdown guides.' },
      { type: 'architect-specialist', description: 'Explains architectural decisions and design patterns.' },
      { type: 'feature-developer', description: 'Implements new capabilities across multiple modules.' }
    ];

    const allowedAgents = new Set(AGENT_TYPES);

    return preferredAgents
      .filter(agent => allowedAgents.has(agent.type as typeof AGENT_TYPES[number]))
      .map(agent => ({
        name: this.formatAgentName(agent.type),
        path: `${basePath}/${agent.type}.json`,
        description: agent.description
      }));
  }

  private stringify(value: unknown): string {
    return `${JSON.stringify(value, null, 2)}\n`;
  }

  private formatAgentName(agentType: string): string {
    return agentType
      .split('-')
      .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  private createSlug(value: string): string {
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return normalized || 'feature';
  }
}
