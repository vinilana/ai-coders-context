import * as path from 'path';
import { RepoStructure } from '../../types';
import { FileMapper } from '../../utils/fileMapper';
import { IMPORTANT_FILES } from './agentTypes';

export class ContextUtils {
  constructor(private fileMapper: FileMapper) {}

  createRepoContext(repoStructure: RepoStructure): string {
    const { files, totalFiles, totalSize } = repoStructure;
    
    const extensions = new Map<string, number>();
    files.forEach(file => {
      const ext = file.extension || 'no-extension';
      extensions.set(ext, (extensions.get(ext) || 0) + 1);
    });

    const topExtensions = Array.from(extensions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return `**Project Statistics:**
- Total Files: ${totalFiles}
- Total Size: ${this.formatBytes(totalSize)}
- Primary Languages: ${topExtensions.map(([ext, count]) => `${ext} (${count})`).join(', ')}

**Key Project Files:**
${files
  .filter(f => ['package.json', 'README.md', 'tsconfig.json'].includes(path.basename(f.path)))
  .map(f => `- ${f.relativePath}`)
  .join('\n')}`;
  }

  async createFileContext(repoStructure: RepoStructure): Promise<string> {
    const importantFiles = repoStructure.files
      .filter(f => this.isImportantFile(f.relativePath))
      .slice(0, 10);

    let context = '**Important Files Context:**\n\n';
    
    for (const file of importantFiles) {
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
    const extensions = new Map<string, number>();
    repoStructure.files.forEach(file => {
      const ext = file.extension || 'no-extension';
      extensions.set(ext, (extensions.get(ext) || 0) + 1);
    });

    return Array.from(extensions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ext, count]) => `- ${ext}: ${count} files`)
      .join('\n');
  }

  private isImportantFile(filePath: string): boolean {
    const fileName = path.basename(filePath);
    return IMPORTANT_FILES.includes(fileName) || 
           filePath.includes('config') || 
           filePath.includes('index');
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}