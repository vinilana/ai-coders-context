/**
 * Skill Generator
 *
 * Scaffolds skill directories and SKILL.md files.
 * Generates frontmatter-only files (scaffold v2) for AI to fill.
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
} from '../../workflow/skills';
import { getDefaultPhases } from './templates/skillTemplate';
import { generateSkillsIndex } from './templates/indexTemplate';
import { PrevcPhase } from '../../workflow/types';
import {
  createSkillFrontmatter,
  serializeFrontmatter,
} from '../../types/scaffoldFrontmatter';

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

      // Generate frontmatter-only content (scaffold v2)
      let description: string;
      let phases: PrevcPhase[];

      if (isBuiltInSkill(skillName)) {
        // Use built-in template description
        const template = templates[skillName as BuiltInSkillType];
        description = template.description;
        phases = SKILL_TO_PHASES[skillName as BuiltInSkillType];
      } else {
        // Default description for custom skill
        description = `On-demand expertise for ${skillName}`;
        phases = getDefaultPhases(skillName);
      }

      // Create frontmatter-only content
      const frontmatter = createSkillFrontmatter(
        this.formatSkillTitle(skillName),
        description,
        skillName,
        { phases }
      );
      const content = serializeFrontmatter(frontmatter) + '\n';

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
   * Format skill name as display title
   */
  private formatSkillTitle(skillName: string): string {
    return skillName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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

    // Generate frontmatter-only content (scaffold v2)
    const frontmatter = createSkillFrontmatter(
      this.formatSkillTitle(name),
      description,
      name,
      { phases }
    );
    const content = serializeFrontmatter(frontmatter) + '\n';

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
