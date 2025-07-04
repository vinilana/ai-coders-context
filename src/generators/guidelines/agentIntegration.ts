import { RepoStructure } from '../../types';
import { ModuleGroup } from '../moduleGrouper';
import { AgentGenerator } from '../agents/agentGenerator';
import { FileMapper } from '../../utils/fileMapper';
import { BaseLLMClient } from '../../services/baseLLMClient';
import { GuidelineCategory } from './guidelineTypes';

/**
 * Integration layer between Guidelines Generator and Agent System
 * 
 * This class leverages the existing agent system to enhance guideline generation
 * by using specialized agents (architect-specialist, documentation-writer) to
 * provide expert context and validation for generated guidelines.
 */
export class GuidelinesAgentIntegration {
  private agentGenerator: AgentGenerator;

  constructor(
    private fileMapper: FileMapper,
    private llmClient: BaseLLMClient
  ) {
    this.agentGenerator = new AgentGenerator(fileMapper, llmClient);
  }

  /**
   * Enhance guideline generation using architect-specialist agent context
   */
  async enhanceWithArchitectAgent(
    repoStructure: RepoStructure,
    moduleGroups: ModuleGroup[],
    category: GuidelineCategory
  ): Promise<string> {
    // The architect-specialist agent is perfect for:
    // - architecture guidelines
    // - performance guidelines
    // - code-style guidelines
    // - overall system design guidance

    const architectContext = `Repository Analysis for ${category} Guidelines:

Project Structure:
${moduleGroups.map(m => `- ${m.name}: ${m.description} (${m.files.length} files)`).join('\n')}

Focus Area: ${category}

As an architect specialist, analyze this codebase and provide expert insights for creating ${category} guidelines that would be most valuable for this specific project structure and technology stack.

Consider:
1. Current architectural patterns evident in the codebase
2. Areas where ${category} guidelines would have the most impact
3. Technology-specific best practices for ${category}
4. Common pitfalls to avoid in this type of project
5. Specific recommendations for this codebase's current state

Provide architectural insights that should be incorporated into ${category} guidelines.`;

    return architectContext;
  }

  /**
   * Enhance guideline generation using documentation-writer agent context  
   */
  async enhanceWithDocumentationAgent(
    repoStructure: RepoStructure,
    moduleGroups: ModuleGroup[],
    category: GuidelineCategory
  ): Promise<string> {
    // The documentation-writer agent is perfect for:
    // - documentation guidelines
    // - code-style guidelines (commenting, naming)
    // - git-workflow guidelines (commit messages, PR descriptions)
    // - general communication and knowledge sharing

    const docContext = `Documentation Analysis for ${category} Guidelines:

Current Documentation State:
- Total Files: ${repoStructure.totalFiles}
- README files: ${repoStructure.files.filter(f => f.relativePath.toLowerCase().includes('readme')).length}
- Documentation directories: ${repoStructure.files.filter(f => f.relativePath.includes('docs') || f.relativePath.includes('doc')).length}

Focus Area: ${category}

As a documentation specialist, analyze how ${category} guidelines should be structured and presented to maximize their effectiveness for developers working on this codebase.

Consider:
1. How ${category} guidelines should be documented for best accessibility
2. What examples and templates would be most helpful
3. How to make guidelines actionable and measurable
4. Integration with existing documentation patterns
5. Onboarding and reference use cases

Provide documentation expertise for creating effective ${category} guidelines.`;

    return docContext;
  }

  /**
   * Get agent-enhanced context for specific guideline categories
   */
  async getEnhancedContext(
    category: GuidelineCategory,
    repoStructure: RepoStructure,
    moduleGroups: ModuleGroup[]
  ): Promise<{
    architectContext?: string;
    documentationContext?: string;
    recommendedAgentApproach: string;
  }> {
    const categoryAgentMap: Record<GuidelineCategory, 'architect' | 'documentation' | 'both'> = {
      'testing': 'architect',
      'frontend': 'architect', 
      'backend': 'architect',
      'database': 'architect',
      'security': 'architect',
      'performance': 'architect',
      'code-style': 'both',
      'git-workflow': 'documentation',
      'deployment': 'architect',
      'monitoring': 'architect',
      'documentation': 'documentation',
      'architecture': 'architect'
    };

    const agentApproach = categoryAgentMap[category];
    const result: any = { recommendedAgentApproach: agentApproach };

    if (agentApproach === 'architect' || agentApproach === 'both') {
      result.architectContext = await this.enhanceWithArchitectAgent(repoStructure, moduleGroups, category);
    }

    if (agentApproach === 'documentation' || agentApproach === 'both') {
      result.documentationContext = await this.enhanceWithDocumentationAgent(repoStructure, moduleGroups, category);
    }

    return result;
  }

  /**
   * Generate agent prompts specifically for guideline validation and enhancement
   */
  async generateGuidelineValidationPrompts(
    repoStructure: RepoStructure,
    outputDir: string,
    verbose: boolean = false
  ): Promise<void> {
    // Generate specialized agent prompts for guideline creation and validation
    await this.agentGenerator.generateAgentPrompts(repoStructure, outputDir, verbose);
  }

  /**
   * Create guideline-specific agent prompt that combines multiple agent perspectives
   */
  createCombinedAgentPrompt(
    category: GuidelineCategory,
    architectContext?: string,
    documentationContext?: string
  ): string {
    let prompt = `# Guidelines Creation Agent for ${category.toUpperCase()}

You are a specialized AI agent focused on creating comprehensive ${category} guidelines.

## Your Role
Combine the expertise of both architect and documentation specialists to create actionable, practical guidelines for ${category}.

`;

    if (architectContext) {
      prompt += `## Architectural Perspective
${architectContext}

`;
    }

    if (documentationContext) {
      prompt += `## Documentation Perspective  
${documentationContext}

`;
    }

    prompt += `## Your Task
Create detailed, actionable ${category} guidelines that:

1. **Are Specific**: Tailored to this exact codebase and technology stack
2. **Are Actionable**: Provide clear steps and decisions developers can follow
3. **Are Measurable**: Include ways to verify adherence to guidelines
4. **Are Practical**: Focus on real-world development scenarios
5. **Are Maintainable**: Can evolve with the project over time

## Guidelines Structure
For each guideline, provide:
- **Rule**: Clear, concise statement of what to do
- **Rationale**: Why this rule matters for this specific project
- **Examples**: Concrete examples using the project's technology stack
- **Tools**: Specific tools or automation to support the guideline
- **Validation**: How to check if the guideline is being followed

Focus on guidelines that will have the highest impact on code quality, team productivity, and project maintainability.`;

    return prompt;
  }
}