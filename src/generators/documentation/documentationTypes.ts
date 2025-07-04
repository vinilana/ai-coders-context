export const DOCUMENTATION_TYPES = [
  'mental-model',
  'architecture-decisions',
  'code-organization',
  'development-patterns',
  'ai-guidelines',
  'contributing-workflows',
  'domain-context'
] as const;

export type DocumentationType = typeof DOCUMENTATION_TYPES[number];

// Mutable version for runtime use
export const DOCUMENTATION_TYPES_ARRAY: DocumentationType[] = [...DOCUMENTATION_TYPES];

export const DOCUMENTATION_CONFIG_FILES = [
  'package.json', 'tsconfig.json', 'webpack.config.js', 
  'next.config.js', 'tailwind.config.js', 'README.md',
  '.gitignore', 'Dockerfile', 'docker-compose.yml',
  '.env', '.env.example', 'jest.config.js'
];

export interface DocumentationConfig {
  focusAreas: string[];
  maxContentLength: number;
  includeExamples: boolean;
  enabledTypes?: DocumentationType[];
}