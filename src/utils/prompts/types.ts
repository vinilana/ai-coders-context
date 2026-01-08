import type { AIProvider } from '../../types';

export type InteractiveMode = 'quick' | 'advanced';

export interface LLMPromptResult {
  provider: AIProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  autoDetected: boolean;
}

export interface PathsPromptResult {
  repoPath: string;
  outputDir: string;
}

export interface SmartDefaults {
  repoPath: string;
  outputDir: string;
  provider?: AIProvider;
  model?: string;
  apiKeyConfigured: boolean;
  scaffoldExists: boolean;
  detectedLanguages: string[];
}

export interface ConfigSummary {
  operation: 'fill' | 'plan' | 'sync';
  repoPath?: string;
  outputDir?: string;
  provider?: string;
  model?: string;
  apiKeySource?: 'env' | 'provided' | 'none';
  options?: Record<string, string | boolean | string[]>;
}

export interface AnalysisOptions {
  semantic: boolean;
  languages?: string[];
  useLsp: boolean;
  verbose: boolean;
}
