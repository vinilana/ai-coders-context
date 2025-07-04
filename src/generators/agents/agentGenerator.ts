import * as fs from 'fs-extra';
import * as path from 'path';
import { RepoStructure } from '../../types';
import { FileMapper } from '../../utils/fileMapper';
import { BaseLLMClient } from '../../services/baseLLMClient';
import chalk from 'chalk';
import { AGENT_TYPES, AgentType } from './agentTypes';
import { ContextUtils } from './contextUtils';
import { PromptFormatter } from './promptFormatter';

export class AgentGenerator {
  private contextUtils: ContextUtils;
  private promptFormatter: PromptFormatter;

  constructor(
    private fileMapper: FileMapper,
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
    await fs.ensureDir(agentsDir);

    if (verbose) {
      console.log(chalk.blue(`🤖 Generating agent prompts in: ${agentsDir}`));
    }

    const repoContext = this.contextUtils.createRepoContext(repoStructure);
    const fileContext = await this.contextUtils.createFileContext(repoStructure);

    for (const agentType of AGENT_TYPES) {
      try {
        const fileName = `${agentType}.md`;
        if (verbose) {
          console.log(chalk.blue(`📄 Creating ${fileName}...`));
        }

        const agentPrompt = await this.generateAgentPrompt(
          agentType,
          repoContext,
          fileContext,
          repoStructure
        );

        const agentPath = path.join(agentsDir, fileName);
        await fs.writeFile(agentPath, agentPrompt);

        if (verbose) {
          console.log(chalk.green(`✅ Created ${fileName}`));
        }
      } catch (error) {
        if (verbose) {
          console.log(chalk.red(`❌ Error generating ${agentType}: ${error}`));
        }
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
    if (verbose) {
      console.log(chalk.blue(`📄 Creating ${fileName}...`));
    }
    const indexContent = this.promptFormatter.generateAgentIndex();

    const indexPath = path.join(agentsDir, fileName);
    await fs.writeFile(indexPath, indexContent);

    if (verbose) {
      console.log(chalk.green(`✅ Created ${fileName}`));
    }
  }

}