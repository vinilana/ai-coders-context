/**
 * Stack Detector Service
 *
 * Detects the technology stack of a project for intelligent defaults.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { glob } from 'glob';

export interface StackInfo {
  primaryLanguage: string | null;
  languages: string[];
  frameworks: string[];
  buildTools: string[];
  testFrameworks: string[];
  files: string[];
  packageManager: string | null;
  isMonorepo: boolean;
  hasDocker: boolean;
  hasCI: boolean;
}

interface DetectionRule {
  file: string | string[];
  language?: string;
  framework?: string;
  buildTool?: string;
  testFramework?: string;
  packageManager?: string;
}

const DETECTION_RULES: DetectionRule[] = [
  // JavaScript/TypeScript
  { file: 'package.json', language: 'javascript' },
  { file: 'tsconfig.json', language: 'typescript' },
  { file: 'next.config.js', framework: 'nextjs' },
  { file: 'next.config.mjs', framework: 'nextjs' },
  { file: 'next.config.ts', framework: 'nextjs' },
  { file: 'nuxt.config.js', framework: 'nuxt' },
  { file: 'nuxt.config.ts', framework: 'nuxt' },
  { file: 'vite.config.js', buildTool: 'vite' },
  { file: 'vite.config.ts', buildTool: 'vite' },
  { file: 'webpack.config.js', buildTool: 'webpack' },
  { file: 'angular.json', framework: 'angular' },
  { file: 'vue.config.js', framework: 'vue' },
  { file: 'svelte.config.js', framework: 'svelte' },
  { file: 'astro.config.mjs', framework: 'astro' },
  { file: 'remix.config.js', framework: 'remix' },
  { file: 'gatsby-config.js', framework: 'gatsby' },
  { file: 'nest-cli.json', framework: 'nestjs' },
  { file: 'jest.config.js', testFramework: 'jest' },
  { file: 'jest.config.ts', testFramework: 'jest' },
  { file: 'vitest.config.ts', testFramework: 'vitest' },
  { file: 'playwright.config.ts', testFramework: 'playwright' },
  { file: 'cypress.config.ts', testFramework: 'cypress' },
  { file: 'yarn.lock', packageManager: 'yarn' },
  { file: 'pnpm-lock.yaml', packageManager: 'pnpm' },
  { file: 'bun.lockb', packageManager: 'bun' },
  { file: 'package-lock.json', packageManager: 'npm' },

  // Python
  { file: 'pyproject.toml', language: 'python' },
  { file: 'setup.py', language: 'python' },
  { file: 'requirements.txt', language: 'python' },
  { file: 'Pipfile', language: 'python', packageManager: 'pipenv' },
  { file: 'poetry.lock', language: 'python', packageManager: 'poetry' },
  { file: 'manage.py', framework: 'django' },
  { file: 'app.py', framework: 'flask' },
  { file: 'fastapi', framework: 'fastapi' },
  { file: 'pytest.ini', testFramework: 'pytest' },
  { file: 'conftest.py', testFramework: 'pytest' },

  // Go
  { file: 'go.mod', language: 'go' },
  { file: 'go.sum', language: 'go' },

  // Rust
  { file: 'Cargo.toml', language: 'rust' },
  { file: 'Cargo.lock', language: 'rust' },

  // Java/Kotlin
  { file: 'pom.xml', language: 'java', buildTool: 'maven' },
  { file: 'build.gradle', language: 'java', buildTool: 'gradle' },
  { file: 'build.gradle.kts', language: 'kotlin', buildTool: 'gradle' },
  { file: 'settings.gradle', buildTool: 'gradle' },
  { file: 'gradlew', buildTool: 'gradle' },

  // Ruby
  { file: 'Gemfile', language: 'ruby' },
  { file: 'Gemfile.lock', language: 'ruby' },
  { file: 'config/routes.rb', framework: 'rails' },

  // PHP
  { file: 'composer.json', language: 'php' },
  { file: 'artisan', framework: 'laravel' },

  // C#/.NET
  { file: '*.csproj', language: 'csharp' },
  { file: '*.sln', language: 'csharp' },

  // Swift
  { file: 'Package.swift', language: 'swift' },
  { file: '*.xcodeproj', language: 'swift' },

  // Elixir
  { file: 'mix.exs', language: 'elixir' },
  { file: 'config/config.exs', framework: 'phoenix' },

  // Infrastructure
  { file: 'Dockerfile', buildTool: 'docker' },
  { file: 'docker-compose.yml', buildTool: 'docker-compose' },
  { file: 'docker-compose.yaml', buildTool: 'docker-compose' },
  { file: 'terraform', buildTool: 'terraform' },
  { file: 'kubernetes', buildTool: 'kubernetes' },
  { file: 'k8s', buildTool: 'kubernetes' },
  { file: 'helm', buildTool: 'helm' },

  // Monorepo
  { file: 'lerna.json', buildTool: 'lerna' },
  { file: 'nx.json', buildTool: 'nx' },
  { file: 'turbo.json', buildTool: 'turborepo' },
  { file: 'pnpm-workspace.yaml', buildTool: 'pnpm-workspace' },
];

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.rb': 'ruby',
  '.php': 'php',
  '.cs': 'csharp',
  '.swift': 'swift',
  '.ex': 'elixir',
  '.exs': 'elixir',
  '.cpp': 'cpp',
  '.c': 'c',
  '.h': 'c',
  '.hpp': 'cpp',
};

export class StackDetector {
  /**
   * Detect the technology stack of a project
   */
  async detect(repoPath: string): Promise<StackInfo> {
    const absolutePath = path.resolve(repoPath);

    const result: StackInfo = {
      primaryLanguage: null,
      languages: [],
      frameworks: [],
      buildTools: [],
      testFrameworks: [],
      files: [],
      packageManager: null,
      isMonorepo: false,
      hasDocker: false,
      hasCI: false,
    };

    // Check detection rules
    for (const rule of DETECTION_RULES) {
      const files = Array.isArray(rule.file) ? rule.file : [rule.file];

      for (const file of files) {
        const matches = await this.checkFileExists(absolutePath, file);
        if (matches.length > 0) {
          result.files.push(...matches);

          if (rule.language && !result.languages.includes(rule.language)) {
            result.languages.push(rule.language);
          }
          if (rule.framework && !result.frameworks.includes(rule.framework)) {
            result.frameworks.push(rule.framework);
          }
          if (rule.buildTool && !result.buildTools.includes(rule.buildTool)) {
            result.buildTools.push(rule.buildTool);
          }
          if (rule.testFramework && !result.testFrameworks.includes(rule.testFramework)) {
            result.testFrameworks.push(rule.testFramework);
          }
          if (rule.packageManager && !result.packageManager) {
            result.packageManager = rule.packageManager;
          }
        }
      }
    }

    // Detect languages by file extensions
    const languageCounts = await this.countLanguagesByExtension(absolutePath);
    for (const [lang, count] of Object.entries(languageCounts)) {
      if (count > 0 && !result.languages.includes(lang)) {
        result.languages.push(lang);
      }
    }

    // Determine primary language (most files)
    if (result.languages.length > 0) {
      const langPriority = ['typescript', 'javascript', 'python', 'go', 'rust', 'java', 'kotlin', 'ruby', 'php', 'csharp', 'swift'];
      result.primaryLanguage = langPriority.find(l => result.languages.includes(l)) || result.languages[0];
    }

    // Check for monorepo indicators
    result.isMonorepo = result.buildTools.some(t =>
      ['lerna', 'nx', 'turborepo', 'pnpm-workspace'].includes(t)
    );

    // Check for Docker
    result.hasDocker = result.buildTools.includes('docker') || result.buildTools.includes('docker-compose');

    // Check for CI
    result.hasCI = await this.hasCI(absolutePath);

    return result;
  }

  /**
   * Get recommended agents based on stack
   */
  getRecommendedAgents(stack: StackInfo): string[] {
    const agents: string[] = ['feature-developer', 'bug-fixer', 'code-reviewer'];

    if (stack.primaryLanguage) {
      if (['typescript', 'javascript'].includes(stack.primaryLanguage)) {
        if (stack.frameworks.some(f => ['nextjs', 'nuxt', 'vue', 'angular', 'svelte', 'react'].includes(f))) {
          agents.push('frontend-specialist');
        }
        if (stack.frameworks.some(f => ['nestjs', 'express', 'fastify'].includes(f))) {
          agents.push('backend-specialist');
        }
      }

      if (['python', 'java', 'go', 'rust', 'csharp'].includes(stack.primaryLanguage)) {
        agents.push('backend-specialist');
      }

      if (stack.frameworks.some(f => ['django', 'rails', 'laravel'].includes(f))) {
        agents.push('database-specialist');
      }
    }

    if (stack.testFrameworks.length > 0) {
      agents.push('test-writer');
    }

    if (stack.hasDocker || stack.hasCI) {
      agents.push('devops-specialist');
    }

    return [...new Set(agents)];
  }

  /**
   * Get recommended rules based on stack
   */
  getRecommendedRules(stack: StackInfo): string[] {
    const rules: string[] = [];

    if (stack.primaryLanguage === 'typescript' || stack.primaryLanguage === 'javascript') {
      rules.push('Use TypeScript strict mode', 'Prefer const over let', 'Use async/await over promises');
    }

    if (stack.primaryLanguage === 'python') {
      rules.push('Follow PEP 8 style guide', 'Use type hints', 'Use virtual environments');
    }

    if (stack.testFrameworks.length > 0) {
      rules.push(`Write tests using ${stack.testFrameworks[0]}`, 'Aim for >80% code coverage');
    }

    if (stack.frameworks.length > 0) {
      rules.push(`Follow ${stack.frameworks[0]} best practices`);
    }

    return rules;
  }

  private async checkFileExists(basePath: string, pattern: string): Promise<string[]> {
    try {
      if (pattern.includes('*')) {
        return await glob(pattern, {
          cwd: basePath,
          absolute: false,
          ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
        });
      }

      const fullPath = path.join(basePath, pattern);
      if (await fs.pathExists(fullPath)) {
        return [pattern];
      }
      return [];
    } catch {
      return [];
    }
  }

  private async countLanguagesByExtension(basePath: string): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};

    try {
      const files = await glob('**/*.*', {
        cwd: basePath,
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', 'vendor/**', '__pycache__/**'],
        nodir: true,
      });

      for (const file of files.slice(0, 1000)) {
        const ext = path.extname(file).toLowerCase();
        const lang = LANGUAGE_EXTENSIONS[ext];
        if (lang) {
          counts[lang] = (counts[lang] || 0) + 1;
        }
      }
    } catch {
      // Ignore errors
    }

    return counts;
  }

  private async hasCI(basePath: string): Promise<boolean> {
    const ciFiles = [
      '.github/workflows',
      '.gitlab-ci.yml',
      '.circleci/config.yml',
      'Jenkinsfile',
      '.travis.yml',
      'azure-pipelines.yml',
      'bitbucket-pipelines.yml',
    ];

    for (const ciFile of ciFiles) {
      const fullPath = path.join(basePath, ciFile);
      if (await fs.pathExists(fullPath)) {
        return true;
      }
    }

    return false;
  }
}
