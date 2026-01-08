import * as fs from 'fs';
import * as path from 'path';
import type { SmartDefaults } from './types';
import type { AIProvider } from '../../types';
import {
  detectProviderFromEnv,
  getApiKeyFromEnv,
  getModelFromEnv,
  DEFAULT_MODELS
} from '../../services/ai/providerFactory';

/**
 * Detects smart defaults from environment and project structure
 */
export async function detectSmartDefaults(basePath?: string): Promise<SmartDefaults> {
  const repoPath = basePath || process.cwd();
  const outputDir = path.resolve(repoPath, '.context');

  // Detect provider from environment
  const provider = detectProviderFromEnv() ?? undefined;
  const apiKeyConfigured = provider ? !!getApiKeyFromEnv(provider) : false;
  const model = provider ? (getModelFromEnv(provider) ?? DEFAULT_MODELS[provider]) : undefined;

  // Check if scaffold exists
  const scaffoldExists = fs.existsSync(outputDir);

  // Detect languages from project files
  const detectedLanguages = await detectProjectLanguages(repoPath);

  return {
    repoPath,
    outputDir,
    provider,
    model,
    apiKeyConfigured,
    scaffoldExists,
    detectedLanguages
  };
}

/**
 * Detects programming languages used in the project
 */
async function detectProjectLanguages(repoPath: string): Promise<string[]> {
  const languages: string[] = [];

  // Check for TypeScript
  if (
    fs.existsSync(path.join(repoPath, 'tsconfig.json')) ||
    fs.existsSync(path.join(repoPath, 'tsconfig.base.json'))
  ) {
    languages.push('typescript');
  }

  // Check for JavaScript (package.json without TypeScript)
  if (fs.existsSync(path.join(repoPath, 'package.json')) && !languages.includes('typescript')) {
    languages.push('javascript');
  }

  // Check for Python
  if (
    fs.existsSync(path.join(repoPath, 'pyproject.toml')) ||
    fs.existsSync(path.join(repoPath, 'setup.py')) ||
    fs.existsSync(path.join(repoPath, 'requirements.txt'))
  ) {
    languages.push('python');
  }

  // Default to common languages if none detected
  if (languages.length === 0) {
    return ['typescript', 'javascript'];
  }

  return languages;
}

/**
 * Gets the list of configured providers from environment
 */
export function getConfiguredProviders(): AIProvider[] {
  const providers: AIProvider[] = ['openrouter', 'openai', 'anthropic', 'google'];
  return providers.filter((p) => !!getApiKeyFromEnv(p));
}

/**
 * Checks if any LLM provider is configured
 */
export function hasAnyProviderConfigured(): boolean {
  return getConfiguredProviders().length > 0;
}
