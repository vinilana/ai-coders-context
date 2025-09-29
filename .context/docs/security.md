---
id: security
ai_update_goal: "Document authentication, authorization, data protection, and compliance expectations."
required_inputs:
  - "AuthN/AuthZ implementation details"
  - "Secrets storage and rotation policies"
  - "Compliance frameworks or audit requirements"
success_criteria:
  - "Explains how users and services authenticate"
  - "Lists sensitive data classifications and storage locations"
  - "Provides clear escalation paths for security incidents"
related_agents:
  - "security-auditor"
  - "code-reviewer"
---

<!-- agent-update:start:security -->
# Security & Compliance Notes

Capture the policies and guardrails that keep this project secure and compliant.

## Authentication & Authorization
This project is a development scaffolding tool for AI contexts, primarily accessed via GitHub for collaboration and local execution. There is no runtime authentication for end-users, as it runs as a local CLI tool or in CI environments.

- **Identity Providers**: GitHub OAuth for repository access and contributions. CI pipelines (GitHub Actions) authenticate via GitHub Apps or personal access tokens (PATs) with minimal scopes (e.g., repo:read, workflow:update).
- **Token Formats**: JWTs for GitHub API interactions; short-lived tokens for CI jobs (e.g., GITHUB_TOKEN).
- **Session Strategies**: Stateless; no persistent sessions. Local development uses environment variables for any API keys (e.g., for external AI services like OpenAI).
- **Role/Permission Models**: Repository-level permissions via GitHub teams (e.g., maintainers for write access, contributors for PRs). No fine-grained RBAC in the tool itself; authorization is handled at the infrastructure level (e.g., AWS IAM roles for any deployed components, though none are currently deployed).

For services integrating with external APIs (e.g., LLM providers in `src/`), authentication uses API keys stored as secrets (see below).

## Secrets & Sensitive Data
The project handles minimal sensitive data, focusing on development prompts and code generation. No user data is processed at runtime.

- **Data Classifications**:
  - **Public**: All source code in `src/` and `prompts/` directories, documentation.
  - **Internal/Confidential**: API keys for external services (e.g., OpenAI, GitHub PATs for CI); configuration files in `.env` (gitignored).
  - **No PII/Highly Sensitive**: The tool does not collect or store personal data.
- **Storage Locations**: 
  - Local: `.env` files (excluded from Git via `.gitignore`).
  - CI/CD: GitHub Secrets (e.g., `OPENAI_API_KEY`, `GITHUB_TOKEN`) for workflows in `.github/workflows/`.
  - No centralized vault; for production extensions, recommend AWS Secrets Manager or HashiCorp Vault.
- **Rotation Cadence**: Rotate API keys quarterly or upon suspicion of compromise. GitHub Secrets are rotated via UI or API; enforce via policy in team runbooks.
- **Encryption Practices**: Secrets are encrypted at rest in GitHub (using their platform encryption). In transit, use HTTPS for all API calls. Local `.env` files should be encrypted if stored (e.g., via `git-crypt` if needed, though not currently implemented).

Scan for secrets using tools like `truffleHog` in CI (integrated in `package.json` scripts).

## Compliance & Policies
As an open-source development tool, compliance focuses on best practices rather than regulated frameworks. No formal audits are required, but align with open-source security standards.

- **Applicable Standards**: 
  - General: OWASP Top 10 for code security; GitHub's security advisories.
  - Internal: Follow contributor guidelines in `CONTRIBUTING.md`; no GDPR/SOC2/HIPAA applicability due to lack of user data processing.
  - Open Source: Dependency scanning with `npm audit` and Snyk (if integrated); license compliance via `src/` package checks.
- **Evidence Requirements**: Security scans in CI logs (e.g., from GitHub Actions); dependency vulnerability reports in PRs. Maintain a security.md in root for advisories (link: [../SECURITY.md](../SECURITY.md)).

For any extensions handling data, conduct a DPIA and align with relevant regs.

## Incident Response
Security incidents are rare given the project's scope but follow GitHub's ecosystem and basic dev practices.

- **On-Call Contacts**: Primary: Repository maintainers (listed in `README.md` or GitHub repo settings). For urgent issues, use GitHub Issues with `security` label or email security@project-domain.com (TBD; currently route via GitHub Discussions).
- **Escalation Steps**:
  1. **Detection**: Monitor CI failures, secret scans, or dependency alerts via GitHub notifications.
  2. **Triage**: Maintainer reviews issue/PR; use `security-auditor` agent for initial code scan.
  3. **Response**: Rotate affected secrets immediately; patch code and release via PR (e.g., bump version in `package.json`).
  4. **Post-Incident**: Document in a GitHub Issue, update this doc, and notify contributors via release notes.
- **Tooling**: GitHub Advanced Security for code scanning; Dependabot for vuln alerts. No dedicated SIEM; rely on GitHub's audit logs for traceability.

Report vulnerabilities privately via GitHub's security advisory feature.

<!-- agent-readonly:guidance -->
## AI Update Checklist
1. Confirm security libraries and infrastructure match current deployments.
2. Update secrets management details when storage or naming changes.
3. Reflect new compliance obligations or audit findings.
4. Ensure incident response procedures include current contacts and tooling.

<!-- agent-readonly:sources -->
## Acceptable Sources
- Security architecture docs, runbooks, policy handbooks.
- IAM/authorization configuration (code or infrastructure).
- Compliance updates from security or legal teams.

<!-- agent-update:end -->

</file>
