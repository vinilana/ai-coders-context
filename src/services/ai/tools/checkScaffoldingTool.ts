import { tool } from 'ai';
import * as fs from 'fs-extra';
import * as path from 'path';
import { CheckScaffoldingInputSchema, type CheckScaffoldingInput } from '../schemas';

/**
 * Check if a directory exists and has content
 */
async function hasContent(dirPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dirPath);
    return entries.length > 0;
  } catch {
    return false;
  }
}

export const checkScaffoldingTool = tool({
  description: 'Check if .context scaffolding exists and return granular status',
  inputSchema: CheckScaffoldingInputSchema,
  execute: async (input: CheckScaffoldingInput) => {
    if (!input.repoPath) {
      throw new Error('repoPath is required for checkScaffolding');
    }
      const repoPath = input.repoPath;
      const outputDir = path.resolve(repoPath, '.context');

    try {
      const [initialized, docs, agents, plans, skills, commands] = await Promise.all([
        fs.pathExists(outputDir),
        fs.pathExists(path.join(outputDir, 'docs')).then(exists =>
          exists ? hasContent(path.join(outputDir, 'docs')) : false
        ),
        fs.pathExists(path.join(outputDir, 'agents')).then(exists =>
          exists ? hasContent(path.join(outputDir, 'agents')) : false
        ),
        fs.pathExists(path.join(outputDir, 'plans')).then(exists =>
          exists ? hasContent(path.join(outputDir, 'plans')) : false
        ),
        fs.pathExists(path.join(outputDir, 'skills')).then(exists =>
          exists ? hasContent(path.join(outputDir, 'skills')) : false
        ),
        fs.pathExists(path.join(outputDir, 'commands')).then(exists =>
          exists ? hasContent(path.join(outputDir, 'commands')) : false
        )
      ]);

      return {
        initialized,
        docs,
        agents,
        plans,
        skills,
        commands,
        outputDir
      };
    } catch (error) {
      return {
        initialized: false,
        docs: false,
        agents: false,
        plans: false,
        skills: false,
        commands: false,
        outputDir,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});
