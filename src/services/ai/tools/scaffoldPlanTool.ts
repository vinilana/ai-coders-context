import { tool } from 'ai';
import * as path from 'path';
import * as fs from 'fs-extra';
import { ScaffoldPlanInputSchema, type ScaffoldPlanInput } from '../schemas';
import { PlanGenerator } from '../../../generators/plans/planGenerator';

export const scaffoldPlanTool = tool({
  description: 'Create a plan template in .context/plans/',
  inputSchema: ScaffoldPlanInputSchema,
  execute: async (input: ScaffoldPlanInput) => {
    const {
      planName,
      repoPath: customRepoPath,
      outputDir: customOutputDir,
      title,
      summary,
      semantic = true
    } = input;

    const repoPath = customRepoPath ? path.resolve(customRepoPath) : process.cwd();
    const outputDir = customOutputDir
      ? path.resolve(customOutputDir)
      : path.resolve(repoPath, '.context');

    try {
      const planGenerator = new PlanGenerator();

      const result = await planGenerator.generatePlan({
        planName,
        outputDir,
        title,
        summary,
        force: true, // MCP calls should always overwrite (non-interactive)
        verbose: false,
        semantic,
        projectPath: semantic ? repoPath : undefined,
        selectedAgentTypes: undefined, // Include all agents
        selectedDocKeys: undefined // Include all docs
      });

      // Read the generated content to return
      const planContent = await fs.readFile(result.planPath, 'utf-8');

      return {
        success: true,
        planPath: result.planPath,
        planContent
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});
