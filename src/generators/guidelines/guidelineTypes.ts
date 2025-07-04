export const GUIDELINE_CATEGORIES = [
  'testing',
  'frontend',
  'backend', 
  'database',
  'security',
  'performance',
  'code-style',
  'git-workflow',
  'deployment',
  'monitoring',
  'documentation',
  'architecture'
] as const;

export type GuidelineCategory = typeof GUIDELINE_CATEGORIES[number];

export const GUIDELINE_CATEGORIES_ARRAY: GuidelineCategory[] = [...GUIDELINE_CATEGORIES];

export interface GuidelineConfig {
  categories: GuidelineCategory[];
  techStack: string[];
  projectType: 'frontend' | 'backend' | 'fullstack' | 'library' | 'cli' | 'mobile';
  complexity: 'simple' | 'moderate' | 'complex';
  teamSize: 'solo' | 'small' | 'medium' | 'large';
  includeExamples: boolean;
  includeTools: boolean;
}

export interface DetectedTechnology {
  name: string;
  category: 'framework' | 'library' | 'database' | 'tool' | 'language';
  confidence: number;
  files: string[];
  patterns: string[];
}

export interface GuidelineRule {
  rule: string;
  rationale: string;
  examples?: string[];
  antiPatterns?: string[];
  tools?: string[];
  severity: 'must' | 'should' | 'could';
}

export interface GuidelineSection {
  title: string;
  description: string;
  rules: GuidelineRule[];
  relatedCategories?: GuidelineCategory[];
}

export const TECHNOLOGY_PATTERNS: Record<string, {
  files: string[];
  dependencies?: string[];
  patterns?: string[];
  category: DetectedTechnology['category'];
}> = {
  // Frontend Frameworks
  'React': {
    files: ['package.json', '*.jsx', '*.tsx'],
    dependencies: ['react', '@types/react'],
    patterns: ['useState', 'useEffect', 'Component'],
    category: 'framework'
  },
  'Vue': {
    files: ['package.json', '*.vue'],
    dependencies: ['vue', '@vue/'],
    patterns: ['<template>', '<script>', '<style>'],
    category: 'framework'
  },
  'Angular': {
    files: ['package.json', '*.component.ts', 'angular.json'],
    dependencies: ['@angular/'],
    patterns: ['@Component', '@Injectable', '@NgModule'],
    category: 'framework'
  },
  'Next.js': {
    files: ['package.json', 'next.config.js', 'pages/', 'app/'],
    dependencies: ['next'],
    patterns: ['getServerSideProps', 'getStaticProps'],
    category: 'framework'
  },

  // Backend Frameworks
  'Express': {
    files: ['package.json', '*.js', '*.ts'],
    dependencies: ['express', '@types/express'],
    patterns: ['app.get', 'app.post', 'middleware'],
    category: 'framework'
  },
  'Fastify': {
    files: ['package.json'],
    dependencies: ['fastify'],
    patterns: ['fastify.register', 'fastify.get'],
    category: 'framework'
  },
  'NestJS': {
    files: ['package.json', '*.controller.ts', '*.service.ts'],
    dependencies: ['@nestjs/'],
    patterns: ['@Controller', '@Injectable', '@Module'],
    category: 'framework'
  },

  // Databases
  'MongoDB': {
    files: ['package.json'],
    dependencies: ['mongodb', 'mongoose'],
    patterns: ['Schema', 'Model', 'connect'],
    category: 'database'
  },
  'PostgreSQL': {
    files: ['package.json', '*.sql'],
    dependencies: ['pg', 'postgres', 'prisma'],
    patterns: ['SELECT', 'INSERT', 'CREATE TABLE'],
    category: 'database'
  },
  'Redis': {
    files: ['package.json'],
    dependencies: ['redis', 'ioredis'],
    patterns: ['redis.get', 'redis.set'],
    category: 'database'
  },

  // Testing Frameworks
  'Jest': {
    files: ['package.json', '*.test.js', '*.test.ts', 'jest.config.js'],
    dependencies: ['jest', '@types/jest'],
    patterns: ['describe', 'it', 'expect'],
    category: 'tool'
  },
  'Cypress': {
    files: ['package.json', 'cypress.config.js', 'cypress/'],
    dependencies: ['cypress'],
    patterns: ['cy.visit', 'cy.get', 'cy.click'],
    category: 'tool'
  },
  'Vitest': {
    files: ['package.json', 'vitest.config.ts'],
    dependencies: ['vitest'],
    patterns: ['describe', 'it', 'expect'],
    category: 'tool'
  },

  // Build Tools
  'Webpack': {
    files: ['webpack.config.js', 'package.json'],
    dependencies: ['webpack'],
    patterns: ['module.exports', 'entry:', 'output:'],
    category: 'tool'
  },
  'Vite': {
    files: ['vite.config.ts', 'vite.config.js', 'package.json'],
    dependencies: ['vite'],
    patterns: ['defineConfig', 'plugins:', 'build:'],
    category: 'tool'
  },

  // Languages
  'TypeScript': {
    files: ['tsconfig.json', '*.ts', '*.tsx'],
    dependencies: ['typescript', '@types/'],
    patterns: ['interface', 'type', 'enum'],
    category: 'language'
  },
  'Python': {
    files: ['*.py', 'requirements.txt', 'pyproject.toml'],
    patterns: ['def ', 'class ', 'import '],
    category: 'language'
  },
  'Go': {
    files: ['*.go', 'go.mod'],
    patterns: ['func ', 'package ', 'import ('],
    category: 'language'
  },

  // DevOps/Deployment
  'Docker': {
    files: ['Dockerfile', 'docker-compose.yml', '.dockerignore'],
    patterns: ['FROM ', 'RUN ', 'COPY '],
    category: 'tool'
  },
  'Kubernetes': {
    files: ['*.yaml', '*.yml'],
    patterns: ['apiVersion:', 'kind:', 'metadata:'],
    category: 'tool'
  }
};