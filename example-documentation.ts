/**
 * Example script demonstrating the new Documentation Generator
 * 
 * This example shows how to use the high-level documentation approach
 * that focuses on concepts, patterns, and guidelines rather than file-level details.
 */

import { DocumentationGenerator, DocumentationConfig } from './src/generators/documentation';
import { FileMapper } from './src/utils/fileMapper';
import { BaseLLMClient } from './src/services/baseLLMClient';
import { RepoStructure } from './src/types';

async function demonstrateDocumentationGeneration() {
  // Initialize components
  const fileMapper = new FileMapper();
  const llmClient = new BaseLLMClient('your-api-key', 'google/gemini-2.5-flash-preview-05-20');
  const generator = new DocumentationGenerator(fileMapper, llmClient);

  // Example repository structure (would normally come from scanning)
  const exampleRepoStructure: RepoStructure = {
    rootPath: '/path/to/your/project',
    files: [], // Would be populated by scanning
    directories: [],
    totalFiles: 0,
    totalSize: 0
  };

  // Configuration for documentation generation
  const config: DocumentationConfig = {
    focusAreas: ['architecture', 'patterns', 'guidelines'],
    maxContentLength: 2000,
    includeExamples: true,
    enabledTypes: [
      'mental-model',
      'architecture-decisions',
      'code-organization',
      'development-patterns',
      'ai-guidelines'
    ]
  };

  try {
    // Generate all documentation
    await generator.generateDocumentation(
      exampleRepoStructure,
      './output',
      config,
      true // verbose
    );

    console.log('✅ Documentation generated successfully!');
    console.log('📁 Check ./output/docs/ for the generated documentation');
    
  } catch (error) {
    console.error('❌ Error generating documentation:', error);
  }
}

async function demonstrateSpecificDocuments() {
  // You can also generate specific documents individually
  const fileMapper = new FileMapper();
  const llmClient = new BaseLLMClient('your-api-key', 'google/gemini-2.5-flash-preview-05-20');
  const generator = new DocumentationGenerator(fileMapper, llmClient);

  const exampleRepoStructure: RepoStructure = {
    rootPath: '/path/to/your/project',
    files: [],
    directories: [],
    totalFiles: 0,
    totalSize: 0
  };

  // Generate just the Mental Model document
  await generator.generateMentalModelOnly(exampleRepoStructure, './output', true);
  
  // Generate just the AI Guidelines document  
  await generator.generateAIGuidelinesOnly(exampleRepoStructure, './output', true);

  // Generate just the Architecture Decisions document
  await generator.generateArchitectureDecisionsOnly(exampleRepoStructure, './output', true);
}

// Example of what the new documentation types provide:

const DOCUMENTATION_BENEFITS = {
  'mental-model': {
    purpose: 'Helps developers and AI agents build the right conceptual framework',
    benefits: [
      'Faster onboarding for new team members',
      'Better architectural understanding',
      'Clearer decision-making framework',
      'Consistent mental models across team'
    ]
  },
  
  'architecture-decisions': {
    purpose: 'Documents the "why" behind key design choices',
    benefits: [
      'Preserves institutional knowledge',
      'Helps avoid repeated debates',
      'Guides future architectural decisions',
      'Explains trade-offs and constraints'
    ]
  },
  
  'code-organization': {
    purpose: 'Explains the logic behind code structure',
    benefits: [
      'Clear guidance on where to add new code',
      'Understanding of module boundaries',
      'Consistent naming and organization',
      'Easy navigation for new developers'
    ]
  },
  
  'development-patterns': {
    purpose: 'Teaches how to work effectively in this codebase',
    benefits: [
      'Consistent coding practices',
      'Faster feature development',
      'Better code quality',
      'Clear guidelines for common tasks'
    ]
  },
  
  'ai-guidelines': {
    purpose: 'Specific guidance for AI agents working on this code',
    benefits: [
      'More accurate AI suggestions',
      'Consistent with project patterns',
      'Reduced risk of breaking changes',
      'Better integration with existing code'
    ]
  }
};

console.log('🧠 New Documentation Approach Benefits:');
console.log(JSON.stringify(DOCUMENTATION_BENEFITS, null, 2));

export {
  demonstrateDocumentationGeneration,
  demonstrateSpecificDocuments,
  DOCUMENTATION_BENEFITS
};