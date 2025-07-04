import * as path from 'path';
import { FileInfo, RepoStructure } from '../types';
import { DocumentationUtils } from './documentation/documentationUtils';

export class ProjectAnalyzer {
  static identifyProjectType(repoStructure: RepoStructure): string {
    const files = repoStructure.files.map(f => f.relativePath);
    
    if (files.some(f => f === 'package.json')) {
      if (files.some(f => f.includes('react') || f.includes('.jsx') || f.includes('.tsx'))) {
        return 'React Application';
      } else if (files.some(f => f.includes('angular.json'))) {
        return 'Angular Application';
      } else if (files.some(f => f.includes('vue'))) {
        return 'Vue Application';
      } else if (files.some(f => f.includes('next.config'))) {
        return 'Next.js Application';
      }
      return 'Node.js Project';
    } else if (files.some(f => f === 'requirements.txt' || f === 'setup.py')) {
      return 'Python Project';
    } else if (files.some(f => f === 'pom.xml')) {
      return 'Java Maven Project';
    } else if (files.some(f => f === 'build.gradle')) {
      return 'Java Gradle Project';
    }
    
    return 'General Software Project';
  }

  static identifyTechStack(repoStructure: RepoStructure): string[] {
    const stack: string[] = [];
    const files = repoStructure.files.map(f => f.relativePath);
    
    // Languages
    if (files.some(f => f.endsWith('.ts') || f.endsWith('.tsx'))) stack.push('TypeScript');
    if (files.some(f => f.endsWith('.js') || f.endsWith('.jsx'))) stack.push('JavaScript');
    if (files.some(f => f.endsWith('.py'))) stack.push('Python');
    if (files.some(f => f.endsWith('.java'))) stack.push('Java');
    
    // Frameworks
    if (files.some(f => f === 'package.json')) stack.push('Node.js');
    if (files.some(f => f.includes('react'))) stack.push('React');
    if (files.some(f => f.includes('vue'))) stack.push('Vue');
    if (files.some(f => f.includes('angular'))) stack.push('Angular');
    
    // Tools
    if (files.some(f => f === 'tsconfig.json')) stack.push('TypeScript Compiler');
    if (files.some(f => f === 'jest.config.js')) stack.push('Jest');
    if (files.some(f => f === 'webpack.config.js')) stack.push('Webpack');
    
    return [...new Set(stack)];
  }

  static identifyKeyFiles(repoStructure: RepoStructure): Array<{relativePath: string, description: string}> {
    const keyFiles: Array<{relativePath: string, description: string}> = [];
    
    repoStructure.files.forEach(file => {
      const basename = path.basename(file.path);
      const descriptions: { [key: string]: string } = {
        'package.json': 'Node.js project configuration and dependencies',
        'tsconfig.json': 'TypeScript compiler configuration',
        'README.md': 'Project documentation and setup guide',
        '.gitignore': 'Git ignore patterns',
        'LICENSE': 'Project license information',
        'index.ts': 'Main entry point',
        'index.js': 'Main entry point',
        '.env.example': 'Environment variable template'
      };
      
      if (descriptions[basename]) {
        keyFiles.push({
          relativePath: file.relativePath,
          description: descriptions[basename]
        });
      }
    });
    
    return keyFiles;
  }

  static createSimplifiedTree(repoStructure: RepoStructure): string {
    const tree: { [key: string]: Set<string> } = {};
    
    // Build directory structure
    repoStructure.files.forEach(file => {
      const parts = file.relativePath.split(path.sep);
      if (parts.length > 1) {
        const dir = parts[0];
        if (!tree[dir]) tree[dir] = new Set();
        if (parts.length === 2) {
          tree[dir].add(parts[1]);
        }
      }
    });
    
    // Create tree visualization
    let result = '';
    const dirs = Object.keys(tree).sort();
    
    dirs.forEach((dir, index) => {
      const isLast = index === dirs.length - 1;
      result += `${isLast ? '└── ' : '├── '}${dir}/\n`;
      
      const files = Array.from(tree[dir]).slice(0, 3);
      files.forEach((file, fIndex) => {
        const isLastFile = fIndex === files.length - 1 && tree[dir].size <= 3;
        result += `${isLast ? '    ' : '│   '}${isLastFile ? '└── ' : '├── '}${file}\n`;
      });
      
      if (tree[dir].size > 3) {
        result += `${isLast ? '    ' : '│   '}└── ... (${tree[dir].size - 3} more files)\n`;
      }
    });
    
    return result || 'No subdirectories found';
  }

  static detectProjectType(repoStructure: RepoStructure): string {
    const packageJson = repoStructure.files.find(f => f.relativePath === 'package.json');
    if (packageJson) {
      return 'Node.js/JavaScript';
    }
    
    const cargoToml = repoStructure.files.find(f => f.relativePath === 'Cargo.toml');
    if (cargoToml) {
      return 'Rust';
    }
    
    const goMod = repoStructure.files.find(f => f.relativePath === 'go.mod');
    if (goMod) {
      return 'Go';
    }
    
    const pythonFiles = repoStructure.files.filter(f => f.extension === '.py');
    if (pythonFiles.length > 0) {
      return 'Python';
    }
    
    const javaFiles = repoStructure.files.filter(f => f.extension === '.java');
    if (javaFiles.length > 0) {
      return 'Java';
    }
    
    return 'Mixed/Other';
  }

  static getConfigurationFiles(repoStructure: RepoStructure): FileInfo[] {
    const configPatterns = [
      'package.json',
      'tsconfig.json',
      'jest.config.js',
      'webpack.config.js',
      '.env',
      '.env.example',
      'docker-compose.yml',
      'Dockerfile',
      'cargo.toml',
      'go.mod',
      'requirements.txt',
      'pyproject.toml'
    ];

    return repoStructure.files.filter((file: FileInfo) => 
      configPatterns.some(pattern => 
        file.relativePath.toLowerCase().includes(pattern.toLowerCase())
      )
    );
  }

  static getPackageInfo(repoStructure: RepoStructure): any {
    const packageJson = repoStructure.files.find(f => f.relativePath === 'package.json');
    if (packageJson) {
      try {
        return {
          type: 'Node.js project',
          configFile: 'package.json',
          hasScripts: true
        };
      } catch {
        return { type: 'Node.js project', configFile: 'package.json' };
      }
    }

    const cargoToml = repoStructure.files.find(f => f.relativePath === 'Cargo.toml');
    if (cargoToml) {
      return { type: 'Rust project', configFile: 'Cargo.toml' };
    }

    const goMod = repoStructure.files.find(f => f.relativePath === 'go.mod');
    if (goMod) {
      return { type: 'Go project', configFile: 'go.mod' };
    }

    return { type: 'Generic project', configFile: 'none' };
  }
} 