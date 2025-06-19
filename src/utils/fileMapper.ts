import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { FileInfo, RepoStructure } from '../types';

export class FileMapper {
  private excludePatterns: string[] = [
    'node_modules/**',
    '.git/**',
    'dist/**',
    'build/**',
    '*.log',
    '.env*',
    '*.tmp',
    '**/.DS_Store'
  ];

  constructor(private customExcludes: string[] = []) {
    this.excludePatterns = [...this.excludePatterns, ...customExcludes];
  }

  async mapRepository(repoPath: string, includePatterns?: string[]): Promise<RepoStructure> {
    const absolutePath = path.resolve(repoPath);
    
    if (!await fs.pathExists(absolutePath)) {
      throw new Error(`Repository path does not exist: ${absolutePath}`);
    }

    const patterns = includePatterns || ['**/*'];
    const allFiles: string[] = [];

    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: absolutePath,
        ignore: this.excludePatterns,
        dot: false,
        absolute: false
      });
      allFiles.push(...files);
    }

    const uniqueFiles = [...new Set(allFiles)];
    const fileInfos: FileInfo[] = [];
    const directories: FileInfo[] = [];
    let totalSize = 0;

    for (const file of uniqueFiles) {
      const fullPath = path.join(absolutePath, file);
      const stats = await fs.stat(fullPath);
      
      const fileInfo: FileInfo = {
        path: fullPath,
        relativePath: file,
        extension: path.extname(file),
        size: stats.size,
        type: stats.isDirectory() ? 'directory' : 'file'
      };

      if (stats.isDirectory()) {
        directories.push(fileInfo);
      } else {
        fileInfos.push(fileInfo);
        totalSize += stats.size;
      }
    }

    return {
      rootPath: absolutePath,
      files: fileInfos,
      directories,
      totalFiles: fileInfos.length,
      totalSize
    };
  }

  async readFileContent(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      return `Error reading file: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  getFilesByExtension(files: FileInfo[], extension: string): FileInfo[] {
    return files.filter(file => file.extension === extension);
  }

  isTextFile(filePath: string): boolean {
    const textExtensions = [
      '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h',
      '.css', '.scss', '.sass', '.html', '.xml', '.json', '.yaml', '.yml',
      '.md', '.txt', '.sql', '.sh', '.bat', '.ps1', '.php', '.rb', '.go',
      '.rs', '.swift', '.kt', '.scala', '.r', '.m', '.pl', '.lua', '.vim',
      '.dockerfile', '.gitignore', '.env'
    ];
    
    const ext = path.extname(filePath).toLowerCase();
    return textExtensions.includes(ext) || !ext;
  }
}