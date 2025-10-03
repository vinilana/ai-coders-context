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

export interface FeatureComponentSummary {
  name: string;
  path: string;
  type: 'file' | 'directory';
  summary: string;
}

export interface FeatureContext {
  id: string;
  name: string;
  type: 'directory' | 'file';
  relativePath: string;
  description: string;
  keyComponents: FeatureComponentSummary[];
  stats: {
    fileCount: number;
    totalSize: number;
    sizeHuman: string;
    primaryExtensions: Array<{ extension: string; count: number }>;
  };
  architecture: {
    patterns: string[];
    notes: string[];
  };
  dataFlows: Array<{
    source: string;
    target: string;
    description: string;
  }>;
  references: {
    documentation: DocumentationReference[];
    agents: AgentReference[];
  };
  updateChecklist: string[];
  recommendedSources: string[];
  generatedAt: string;
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
  features: Array<{
    id: string;
    name: string;
    contextPath: string;
  }>;
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
