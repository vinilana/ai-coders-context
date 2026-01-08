export function renderSecurity(): string {
  return `# Security & Compliance Notes

Capture the policies and guardrails that keep this project secure and compliant.

## Authentication & Authorization
- Describe identity providers, token formats, session strategies, and role/permission models.

## Secrets & Sensitive Data
- Storage locations (vaults, parameter stores), rotation cadence, encryption practices, and data classifications.

## Compliance & Policies
- Applicable standards (GDPR, SOC2, HIPAA, internal policies) and evidence requirements.

## Incident Response
- On-call contacts, escalation steps, and tooling for detection, triage, and post-incident analysis.
`;
}
