import { RepoStructure } from '../../../types';

export interface GuideMeta {
  key: string;
  title: string;
  file: string;
  primaryInputs: string;
}

export interface DirectoryStat {
  name: string;
  fileCount: number;
  totalSize: number;
}

export interface DocumentationTemplateContext {
  repoStructure: RepoStructure;
  topLevelDirectories: string[];
  primaryLanguages: Array<{ extension: string; count: number }>;
  directoryStats: DirectoryStat[];
  guides: GuideMeta[];
}
