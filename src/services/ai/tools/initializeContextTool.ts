import { tool } from 'ai';
import * as path from 'path';
import * as fs from 'fs-extra';
import { InitializeContextInputSchema, type InitializeContextInput } from '../schemas';
import { FileMapper } from '../../../utils/fileMapper';
import { DocumentationGenerator } from '../../../generators/documentation/documentationGenerator';
import { AgentGenerator } from '../../../generators/agents/agentGenerator';

export const initializeContextTool = tool({
  description: `Initialize .context scaffolding and create template files.
IMPORTANT: After scaffolding, you MUST fill the generated files with actual content by:
1. Use buildSemanticContext to understand the codebase
2. Read each generated template file
3. Write filled content to each file based on the codebase analysis`,
  inputSchema: InitializeContextInputSchema,
  execute: async (input: InitializeContextInput) => {
    const {
      repoPath,
      type = 'both',
      outputDir: customOutputDir,
      semantic = true,
      include,
      exclude = []
    } = input;

    const resolvedRepoPath = path.resolve(repoPath);
    const outputDir = customOutputDir
      ? path.resolve(customOutputDir)
      : path.resolve(resolvedRepoPath, '.context');

    const scaffoldDocs = type === 'docs' || type === 'both';
    const scaffoldAgents = type === 'agents' || type === 'both';

    try {
      // Validate repo path exists
      if (!await fs.pathExists(resolvedRepoPath)) {
        return {
          success: false,
          outputDir,
          error: `Repository path does not exist: ${resolvedRepoPath}`
        };
      }

      // Ensure output directory exists
      await fs.ensureDir(outputDir);

      // Map repository structure
      const fileMapper = new FileMapper(exclude);
      const repoStructure = await fileMapper.mapRepository(resolvedRepoPath, include);

      let docsGenerated = 0;
      let agentsGenerated = 0;

      // Generate documentation scaffolding
      if (scaffoldDocs) {
        const docGenerator = new DocumentationGenerator();
        docsGenerated = await docGenerator.generateDocumentation(
          repoStructure,
          outputDir,
          { semantic },
          false // verbose
        );
      }

      // Generate agent scaffolding
      if (scaffoldAgents) {
        const agentGenerator = new AgentGenerator();
        agentsGenerated = await agentGenerator.generateAgentPrompts(
          repoStructure,
          outputDir,
          { semantic },
          false // verbose
        );
      }

      // Build list of generated files for the agent to fill
      const generatedFiles: string[] = [];
      if (scaffoldDocs) {
        const docsDir = path.join(outputDir, 'docs');
        const docFiles = await fs.readdir(docsDir);
        generatedFiles.push(...docFiles.map(f => path.join(docsDir, f)));
      }
      if (scaffoldAgents) {
        const agentsDir = path.join(outputDir, 'agents');
        const agentFiles = await fs.readdir(agentsDir);
        generatedFiles.push(...agentFiles.map(f => path.join(agentsDir, f)));
      }

      return {
        success: true,
        docsGenerated,
        agentsGenerated,
        outputDir,
        generatedFiles,
        nextSteps: [
          'Call fillScaffolding tool to get codebase-aware content for each file',
          'Write the suggestedContent to each file path returned',
          'Focus on architecture.md, project-overview.md, and agent playbooks first'
        ]
      };
    } catch (error) {
      return {
        success: false,
        outputDir,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});
