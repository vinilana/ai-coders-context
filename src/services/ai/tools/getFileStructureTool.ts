import { tool } from 'ai';
import { FileMapper } from '../../../utils/fileMapper';
import { GetFileStructureInputSchema, type GetFileStructureInput } from '../schemas';

export const getFileStructureTool = tool({
  description: 'Get the directory structure and file listing of a repository',
  inputSchema: GetFileStructureInputSchema,
  execute: async (input: GetFileStructureInput) => {
    const { rootPath, maxDepth = 3, includePatterns } = input;
    try {
      const mapper = new FileMapper([]);
      const structure = await mapper.mapRepository(rootPath, includePatterns || undefined);

      // Filter files by depth
      const filterByDepth = (relativePath: string): boolean => {
        const depth = relativePath.split('/').length;
        return depth <= maxDepth;
      };

      return {
        success: true,
        rootPath: structure.rootPath,
        totalFiles: structure.totalFiles,
        totalSize: structure.totalSize,
        topLevelDirs: structure.topLevelDirectoryStats.map((s) => ({
          name: s.name,
          fileCount: s.fileCount
        })),
        files: structure.files
          .filter((f) => filterByDepth(f.relativePath))
          .slice(0, 200)
          .map((f) => ({
            path: f.relativePath,
            extension: f.extension,
            size: f.size
          }))
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        rootPath
      };
    }
  }
});
