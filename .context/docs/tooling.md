---
id: tooling-guide
ai_update_goal: "Help contributors set up local environments, automation, and productivity tooling quickly."
required_inputs:
  - "Project-specific CLI commands or scripts"
  - "Preferred IDE/editor configurations"
  - "Automation hooks (pre-commit, CI helpers, generators)"
success_criteria:
  - "Includes copy/paste-ready commands for installation and diagnostics"
  - "Highlights required extensions or plugins"
  - "Links to automation or productivity aids maintained by the team"
related_agents:
  - "feature-developer"
  - "documentation-writer"
---

<!-- agent-update:start:tooling -->
# Tooling & Productivity Guide

Collect the scripts, automation, and editor settings that keep contributors efficient.

## Required Tooling
- **Node.js (v18+)**: Powers the core runtime for src/ scripts and prompt processing. Install via Node Version Manager (nvm) for easy version switching:  
  ```
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
  nvm install 18
  nvm use 18
  node --version  # Verify: v18.x.x
  ```
  Required for running npm/yarn scripts in package.json.
  
- **Git**: Version control for the repository. Ensure Git 2.30+ for modern features:  
  ```
  git --version  # Should be >= 2.30
  ```
  Clone the repo with:  
  ```
  git clone https://github.com/your-org/ai-context-scaffolding.git
  cd ai-context-scaffolding
  ```

- **npm or Yarn**: Package manager. Use npm (v8+) bundled with Node:  
  ```
  npm install -g npm@latest  # Update if needed
  npm --version  # Verify
  ```
  Install dependencies:  
  ```
  npm install
  ```

## Recommended Automation
- **Pre-commit Hooks (via Husky)**: Automatically run linting and tests before commits. Installed via devDependencies in package.json. Setup:  
  ```
  npm install  # Includes Husky initialization
  npx husky install  # If not auto-run
  ```
  Hooks enforce ESLint and Prettier on staged files, preventing common issues.

- **Linting and Formatting**: Use ESLint for code quality and Prettier for consistent style. Commands:  
  ```
  npm run lint  # Check for issues
  npm run lint:fix  # Auto-fix where possible
  npm run format  # Format all files with Prettier
  ```
  Integrated into CI for pull requests.

- **Scaffolding Scripts**: Use the ai-context tool for generating docs and agents:  
  ```
  npm run scaffold -- --type=doc --name=new-guide  # Example for new docs
  ```
  See [src/scaffolding/](src/scaffolding/) for custom generators.

- **Local Development Loop**: Watch mode for real-time feedback:  
  ```
  npm run dev  # Starts watcher for src/ changes, if configured
  ```

## IDE / Editor Setup
- **VS Code (Recommended)**: Primary editor for the team. Install from [code.visualstudio.com](https://code.visualstudio.com/).  
  Required Extensions (install via VS Code marketplace):  
  - ESLint (dbaeumer.vscode-eslint): Integrates linting.  
  - Prettier - Code formatter (esbenp.prettier-vscode): Auto-formats on save.  
  - GitLens (eamodio.gitlens): Enhanced Git visualization.  
  - Markdown All in One (yzhang.markdown-all-in-one): For editing docs/*.md.  
  Enable format on save: Add to settings.json:  
  ```json
  {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
  ```

- **Workspace Settings**: Copy `.vscode/settings.json` from the repo root for shared configurations like TypeScript paths if applicable.

## Productivity Tips
- **Terminal Aliases**: Add to ~/.bashrc or ~/.zshrc for quicker workflows:  
  ```
  alias ni='npm install'
  alias nr='npm run'
  alias lg='lazygit'  # If using lazygit for Git UI
  ```
  Reload: `source ~/.bashrc`.

- **Container Workflows**: Use Docker for isolated environments (if Docker is installed):  
  ```
  docker compose up  # Builds and runs dev container from docker-compose.yml
  ```
  Mirrors production setup for prompt testing.

- **Local Emulators**: For AI context simulation, run:  
  ```
  npm run emulate  # Placeholder for local prompt runner, see src/emulator/
  ```
  Links to shared scripts in [prompts/shared/](prompts/shared/) for reusable dotfiles and configs.

<!-- agent-readonly:guidance -->
## AI Update Checklist
1. Verify commands align with the latest scripts and build tooling.
2. Remove instructions for deprecated tools and add replacements.
3. Highlight automation that saves time during reviews or releases.
4. Cross-link to runbooks or README sections that provide deeper context.

<!-- agent-readonly:sources -->
## Acceptable Sources
- Onboarding docs, internal wikis, and team retrospectives.
- Script directories, package manifests, CI configuration.
- Maintainer recommendations gathered during pairing or code reviews.

<!-- agent-update:end -->
