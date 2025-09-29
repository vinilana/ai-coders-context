import { createFrontMatter } from './frontMatter';

export function renderOnboarding(): string {
  const frontMatter = createFrontMatter({
    id: 'onboarding-guide',
    goal: 'Provide a comprehensive checklist for new team members to get productive quickly.',
    requiredInputs: [
      'Development environment setup instructions',
      'Required access and permissions',
      'Team communication channels and processes'
    ],
    successCriteria: [
      'New developers can set up environment independently',
      'All required access and tools are documented',
      'Learning resources and first tasks are clearly identified'
    ],
    relatedAgents: ['documentation-writer', 'architect-specialist']
  });

  return `${frontMatter}
<!-- agent-update:start:onboarding-guide -->
# Onboarding Guide

Welcome to the team! This guide will help you get set up and productive quickly.

## Onboarding Checklist

### Day 1: Access & Accounts
- [ ] **Email account** - Verify access to team email
- [ ] **Chat/Communication**
  - [ ] Slack/Teams workspace invitation
  - [ ] Join relevant channels: #engineering, #team-name, #general
- [ ] **Code repository access**
  - [ ] GitHub/GitLab account added to organization
  - [ ] SSH key configured for git operations
  - [ ] Clone main repository
- [ ] **Issue tracking**
  - [ ] Jira/GitHub Issues access
  - [ ] Assigned to team project/board
- [ ] **Documentation access**
  - [ ] Wiki/Confluence access
  - [ ] Shared drive access (Google Drive, Notion, etc.)
- [ ] **Meeting invites**
  - [ ] Added to recurring team meetings
  - [ ] Calendar access configured

### Day 1-2: Development Environment
- [ ] **Install required software**
  - [ ] Node.js (version: TODO: specify version)
  - [ ] npm/yarn package manager
  - [ ] Git (latest stable version)
  - [ ] Code editor/IDE (VS Code, WebStorm, etc.)
  - [ ] Docker Desktop (if applicable)
  - [ ] Database client (if applicable)
- [ ] **Configure development environment**
  \`\`\`bash
  # Clone repository
  git clone git@github.com:org/repo.git
  cd repo

  # Copy environment configuration
  cp .env.example .env
  # Edit .env with local settings

  # Install dependencies
  npm install

  # Run database migrations (if applicable)
  npm run migrate

  # Start development server
  npm run dev
  \`\`\`
- [ ] **Verify environment setup**
  - [ ] Application runs locally
  - [ ] Tests pass: \`npm test\`
  - [ ] Linting works: \`npm run lint\`
  - [ ] Can access local application in browser
- [ ] **Editor configuration**
  - [ ] Install recommended VS Code extensions (see .vscode/extensions.json)
  - [ ] Configure code formatting (Prettier, ESLint)
  - [ ] Set up debugger configuration

### Day 2-3: Project Understanding
- [ ] **Read core documentation**
  - [ ] [Project Overview](./project-overview.md)
  - [ ] [Architecture Notes](./architecture.md)
  - [ ] [Development Workflow](./development-workflow.md)
  - [ ] [Testing Strategy](./testing.md)
- [ ] **Understand the codebase**
  - [ ] Explore project structure
  - [ ] Review main application entry points
  - [ ] Understand key modules and their responsibilities
  - [ ] Read recent pull requests to see code review standards
- [ ] **Meet the team**
  - [ ] 1:1 with manager
  - [ ] Meet team members
  - [ ] Meet cross-functional partners (Product, Design, QA)
  - [ ] Understand team roles and responsibilities

### Week 1: First Contributions
- [ ] **Start with good first issues**
  - [ ] Find issues tagged "good-first-issue" or similar
  - [ ] Complete 1-2 small bug fixes or documentation updates
  - [ ] Go through code review process
  - [ ] Get first PR merged
- [ ] **Learn the workflow**
  - [ ] Create feature branch
  - [ ] Make changes and write tests
  - [ ] Submit pull request
  - [ ] Address review feedback
  - [ ] Merge and deploy (or see deployment process)
- [ ] **Set up productivity tools**
  - [ ] Configure git aliases
  - [ ] Set up any team-specific CLI tools
  - [ ] Bookmark important dashboards/tools
  - [ ] Join pair programming sessions

### Week 2-4: Ramp Up
- [ ] **Take on larger tasks**
  - [ ] Pick up medium complexity issues
  - [ ] Work on feature development
  - [ ] Participate in design discussions
- [ ] **Deepen knowledge**
  - [ ] Understand deployment process
  - [ ] Learn monitoring and debugging tools
  - [ ] Review production architecture
  - [ ] Shadow on-call engineer (if applicable)
- [ ] **Contribute to team processes**
  - [ ] Attend sprint planning/standup
  - [ ] Participate in retrospectives
  - [ ] Update documentation as you learn

### Month 2-3: Full Productivity
- [ ] **Own features end-to-end**
  - [ ] Design, implement, test, and deploy features
  - [ ] Participate in on-call rotation (if applicable)
  - [ ] Help onboard newer team members
- [ ] **Identify improvements**
  - [ ] Suggest process improvements
  - [ ] Improve documentation
  - [ ] Refactor problem areas

---

## Development Environment Setup

### Prerequisites
**Operating System:**
- macOS 10.15+ or Linux (Ubuntu 20.04+)
- Windows 10/11 with WSL2 (Windows Subsystem for Linux)

**Required Tools:**
- **Node.js:** v18.0.0 or higher ([Download](https://nodejs.org/))
- **npm:** v9.0.0 or higher (comes with Node.js)
- **Git:** v2.30.0 or higher ([Download](https://git-scm.com/))
- **Docker:** (Optional) For running services locally

### Step-by-Step Setup

#### 1. Install Node.js
\`\`\`bash
# macOS (using Homebrew)
brew install node@18

# Linux (using nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show v9.x.x
\`\`\`

#### 2. Configure Git
\`\`\`bash
# Set your identity
git config --global user.name "Your Name"
git config --global user.email "your.email@company.com"

# Set up SSH key for GitHub
ssh-keygen -t ed25519 -C "your.email@company.com"
# Follow prompts, then add key to GitHub:
# https://github.com/settings/keys

# Test SSH connection
ssh -T git@github.com
\`\`\`

#### 3. Clone and Setup Project
\`\`\`bash
# Clone repository
git clone git@github.com:org/repo.git
cd repo

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your local settings
# Required variables:
# - DATABASE_URL (if using database)
# - API_KEY (if applicable)
# - Any other project-specific variables
\`\`\`

#### 4. Database Setup (if applicable)
\`\`\`bash
# Option 1: Docker (recommended)
docker-compose up -d db

# Option 2: Local installation
# Install PostgreSQL/MySQL/MongoDB locally
# Create database
createdb project_dev

# Run migrations
npm run migrate

# Seed database with sample data (optional)
npm run seed
\`\`\`

#### 5. Verify Setup
\`\`\`bash
# Run tests
npm test

# Start development server
npm run dev

# In another terminal, verify it's running
curl http://localhost:3000/health
# Or open http://localhost:3000 in browser
\`\`\`

### Common Setup Issues

#### Port Already in Use
\`\`\`bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or use a different port
PORT=3001 npm run dev
\`\`\`

#### Database Connection Errors
- Verify database is running: \`docker ps\` or service status
- Check DATABASE_URL in .env file
- Ensure database exists: \`createdb project_dev\`
- Verify migrations ran: \`npm run migrate:status\`

#### Module Not Found Errors
\`\`\`bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
\`\`\`

---

## Required Access & Permissions

### Accounts to Request
1. **GitHub Organization** - Request from: TODO: Add contact
2. **AWS/Cloud Access** - Request from: TODO: Add DevOps contact
3. **Database Access** - Request from: TODO: Add DBA contact
4. **Monitoring/APM Tools** - Request from: TODO: Add contact
5. **CI/CD Pipeline** - Request from: TODO: Add DevOps contact
6. **Issue Tracker (Jira/etc.)** - Request from: TODO: Add PM contact

### Team Permissions
- **Repository:** Write access to main repo
- **Deployments:** Staging access (production access granted after 1-2 months)
- **Databases:** Read access to staging, read-only to production
- **Cloud Resources:** Developer role in non-production environments

---

## Team Communication

### Chat Channels
- **#engineering** - General engineering discussions
- **#team-[name]** - Your team's channel
- **#deployments** - Deployment notifications
- **#incidents** - Production issues and incidents
- **#random** - Non-work related chat

### Meetings
- **Daily Standup** - Every day at TODO: time
- **Sprint Planning** - TODO: frequency and day
- **Sprint Retrospective** - TODO: frequency and day
- **Team Sync** - TODO: frequency and day
- **1:1 with Manager** - Weekly (scheduled individually)

### Communication Guidelines
- Use threads in Slack to keep conversations organized
- @mention people directly when you need their attention
- Use @here sparingly (only for time-sensitive team updates)
- Update your status when away or in focus time
- Default to public channels over DMs when possible

---

## Learning Resources

### Project-Specific
- **Architecture Documentation** - [Link to architecture docs](./architecture.md)
- **API Documentation** - [Link to API docs](./api-reference.md)
- **Deployment Guide** - [Link to deployment docs](./deployment.md)
- **Troubleshooting** - [Link to troubleshooting guide](./troubleshooting.md)

### Technical Skills
- **Node.js Best Practices** - [Link to guide or external resource]
- **TypeScript Handbook** - [TypeScript docs](https://www.typescriptlang.org/docs/)
- **Testing Guide** - [Link to testing strategy](./testing.md)
- **Security Guidelines** - [Link to security docs](./security.md)

### Company/Team
- **Engineering Handbook** - TODO: Add link
- **Company Values** - TODO: Add link
- **Team Charter** - TODO: Add link

### External Resources
- **JavaScript/TypeScript** - MDN Web Docs, TypeScript handbook
- **React** - Official React documentation (if applicable)
- **Database** - PostgreSQL/MySQL/MongoDB documentation
- **DevOps** - Docker, Kubernetes documentation (if applicable)

---

## First Tasks

### Suggested First Issues
Look for issues tagged with:
- \`good-first-issue\` - Easy issues for newcomers
- \`documentation\` - Documentation improvements
- \`bug\` with low priority - Simple bug fixes
- \`refactoring\` - Code cleanup tasks

### Starter Tasks Ideas
1. **Fix a typo** in documentation or comments
2. **Add tests** to increase coverage for existing code
3. **Improve error messages** to be more helpful
4. **Update dependencies** that have security patches
5. **Add logging** to better understand system behavior

---

## Getting Help

### When You're Stuck
1. **Try to debug yourself** (15-30 minutes) - Check logs, search documentation
2. **Search existing resources** - Check Slack history, documentation, issues
3. **Ask your onboarding buddy** - Your assigned mentor for the first few weeks
4. **Ask in team channel** - #team-[name] for team-specific questions
5. **Ask in #engineering** - For broader technical questions

### No Stupid Questions
- We were all new once - ask questions freely!
- Questions often uncover documentation gaps or process issues
- If you're confused, others probably are too
- Asking helps us improve onboarding for future team members

### Escalation
- **Technical questions** - Ask in #engineering or tech leads
- **Access issues** - Ask IT or DevOps team
- **Process questions** - Ask your manager or team lead
- **Urgent production issues** - Follow incident response process

---

## Team Culture & Expectations

### Work Hours
- **Core hours:** TODO: e.g., 10am-4pm (team's local timezone)
- **Flexibility:** Work when you're most productive
- **Availability:** Be responsive during core hours
- **Overtime:** Not expected regularly, communicate if overwhelmed

### Code Review
- **Response time:** Aim to review within 24 hours
- **Constructive feedback:** Focus on code, not person
- **Questions welcome:** Ask questions in PR comments
- **Learn from reviews:** Reviews are learning opportunities both ways

### Development Principles
- **Test your code:** Write tests for new functionality
- **Small PRs:** Keep changes focused and reviewable
- **Documentation:** Update docs when changing behavior
- **Security:** Think about security implications
- **Performance:** Consider performance impact of changes

### Growth & Development
- **Learning time:** Dedicate time each week to learning
- **Pair programming:** Great way to learn and teach
- **Conference talks:** Share knowledge through internal or external talks
- **Side projects:** Explore new technologies and ideas
- **Career development:** Regular discussions with manager about growth

---

## Feedback & Questions

### Onboarding Feedback
We're always improving! Please provide feedback on:
- What was confusing or missing?
- What was particularly helpful?
- Suggestions for improvement?

**Submit feedback:** TODO: Add link to feedback form or channel

### Questions About This Guide
- Update this guide as you find gaps
- Ask in #engineering if something is unclear
- Your feedback helps future team members!

<!-- agent-readonly:guidance -->
## AI Update Checklist
1. Verify all tool versions and installation instructions are current
2. Update access request contacts with current team members
3. Ensure all documentation links are valid
4. Add new accounts or tools that team members need
5. Update team communication channels and meeting schedules
6. Refresh learning resources with current recommendations
7. Verify suggested first issues are still appropriate

<!-- agent-readonly:sources -->
## Acceptable Sources
- Development environment setup scripts and documentation
- Team wiki or handbook
- IT/DevOps onboarding documentation
- Feedback from recent new hires
- Repository README and CONTRIBUTING files

<!-- agent-update:end -->
`;
}