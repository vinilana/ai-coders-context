import { ScaffoldStructure } from '../types';

export const securityStructure: ScaffoldStructure = {
  fileType: 'doc',
  documentName: 'security',
  title: 'Security & Compliance Notes',
  description: 'Security policies, authentication, secrets management, and compliance requirements',
  tone: 'formal',
  audience: 'developers',
  sections: [
    {
      heading: 'Security & Compliance Notes',
      order: 1,
      contentType: 'prose',
      guidance: 'Capture the policies and guardrails that keep this project secure and compliant.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Authentication & Authorization',
      order: 2,
      contentType: 'prose',
      guidance: 'Describe identity providers, token formats, session strategies, and role/permission models.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Secrets & Sensitive Data',
      order: 3,
      contentType: 'prose',
      guidance: 'Document storage locations (vaults, parameter stores), rotation cadence, encryption practices, and data classifications.',
      required: true,
      headingLevel: 2,
    },
    {
      heading: 'Compliance & Policies',
      order: 4,
      contentType: 'list',
      guidance: 'List applicable standards (GDPR, SOC2, HIPAA, internal policies) and evidence requirements.',
      required: false,
      headingLevel: 2,
    },
    {
      heading: 'Incident Response',
      order: 5,
      contentType: 'prose',
      guidance: 'Note on-call contacts, escalation steps, and tooling for detection, triage, and post-incident analysis.',
      required: false,
      headingLevel: 2,
    },
  ],
  linkTo: ['architecture.md'],
};
