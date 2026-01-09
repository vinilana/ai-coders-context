import { tool } from 'ai';
import * as path from 'path';
import * as fs from 'fs-extra';
import { z } from 'zod';
import { SemanticContextBuilder } from '../../semantic/contextBuilder';

// Shared context builder instance for efficiency
let sharedContextBuilder: SemanticContextBuilder | null = null;
let cachedContext: { repoPath: string; context: string } | null = null;

async function getOrBuildContext(repoPath: string): Promise<string> {
  if (cachedContext && cachedContext.repoPath === repoPath) {
    return cachedContext.context;
  }

  if (!sharedContextBuilder) {
    sharedContextBuilder = new SemanticContextBuilder();
  }

  const context = await sharedContextBuilder.buildDocumentationContext(repoPath);
  cachedContext = { repoPath, context };
  return context;
}

// ============================================
// listFilesToFill - Lightweight file listing
// ============================================

const ListFilesToFillInputSchema = z.object({
  repoPath: z.string().describe('Repository path'),
  outputDir: z.string().optional().describe('Scaffold directory (default: ./.context)'),
  target: z.enum(['docs', 'agents', 'plans', 'all']).default('all').optional()
    .describe('Which scaffolding to list')
});

export type ListFilesToFillInput = z.infer<typeof ListFilesToFillInputSchema>;

interface FileToFillInfo {
  path: string;
  relativePath: string;
  type: 'doc' | 'agent' | 'plan';
}

export const listFilesToFillTool = tool({
  description: `List scaffold files that need to be filled. Returns only file paths (no content) for efficient listing.
Use this first to get the list, then call fillSingleFile for each file.`,
  inputSchema: ListFilesToFillInputSchema,
  execute: async (input: ListFilesToFillInput) => {
    const { repoPath, outputDir: customOutputDir, target = 'all' } = input;

    const resolvedRepoPath = path.resolve(repoPath);
    const outputDir = customOutputDir
      ? path.resolve(customOutputDir)
      : path.resolve(resolvedRepoPath, '.context');

    try {
      if (!await fs.pathExists(outputDir)) {
        return {
          success: false,
          error: `Scaffold directory does not exist: ${outputDir}. Run initializeContext first.`
        };
      }

      const files: FileToFillInfo[] = [];

      // Collect docs
      if (target === 'all' || target === 'docs') {
        const docsDir = path.join(outputDir, 'docs');
        if (await fs.pathExists(docsDir)) {
          const docFiles = await fs.readdir(docsDir);
          for (const file of docFiles) {
            if (!file.endsWith('.md')) continue;
            files.push({
              path: path.join(docsDir, file),
              relativePath: `docs/${file}`,
              type: 'doc'
            });
          }
        }
      }

      // Collect agents
      if (target === 'all' || target === 'agents') {
        const agentsDir = path.join(outputDir, 'agents');
        if (await fs.pathExists(agentsDir)) {
          const agentFiles = await fs.readdir(agentsDir);
          for (const file of agentFiles) {
            if (!file.endsWith('.md') || file.toLowerCase() === 'readme.md') continue;
            files.push({
              path: path.join(agentsDir, file),
              relativePath: `agents/${file}`,
              type: 'agent'
            });
          }
        }
      }

      // Collect plans
      if (target === 'all' || target === 'plans') {
        const plansDir = path.join(outputDir, 'plans');
        if (await fs.pathExists(plansDir)) {
          const planFiles = await fs.readdir(plansDir);
          for (const file of planFiles) {
            if (!file.endsWith('.md') || file.toLowerCase() === 'readme.md') continue;
            files.push({
              path: path.join(plansDir, file),
              relativePath: `plans/${file}`,
              type: 'plan'
            });
          }
        }
      }

      return {
        success: true,
        files,
        totalCount: files.length,
        instructions: `Found ${files.length} files to fill. Call fillSingleFile for each file path to get suggested content.`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

// ============================================
// fillSingleFile - Process one file at a time
// ============================================

const FillSingleFileInputSchema = z.object({
  repoPath: z.string().describe('Repository path'),
  filePath: z.string().describe('Absolute path to the scaffold file to fill')
});

export type FillSingleFileInput = z.infer<typeof FillSingleFileInputSchema>;

export const fillSingleFileTool = tool({
  description: `Generate suggested content for a single scaffold file.
Call listFilesToFill first to get file paths, then call this for each file.`,
  inputSchema: FillSingleFileInputSchema,
  execute: async (input: FillSingleFileInput) => {
    const { repoPath, filePath } = input;

    const resolvedRepoPath = path.resolve(repoPath);
    const resolvedFilePath = path.resolve(filePath);

    try {
      if (!await fs.pathExists(resolvedFilePath)) {
        return {
          success: false,
          error: `File does not exist: ${resolvedFilePath}`
        };
      }

      // Get or build semantic context (cached)
      const semanticContext = await getOrBuildContext(resolvedRepoPath);

      // Read current content
      const currentContent = await fs.readFile(resolvedFilePath, 'utf-8');
      const fileName = path.basename(resolvedFilePath);
      const parentDir = path.basename(path.dirname(resolvedFilePath));

      // Generate suggested content based on file type
      let suggestedContent: string;
      let fileType: 'doc' | 'agent' | 'plan';

      if (parentDir === 'docs') {
        suggestedContent = generateDocContent(fileName, currentContent, semanticContext);
        fileType = 'doc';
      } else if (parentDir === 'agents') {
        const agentType = path.basename(fileName, '.md');
        suggestedContent = generateAgentContent(agentType, currentContent, semanticContext);
        fileType = 'agent';
      } else if (parentDir === 'plans') {
        suggestedContent = currentContent; // Plans need manual filling
        fileType = 'plan';
      } else {
        suggestedContent = currentContent;
        fileType = 'doc';
      }

      return {
        success: true,
        filePath: resolvedFilePath,
        fileType,
        suggestedContent,
        instructions: `Write this suggestedContent to ${resolvedFilePath}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

// ============================================
// fillScaffolding - Original tool with pagination
// ============================================

const FillScaffoldingInputSchema = z.object({
  repoPath: z.string().describe('Repository path'),
  outputDir: z.string().optional().describe('Scaffold directory (default: ./.context)'),
  target: z.enum(['docs', 'agents', 'plans', 'all']).default('all').optional()
    .describe('Which scaffolding to fill'),
  offset: z.number().optional().describe('Skip first N files (for pagination)'),
  limit: z.number().optional().describe('Max files to return (default: 3, use 0 for all)')
});

export type FillScaffoldingInput = z.infer<typeof FillScaffoldingInputSchema>;

interface FileToFill {
  path: string;
  relativePath: string;
  suggestedContent: string;
  type: 'doc' | 'agent' | 'plan';
}

export const fillScaffoldingTool = tool({
  description: `Analyze codebase and generate filled content for scaffolding templates.
Returns suggestedContent for each file. Supports pagination with offset/limit.
For large projects, use listFilesToFill + fillSingleFile instead.
After calling this tool, write the suggestedContent to each file path.`,
  inputSchema: FillScaffoldingInputSchema,
  execute: async (input: FillScaffoldingInput) => {
    const {
      repoPath,
      outputDir: customOutputDir,
      target = 'all',
      offset = 0,
      limit = 3
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

      // Get or build semantic context (cached for efficiency)
      const semanticContext = await getOrBuildContext(resolvedRepoPath);

      // Collect all file paths first
      const allFiles: { path: string; relativePath: string; type: 'doc' | 'agent' | 'plan' }[] = [];

      // Collect docs
      if (target === 'all' || target === 'docs') {
        const docsDir = path.join(outputDir, 'docs');
        if (await fs.pathExists(docsDir)) {
          const docFiles = await fs.readdir(docsDir);
          for (const file of docFiles) {
            if (!file.endsWith('.md')) continue;
            allFiles.push({
              path: path.join(docsDir, file),
              relativePath: path.relative(outputDir, path.join(docsDir, file)),
              type: 'doc'
            });
          }
        }
      }

      // Collect agents
      if (target === 'all' || target === 'agents') {
        const agentsDir = path.join(outputDir, 'agents');
        if (await fs.pathExists(agentsDir)) {
          const agentFiles = await fs.readdir(agentsDir);
          for (const file of agentFiles) {
            if (!file.endsWith('.md') || file.toLowerCase() === 'readme.md') continue;
            allFiles.push({
              path: path.join(agentsDir, file),
              relativePath: path.relative(outputDir, path.join(agentsDir, file)),
              type: 'agent'
            });
          }
        }
      }

      // Collect plans
      if (target === 'all' || target === 'plans') {
        const plansDir = path.join(outputDir, 'plans');
        if (await fs.pathExists(plansDir)) {
          const planFiles = await fs.readdir(plansDir);
          for (const file of planFiles) {
            if (!file.endsWith('.md') || file.toLowerCase() === 'readme.md') continue;
            allFiles.push({
              path: path.join(plansDir, file),
              relativePath: path.relative(outputDir, path.join(plansDir, file)),
              type: 'plan'
            });
          }
        }
      }

      const totalCount = allFiles.length;

      // Apply pagination (limit=0 means all files)
      const effectiveLimit = limit === 0 ? totalCount : limit;
      const paginatedFiles = allFiles.slice(offset, offset + effectiveLimit);

      // Generate content only for paginated files
      const filesToFill: FileToFill[] = [];
      for (const fileInfo of paginatedFiles) {
        const currentContent = await fs.readFile(fileInfo.path, 'utf-8');
        let suggestedContent: string;

        if (fileInfo.type === 'doc') {
          suggestedContent = generateDocContent(path.basename(fileInfo.path), currentContent, semanticContext);
        } else if (fileInfo.type === 'agent') {
          const agentType = path.basename(fileInfo.path, '.md');
          suggestedContent = generateAgentContent(agentType, currentContent, semanticContext);
        } else {
          suggestedContent = currentContent; // Plans need manual filling
        }

        filesToFill.push({
          path: fileInfo.path,
          relativePath: fileInfo.relativePath,
          suggestedContent,
          type: fileInfo.type
        });
      }

      const hasMore = offset + paginatedFiles.length < totalCount;

      return {
        success: true,
        filesToFill,
        pagination: {
          offset,
          limit: effectiveLimit,
          returned: filesToFill.length,
          totalCount,
          hasMore
        },
        instructions: hasMore
          ? `Processed ${filesToFill.length} of ${totalCount} files. Call again with offset=${offset + paginatedFiles.length} to continue.`
          : `All ${totalCount} files processed. Write each suggestedContent to its file path.`
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
