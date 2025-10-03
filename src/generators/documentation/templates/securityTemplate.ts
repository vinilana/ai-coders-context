
export function renderSecurity(): string {

  return `
# Security & Compliance Notes

Capture the policies and guardrails that keep this project secure and compliant.

## Authentication & Authorization
- Describe identity providers, token formats, session strategies, and role/permission models.

## Secrets & Sensitive Data
- Storage locations (vaults, parameter stores), rotation cadence, encryption practices, and data classifications.

## Compliance & Policies
- Applicable standards (GDPR, SOC2, HIPAA, internal policies) and evidence requirements.

## Incident Response
- On-call contacts, escalation steps, and tooling for detection, triage, and post-incident analysis.

## Update Checklist
1. Confirm security libraries and infrastructure match current deployments.
2. Update secrets management details when storage or naming changes.
3. Reflect new compliance obligations or audit findings.
4. Ensure incident response procedures include current contacts and tooling.

## Recommended Sources
- Security architecture docs, runbooks, policy handbooks.
- IAM/authorization configuration (code or infrastructure).
- Compliance updates from security or legal teams.

`;
}
