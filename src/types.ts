export interface FileInfo {
  path: string;
  relativePath: string;
  extension: string;
  size: number;
  content?: string;
  type: 'file' | 'directory';
}

export interface TopLevelDirectoryStats {
  name: string;
  fileCount: number;
  totalSize: number;
}

export interface RepoStructure {
  rootPath: string;
  files: FileInfo[];
  directories: FileInfo[];
  totalFiles: number;
  totalSize: number;
  topLevelDirectoryStats: TopLevelDirectoryStats[];
}

export interface DocumentationReference {
  title: string;
  path: string;
  description?: string;
}

export interface AgentReference {
  name: string;
  path: string;
  description?: string;
}

export interface AgentIndexEntry {
  id: string;
  name: string;
  primaryResponsibility: string;
  playbookPath: string;
  description: string;
}

export interface AgentIndexDocument {
  generatedAt: string;
  summary: string;
  instructions: string[];
  agents: AgentIndexEntry[];
  updateChecklist: string[];
  recommendedSources: string[];
}

export interface AgentResource {
  title: string;
  path: string;
  description?: string;
}

export interface AgentTouchpoint {
  title: string;
  path: string;
  description: string;
}

export interface AgentTroubleshootingGuide {
  issue: string;
  symptoms: string[];
  rootCause: string;
  resolutionSteps: string[];
  prevention: string[];
}

export interface AgentSuccessMetrics {
  codeQuality: string[];
  velocity: string[];
  documentation: string[];
  collaboration: string[];
  targetMetrics: string[];
}

export interface AgentPlaybook {
  id: string;
  name: string;
  role: string;
  mission: string;
  responsibilities: string[];
  bestPractices: string[];
  resources: AgentResource[];
  startingPoints: string[];
  touchpoints: AgentTouchpoint[];
  collaborationChecklist: string[];
  successMetrics: AgentSuccessMetrics;
  troubleshooting: AgentTroubleshootingGuide[];
  handoffNotes: string[];
  evidenceToCapture: string[];
  notes: string[];
  generatedAt: string;
}

export type TestScenarioPriority = 'P0' | 'P1' | 'P2';

export type AutomationStatus = 'manual' | 'automated' | 'mixed';

export interface TestScenario {
  scenarioId: string;
  title: string;
  userStory: string;
  preconditions: string[];
  steps: string[];
  expectedResults: string[];
  priority: TestScenarioPriority;
  automationStatus: AutomationStatus;
  relatedFiles: string[];
  notes: string[];
  testData: {
    fixtures: string[];
    mocks: string[];
    datasets: string[];
  };
}

export interface ScenarioCollection {
  summary: string;
  scenarios: TestScenario[];
}

export interface TestAreaPlan {
  id: string;
  name: string;
  relativePath: string;
  description: string;
  coverage: {
    frontend: ScenarioCollection;
    backend: ScenarioCollection;
  };
  testDataNeeds: {
    fixtures: string[];
    mocks: string[];
    datasets: string[];
  };
  updateChecklist: string[];
  recommendedSources: string[];
}

export interface TestPlanDocument {
  repository: {
    id: string;
    name: string;
    rootPath: string;
    generatedAt: string;
  };
  areas: TestAreaPlan[];
  testDataGuidance: {
    fixtures: string[];
    mocks: string[];
    datasets: string[];
    notes: string[];
  };
  checklists: {
    maintenance: string[];
    planning: string[];
  };
  recommendedSources: string[];
}

export interface RepositoryContextSummary {
  id: string;
  name: string;
  rootPath: string;
  generatedAt: string;
  stats: {
    totalFiles: number;
    totalSize: number;
    sizeHuman: string;
    primaryLanguages: Array<{ extension: string; count: number }>;
  };
  documentation: {
    index: string;
    guides: DocumentationReference[];
  };
  agents: {
    index: string;
    playbooks: AgentReference[];
  };
  testPlan: {
    path: string;
    areas: Array<{
      id: string;
      name: string;
      frontendScenarioCount: number;
      backendScenarioCount: number;
    }>;
  };
}

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface LLMConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  provider: 'openrouter';
}

export interface CLIOptions {
  repoPath: string;
  outputDir?: string;
  model?: string;
  apiKey?: string;
  provider?: LLMConfig['provider'];
  exclude?: string[];
  include?: string[];
  verbose?: boolean;
  since?: string;
  staged?: boolean;
  force?: boolean;
}

export interface AgentPrompt {
  name: string;
  description: string;
  systemPrompt: string;
  context: string;
  examples?: string[];
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface UsageStats {
  totalCalls: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  model: string;
}
