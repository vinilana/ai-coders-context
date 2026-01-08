import { tool } from 'ai';
import { glob } from 'glob';
import { ListFilesInputSchema, type ListFilesInput } from '../schemas';

export const listFilesTool = tool({
  description: 'List files matching a glob pattern in the repository',
  inputSchema: ListFilesInputSchema,
  execute: async (input: ListFilesInput) => {
    const { pattern, cwd, ignore } = input;
    try {
      const files = await glob(pattern, {
        cwd: cwd || process.cwd(),
        ignore: ignore || ['node_modules/**', '.git/**', 'dist/**'],
        absolute: false
      });
      return {
        success: true,
        files,
        count: files.length,
        pattern
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
