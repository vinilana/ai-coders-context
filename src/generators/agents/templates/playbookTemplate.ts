import { AGENT_RESPONSIBILITIES, AGENT_BEST_PRACTICES } from '../agentConfig';
import { AgentType } from '../agentTypes';
import type { DocTouchpoint } from './types';
import type { AgentPlaybook } from '../../../types';

export function renderAgentPlaybook(
  agentType: AgentType,
  topLevelDirectories: string[],
  touchpoints: DocTouchpoint[],
  generatedAt: string
): AgentPlaybook {
  const title = formatTitle(agentType);
  const responsibilities = AGENT_RESPONSIBILITIES[agentType] || ['Clarify this agent\'s responsibilities.'];
  const bestPractices = AGENT_BEST_PRACTICES[agentType] || ['Document preferred workflows.'];

  const startingPoints = topLevelDirectories.length
    ? topLevelDirectories.map(dir => `TODO: Document when the ${title.toLowerCase()} agent should work inside \`${dir}/\`.`)
    : ['TODO: Highlight directories where this agent typically collaborates.'];

  const touchpointEntries = touchpoints.map(tp => ({
    title: tp.title,
    path: tp.path,
    description: tp.description
  }));

  return {
    id: agentType,
    name: `${title} Agent Playbook`,
    role: title,
    mission: `TODO: Describe how the ${title.toLowerCase()} agent advances the team\'s goals and when to engage it.`,
    responsibilities,
    bestPractices,
    resources: [
      {
        title: 'Documentation index',
        path: '../docs/README.md',
        description: 'Navigation hub for generated documentation guides.'
      },
      {
        title: 'Agent index',
        path: '../index.json',
        description: 'Overview of available agents and how to collaborate with them.'
      },
      {
        title: 'Agent knowledge base',
        path: '../../AGENTS.md',
        description: 'Repository-level guidance for AI collaborators.'
      },
      {
        title: 'Contributor guide',
        path: '../../CONTRIBUTING.md',
        description: 'Project contribution workflow and review expectations.'
      },
      {
        title: 'Repository context JSON',
        path: '../context.json',
        description: 'High-level repository summary shared with agents.'
      },
      {
        title: 'TDD test plan',
        path: '../test-plan.json',
        description: 'Frontend and backend scenarios that drive acceptance criteria.'
      }
    ],
    startingPoints,
    touchpoints: touchpointEntries.length ? touchpointEntries : [
      {
        title: 'TODO: Add documentation touchpoints',
        path: '../docs/README.md',
        description: 'Identify the most relevant documentation references for this agent.'
      }
    ],
    collaborationChecklist: [
      'Confirm assumptions with issue reporters or maintainers before acting.',
      'Review open pull requests affecting this area to avoid duplicated work.',
      'Update referenced documentation and resolve TODO placeholders after changes.',
      'Capture learnings in docs or tickets so future runs build on the context.'
    ],
    successMetrics: {
      codeQuality: [
        'Track reductions in bug count and improved test coverage linked to this agent\'s work.',
        'Monitor technical debt items resolved through agent contributions.'
      ],
      velocity: [
        'Measure time-to-complete for the agent\'s typical tasks.',
        'Review deployment frequency impact when the agent participates in a release.'
      ],
      documentation: [
        'Assess freshness and accuracy of guides touched by this agent.',
        'Gauge onboarding feedback related to resources this agent maintains.'
      ],
      collaboration: [
        'Observe PR review turnaround time and feedback quality.',
        'Track cross-team requests the agent helps unblock.'
      ],
      targetMetrics: [
        'TODO: Define measurable goals for this agent (e.g., "Reduce bug resolution time by 30%").',
        'TODO: Establish review cadence for these metrics with maintainers.'
      ]
    },
    troubleshooting: [
      {
        issue: 'TODO: Document a common problem this agent sees.',
        symptoms: [
          'TODO: List signals that indicate this problem.'
        ],
        rootCause: 'TODO: Explain why the issue occurs.',
        resolutionSteps: [
          'TODO: Provide the recommended fix sequence.',
          'TODO: Include validation steps before closing the task.'
        ],
        prevention: [
          'TODO: Capture habits or guardrails that avoid regressions.'
        ]
      },
      {
        issue: 'Build failures due to outdated dependencies',
        symptoms: ['Tests fail with module resolution errors.'],
        rootCause: 'Package versions became incompatible with the current codebase.',
        resolutionSteps: [
          'Review dependency version ranges in package.json.',
          'Run `npm update` or targeted installs to refresh dependencies.',
          'Execute the relevant test suites before publishing changes.'
        ],
        prevention: ['Keep dependencies updated regularly and maintain a lockfile.']
      }
    ],
    handoffNotes: [
      'Summarize decisions made, remaining risks, and suggested follow-up owners.',
      'Link related issues, PRs, or documents for asynchronous reviewers.'
    ],
    evidenceToCapture: [
      'Reference commits, issues, or ADRs consulted for this task.',
      'Attach command output or logs that informed recommendations.',
      'List follow-up items for maintainers or future agent runs.',
      'Track performance metrics or benchmarks impacted by the work.'
    ],
    notes: [
      'TODO: Record project-specific guardrails or escalation paths for this agent.',
      'TODO: Highlight domain experts who can provide additional context.'
    ],
    generatedAt
  };
}

function formatTitle(agentType: string): string {
  return agentType
    .split('-')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
