import * as path from 'path';
import { FileInfo, RepoStructure } from '../types';
import { FileMapper } from '../utils/fileMapper';
import { DocumentationUtils } from './documentation/documentationUtils';

export interface ModuleGroup {
  name: string;
  description: string;
  files: FileInfo[];
}

export class ModuleGrouper {
  constructor(private fileMapper: FileMapper) {}

  getModuleGroups(repoStructure: RepoStructure): ModuleGroup[] {
    const groups: Map<string, FileInfo[]> = new Map();
    
    // Group files by their top-level directory or logical module
    repoStructure.files.forEach(file => {
      if (!this.fileMapper.isTextFile(file.path)) return;
      
      const parts = file.relativePath.split(path.sep);
      let groupName = 'Root Files';
      
      if (parts.length > 1) {
        groupName = parts[0];
        // Special handling for src files
        if (groupName === 'src' && parts.length > 2) {
          groupName = `${parts[1]}`;
        }
      }
      
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName)!.push(file);
    });

    // Convert to ModuleGroup array with descriptions
    return Array.from(groups.entries()).map(([name, files]) => ({
      name: DocumentationUtils.formatModuleName(name),
      description: this.getModuleDescription(name, files),
      files
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  private getModuleDescription(name: string, files: FileInfo[]): string {
    const descriptions: { [key: string]: string } = {
      'generators': 'Code generation utilities for documentation and agents',
      'services': 'External service integrations and API clients',
      'utils': 'Utility functions and helper modules',
      'types': 'TypeScript type definitions and interfaces',
      'Root Files': 'Main configuration and entry point files'
    };

    return descriptions[name] || `${DocumentationUtils.formatModuleName(name)} module with ${files.length} files`;
  }
} 