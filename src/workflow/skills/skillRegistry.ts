/**
 * Skill Registry
 *
 * Centralized management for skill discovery and metadata retrieval.
 * Supports both built-in and custom skills.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  Skill,
  SkillMetadata,
  DiscoveredSkills,
  BUILT_IN_SKILLS,
  BuiltInSkillType,
  isBuiltInSkill,
  SKILL_TO_PHASES,
} from './types';
import { getBuiltInSkillTemplates } from './skillTemplates';
import { parseFrontmatter } from './frontmatter';
import { PrevcPhase } from '../types';

/** Default skills directory path */
const SKILLS_DIR = '.context/skills';

export class SkillRegistry {
  private readonly repoPath: string;
  private readonly contextPath: string;
  private cache: DiscoveredSkills | null = null;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.contextPath = path.join(repoPath, SKILLS_DIR);
  }

  /**
   * Discover all available skills (built-in + custom)
   */
  async discoverAll(): Promise<DiscoveredSkills> {
    if (this.cache) {
      return this.cache;
    }

    const builtIn = this.discoverBuiltInSkills();
    const custom = this.discoverCustomSkills();

    this.cache = {
      builtIn,
      custom,
      all: [...builtIn, ...custom],
    };

    return this.cache;
  }

  /**
   * Get skill metadata by slug
   */
  async getSkillMetadata(slug: string): Promise<Skill | null> {
    const discovered = await this.discoverAll();
    return discovered.all.find((s) => s.slug === slug) || null;
  }

  /**
   * Get skill content (full SKILL.md)
   */
  async getSkillContent(slug: string): Promise<string | null> {
    const skill = await this.getSkillMetadata(slug);
    if (!skill) return null;

    try {
      return fs.readFileSync(skill.path, 'utf-8');
    } catch (error) {
      console.error(`Failed to read skill file: ${skill.path}`, error);
      return null;
    }
  }

  /**
   * Get skills for a PREVC phase
   */
  async getSkillsForPhase(phase: PrevcPhase): Promise<Skill[]> {
    const discovered = await this.discoverAll();
    return discovered.all.filter((skill) => skill.metadata.phases?.includes(phase));
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Discover built-in skills from templates
   */
  private discoverBuiltInSkills(): Skill[] {
    const skills: Skill[] = [];
    const templates = getBuiltInSkillTemplates();

    for (const skillType of BUILT_IN_SKILLS) {
      const skillPath = path.join(this.contextPath, skillType, 'SKILL.md');

      if (fs.existsSync(skillPath)) {
        const skill = this.parseSkillFile(skillPath, skillType, true);
        if (skill) {
          skills.push(skill);
        }
      } else {
        // Create virtual skill from built-in template
        const skill = this.createBuiltInSkill(skillType, templates);
        skills.push(skill);
      }
    }

    return skills;
  }

  /**
   * Discover custom skills from .context/skills/
   */
  private discoverCustomSkills(): Skill[] {
    const skills: Skill[] = [];

    if (!fs.existsSync(this.contextPath)) {
      return skills;
    }

    try {
      const entries = fs.readdirSync(this.contextPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const slug = entry.name;

        // Skip built-in skills (already handled)
        if (isBuiltInSkill(slug)) continue;

        const skillPath = path.join(this.contextPath, slug, 'SKILL.md');

        if (fs.existsSync(skillPath)) {
          const skill = this.parseSkillFile(skillPath, slug, false);
          if (skill) {
            skills.push(skill);
          }
        }
      }
    } catch (error) {
      console.error('Failed to discover custom skills:', error);
    }

    return skills;
  }

  /**
   * Parse a SKILL.md file
   */
  private parseSkillFile(skillPath: string, slug: string, isBuiltIn: boolean): Skill | null {
    try {
      const content = fs.readFileSync(skillPath, 'utf-8');
      const { metadata, body } = parseFrontmatter(content);

      if (!metadata.name || !metadata.description) {
        console.warn(`Skill ${slug} missing required name or description`);
        return null;
      }

      const skillDir = path.dirname(skillPath);
      const resources = this.discoverResources(skillDir);

      return {
        slug,
        path: skillPath,
        metadata,
        content: body,
        resources,
        isBuiltIn,
      };
    } catch (error) {
      console.error(`Failed to parse skill file: ${skillPath}`, error);
      return null;
    }
  }

  /**
   * Discover resource files in skill directory
   */
  private discoverResources(skillDir: string): string[] {
    const resources: string[] = [];

    try {
      const entries = fs.readdirSync(skillDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name === 'SKILL.md') continue;

        const fullPath = path.join(skillDir, entry.name);

        if (entry.isFile()) {
          resources.push(fullPath);
        } else if (entry.isDirectory()) {
          resources.push(...this.discoverResourcesRecursive(fullPath));
        }
      }
    } catch (error) {
      // Directory might not exist or be readable
    }

    return resources;
  }

  private discoverResourcesRecursive(dir: string): string[] {
    const resources: string[] = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile()) {
          resources.push(fullPath);
        } else if (entry.isDirectory()) {
          resources.push(...this.discoverResourcesRecursive(fullPath));
        }
      }
    } catch (error) {
      // Directory might not exist or be readable
    }

    return resources;
  }

  /**
   * Create a virtual built-in skill (not yet scaffolded)
   */
  private createBuiltInSkill(
    skillType: BuiltInSkillType,
    templates: ReturnType<typeof getBuiltInSkillTemplates>
  ): Skill {
    const template = templates[skillType];

    return {
      slug: skillType,
      path: path.join(this.contextPath, skillType, 'SKILL.md'),
      metadata: {
        name: skillType,
        description: template.description,
        phases: SKILL_TO_PHASES[skillType],
      },
      content: template.content,
      resources: [],
      isBuiltIn: true,
    };
  }
}

/**
 * Factory function
 */
export function createSkillRegistry(repoPath: string): SkillRegistry {
  return new SkillRegistry(repoPath);
}
