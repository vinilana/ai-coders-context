import { tool } from 'ai';
import * as path from 'path';
import * as fs from 'fs-extra';
import { z } from 'zod';
import { SemanticContextBuilder } from '../../semantic/contextBuilder';

const FillScaffoldingInputSchema = z.object({
  repoPath: z.string().describe('Repository path'),
  outputDir: z.string().optional().describe('Scaffold directory (default: ./.context)'),
  target: z.enum(['docs', 'agents', 'plans', 'all']).default('all').optional()
    .describe('Which scaffolding to fill')
});

export type FillScaffoldingInput = z.infer<typeof FillScaffoldingInputSchema>;

interface FileToFill {
  path: string;
  relativePath: string;
  currentContent: string;
  suggestedContent: string;
  type: 'doc' | 'agent' | 'plan';
}

export const fillScaffoldingTool = tool({
  description: `Analyze codebase and generate filled content for scaffolding templates.
Returns the content that should be written to each file.
After calling this tool, write the suggestedContent to each file path.`,
  inputSchema: FillScaffoldingInputSchema,
  execute: async (input: FillScaffoldingInput) => {
    const {
      repoPath,
      outputDir: customOutputDir,
      target = 'all'
    } = input;

    const resolvedRepoPath = path.resolve(repoPath);
    const outputDir = customOutputDir
      ? path.resolve(customOutputDir)
      : path.resolve(resolvedRepoPath, '.context');

    try {
      // Validate paths exist
      if (!await fs.pathExists(resolvedRepoPath)) {
        return {
          success: false,
          error: `Repository path does not exist: ${resolvedRepoPath}`
        };
      }

      if (!await fs.pathExists(outputDir)) {
        return {
          success: false,
          error: `Scaffold directory does not exist: ${outputDir}. Run initializeContext first.`
        };
      }

      // Build semantic context for the codebase
      const contextBuilder = new SemanticContextBuilder();
      const semanticContext = await contextBuilder.buildDocumentationContext(resolvedRepoPath);

      const filesToFill: FileToFill[] = [];

      // Process docs
      if (target === 'all' || target === 'docs') {
        const docsDir = path.join(outputDir, 'docs');
        if (await fs.pathExists(docsDir)) {
          const docFiles = await fs.readdir(docsDir);
          for (const file of docFiles) {
            if (!file.endsWith('.md')) continue;
            const filePath = path.join(docsDir, file);
            const currentContent = await fs.readFile(filePath, 'utf-8');

            // Generate suggested content based on file type
            const suggestedContent = generateDocContent(file, currentContent, semanticContext);

            filesToFill.push({
              path: filePath,
              relativePath: path.relative(outputDir, filePath),
              currentContent,
              suggestedContent,
              type: 'doc'
            });
          }
        }
      }

      // Process agents
      if (target === 'all' || target === 'agents') {
        const agentsDir = path.join(outputDir, 'agents');
        if (await fs.pathExists(agentsDir)) {
          const agentFiles = await fs.readdir(agentsDir);
          for (const file of agentFiles) {
            if (!file.endsWith('.md') || file.toLowerCase() === 'readme.md') continue;
            const filePath = path.join(agentsDir, file);
            const currentContent = await fs.readFile(filePath, 'utf-8');

            const agentType = path.basename(file, '.md');
            const suggestedContent = generateAgentContent(agentType, currentContent, semanticContext);

            filesToFill.push({
              path: filePath,
              relativePath: path.relative(outputDir, filePath),
              currentContent,
              suggestedContent,
              type: 'agent'
            });
          }
        }
      }

      // Process plans
      if (target === 'all' || target === 'plans') {
        const plansDir = path.join(outputDir, 'plans');
        if (await fs.pathExists(plansDir)) {
          const planFiles = await fs.readdir(plansDir);
          for (const file of planFiles) {
            if (!file.endsWith('.md') || file.toLowerCase() === 'readme.md') continue;
            const filePath = path.join(plansDir, file);
            const currentContent = await fs.readFile(filePath, 'utf-8');

            filesToFill.push({
              path: filePath,
              relativePath: path.relative(outputDir, filePath),
              currentContent,
              suggestedContent: currentContent, // Plans need manual filling based on goals
              type: 'plan'
            });
          }
        }
      }

      await contextBuilder.shutdown();

      return {
        success: true,
        codebaseContext: semanticContext,
        filesToFill,
        instructions: `For each file in filesToFill:
1. Review the suggestedContent which contains codebase-aware documentation
2. Enhance it with your analysis of the codebase
3. Write the final content to the file path
4. Focus on making the content specific to THIS codebase, not generic`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

function generateDocContent(fileName: string, template: string, context: string): string {
  // Extract key information from semantic context
  const contextLines = context.split('\n');

  // Find architecture info
  const archSection = extractSection(context, '## Architecture', '##');
  const patternsSection = extractSection(context, '## Patterns', '##');
  const statsSection = extractSection(context, '## Stats', '##');

  switch (fileName.toLowerCase()) {
    case 'architecture.md':
      return `# Architecture

## Overview

${archSection || 'This document describes the architecture of the codebase.'}

## Key Patterns

${patternsSection || 'Document the key architectural patterns used.'}

## Project Structure

${statsSection || 'Document the project structure.'}

---
*Generated from codebase analysis. Review and enhance with specific details.*
`;

    case 'project-overview.md':
      return `# Project Overview

## Summary

${statsSection || 'Provide a high-level summary of the project.'}

## Architecture

${archSection || 'Describe the overall architecture.'}

## Key Components

Analyze the codebase to identify and document key components.

---
*Generated from codebase analysis. Review and enhance with specific details.*
`;

    default:
      // For other files, include the semantic context as reference
      return `${template}

<!-- Codebase Context for Reference:
${context.substring(0, 2000)}...
-->
`;
  }
}

function generateAgentContent(agentType: string, template: string, context: string): string {
  const archSection = extractSection(context, '## Architecture', '##');
  const patternsSection = extractSection(context, '## Patterns', '##');

  const title = agentType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return `# ${title} Agent

## Role

This agent specializes in ${agentType.replace(/-/g, ' ')} tasks for this codebase.

## Codebase Context

${archSection || 'Review the codebase architecture.'}

## Key Patterns

${patternsSection || 'Understand the patterns used in this codebase.'}

## Responsibilities

Based on the codebase analysis, this agent should:
1. Understand the project structure and patterns
2. Follow established conventions
3. Focus on ${agentType.replace(/-/g, ' ')} specific tasks

## Relevant Files

Analyze the codebase to identify files relevant to this agent's responsibilities.

---
*Generated from codebase analysis. Review and enhance with specific responsibilities.*
`;
}

function extractSection(content: string, startMarker: string, endMarker: string): string {
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) return '';

  const afterStart = content.substring(startIndex + startMarker.length);
  const endIndex = afterStart.indexOf(endMarker);

  if (endIndex === -1) {
    return afterStart.trim();
  }

  return afterStart.substring(0, endIndex).trim();
}
