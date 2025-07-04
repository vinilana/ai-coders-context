import { GeneratorUtils } from '../shared';

export class DocumentationUtils {
  static slugify(text: string): string {
    return GeneratorUtils.slugify(text);
  }

  static formatBytes(bytes: number): string {
    return GeneratorUtils.formatBytes(bytes);
  }

  static formatModuleName(name: string): string {
    return GeneratorUtils.formatModuleName(name);
  }

  static getConfigDescription(filePath: string): string {
    const descriptions: { [key: string]: string } = {
      'package.json': 'Node.js dependencies and scripts',
      'tsconfig.json': 'TypeScript compilation settings',
      '.env': 'Environment variables',
      '.env.example': 'Environment variable template',
      'jest.config.js': 'Jest testing configuration'
    };
    
    const basename = filePath.split('/').pop() || filePath;
    return descriptions[basename] || basename.replace(/\.[^.]+$/, '');
  }
} 