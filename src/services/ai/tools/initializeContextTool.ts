import { tool } from 'ai';
import * as path from 'path';
import * as fs from 'fs-extra';
import { InitializeContextInputSchema, type InitializeContextInput } from '../schemas';
import { FileMapper } from '../../../utils/fileMapper';
import { DocumentationGenerator } from '../../../generators/documentation/documentationGenerator';
import { AgentGenerator } from '../../../generators/agents/agentGenerator';
import {
  StackDetector,
  classifyProject,
  getAgentsForProjectType,
  getDocsForProjectType,
  ProjectType,
  ProjectClassification,
} from '../../stack';
import { getOrBuildContext, generateDocContent, generateAgentContent } from './fillScaffoldingTool';

export const initializeContextTool = tool({
  description: `Initialize .context scaffolding and create template files.
When autoFill is true (default), returns semantic context and detailed fill instructions for each file.
The AI agent MUST then fill each generated file using the provided context and instructions.`,
  inputSchema: InitializeContextInputSchema,
  execute: async (input: InitializeContextInput) => {
    const {
      repoPath,
      type = 'both',
      outputDir: customOutputDir,
      semantic = true,
      include,
      exclude = [],
      projectType: overrideProjectType,
      disableFiltering = false,
      autoFill = true,
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

      // Detect stack and classify project type
      let classification: ProjectClassification | undefined;
      let projectType: ProjectType = 'unknown';

      if (!disableFiltering) {
        const stackDetector = new StackDetector();
        const stackInfo = await stackDetector.detect(resolvedRepoPath);

        // Use override if provided, otherwise classify from stack
        if (overrideProjectType) {
          projectType = overrideProjectType;
          classification = {
            primaryType: overrideProjectType,
            secondaryTypes: [],
            confidence: 'high',
            reasoning: ['Project type manually specified'],
          };
        } else {
          classification = classifyProject(stackInfo);
          projectType = classification.primaryType;
        }
      }

      // Get filtered agents and docs based on project type
      const filteredAgents = disableFiltering ? undefined : getAgentsForProjectType(projectType);
      const filteredDocs = disableFiltering ? undefined : getDocsForProjectType(projectType);

      let docsGenerated = 0;
      let agentsGenerated = 0;

      // Generate documentation scaffolding
      if (scaffoldDocs) {
        const docGenerator = new DocumentationGenerator();
        docsGenerated = await docGenerator.generateDocumentation(
          repoStructure,
          outputDir,
          { semantic, filteredDocs },
          false // verbose
        );
      }

      // Generate agent scaffolding
      if (scaffoldAgents) {
        const agentGenerator = new AgentGenerator();
        agentsGenerated = await agentGenerator.generateAgentPrompts(
          repoStructure,
          outputDir,
          { semantic, filteredAgents },
          false // verbose
        );
      }

      // Build list of generated files with their types
      interface FileInfo {
        path: string;
        relativePath: string;
        type: 'doc' | 'agent';
        fillInstructions: string;
      }
      const generatedFiles: FileInfo[] = [];

      if (scaffoldDocs) {
        const docsDir = path.join(outputDir, 'docs');
        const docFiles = await fs.readdir(docsDir);
        for (const f of docFiles.filter(f => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')) {
          generatedFiles.push({
            path: path.join(docsDir, f),
            relativePath: `docs/${f}`,
            type: 'doc',
            fillInstructions: getDocFillInstructions(f),
          });
        }
      }
      if (scaffoldAgents) {
        const agentsDir = path.join(outputDir, 'agents');
        const agentFiles = await fs.readdir(agentsDir);
        for (const f of agentFiles.filter(f => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')) {
          const agentType = path.basename(f, '.md');
          generatedFiles.push({
            path: path.join(agentsDir, f),
            relativePath: `agents/${f}`,
            type: 'agent',
            fillInstructions: getAgentFillInstructions(agentType),
          });
        }
      }

      // Build semantic context if autoFill is enabled
      let semanticContext: string | undefined;
      if (autoFill && generatedFiles.length > 0) {
        try {
          semanticContext = await getOrBuildContext(resolvedRepoPath);
        } catch (contextError) {
          // Continue without semantic context if it fails
          semanticContext = undefined;
        }
      }

      // Build the response with fill instructions
      const fillPrompt = autoFill ? buildFillPrompt(generatedFiles, semanticContext) : undefined;

      return {
        success: true,
        docsGenerated,
        agentsGenerated,
        outputDir,
        generatedFiles: generatedFiles.map(f => ({
          path: f.path,
          relativePath: f.relativePath,
          type: f.type,
          fillInstructions: f.fillInstructions,
        })),
        classification: classification ? {
          projectType: classification.primaryType,
          confidence: classification.confidence,
          reasoning: classification.reasoning,
        } : undefined,
        semanticContext: autoFill ? semanticContext : undefined,
        fillPrompt,
        instructions: autoFill
          ? 'IMPORTANT: You MUST now fill each generated file using the semantic context and fill instructions provided. Write the content to each file path.'
          : 'Call fillScaffolding tool to get codebase-aware content for each file, then write the suggestedContent to each file.',
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

/**
 * Get fill instructions for a documentation file based on its name
 */
function getDocFillInstructions(fileName: string): string {
  const name = fileName.toLowerCase();

  if (name === 'architecture.md') {
    return `Fill this file with:
- High-level architecture overview
- Key components and their responsibilities
- Data flow between components
- Design patterns used
- Technology stack decisions and rationale`;
  }

  if (name === 'project-overview.md') {
    return `Fill this file with:
- Project purpose and goals
- Main features and capabilities
- Target users/audience
- Key dependencies and integrations
- Getting started guide`;
  }

  if (name === 'data-flow.md') {
    return `Fill this file with:
- Data models and schemas
- API endpoints and their purposes
- Data transformation pipelines
- State management approach
- External data sources and sinks`;
  }

  if (name === 'conventions.md') {
    return `Fill this file with:
- Code style and formatting rules
- Naming conventions
- File and folder organization
- Commit message format
- PR and review guidelines`;
  }

  return `Fill this documentation file with relevant content based on the codebase analysis. Focus on accuracy and usefulness for developers.`;
}

/**
 * Get fill instructions for an agent playbook based on agent type
 */
function getAgentFillInstructions(agentType: string): string {
  const type = agentType.toLowerCase();

  if (type.includes('code-reviewer')) {
    return `Fill this agent playbook with:
- Code review checklist specific to this codebase
- Common patterns to look for
- Security considerations
- Performance best practices
- Testing requirements`;
  }

  if (type.includes('bug-fixer')) {
    return `Fill this agent playbook with:
- Debugging workflow for this codebase
- Common bug patterns and fixes
- Logging and error handling conventions
- Test verification steps
- Rollback procedures`;
  }

  if (type.includes('feature-developer')) {
    return `Fill this agent playbook with:
- Feature development workflow
- Code organization patterns
- Integration points for new features
- Testing requirements for new code
- Documentation expectations`;
  }

  if (type.includes('test-writer')) {
    return `Fill this agent playbook with:
- Testing framework and conventions
- Test file organization
- Mocking strategies
- Coverage requirements
- CI/CD integration`;
  }

  return `Fill this agent playbook with:
- Role and responsibilities specific to this codebase
- Key files and components to understand
- Workflow steps for common tasks
- Best practices and conventions to follow
- Common pitfalls to avoid`;
}

/**
 * Build a comprehensive fill prompt for the AI agent
 */
function buildFillPrompt(files: Array<{ path: string; relativePath: string; type: string; fillInstructions: string }>, semanticContext?: string): string {
  const lines: string[] = [];

  lines.push('# Fill Instructions for Scaffolded Files');
  lines.push('');
  lines.push('You MUST fill each of the following files with appropriate content based on the codebase analysis.');
  lines.push('');

  if (semanticContext) {
    lines.push('## Codebase Context');
    lines.push('');
    lines.push('Use this semantic context to understand the codebase structure:');
    lines.push('');
    lines.push('```');
    // Limit context size to avoid overwhelming the response
    lines.push(semanticContext.length > 8000 ? semanticContext.substring(0, 8000) + '\n...(truncated)' : semanticContext);
    lines.push('```');
    lines.push('');
  }

  lines.push('## Files to Fill');
  lines.push('');

  for (const file of files) {
    lines.push(`### ${file.relativePath}`);
    lines.push(`**Path:** \`${file.path}\``);
    lines.push(`**Type:** ${file.type}`);
    lines.push('');
    lines.push('**Instructions:**');
    lines.push(file.fillInstructions);
    lines.push('');
  }

  lines.push('## Action Required');
  lines.push('');
  lines.push('For each file listed above:');
  lines.push('1. Read the current template content');
  lines.push('2. Generate appropriate content based on the instructions and codebase context');
  lines.push('3. Write the filled content to the file');
  lines.push('');
  lines.push('DO NOT skip any files. Each file must be filled with meaningful, codebase-specific content.');

  return lines.join('\n');
}
