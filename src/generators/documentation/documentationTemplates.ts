import { RepoStructure } from '../../types';
import { BaseLLMClient } from '../../services/baseLLMClient';
import { ModuleGroup } from '../moduleGrouper';
import { GeneratorUtils } from '../shared';
import { DocumentationType } from './documentationTypes';
import { CodebaseAnalyzer } from '../analyzers/codebaseAnalyzer';

export class DocumentationTemplates {
  private analyzer: CodebaseAnalyzer;

  constructor(private llmClient: BaseLLMClient, fileMapper?: any) {
    this.analyzer = new CodebaseAnalyzer(fileMapper);
  }

  async createMentalModel(repoStructure: RepoStructure, moduleGroups: ModuleGroup[]): Promise<string> {
    const context = this.buildRepoContext(repoStructure, moduleGroups);
    
    const content = await this.llmClient.generateText(
      `Create a "Mental Model" document that helps developers and AI agents understand this codebase conceptually.

Include:
1. **Core Metaphor**: A real-world analogy that explains what this system does
2. **Key Abstractions**: The main concepts and how they relate (3-5 core abstractions max)
3. **Data Flow**: How information moves through the system
4. **Boundary Definitions**: What this codebase does vs what it doesn't do
5. **Success Metrics**: How to measure if the system is working well

Focus on "how to think about this codebase" rather than implementation details.
Use clear, concrete language and avoid jargon.
Keep it under 1500 words.`,
      context
    );

    return `# Codebase Mental Model

${content}

${GeneratorUtils.createGeneratedByFooter('Mental Model Documentation')}`;
  }

  async createArchitectureDecisions(repoStructure: RepoStructure, moduleGroups: ModuleGroup[]): Promise<string> {
    const context = this.buildRepoContext(repoStructure, moduleGroups);
    
    // Enhance context with architectural analysis
    let enhancedContext = context;
    if (this.analyzer) {
      try {
        const architecturalPatterns = await this.analyzer.analyzeArchitecturalPatterns(repoStructure, moduleGroups);
        const dependencyFlow = this.analyzer.analyzeDependencyFlow(repoStructure, moduleGroups);
        
        enhancedContext += `\n\nArchitectural Patterns Detected:
${architecturalPatterns.map(p => `- ${p.name}: ${p.description} (confidence: ${p.confidence})`).join('\n')}

Dependency Flow Analysis:
${dependencyFlow.slice(0, 5).map(d => `- ${d.from} → ${d.to} (strength: ${d.strength.toFixed(2)})`).join('\n')}`;
      } catch (error) {
        // Continue without enhanced analysis if it fails
      }
    }
    
    const content = await this.llmClient.generateText(
      `Create an "Architecture Decisions" document that explains the key design choices in this codebase.

For each major decision, include:
1. **Context**: What problem was being solved?
2. **Decision**: What approach was chosen?
3. **Rationale**: Why this approach over alternatives?
4. **Consequences**: What are the trade-offs?

Focus on decisions that would help new developers or AI agents understand:
- Technology choices (languages, frameworks, libraries)
- Architectural patterns (how modules interact)
- Design constraints (what limitations shaped decisions)
- Code organization principles

Use the detected architectural patterns and dependency analysis to inform your decisions.
Limit to 5-7 most important decisions.
Keep explanations concise but complete.`,
      enhancedContext
    );

    return `# Architecture Decision Records

${content}

${GeneratorUtils.createGeneratedByFooter('Architecture Decisions Documentation')}`;
  }

  async createCodeOrganization(repoStructure: RepoStructure, moduleGroups: ModuleGroup[]): Promise<string> {
    const context = this.buildRepoContext(repoStructure, moduleGroups);
    
    // Enhance with extension point analysis
    let enhancedContext = context;
    if (this.analyzer) {
      try {
        const extensionPoints = this.analyzer.identifyExtensionPoints(repoStructure);
        const dependencyFlow = this.analyzer.analyzeDependencyFlow(repoStructure, moduleGroups);
        
        enhancedContext += `\n\nExtension Points Identified:
${extensionPoints.map(ep => `- ${ep}`).join('\n')}

Module Dependencies:
${dependencyFlow.slice(0, 8).map(d => `- ${d.from} depends on ${d.to}`).join('\n')}`;
      } catch (error) {
        // Continue without enhanced analysis if it fails
      }
    }
    
    const content = await this.llmClient.generateText(
      `Create a "Code Organization Guide" that explains the logic behind this codebase's structure.

Include:
1. **Directory Structure Logic**: Why directories are organized this way
2. **Module Boundaries**: What belongs in each module and why
3. **Naming Conventions**: Patterns in file/folder/variable names
4. **Dependency Flow**: How modules depend on each other
5. **Extension Points**: Where/how to add new functionality

Make it practical - focus on helping someone understand:
- Where to find specific types of code
- Where to add new features
- How pieces fit together
- What patterns to follow

Use the identified extension points and dependency analysis to provide concrete guidance.
Avoid listing every file - focus on the organizing principles.`,
      enhancedContext
    );

    return `# Code Organization Guide

${content}

${GeneratorUtils.createGeneratedByFooter('Code Organization Documentation')}`;
  }

  async createDevelopmentPatterns(repoStructure: RepoStructure, moduleGroups: ModuleGroup[]): Promise<string> {
    const context = this.buildRepoContext(repoStructure, moduleGroups);
    
    // Enhance with code pattern analysis
    let enhancedContext = context;
    if (this.analyzer) {
      try {
        const codePatterns = await this.analyzer.analyzeCodePatterns(repoStructure);
        
        enhancedContext += `\n\nCode Patterns Detected:
${codePatterns.slice(0, 10).map(p => `- ${p.pattern} (${p.type}): ${p.description} - used ${p.frequency} times`).join('\n')}`;
      } catch (error) {
        // Continue without enhanced analysis if it fails
      }
    }
    
    const content = await this.llmClient.generateText(
      `Create a "Development Patterns" guide that teaches how to work effectively in this codebase.

Include:
1. **Common Workflows**: How to add features, fix bugs, make changes
2. **Code Patterns**: Established patterns to follow (with examples)
3. **Testing Strategy**: How testing is approached in this codebase  
4. **Error Handling**: How errors are handled and reported
5. **Performance Considerations**: What to keep in mind for performance

Focus on actionable guidance:
- "When you need to X, do Y"
- "This codebase prefers pattern A over pattern B because..."
- "Always/never do X when..."

Use the detected code patterns to provide specific guidance about what patterns are already established.
Include concrete examples where helpful.
Target both human developers and AI agents.`,
      enhancedContext
    );

    return `# Development Patterns

${content}

${GeneratorUtils.createGeneratedByFooter('Development Patterns Documentation')}`;
  }

  async createAIGuidelines(repoStructure: RepoStructure, moduleGroups: ModuleGroup[]): Promise<string> {
    const context = this.buildRepoContext(repoStructure, moduleGroups);
    
    const content = await this.llmClient.generateText(
      `Create "AI Agent Guidelines" specifically for AI assistants working on this codebase.

Include:
1. **Code Style Preferences**: Specific formatting and style rules
2. **Decision Frameworks**: How to make common technical choices
3. **Risk Areas**: Parts of the code that need extra careful attention
4. **Validation Steps**: Checks to perform before suggesting changes
5. **Context Clues**: How to understand the intent behind existing code

Format as clear, actionable rules:
- "When modifying X, always check Y"
- "Prefer approach A over B in this codebase"
- "Before changing Z, validate that..."

Make it specific to this codebase's patterns and conventions.
Focus on preventing common mistakes and maintaining consistency.`,
      context
    );

    return `# AI Agent Guidelines

${content}

${GeneratorUtils.createGeneratedByFooter('AI Guidelines Documentation')}`;
  }

  async createContributingWorkflows(repoStructure: RepoStructure, moduleGroups: ModuleGroup[]): Promise<string> {
    const context = this.buildRepoContext(repoStructure, moduleGroups);
    
    const content = await this.llmClient.generateText(
      `Create a "Contributing Workflows" guide that explains the processes for working on this codebase.

Include:
1. **Development Lifecycle**: From idea to deployment
2. **Code Review Process**: What gets reviewed and how
3. **Testing Requirements**: What testing is expected
4. **Release Process**: How changes get deployed
5. **Communication**: How team members coordinate

Focus on:
- Step-by-step workflows
- Quality gates and checkpoints  
- Tools and automation used
- Standards and expectations

Make it practical for both new and experienced contributors.
Explain not just what to do, but why these processes exist.`,
      context
    );

    return `# Contributing Workflows

${content}

${GeneratorUtils.createGeneratedByFooter('Contributing Workflows Documentation')}`;
  }

  async createDomainContext(repoStructure: RepoStructure, moduleGroups: ModuleGroup[]): Promise<string> {
    const context = this.buildRepoContext(repoStructure, moduleGroups);
    
    const content = await this.llmClient.generateText(
      `Create a "Domain Context" guide that explains the business/domain knowledge needed to work on this codebase.

Include:
1. **Problem Domain**: What real-world problem this software solves
2. **User Personas**: Who uses this software and how
3. **Business Rules**: Important constraints and requirements
4. **Domain Terminology**: Key terms and their meanings
5. **Success Criteria**: How to measure if the software is successful

Focus on knowledge that would help someone:
- Understand why certain features exist
- Make good decisions about new features
- Recognize when something doesn't fit the domain
- Communicate effectively with stakeholders

Avoid deep technical details - focus on the "why" behind the code.`,
      context
    );

    return `# Domain Context

${content}

${GeneratorUtils.createGeneratedByFooter('Domain Context Documentation')}`;
  }

  createDocumentationIndex(enabledTypes: DocumentationType[]): string {
    const docDescriptions: Record<DocumentationType, { title: string; description: string }> = {
      'mental-model': {
        title: 'Mental Model',
        description: 'Core concepts and metaphors for understanding this codebase'
      },
      'architecture-decisions': {
        title: 'Architecture Decisions',
        description: 'Key design choices and their rationale'
      },
      'code-organization': {
        title: 'Code Organization',
        description: 'Logic behind the codebase structure and patterns'
      },
      'development-patterns': {
        title: 'Development Patterns',
        description: 'How to work effectively in this codebase'
      },
      'ai-guidelines': {
        title: 'AI Guidelines', 
        description: 'Specific guidance for AI agents working on this code'
      },
      'contributing-workflows': {
        title: 'Contributing Workflows',
        description: 'Processes and procedures for contributing'
      },
      'domain-context': {
        title: 'Domain Context',
        description: 'Business and domain knowledge for this project'
      }
    };

    const sections = enabledTypes.map(type => {
      const { title, description } = docDescriptions[type];
      return `### [${title}](./${type}.md)
${description}`;
    }).join('\n\n');

    return `# Documentation

This documentation focuses on helping you understand and work with this codebase effectively through high-level concepts and patterns.

## Documentation Sections

${sections}

## How to Use This Documentation

1. **Start with Mental Model** - Build the right conceptual framework
2. **Review Architecture Decisions** - Understand key design choices  
3. **Study Code Organization** - Learn how the code is structured
4. **Follow Development Patterns** - Work effectively within established patterns
5. **Reference AI Guidelines** - (For AI agents) Follow codebase-specific guidance

## Philosophy

This documentation teaches "how to think about this codebase" rather than "what every file does." The goal is to help both humans and AI agents make good decisions when working with the code.

${GeneratorUtils.createGeneratedByFooter('Documentation Index')}`;
  }

  private buildRepoContext(repoStructure: RepoStructure, moduleGroups: ModuleGroup[]): string {
    const topExtensions = GeneratorUtils.getTopFileExtensions(repoStructure, 5);
    
    return `Repository Analysis:
- Root Path: ${repoStructure.rootPath}
- Total Files: ${repoStructure.totalFiles}
- Total Size: ${GeneratorUtils.formatBytes(repoStructure.totalSize)}
- Primary Languages: ${topExtensions.map(([ext, count]) => `${ext} (${count} files)`).join(', ')}

Module Structure:
${moduleGroups.slice(0, 10).map(m => 
  `- ${m.name}: ${m.description} (${m.files.length} files)`
).join('\n')}

Key Directories:
${[...new Set(repoStructure.files.map(f => f.relativePath.split('/')[0]))]
  .filter(dir => !dir.includes('.'))
  .slice(0, 10)
  .map(dir => `- ${dir}/`)
  .join('\n')}

Configuration Files:
${repoStructure.files
  .filter(f => ['package.json', 'tsconfig.json', '.env', 'README.md'].some(config => f.relativePath.includes(config)))
  .map(f => `- ${f.relativePath}`)
  .join('\n')}`;
  }
}