/**
 * Skill Gateway Handler
 *
 * Handles skill management operations.
 * Replaces: listSkills, getSkillContent, getSkillsForPhase, scaffoldSkills,
 *           exportSkills, fillSkills
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { VERSION } from '../../../version';
import { PHASE_NAMES_EN, PrevcPhase } from '../../../workflow';
import { getOrBuildContext } from '../../ai/tools';

import type { SkillParams } from './types';
import type { MCPToolResponse } from './response';
import { createJsonResponse, createErrorResponse } from './response';
import { minimalUI, mockTranslate } from './shared';

export interface SkillOptions {
  repoPath: string;
}

/**
 * Get fill instructions for a skill based on its type.
 */
function getSkillFillInstructions(skillSlug: string): string {
  const instructions: Record<string, string> = {
    'commit-message': `Fill this skill with:
- Commit message format conventions for this project
- Examples of good commit messages from the codebase
- Branch naming conventions if applicable
- Semantic versioning guidelines`,

    'pr-review': `Fill this skill with:
- PR review checklist specific to this codebase
- Code quality standards to check
- Testing requirements before merge
- Documentation expectations`,

    'code-review': `Fill this skill with:
- Code review guidelines for this project
- Common patterns to look for
- Security and performance considerations
- Style and convention checks`,

    'test-generation': `Fill this skill with:
- Testing framework and conventions used
- Test file organization patterns
- Mocking strategies for this codebase
- Coverage requirements`,

    'documentation': `Fill this skill with:
- Documentation standards for this project
- JSDoc/TSDoc conventions
- README structure expectations
- API documentation guidelines`,

    'refactoring': `Fill this skill with:
- Refactoring patterns common in this codebase
- Code smell detection guidelines
- Safe refactoring procedures
- Testing requirements after refactoring`,

    'bug-investigation': `Fill this skill with:
- Debugging workflow for this codebase
- Common bug patterns and their fixes
- Logging and error handling conventions
- Test verification steps`,

    'feature-breakdown': `Fill this skill with:
- Feature decomposition approach
- Task estimation guidelines
- Dependency identification process
- Integration points to consider`,

    'api-design': `Fill this skill with:
- API design patterns used in this project
- Endpoint naming conventions
- Request/response format standards
- Versioning and deprecation policies`,

    'security-audit': `Fill this skill with:
- Security checklist for this codebase
- Common vulnerabilities to check
- Authentication/authorization patterns
- Data validation requirements`,
  };

  return instructions[skillSlug] || `Fill this skill with project-specific content for ${skillSlug}:
- Identify relevant patterns from the codebase
- Include specific examples from the project
- Add conventions and best practices
- Reference important files and components`;
}

/**
 * Build comprehensive fill prompt for skills.
 */
function buildSkillFillPrompt(
  skills: Array<{
    skillPath: string;
    skillSlug: string;
    skillName: string;
    description: string;
    instructions: string;
  }>,
  semanticContext?: string
): string {
  const lines: string[] = [];

  lines.push('# Skill Fill Instructions');
  lines.push('');
  lines.push('You MUST fill each of the following skill files with codebase-specific content.');
  lines.push('');

  if (semanticContext) {
    lines.push('## Codebase Context');
    lines.push('');
    lines.push('Use this semantic context to understand the codebase:');
    lines.push('');
    lines.push('```');
    lines.push(semanticContext.length > 6000 ? semanticContext.substring(0, 6000) + '\n...(truncated)' : semanticContext);
    lines.push('```');
    lines.push('');
  }

  lines.push('## Skills to Fill');
  lines.push('');

  for (const skill of skills) {
    lines.push(`### ${skill.skillName} (${skill.skillSlug})`);
    lines.push(`**Path:** \`${skill.skillPath}\``);
    if (skill.description) {
      lines.push(`**Description:** ${skill.description}`);
    }
    lines.push('');
    lines.push('**Fill Instructions:**');
    lines.push(skill.instructions);
    lines.push('');
  }

  lines.push('## Action Required');
  lines.push('');
  lines.push('For each skill listed above:');
  lines.push('1. Read the current skill template');
  lines.push('2. Generate codebase-specific content based on the instructions and context');
  lines.push('3. Write the filled content to the skill file');
  lines.push('');
  lines.push('Each skill should be personalized with:');
  lines.push('- Specific examples from this codebase');
  lines.push('- Project-specific conventions and patterns');
  lines.push('- References to relevant files and components');
  lines.push('');
  lines.push('DO NOT leave placeholder text. Each skill must have meaningful, project-specific content.');

  return lines.join('\n');
}

/**
 * Handles skill gateway actions for skill management.
 */
export async function handleSkill(
  params: SkillParams,
  options: SkillOptions
): Promise<MCPToolResponse> {
  const repoPath = options.repoPath || process.cwd();
  const { createSkillRegistry, BUILT_IN_SKILLS } = require('../../../workflow/skills');

  try {
    switch (params.action) {
      case 'list': {
        const registry = createSkillRegistry(repoPath);
        const discovered = await registry.discoverAll();

        const format = (skill: any) => ({
          slug: skill.slug,
          name: skill.metadata.name,
          description: skill.metadata.description,
          phases: skill.metadata.phases || [],
          isBuiltIn: skill.isBuiltIn,
          ...(params.includeContent ? { content: skill.content } : {}),
        });

        return createJsonResponse({
          success: true,
          totalSkills: discovered.all.length,
          builtInCount: discovered.builtIn.length,
          customCount: discovered.custom.length,
          skills: {
            builtIn: discovered.builtIn.map(format),
            custom: discovered.custom.map(format),
          },
        });
      }

      case 'getContent': {
        const registry = createSkillRegistry(repoPath);
        const content = await registry.getSkillContent(params.skillSlug!);

        if (!content) {
          return createJsonResponse({
            success: false,
            error: `Skill not found: ${params.skillSlug}`,
            availableSkills: BUILT_IN_SKILLS,
          });
        }

        const skill = await registry.getSkillMetadata(params.skillSlug!);

        return createJsonResponse({
          success: true,
          skill: {
            slug: params.skillSlug,
            name: skill?.metadata.name,
            description: skill?.metadata.description,
            phases: skill?.metadata.phases,
            isBuiltIn: skill?.isBuiltIn,
          },
          content,
        });
      }

      case 'getForPhase': {
        const registry = createSkillRegistry(repoPath);
        const skills = await registry.getSkillsForPhase(params.phase!);

        return createJsonResponse({
          success: true,
          phase: params.phase,
          phaseName: PHASE_NAMES_EN[params.phase as PrevcPhase],
          skills: skills.map((s: any) => ({
            slug: s.slug,
            name: s.metadata.name,
            description: s.metadata.description,
            isBuiltIn: s.isBuiltIn,
          })),
          count: skills.length,
        });
      }

      case 'scaffold': {
        const { createSkillGenerator } = require('../../../generators/skills');
        const generator = createSkillGenerator({ repoPath });
        const result = await generator.generate({ skills: params.skills, force: params.includeBuiltIn });

        return createJsonResponse({
          success: true,
          skillsDir: result.skillsDir,
          generated: result.generatedSkills,
          skipped: result.skippedSkills,
          indexPath: result.indexPath,
        });
      }

      case 'export': {
        const { SkillExportService } = require('../../export/skillExportService');
        const exportService = new SkillExportService({
          ui: minimalUI,
          t: mockTranslate,
          version: VERSION,
        });

        const result = await exportService.run(repoPath, {
          preset: params.preset,
          includeBuiltIn: params.includeBuiltIn,
          force: false,
        });

        return createJsonResponse({
          success: result.filesCreated > 0,
          targets: result.targets,
          skillsExported: result.skillsExported,
          filesCreated: result.filesCreated,
          filesSkipped: result.filesSkipped,
        });
      }

      case 'fill': {
        const registry = createSkillRegistry(repoPath);
        const skillsDir = path.join(repoPath, '.context', 'skills');

        if (!await fs.pathExists(skillsDir)) {
          return createJsonResponse({
            success: false,
            error: 'Skills directory does not exist. Run skill({ action: "scaffold" }) first.',
            skillsDir,
          });
        }

        const discovered = await registry.discoverAll();
        let skillsToFill = discovered.all;

        if (params.skills && params.skills.length > 0) {
          skillsToFill = skillsToFill.filter((s: { slug: string }) => params.skills!.includes(s.slug));
        }

        if (!params.includeBuiltIn) {
          skillsToFill = skillsToFill.filter((s: { path: string }) => {
            if (!fs.existsSync(s.path)) return true;
            const content = fs.readFileSync(s.path, 'utf-8');
            return content.includes('<!-- TODO') || content.includes('[PLACEHOLDER]') || content.length < 500;
          });
        }

        if (skillsToFill.length === 0) {
          return createJsonResponse({
            success: true,
            message: 'No skills need filling. Use includeBuiltIn: true to refill existing skills.',
            skillsDir,
          });
        }

        let semanticContext: string | undefined;
        try {
          semanticContext = await getOrBuildContext(repoPath);
        } catch {
          semanticContext = undefined;
        }

        const fillInstructions = skillsToFill.map((skill: { path: string; slug: string; metadata: { name?: string; description?: string }; isBuiltIn: boolean }) => ({
          skillPath: skill.path,
          skillSlug: skill.slug,
          skillName: skill.metadata.name || skill.slug,
          description: skill.metadata.description || '',
          isBuiltIn: skill.isBuiltIn,
          instructions: getSkillFillInstructions(skill.slug),
        }));

        const fillPrompt = buildSkillFillPrompt(fillInstructions, semanticContext);

        return createJsonResponse({
          success: true,
          skillsToFill: fillInstructions,
          semanticContext,
          fillPrompt,
          instructions: 'IMPORTANT: You MUST now fill each skill file using the semantic context and fill instructions provided. Write the content to each skillPath.',
        });
      }

      default:
        return createErrorResponse(`Unknown skill action: ${params.action}`);
    }
  } catch (error) {
    return createErrorResponse(error);
  }
}
