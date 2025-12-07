/**
 * Validation utilities for generators
 *
 * PROBLEM SOLVED:
 * - No validation that agent/doc registries are complete
 * - No way to catch configuration errors at dev time
 * - Inconsistencies between registries went unnoticed
 *
 * NOW:
 * - Validation functions check registry completeness
 * - Cross-registry validation ensures consistency
 * - Can be run as part of build/test process
 */

import { AGENT_REGISTRY } from '../agents/agentRegistry';
import { DOCUMENT_GUIDES } from '../documentation/guideRegistry';
import { MARKER_IDS, getAllDocMarkerIds } from './markerRegistry';

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// AGENT REGISTRY VALIDATION
// ============================================================================

/**
 * Validate that all agents have required fields populated
 */
export function validateAgentRegistry(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const agent of AGENT_REGISTRY) {
    // Required fields
    if (!agent.id) {
      errors.push(`Agent missing ID`);
    }
    if (!agent.title) {
      errors.push(`Agent ${agent.id}: missing title`);
    }
    if (!agent.responsibilities || agent.responsibilities.length === 0) {
      errors.push(`Agent ${agent.id}: missing responsibilities`);
    }
    if (!agent.bestPractices || agent.bestPractices.length === 0) {
      errors.push(`Agent ${agent.id}: missing best practices`);
    }
    if (!agent.docTouchpoints || agent.docTouchpoints.length === 0) {
      warnings.push(`Agent ${agent.id}: no doc touchpoints defined`);
    }

    // Validate doc touchpoints reference valid guides
    for (const touchpoint of agent.docTouchpoints) {
      const guide = DOCUMENT_GUIDES.find(g => g.key === touchpoint);
      if (!guide) {
        errors.push(`Agent ${agent.id}: references unknown doc touchpoint '${touchpoint}'`);
      }
    }
  }

  // Check for duplicate IDs
  const ids = AGENT_REGISTRY.map(a => a.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  for (const dup of duplicates) {
    errors.push(`Duplicate agent ID: ${dup}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// GUIDE REGISTRY VALIDATION
// ============================================================================

/**
 * Validate that all guides have required fields and valid markers
 */
export function validateGuideRegistry(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const validMarkers = getAllDocMarkerIds();

  for (const guide of DOCUMENT_GUIDES) {
    // Required fields
    if (!guide.key) {
      errors.push(`Guide missing key`);
    }
    if (!guide.title) {
      errors.push(`Guide ${guide.key}: missing title`);
    }
    if (!guide.file) {
      errors.push(`Guide ${guide.key}: missing file`);
    }
    if (!guide.marker) {
      errors.push(`Guide ${guide.key}: missing marker`);
    }

    // Validate marker format
    if (guide.marker && !guide.marker.startsWith('agent-update:')) {
      warnings.push(`Guide ${guide.key}: marker should start with 'agent-update:'`);
    }

    // Check file extension
    if (guide.file && !guide.file.endsWith('.md')) {
      warnings.push(`Guide ${guide.key}: file should be a .md file`);
    }
  }

  // Check for duplicate keys
  const keys = DOCUMENT_GUIDES.map(g => g.key);
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
  for (const dup of duplicates) {
    errors.push(`Duplicate guide key: ${dup}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// CROSS-REGISTRY VALIDATION
// ============================================================================

/**
 * Validate consistency across all registries
 */
export function validateAllRegistries(): ValidationResult {
  const agentResult = validateAgentRegistry();
  const guideResult = validateGuideRegistry();

  const errors = [...agentResult.errors, ...guideResult.errors];
  const warnings = [...agentResult.warnings, ...guideResult.warnings];

  // Cross-validate: check that guides referenced by agents exist
  const guideKeys = new Set(DOCUMENT_GUIDES.map(g => g.key));
  for (const agent of AGENT_REGISTRY) {
    for (const touchpoint of agent.docTouchpoints) {
      if (!guideKeys.has(touchpoint)) {
        errors.push(`Agent ${agent.id}: doc touchpoint '${touchpoint}' not found in guide registry`);
      }
    }
  }

  // Check that all guide categories have at least one guide
  const categories = new Set(DOCUMENT_GUIDES.map(g => g.category));
  if (categories.size < 3) {
    warnings.push(`Expected at least 3 guide categories, found ${categories.size}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// CLI HELPER
// ============================================================================

/**
 * Print validation results to console
 */
export function printValidationResults(result: ValidationResult): void {
  if (result.valid) {
    console.log('✅ Validation passed');
  } else {
    console.log('❌ Validation failed');
  }

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    for (const error of result.errors) {
      console.log(`  ❌ ${error}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    for (const warning of result.warnings) {
      console.log(`  ⚠️  ${warning}`);
    }
  }
}
