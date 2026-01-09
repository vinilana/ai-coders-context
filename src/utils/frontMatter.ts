/**
 * YAML Front Matter utilities for status detection
 *
 * Allows instant detection of unfilled files by reading only the first line.
 */

import * as fs from 'fs/promises';
import { createReadStream } from 'fs';
import * as readline from 'readline';

export interface FrontMatter {
  status?: 'unfilled' | 'filled';
  generated?: string;
  [key: string]: string | undefined;
}

const FRONT_MATTER_DELIMITER = '---';

/**
 * Check if a file needs to be filled by reading only the first few lines.
 * Much faster than reading entire file content.
 */
export async function needsFill(filePath: string): Promise<boolean> {
  try {
    const firstLines = await readFirstLines(filePath, 3);
    return firstLines.some(line => line.includes('status: unfilled'));
  } catch {
    return false;
  }
}

/**
 * Read only the first N lines of a file efficiently
 */
async function readFirstLines(filePath: string, n: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const lines: string[] = [];
    const rl = readline.createInterface({
      input: createReadStream(filePath),
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      lines.push(line);
      if (lines.length >= n) {
        rl.close();
      }
    });

    rl.on('close', () => resolve(lines));
    rl.on('error', reject);
  });
}

/**
 * Parse YAML front matter from content string
 */
export function parseFrontMatter(content: string): { frontMatter: FrontMatter | null; body: string } {
  const lines = content.split('\n');

  if (lines[0]?.trim() !== FRONT_MATTER_DELIMITER) {
    return { frontMatter: null, body: content };
  }

  const endIndex = lines.findIndex((line, i) => i > 0 && line.trim() === FRONT_MATTER_DELIMITER);

  if (endIndex === -1) {
    return { frontMatter: null, body: content };
  }

  const frontMatterLines = lines.slice(1, endIndex);
  const frontMatter: FrontMatter = {};

  for (const line of frontMatterLines) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      frontMatter[match[1]] = match[2].trim();
    }
  }

  const body = lines.slice(endIndex + 1).join('\n').replace(/^\n+/, '');

  return { frontMatter, body };
}

/**
 * Add front matter to content
 */
export function addFrontMatter(content: string, frontMatter: FrontMatter): string {
  const lines = [FRONT_MATTER_DELIMITER];

  for (const [key, value] of Object.entries(frontMatter)) {
    if (value !== undefined) {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push(FRONT_MATTER_DELIMITER);
  lines.push('');

  return lines.join('\n') + content;
}

/**
 * Remove front matter from content (used after filling)
 */
export function removeFrontMatter(content: string): string {
  const { body } = parseFrontMatter(content);
  return body;
}

/**
 * Check if content has front matter
 */
export function hasFrontMatter(content: string): boolean {
  return content.trimStart().startsWith(FRONT_MATTER_DELIMITER);
}

/**
 * Create standard unfilled front matter
 */
export function createUnfilledFrontMatter(): FrontMatter {
  return {
    status: 'unfilled',
    generated: new Date().toISOString().split('T')[0]
  };
}

/**
 * Get all unfilled files in a directory
 */
export async function getUnfilledFiles(contextDir: string): Promise<string[]> {
  const { glob } = await import('glob');
  const files = await glob(`${contextDir}/**/*.md`);

  const results = await Promise.all(
    files.map(async (file) => ({
      file,
      unfilled: await needsFill(file)
    }))
  );

  return results.filter(r => r.unfilled).map(r => r.file);
}

/**
 * Count filled vs unfilled files
 */
export async function getFilledStats(contextDir: string): Promise<{
  total: number;
  filled: number;
  unfilled: number;
  files: { path: string; filled: boolean }[];
}> {
  const { glob } = await import('glob');
  const files = await glob(`${contextDir}/**/*.md`);

  const results = await Promise.all(
    files.map(async (file) => ({
      path: file,
      filled: !(await needsFill(file))
    }))
  );

  return {
    total: results.length,
    filled: results.filter(r => r.filled).length,
    unfilled: results.filter(r => !r.filled).length,
    files: results
  };
}
