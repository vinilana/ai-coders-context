import * as path from 'path';
import { RepoStructure } from '../../types';
import { FileMapper } from '../../utils/fileMapper';
import { BaseLLMClient } from '../../services/baseLLMClient';
import { AGENT_TYPES, AgentType } from './agentTypes';
import { ContextUtils } from './contextUtils';
import { PromptFormatter } from './promptFormatter';
import { GeneratorUtils } from '../shared';

export class AgentGenerator {
  private contextUtils: ContextUtils;
  private promptFormatter: PromptFormatter;

  constructor(
    fileMapper: FileMapper,
    private llmClient: BaseLLMClient
  ) {
    this.contextUtils = new ContextUtils(fileMapper);
    this.promptFormatter = new PromptFormatter();
  }

  async generateAgentPrompts(
    repoStructure: RepoStructure,
    outputDir: string,
    verbose: boolean = false
  ): Promise<void> {
    const agentsDir = path.join(outputDir, 'agents');
    await GeneratorUtils.ensureDirectoryAndLog(agentsDir, verbose, '🤖 Generating agent prompts in');

    const repoContext = this.contextUtils.createRepoContext(repoStructure);
    const fileContext = await this.contextUtils.createFileContext(repoStructure);

    for (const agentType of AGENT_TYPES) {
      try {
        const fileName = `${agentType}.md`;
        const agentPrompt = await this.generateAgentPrompt(
          agentType,
          repoContext,
          fileContext,
          repoStructure
        );

        const agentPath = path.join(agentsDir, fileName);
        await GeneratorUtils.writeFileWithLogging(agentPath, agentPrompt, verbose);
      } catch (error) {
        GeneratorUtils.logError(`Error generating ${agentType}`, error, verbose);
      }
    }

    // Generate master agent index
    await this.generateAgentIndex(agentsDir, verbose);
  }

  private async generateAgentPrompt(
    agentType: AgentType,
    repoContext: string,
    fileContext: string,
    repoStructure: RepoStructure
  ): Promise<string> {
    const structureOverview = this.contextUtils.createStructureOverview(repoStructure);
    
    const agentPrompt = await this.llmClient.generateAgentPrompt(
      structureOverview,
      fileContext,
      agentType
    );

    return this.promptFormatter.formatAgentPrompt(agentType, agentPrompt, repoContext);
  }










  private async generateAgentIndex(agentsDir: string, verbose: boolean): Promise<void> {
    const fileName = 'README.md';
    const indexContent = this.promptFormatter.generateAgentIndex();
    const indexPath = path.join(agentsDir, fileName);
    await GeneratorUtils.writeFileWithLogging(indexPath, indexContent, verbose);
  }

}