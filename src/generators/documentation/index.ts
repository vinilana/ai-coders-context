export { DocumentationGenerator } from './documentationGenerator';
export { DocumentationUtils } from './documentationUtils';
export { DocumentationTemplates } from './documentationTemplates';
export { IncrementalDocumentationGenerator } from './incrementalDocumentationGenerator';
export { 
  DOCUMENTATION_TYPES,
  DOCUMENTATION_TYPES_ARRAY,
  DocumentationType, 
  DocumentationConfig,
  DOCUMENTATION_CONFIG_FILES 
} from './documentationTypes';

// Re-export analyzers and guidelines for convenience
export { CodebaseAnalyzer } from '../analyzers';
export { 
  GuidelinesGenerator,
  GuidelinesAnalyzer,
  GuidelineCategory,
  GuidelineConfig
} from '../guidelines';