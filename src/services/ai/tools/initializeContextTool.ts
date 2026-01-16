import { tool } from 'ai';
import * as path from 'path';
import * as fs from 'fs-extra';
import { InitializeContextInputSchema, type InitializeContextInput, type RequiredAction } from '../schemas';
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
      skipContentGeneration = true, // Default true to reduce response size
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
          status: 'error',
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

      // Build semantic context only if autoFill is enabled AND skipContentGeneration is false
      let semanticContext: string | undefined;
      const shouldGenerateContent = autoFill && !skipContentGeneration;

      if (shouldGenerateContent && generatedFiles.length > 0) {
        try {
          semanticContext = await getOrBuildContext(resolvedRepoPath);
        } catch (contextError) {
          // Continue without semantic context if it fails
          semanticContext = undefined;
        }
      }

      // Build requiredActions - with or without pre-generated content
      const requiredActions: RequiredAction[] = [];

      if (autoFill && generatedFiles.length > 0) {
        for (let i = 0; i < generatedFiles.length; i++) {
          const file = generatedFiles[i];
          let suggestedContent: string | undefined;

          // Only pre-generate content if skipContentGeneration is false
          if (!skipContentGeneration && semanticContext) {
            try {
              const templateContent = await fs.readFile(file.path, 'utf-8');
              if (file.type === 'doc') {
                suggestedContent = generateDocContent(path.basename(file.path), templateContent, semanticContext);
              } else if (file.type === 'agent') {
                const agentType = path.basename(file.path, '.md');
                suggestedContent = generateAgentContent(agentType, templateContent, semanticContext);
              }
            } catch {
              // If content generation fails, leave undefined
              suggestedContent = undefined;
            }
          }

          requiredActions.push({
            order: i + 1,
            actionType: 'WRITE_FILE',
            filePath: file.path,
            fileType: file.type,
            instructions: file.fillInstructions,
            suggestedContent,
            status: 'pending',
          });
        }
      }

      // When skipContentGeneration is true, return a lean response
      if (skipContentGeneration) {
        return {
          status: 'success',
          operationType: 'scaffold_only',

          // Lightweight list of scaffolded files
          scaffoldedFiles: generatedFiles.map(f => ({
            filePath: f.path,
            relativePath: f.relativePath,
            type: f.type,
          })),

          // Instructions for next steps
          fillInstructions: generatedFiles.length > 0
            ? 'Use fillSingleFile tool to generate content for each file, or fillScaffolding with limit parameter for batch processing.'
            : undefined,

          // Metadata fields
          docsGenerated,
          agentsGenerated,
          outputDir,
          classification: classification ? {
            projectType: classification.primaryType,
            confidence: classification.confidence,
            reasoning: classification.reasoning,
          } : undefined,
        };
      }

      // Full response with pre-generated content (when skipContentGeneration is false)
      const hasActionsRequired = requiredActions.length > 0;

      return {
        // Structured action protocol - status indicates if follow-up is needed
        status: hasActionsRequired ? 'requires_action' : 'success',
        operationType: 'initialize_and_fill',
        completionCriteria: hasActionsRequired
          ? 'Write the suggestedContent to each file in requiredActions using the Write tool'
          : undefined,

        // Required actions with pre-generated content
        requiredActions: hasActionsRequired ? requiredActions : undefined,

        // Context for reference
        codebaseContext: semanticContext,

        // Explicit next step with example
        nextStep: hasActionsRequired ? {
          action: 'For each item in requiredActions, call Write tool with filePath and suggestedContent',
          example: `Write({ file_path: "${requiredActions[0]?.filePath || ''}", content: requiredActions[0].suggestedContent })`,
        } : undefined,

        // Metadata fields
        docsGenerated,
        agentsGenerated,
        outputDir,
        classification: classification ? {
          projectType: classification.primaryType,
          confidence: classification.confidence,
          reasoning: classification.reasoning,
        } : undefined,
      };
    } catch (error) {
      return {
        status: 'error',
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

