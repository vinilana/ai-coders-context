import { tool } from 'ai';
import * as path from 'path';
import * as fs from 'fs-extra';
import { ScaffoldPlanInputSchema, type ScaffoldPlanInput } from '../schemas';
import { PlanGenerator } from '../../../generators/plans/planGenerator';
import {
  StackDetector,
  classifyProject,
  getAgentsForProjectType,
  getDocsForProjectType,
} from '../../stack';

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
      // Detect project type for intelligent agent/doc filtering
      const stackDetector = new StackDetector();
      const stackInfo = await stackDetector.detect(repoPath);
      const classification = classifyProject(stackInfo);

      // Get filtered agents and docs based on project type
      const filteredAgents = getAgentsForProjectType(classification.primaryType);
      const filteredDocs = getDocsForProjectType(classification.primaryType);

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
        selectedAgentTypes: filteredAgents,
        selectedDocKeys: filteredDocs,
      });

      // Read the generated content to return
      const planContent = await fs.readFile(result.planPath, 'utf-8');

      return {
        success: true,
        planPath: result.planPath,
        planContent,
        classification: {
          projectType: classification.primaryType,
          confidence: classification.confidence,
          reasoning: classification.reasoning,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});
