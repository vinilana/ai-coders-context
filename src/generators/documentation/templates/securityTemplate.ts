/**
 * REFERENCE ONLY - This file is not used by generators anymore.
 *
 * Scaffold structures are now defined in:
 * src/generators/shared/scaffoldStructures.ts
 *
 * This file serves as historical reference for the structure/content
 * that should be generated for this document type.
 *
 * @deprecated Since v2.0.0 scaffold system
 */
import { wrapWithFrontMatter } from './common';

export function renderSecurity(): string {
  const content = `# Security & Compliance Notes

Capture the policies and guardrails that keep this project secure and compliant.

## Authentication & Authorization

Describe identity providers, token formats, session strategies, and role/permission models.

## Secrets & Sensitive Data

Document storage locations (vaults, parameter stores), rotation cadence, encryption practices, and data classifications.

## Compliance & Policies

List applicable standards (GDPR, SOC2, HIPAA, internal policies) and evidence requirements.

## Incident Response

Note on-call contacts, escalation steps, and tooling for detection, triage, and post-incident analysis.
`;

  return wrapWithFrontMatter(content);
}
