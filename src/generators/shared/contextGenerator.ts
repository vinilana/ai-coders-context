import * as path from 'path';
import { RepoStructure } from '../../types';
import { FileMapper } from '../../utils/fileMapper';
import { GeneratorUtils } from './generatorUtils';

export class ContextGenerator {
  constructor(private fileMapper: FileMapper) {}

  createRepoContext(repoStructure: RepoStructure): string {
    const { files, totalFiles, totalSize } = repoStructure;
    
    const topExtensions = GeneratorUtils.getTopFileExtensions(repoStructure);

    return `**Project Statistics:**
- Total Files: ${totalFiles}
- Total Size: ${GeneratorUtils.formatBytes(totalSize)}
- Primary Languages: ${topExtensions.map(([ext, count]) => `${ext} (${count})`).join(', ')}

**Key Project Files:**
${files
  .filter(f => ['package.json', 'README.md', 'tsconfig.json'].includes(path.basename(f.path)))
  .map(f => `- ${f.relativePath}`)
  .join('\n')}`;
  }

  async createFileContext(repoStructure: RepoStructure, importantFiles: string[] = []): Promise<string> {
    const filesToProcess = repoStructure.files
      .filter(f => this.isImportantFile(f.relativePath, importantFiles))
      .slice(0, 10);

    let context = '**Important Files Context:**\n\n';
    
    for (const file of filesToProcess) {
      try {
        const content = await this.fileMapper.readFileContent(file.path);
        const preview = content.substring(0, 500);
        context += `**${file.relativePath}:**\n\`\`\`\n${preview}${content.length > 500 ? '...' : ''}\n\`\`\`\n\n`;
      } catch (error) {
        context += `**${file.relativePath}:** (Error reading file)\n\n`;
      }
    }

    return context;
  }

  createStructureOverview(repoStructure: RepoStructure): string {
    const directories = [...new Set(
      repoStructure.files.map(f => path.dirname(f.relativePath))
    )].filter(dir => dir !== '.').slice(0, 20);

    return `Repository Structure Overview:

Directories:
${directories.map(dir => `- ${dir}`).join('\n')}

File Types:
${this.getFileTypeDistribution(repoStructure)}

Total Files: ${repoStructure.totalFiles}
`;
  }

  private getFileTypeDistribution(repoStructure: RepoStructure): string {
    const extensions = GeneratorUtils.getFileTypeDistribution(repoStructure);

    return Array.from(extensions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ext, count]) => `- ${ext}: ${count} files`)
      .join('\n');
  }

  private isImportantFile(filePath: string, customImportantFiles: string[] = []): boolean {
    const defaultImportantFiles = [
      'package.json', 'tsconfig.json', 'webpack.config.js', 
      'next.config.js', 'tailwind.config.js', 'README.md',
      '.gitignore', 'Dockerfile', 'docker-compose.yml'
    ];
    
    const allImportantFiles = [...defaultImportantFiles, ...customImportantFiles];
    const fileName = path.basename(filePath);
    
    return allImportantFiles.includes(fileName) || 
           filePath.includes('config') || 
           filePath.includes('index');
  }
}