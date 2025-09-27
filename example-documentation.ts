/**
 * Example script demonstrating how to scaffold documentation and agent playbooks
 * programmatically without going through the CLI binary.
 */

import path from 'node:path';
import { DocumentationGenerator } from './src/generators/documentation';
import { AgentGenerator } from './src/generators/agents';
import { FileMapper } from './src/utils/fileMapper';

async function scaffoldRepo(repoRoot: string, outputDir: string = path.join(repoRoot, '.context')) {
  const fileMapper = new FileMapper();
  const documentationGenerator = new DocumentationGenerator();
  const agentGenerator = new AgentGenerator();

  const repoStructure = await fileMapper.mapRepository(repoRoot);

  await documentationGenerator.generateDocumentation(repoStructure, outputDir, {}, true);
  await agentGenerator.generateAgentPrompts(repoStructure, outputDir, true);

  console.log(`Scaffold written to ${outputDir}`);
}

if (require.main === module) {
  const repoRoot = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  scaffoldRepo(repoRoot).catch(error => {
    console.error('Failed to scaffold repository:', error);
    process.exit(1);
  });
}

export { scaffoldRepo };
