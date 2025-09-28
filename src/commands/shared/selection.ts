import { DOCUMENT_GUIDE_KEYS } from '../../generators/documentation/guideRegistry';
import { AGENT_TYPES } from '../../generators/agents/agentTypes';

export interface SelectionParseResult {
  selected?: string[];
  invalid: string[];
  provided: boolean;
  explicitNone: boolean;
}

export function parseDocSelection(input: unknown): SelectionParseResult {
  if (input === undefined) {
    return { selected: undefined, invalid: [], provided: false, explicitNone: false };
  }

  if (Array.isArray(input) && input.length === 0) {
    return { selected: [], invalid: [], provided: true, explicitNone: true };
  }

  const values = toStringArray(input);
  const normalized = values.map(value => value.toLowerCase().replace(/\.md$/, ''));
  const valid = Array.from(new Set(normalized.filter(key => DOCUMENT_GUIDE_KEYS.includes(key))));
  const invalid = normalized.filter(key => !DOCUMENT_GUIDE_KEYS.includes(key));

  if (values.length > 0 && valid.length === 0 && invalid.length > 0) {
    return { selected: undefined, invalid, provided: true, explicitNone: false };
  }

  return { selected: valid.length > 0 ? valid : undefined, invalid, provided: true, explicitNone: false };
}

export function parseAgentSelection(input: unknown): SelectionParseResult {
  if (input === undefined) {
    return { selected: undefined, invalid: [], provided: false, explicitNone: false };
  }

  if (Array.isArray(input) && input.length === 0) {
    return { selected: [], invalid: [], provided: true, explicitNone: true };
  }

  const values = toStringArray(input);
  const normalized = values.map(value => value.toLowerCase().replace(/\.md$/, ''));
  const allowed = new Set(AGENT_TYPES);
  const valid = Array.from(new Set(normalized.filter(value => allowed.has(value as typeof AGENT_TYPES[number]))));
  const invalid = normalized.filter(value => !allowed.has(value as typeof AGENT_TYPES[number]));

  if (values.length > 0 && valid.length === 0 && invalid.length > 0) {
    return { selected: undefined, invalid, provided: true, explicitNone: false };
  }

  return { selected: valid.length > 0 ? valid : undefined, invalid, provided: true, explicitNone: false };
}

export function shouldGenerateDocs(resolvedType: 'docs' | 'agents' | 'both', selection: SelectionParseResult): boolean {
  if (selection.explicitNone) {
    return false;
  }

  if (resolvedType === 'agents') {
    return false;
  }

  if (!selection.provided) {
    return resolvedType === 'docs' || resolvedType === 'both';
  }

  if (selection.selected && selection.selected.length === 0) {
    return false;
  }

  return resolvedType === 'docs' || resolvedType === 'both';
}

export function shouldGenerateAgents(resolvedType: 'docs' | 'agents' | 'both', selection: SelectionParseResult): boolean {
  if (selection.explicitNone) {
    return false;
  }

  if (resolvedType === 'docs') {
    return false;
  }

  if (!selection.provided) {
    return resolvedType === 'agents' || resolvedType === 'both';
  }

  if (selection.selected && selection.selected.length === 0) {
    return false;
  }

  return resolvedType === 'agents' || resolvedType === 'both';
}

export function determineScaffoldType(docSelection?: string[], agentSelection?: string[]): 'docs' | 'agents' | 'both' {
  const docsSelected = docSelection === undefined ? true : docSelection.length > 0;
  const agentsSelected = agentSelection === undefined ? true : agentSelection.length > 0;

  if (docsSelected && agentsSelected) return 'both';
  if (docsSelected) return 'docs';
  return 'agents';
}

function toStringArray(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map(item => item.toString().trim()).filter(Boolean);
  }
  if (input === null || input === undefined) {
    return [];
  }
  return input
    .toString()
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
}
