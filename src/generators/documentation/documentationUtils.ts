export class DocumentationUtils {
  static slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static formatModuleName(name: string): string {
    return name
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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