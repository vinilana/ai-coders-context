import * as path from 'path';
import { RepoStructure } from '../../types';
import { FileMapper } from '../../utils/fileMapper';
import { IMPORTANT_FILES } from './agentTypes';
import { ContextGenerator, GeneratorUtils } from '../shared';

export class ContextUtils extends ContextGenerator {
  constructor(fileMapper: FileMapper) {
    super(fileMapper);
  }


  async createFileContext(repoStructure: RepoStructure): Promise<string> {
    return super.createFileContext(repoStructure, IMPORTANT_FILES);
  }




}