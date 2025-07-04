import { AgentType, AGENT_TYPES } from './agentTypes';
import { AGENT_RESPONSIBILITIES, AGENT_BEST_PRACTICES } from './agentConfig';
import { GeneratorUtils } from '../shared';

export class PromptFormatter {
  formatAgentPrompt(
    agentType: AgentType,
    generatedPrompt: string,
    repoContext: string
  ): string {
    const title = GeneratorUtils.formatTitle(agentType);

    return `# ${title} Agent

## Role Description
You are a specialized ${title} agent for this codebase. Your primary function is to assist with ${agentType.replace('-', ' ')} tasks while maintaining deep understanding of the project structure and conventions.

## Repository Context
${repoContext}

## Agent-Specific Prompt
${generatedPrompt}

## Key Responsibilities
${this.getAgentResponsibilities(agentType)}

## Best Practices
${this.getAgentBestPractices(agentType)}

## Common Commands and Patterns
${this.getAgentCommands(agentType)}

${GeneratorUtils.createGeneratedByFooter('Agent', `Agent Type: ${agentType}`)}
`;
  }

  generateAgentIndex(): string {
    return `# AI Agents Index

This directory contains specialized AI agent prompts designed for this codebase.

## Available Agents

${AGENT_TYPES.map(type => {
  const title = GeneratorUtils.formatTitle(type);
  return `### [${title}](${type}.md)
- **File:** \`${type}.md\`
- **Purpose:** Specialized ${title.toLowerCase()} tasks
`;
}).join('\n')}

## Usage

Each agent prompt is designed to provide context-aware assistance for specific development tasks. Use these prompts with your preferred AI assistant to get specialized help with your codebase.

## How to Use

1. Choose the appropriate agent for your task
2. Copy the agent prompt from the corresponding .md file
3. Provide the prompt to your AI assistant along with your specific question or task
4. The agent will provide context-aware assistance based on your codebase structure

${GeneratorUtils.createGeneratedByFooter('Agent Index')}
`;
  }

  private getAgentResponsibilities(agentType: AgentType): string {
    return AGENT_RESPONSIBILITIES[agentType]?.map(r => `- ${r}`).join('\n') || 
           '- Perform specialized tasks for this agent type';
  }

  private getAgentBestPractices(agentType: AgentType): string {
    return AGENT_BEST_PRACTICES[agentType]?.map(p => `- ${p}`).join('\n') || 
           '- Follow general best practices for software development';
  }

  private getAgentCommands(agentType: AgentType): string {
    return `Common patterns and commands for ${agentType} tasks:

\`\`\`bash
# Add relevant commands here based on the codebase
npm test          # Run tests
npm run lint      # Check code style
npm run build     # Build the project
\`\`\`

Refer to the project's package.json or documentation for specific commands.`;
  }
}