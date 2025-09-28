import * as path from 'path';
import * as fs from 'fs-extra';

import { UPDATE_PLAN_PROMPT_FALLBACK, UPDATE_SCAFFOLD_PROMPT_FALLBACK } from '../prompts/defaults';

type FileSystem = typeof fs;

export type PromptSource = 'custom' | 'package' | 'builtin';

export interface PromptResolution {
  content: string;
  source: PromptSource;
  path?: string;
}

interface ResolvePromptOptions {
  customPath?: string;
  fallbackFileName: string;
  fallbackContent: string;
  missingCustomPromptMessage: (resolvedPath: string) => string;
  fsModule?: FileSystem;
}

async function resolvePrompt({
  customPath,
  fallbackFileName,
  fallbackContent,
  missingCustomPromptMessage,
  fsModule
}: ResolvePromptOptions): Promise<PromptResolution> {
  const fileSystem = fsModule ?? fs;

  if (customPath) {
    const resolvedCustomPath = path.resolve(customPath);

    if (!(await fileSystem.pathExists(resolvedCustomPath))) {
      throw new Error(missingCustomPromptMessage(resolvedCustomPath));
    }

    const content = await fileSystem.readFile(resolvedCustomPath, 'utf-8');
    return { content, source: 'custom', path: resolvedCustomPath };
  }

  const candidatePaths = [
    path.resolve(__dirname, '../../prompts', fallbackFileName),
    path.resolve(__dirname, '../prompts', fallbackFileName)
  ];

  for (const candidatePath of candidatePaths) {
    if (await fileSystem.pathExists(candidatePath)) {
      const content = await fileSystem.readFile(candidatePath, 'utf-8');
      return { content, source: 'package', path: candidatePath };
    }
  }

  return { content: fallbackContent, source: 'builtin' };
}

export function resolveScaffoldPrompt(
  customPath: string | undefined,
  missingCustomPromptMessage: (resolvedPath: string) => string,
  fsModule?: FileSystem
): Promise<PromptResolution> {
  return resolvePrompt({
    customPath,
    fallbackFileName: 'update_scaffold_prompt.md',
    fallbackContent: UPDATE_SCAFFOLD_PROMPT_FALLBACK,
    missingCustomPromptMessage,
    fsModule
  });
}

export function resolvePlanPrompt(
  customPath: string | undefined,
  missingCustomPromptMessage: (resolvedPath: string) => string,
  fsModule?: FileSystem
): Promise<PromptResolution> {
  return resolvePrompt({
    customPath,
    fallbackFileName: 'update_plan_prompt.md',
    fallbackContent: UPDATE_PLAN_PROMPT_FALLBACK,
    missingCustomPromptMessage,
    fsModule
  });
}
