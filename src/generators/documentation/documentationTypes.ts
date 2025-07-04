export const DOCUMENTATION_TYPES = [
  'main-index',
  'overview',
  'architecture',
  'api-reference',
  'configuration',
  'development',
  'deployment',
  'troubleshooting'
] as const;

export type DocumentationType = typeof DOCUMENTATION_TYPES[number];

export const DOCUMENTATION_CONFIG_FILES = [
  'package.json', 'tsconfig.json', 'webpack.config.js', 
  'next.config.js', 'tailwind.config.js', 'README.md',
  '.gitignore', 'Dockerfile', 'docker-compose.yml',
  '.env', '.env.example', 'jest.config.js'
];