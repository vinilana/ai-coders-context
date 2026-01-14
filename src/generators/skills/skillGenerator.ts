/**
 * Skill Generator
 *
 * Scaffolds skill directories and SKILL.md files.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  BUILT_IN_SKILLS,
  BuiltInSkillType,
  isBuiltInSkill,
  createSkillRegistry,
  getBuiltInSkillTemplates,
  SKILL_TO_PHASES,
  wrapWithFrontmatter,
} from '../../workflow/skills';
import { generateSkillContent, getDefaultPhases } from './templates/skillTemplate';
import { generateSkillsIndex } from './templates/indexTemplate';
import { PrevcPhase } from '../../workflow/types';

export interface SkillGeneratorOptions {
  /** Repository path */
  repoPath: string;
  /** Output directory (default: .context) */
  outputDir?: string;
  /** Skills to generate (default: all built-in) */
  skills?: string[];
  /** Force overwrite existing files */
  force?: boolean;
}

export interface SkillGeneratorResult {
  skillsDir: string;
  generatedSkills: string[];
  skippedSkills: string[];
  indexPath: string;
}

export class SkillGenerator {
  private readonly repoPath: string;
  private readonly outputDir: string;
  private readonly skillsDir: string;

  constructor(options: SkillGeneratorOptions) {
    this.repoPath = options.repoPath;
    this.outputDir = options.outputDir || '.context';
    this.skillsDir = path.join(this.repoPath, this.outputDir, 'skills');
  }

  /**
   * Generate skills directory with selected skills
   */
  async generate(options: {
    skills?: string[];
    force?: boolean;
  } = {}): Promise<SkillGeneratorResult> {
    const { skills = [...BUILT_IN_SKILLS], force = false } = options;

    // Create skills directory
    fs.mkdirSync(this.skillsDir, { recursive: true });

    const generatedSkills: string[] = [];
    const skippedSkills: string[] = [];

    const templates = getBuiltInSkillTemplates();

    for (const skillName of skills) {
      const skillDir = path.join(this.skillsDir, skillName);
      const skillPath = path.join(skillDir, 'SKILL.md');

      // Check if skill already exists
      if (fs.existsSync(skillPath) && !force) {
        skippedSkills.push(skillName);
        continue;
      }

      // Create skill directory
      fs.mkdirSync(skillDir, { recursive: true });

      // Generate SKILL.md content
      let content: string;

      if (isBuiltInSkill(skillName)) {
        // Use built-in template
        const template = templates[skillName as BuiltInSkillType];
        const phases = SKILL_TO_PHASES[skillName as BuiltInSkillType];

        content = wrapWithFrontmatter(
          { name: skillName, description: template.description, phases },
          template.content
        );
      } else {
        // Generate empty template for custom skill
        content = generateSkillContent({
          name: skillName,
          description: `TODO: Describe when to use ${skillName}`,
          phases: getDefaultPhases(skillName),
        });
      }

      // Write SKILL.md
      fs.writeFileSync(skillPath, content, 'utf-8');
      generatedSkills.push(skillName);
    }

    // Generate index README
    const indexPath = await this.generateIndex();

    return {
      skillsDir: this.skillsDir,
      generatedSkills,
      skippedSkills,
      indexPath,
    };
  }

  /**
   * Generate a single custom skill
   */
  async generateCustomSkill(options: {
    name: string;
    description: string;
    phases?: PrevcPhase[];
    force?: boolean;
  }): Promise<string> {
    const { name, description, phases = ['E'], force = false } = options;

    const skillDir = path.join(this.skillsDir, name);
    const skillPath = path.join(skillDir, 'SKILL.md');

    if (fs.existsSync(skillPath) && !force) {
      throw new Error(`Skill ${name} already exists. Use --force to overwrite.`);
    }

    // Create skill directory
    fs.mkdirSync(skillDir, { recursive: true });

    // Generate content
    const content = generateSkillContent({
      name,
      description,
      phases,
    });

    // Write SKILL.md
    fs.writeFileSync(skillPath, content, 'utf-8');

    // Update index
    await this.generateIndex();

    return skillPath;
  }

  /**
   * Generate README.md index
   */
  async generateIndex(): Promise<string> {
    const registry = createSkillRegistry(this.repoPath);
    const discovered = await registry.discoverAll();

    const content = generateSkillsIndex({
      skills: discovered.all,
      projectName: path.basename(this.repoPath),
    });

    const indexPath = path.join(this.skillsDir, 'README.md');
    fs.writeFileSync(indexPath, content, 'utf-8');

    return indexPath;
  }

}

/**
 * Factory function
 */
export function createSkillGenerator(options: SkillGeneratorOptions): SkillGenerator {
  return new SkillGenerator(options);
}
