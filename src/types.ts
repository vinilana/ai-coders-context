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
  estimatedCost: number;
  model: string;
}
