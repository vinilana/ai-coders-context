import { tool } from 'ai';
import { glob } from 'glob';
import * as fs from 'fs-extra';
import * as path from 'path';
import { SearchCodeInputSchema, type SearchCodeInput } from '../schemas';

export const searchCodeTool = tool({
  description: 'Search for code patterns across files in the repository',
  inputSchema: SearchCodeInputSchema,
  execute: async (input: SearchCodeInput) => {
    const { pattern, fileGlob, maxResults = 50 } = input;
    try {
      const files = await glob(fileGlob || '**/*.{ts,tsx,js,jsx,py,go,rs,java}', {
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
        absolute: true
      });

      const regex = new RegExp(pattern, 'gm');
      const matches: Array<{
        file: string;
        line: number;
        match: string;
        context: string;
      }> = [];

      for (const file of files) {
        if (matches.length >= maxResults) break;

        try {
          const content = await fs.readFile(file, 'utf-8');
          const lines = content.split('\n');

          for (let i = 0; i < lines.length && matches.length < maxResults; i++) {
            if (regex.test(lines[i])) {
              matches.push({
                file: path.relative(process.cwd(), file),
                line: i + 1,
                match: lines[i].trim().slice(0, 200),
                context: lines
                  .slice(Math.max(0, i - 1), i + 2)
                  .join('\n')
                  .slice(0, 500)
              });
            }
            regex.lastIndex = 0; // Reset regex state
          }
        } catch {
          // Skip unreadable files
        }
      }

      return {
        success: true,
        pattern,
        matches,
        totalMatches: matches.length,
        truncated: matches.length >= maxResults
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        pattern
      };
    }
  }
});
