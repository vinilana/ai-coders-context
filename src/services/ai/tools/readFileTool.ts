import { tool } from 'ai';
import * as fs from 'fs-extra';
import { ReadFileInputSchema, type ReadFileInput } from '../schemas';

export const readFileTool = tool({
  description: 'Read the contents of a file from the filesystem',
  inputSchema: ReadFileInputSchema,
  execute: async (input: ReadFileInput) => {
    const { filePath, encoding = 'utf-8' } = input;
    try {
      const content = await fs.readFile(filePath, encoding as BufferEncoding);
      return {
        success: true,
        content,
        path: filePath,
        size: content.length
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        path: filePath
      };
    }
  }
});
