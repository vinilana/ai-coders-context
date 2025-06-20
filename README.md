# @ai-coders/context

[![npm version](https://badge.fury.io/js/@ai-coders%2Fcontext.svg)](https://www.npmjs.com/package/@ai-coders/context)
[![CI](https://github.com/vinilana/ai-coders-context/actions/workflows/ci.yml/badge.svg)](https://github.com/vinilana/ai-coders-context/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> ⚠️ **Beta Release**: This tool is in early development (v0.x). APIs and features may change.

A powerful CLI tool that analyzes your codebase and generates comprehensive documentation and AI agent prompts using LLM APIs. Features intelligent incremental updates, cost estimation, and support for multiple LLM providers.

## ✨ Features

- 🔍 **Repository Analysis**: Maps and analyzes your entire codebase structure with token estimation
- 📚 **Documentation Generation**: Creates comprehensive, module-based documentation
- 🔄 **Incremental Updates**: Smart git-based updates that only process changed files
- 👀 **Preview Mode**: See what would change before running expensive operations
- 🤖 **AI Agent Prompts**: Generates specialized prompts for different development tasks
- 🌐 **Multi-Provider Support**: Works with OpenRouter, OpenAI, Anthropic, Google AI, and Grok
- 💰 **Cost Tracking**: Real-time token usage and precise cost estimation across models
- 🎯 **Smart Filtering**: Intelligent file filtering and module organization
- 🚀 **CI/CD Ready**: Perfect for automated documentation workflows and pre-commit hooks

## 📦 Installation

### Using npx (Recommended)

```bash
# Run directly without installation
npx @ai-coders/context analyze /path/to/your/repo
```

### Global Installation

```bash
npm install -g @ai-coders/context
```

### Local Development

```bash
git clone https://github.com/vinilana/ai-coders-context.git
cd ai-coders-context
npm install
npm run build
npm link
```

## 🚀 Quick Start

### 1. Set Up API Key

Choose your preferred LLM provider and set the API key:

```bash
# OpenRouter (Recommended - access to 100+ models)
export OPENROUTER_API_KEY=your_key_here

# Or use other providers
export OPENAI_API_KEY=your_key_here
export ANTHROPIC_API_KEY=your_key_here
export GOOGLE_AI_API_KEY=your_key_here
export GROK_API_KEY=your_key_here
```

### 2. Analyze Your Repository

```bash
# Get cost estimates and repository analysis
npx @ai-coders/context analyze /path/to/your/repo
```

### 3. Generate Initial Documentation

```bash
# Create comprehensive documentation and agent prompts
npx @ai-coders/context generate /path/to/your/repo
```

### 4. Update Documentation (Incremental)

```bash
# Update only changed files since last run
npx @ai-coders/context update /path/to/your/repo

# Preview changes before updating
npx @ai-coders/context preview /path/to/your/repo
```

## 📋 Commands

### `analyze` - Repository Analysis & Cost Estimation

Analyzes your repository structure and provides detailed cost estimates for documentation generation.

```bash
npx @ai-coders/context analyze /path/to/repo [options]

Options:
  --exclude <patterns...>    Patterns to exclude from analysis
  --include <patterns...>    Patterns to include in analysis
  -v, --verbose             Show detailed file breakdown
```

**Example Output:**
```
📊 Token Usage Estimate for Full Documentation Generation:
═══════════════════════════════════════════════════════════

📁 Files to Process: 247
🔤 Estimated Input Tokens: 156,500
📝 Estimated Output Tokens: 62,600
🎯 Total Estimated Tokens: 219,100

💰 Cost Estimates by Model:
  Llama 3.1 8B (OpenRouter)        | Input:  $0.01 | Output:  $0.01 | Total:  $0.02
  Gemini 1.5 Flash (Google AI)     | Input:  $0.01 | Output:  $0.02 | Total:  $0.03
  GPT-4o Mini (OpenRouter)         | Input:  $0.02 | Output:  $0.04 | Total:  $0.06
  Claude 3 Haiku (OpenRouter)      | Input:  $0.04 | Output:  $0.08 | Total:  $0.12
```

### `generate` - Initial Documentation Generation

Creates comprehensive documentation and AI agent prompts for your entire repository.

```bash
npx @ai-coders/context generate /path/to/repo [options]

Options:
  -o, --output <dir>         Output directory (default: "./.context")
  -k, --api-key <key>        API key for the LLM provider
  -m, --model <model>        LLM model to use (default: "google/gemini-2.5-flash-preview-05-20")
  -p, --provider <provider>  LLM provider (openrouter, openai, anthropic, gemini, grok)
  --exclude <patterns...>    Patterns to exclude from analysis
  --include <patterns...>    Patterns to include in analysis
  --docs-only               Generate only documentation (skip agent prompts)
  --agents-only             Generate only agent prompts (skip documentation)
  -v, --verbose             Verbose output with detailed progress
```

### `update` - Incremental Documentation Updates

Updates documentation only for files that have changed since the last documented commit.

```bash
npx @ai-coders/context update /path/to/repo [options]

Options:
  -o, --output <dir>         Output directory (default: "./.context")
  -k, --api-key <key>        API key for the LLM provider
  -m, --model <model>        LLM model to use
  -p, --provider <provider>  LLM provider
  --since <commit>          Compare against specific commit/branch
  --staged                  Only process staged files (for pre-commit hooks)
  --force                   Force regeneration even if no changes detected
  --exclude <patterns...>    Patterns to exclude from analysis
  --include <patterns...>    Patterns to include in analysis
  -v, --verbose             Verbose output with commit tracking info
```

### `preview` - Preview Changes

Shows what documentation updates would be made without actually making changes. Includes cost estimates for the affected files.

```bash
npx @ai-coders/context preview /path/to/repo [options]

Options:
  --since <commit>          Compare against specific commit/branch
  --staged                  Only analyze staged files
  --exclude <patterns...>    Patterns to exclude from analysis
  --include <patterns...>    Patterns to include in analysis
  -v, --verbose             Show detailed file change lists and debug info
```

## 🎯 Workflow Examples

### Initial Setup Workflow

```bash
# 1. Analyze repository and get cost estimates
npx @ai-coders/context analyze ./my-project

# 2. Generate initial documentation
npx @ai-coders/context generate ./my-project

# 3. Check what the output looks like
ls .context/
```

### Daily Development Workflow

```bash
# Preview what would be updated
npx @ai-coders/context preview ./my-project

# Update documentation for changed files
npx @ai-coders/context update ./my-project -v

# Or update since a specific commit
npx @ai-coders/context update ./my-project --since HEAD~3
```

### Pre-commit Hook Integration

```bash
# Update only staged files (perfect for pre-commit hooks)
npx @ai-coders/context update ./my-project --staged

# Preview staged changes
npx @ai-coders/context preview ./my-project --staged
```

### CI/CD Integration

```bash
# Update documentation in CI for main branch changes
npx @ai-coders/context update . \
  --provider openrouter \
  --model google/gemini-2.5-flash-preview-05-20 \
  --verbose
```

## 🏗️ Output Structure

The tool generates documentation in the `.context` directory:

```
.context/
├── docs/                    # Generated documentation
│   ├── README.md           # Project overview
│   ├── STRUCTURE.md        # Repository structure
│   ├── DEVELOPMENT.md      # Development guide
│   ├── API.md             # API documentation
│   ├── DEPLOYMENT.md      # Deployment guide
│   ├── TROUBLESHOOTING.md # Troubleshooting guide
│   └── modules/           # Module-specific documentation
│       ├── auth/          # Auth module docs
│       ├── api/           # API module docs
│       └── utils/         # Utils module docs
└── agents/                # AI agent prompts
    ├── README.md          # Agent index
    ├── code-reviewer.md   # Code review specialist
    ├── bug-fixer.md       # Bug fixing specialist
    ├── feature-developer.md # Feature development specialist
    ├── refactoring-specialist.md
    ├── test-writer.md
    ├── documentation-writer.md
    ├── performance-optimizer.md
    └── security-auditor.md

# State tracking
context-log.json           # Tracks last processed commit
```

## 🔧 LLM Provider Configuration

### OpenRouter (Recommended)

Access to 100+ models from different providers with competitive pricing:

```bash
export OPENROUTER_API_KEY=your_api_key_here

# Use specific models
npx @ai-coders/context generate . -m google/gemini-2.5-flash-preview-05-20  # Fast & cheap
npx @ai-coders/context generate . -m anthropic/claude-3-sonnet  # Balanced
npx @ai-coders/context generate . -m openai/gpt-4  # High quality
```

### Direct Provider Access

```bash
# OpenAI
export OPENAI_API_KEY=your_key
npx @ai-coders/context generate . -p openai -m gpt-4o

# Anthropic
export ANTHROPIC_API_KEY=your_key
npx @ai-coders/context generate . -p anthropic -m claude-3-sonnet-20240229

# Google AI
export GOOGLE_AI_API_KEY=your_key
npx @ai-coders/context generate . -p gemini -m gemini-1.5-pro

# Grok
export GROK_API_KEY=your_key
npx @ai-coders/context generate . -p grok -m grok-beta
```

## 💰 Cost Management

### Model Selection by Cost

**Ultra Low Cost:**
- Llama 3.1 8B (OpenRouter): ~$0.05 per 1M tokens
- Gemini 1.5 Flash: ~$0.075 per 1M tokens

**Low Cost:**
- GPT-4o Mini: ~$0.15 per 1M tokens
- Claude 3 Haiku: ~$0.25 per 1M tokens

**Balanced:**
- Gemini 1.5 Pro: ~$1.25 per 1M tokens
- GPT-4o: ~$2.50 per 1M tokens
- Claude 3.5 Sonnet: ~$3.00 per 1M tokens

**High Quality:**
- GPT-4 Turbo: ~$10.00 per 1M tokens
- Grok Beta: ~$5.00 per 1M tokens

### Cost Estimation Features

- **Pre-generation estimates**: Always run `analyze` first to see costs
- **Preview mode**: See exactly what files will be processed
- **Incremental updates**: Only pay for changed files
- **Provider comparison**: Compare costs across all supported models

## 🎛️ Advanced Configuration

### Filtering Options

```bash
# Exclude specific file types and directories
npx @ai-coders/context generate . \
  --exclude "**/*.test.*" "node_modules/**" "dist/**" "*.log"

# Include only source code
npx @ai-coders/context generate . \
  --include "src/**" "lib/**" "packages/**"

# Complex filtering
npx @ai-coders/context generate . \
  --include "src/**" \
  --exclude "src/**/*.test.*" "src/legacy/**"
```

### Environment Configuration

Create a `.env` file in your project:

```bash
# .env
OPENROUTER_API_KEY=your_key_here
DEFAULT_MODEL=google/gemini-2.5-flash-preview-05-20
OUTPUT_DIR=./.context
```

### Model-Specific Options

```bash
# Use high-quality model for important documentation
npx @ai-coders/context generate . \
  --model anthropic/claude-3-opus \
  --docs-only

# Use fast model for regular updates
npx @ai-coders/context update . \
  --model google/gemini-2.5-flash-preview-05-20
```

## 🔄 Git Integration & State Tracking

### How It Works

The tool uses Git to track which commits have been documented:

1. **State File**: `context-log.json` tracks the last processed commit
2. **Change Detection**: Compares current HEAD with last processed commit
3. **Smart Updates**: Only processes files affected by changes
4. **Commit Validation**: Handles rebases and history changes gracefully

### Commit Tracking Features

```bash
# See commit tracking info in verbose mode
npx @ai-coders/context update . -v

# Output includes:
# 🔍 Commit Tracking Information:
# Last documented: abc1234 - feat: add user authentication
# Current commit:  def5678 - fix: handle edge case in validation
# Commits to process: 3
```

### Handling Different Scenarios

```bash
# Update from specific commit
npx @ai-coders/context update . --since abc1234

# Force full regeneration
npx @ai-coders/context update . --force

# Work with staged files (pre-commit)
npx @ai-coders/context update . --staged
```

## 🚀 Pre-commit Hook Setup

Automatically update documentation when committing code changes:

### 1. Create Pre-commit Hook

```bash
# Create the hook file
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
set -e

echo "🔍 AI Coders Context: Checking for documentation updates..."

# Check if there are staged files that need documentation updates
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|js|py|java|cpp|c|h|css|scss|html|xml|json|yaml|yml|md|txt|sql|sh|bat|ps1|php|rb|go|rs|swift|kt|scala|r|m|pl|lua|vim)$' || true)

if [ -z "$STAGED_FILES" ]; then
    echo "✅ No relevant files staged for commit"
    exit 0
fi

echo "📁 Found staged files that may need documentation updates:"
echo "$STAGED_FILES" | sed 's/^/  - /'

# Update documentation for staged files only
echo "📚 Updating documentation for staged files..."
npx @ai-coders/context update . \
    --staged \
    --model google/gemini-2.5-flash-preview-05-20 \
    --verbose || {
    echo "❌ Documentation update failed. Commit aborted."
    exit 1
}

# Check if documentation was updated
if git diff --quiet .context/docs/; then
    echo "✅ Documentation is up to date"
else
    echo "📝 Documentation updated. Adding to commit..."
    git add .context/docs/
    echo "✅ Documentation changes added to commit"
fi

echo "🎉 Pre-commit documentation check complete!"
exit 0
EOF

# Make it executable
chmod +x .git/hooks/pre-commit
```

### 2. Test the Hook

```bash
# Stage some files and commit
git add src/my-changes.ts
git commit -m "feat: add new feature"

# The hook will automatically:
# 1. Detect staged files
# 2. Update relevant documentation
# 3. Add updated docs to the commit
```

## 🏢 CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/docs-update.yml
name: Update Documentation

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'src/**'
      - 'lib/**'
      - '*.md'
      - '*.json'
      - '*.ts'
      - '*.js'

jobs:
  update-docs:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0  # Need full history for git diff
    
    - name: Use Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20.x'
        cache: 'npm'
    
    - name: Update Documentation
      run: |
        npx @ai-coders/context update . \
          --provider openrouter \
          --model google/gemini-2.5-flash-preview-05-20 \
          --verbose
      env:
        OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
    
    - name: Commit documentation updates
      run: |
        git config user.name "docs-bot"
        git config user.email "docs-bot@github.com"
        
        if ! git diff --quiet .context/docs/; then
          git add .context/docs/
          git commit -m "docs: update documentation for changed files
          
          Auto-generated by AI Coders Context"
          git push
        fi
```

## 🛠️ Troubleshooting

### Common Issues

**"No documentation context found"**
```bash
# Run these commands in order:
npx @ai-coders/context analyze .
npx @ai-coders/context generate .
npx @ai-coders/context preview .  # Now this will work
```

**"API key not found"**
```bash
# Set your API key
export OPENROUTER_API_KEY=your_key_here

# Or pass it directly
npx @ai-coders/context generate . --api-key your_key_here
```

**"No changes detected"**
```bash
# Force regeneration
npx @ai-coders/context update . --force

# Or check what's being tracked
npx @ai-coders/context update . -v
```

**High costs**
```bash
# Use cost-effective models
npx @ai-coders/context generate . --model google/gemini-2.5-flash-preview-05-20

# Preview costs first
npx @ai-coders/context analyze .

# Use incremental updates
npx @ai-coders/context update . # Only processes changed files
```

### Debug Mode

```bash
# Enable verbose output for detailed debugging
npx @ai-coders/context update . -v

# This shows:
# - Commit tracking information
# - File change analysis
# - Token estimation details
# - Processing progress
```

## 📚 Available Agent Types

The tool generates specialized AI agent prompts for different development tasks:

- **🔍 Code Reviewer**: Reviews code for quality, best practices, and potential issues
- **🐛 Bug Fixer**: Analyzes and fixes bugs with step-by-step debugging
- **⚡ Feature Developer**: Implements new features following project patterns
- **🔧 Refactoring Specialist**: Improves code structure and maintainability
- **🧪 Test Writer**: Creates comprehensive test suites
- **📝 Documentation Writer**: Maintains and improves documentation
- **🚀 Performance Optimizer**: Identifies and fixes performance bottlenecks
- **🔒 Security Auditor**: Identifies security vulnerabilities and fixes

## 📊 Supported File Types

The tool automatically detects and processes these file types:

**Programming Languages:**
- JavaScript/TypeScript (`.js`, `.ts`, `.jsx`, `.tsx`)
- Python (`.py`)
- Java (`.java`)
- C/C++ (`.c`, `.cpp`, `.h`)
- Go (`.go`)
- Rust (`.rs`)
- Swift (`.swift`)
- Kotlin (`.kt`)
- Scala (`.scala`)
- PHP (`.php`)
- Ruby (`.rb`)

**Configuration & Data:**
- JSON (`.json`)
- YAML (`.yaml`, `.yml`)
- XML (`.xml`)
- SQL (`.sql`)

**Web Technologies:**
- HTML (`.html`)
- CSS/SCSS (`.css`, `.scss`, `.sass`)

**Documentation:**
- Markdown (`.md`)
- Text files (`.txt`)

**Scripts:**
- Shell scripts (`.sh`)
- Batch files (`.bat`)
- PowerShell (`.ps1`)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests if applicable
5. Commit your changes: `git commit -m 'feat: add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Submit a pull request

### Development Setup

```bash
git clone https://github.com/vinilana/ai-coders-context.git
cd ai-coders-context
npm install
npm run dev  # Development mode with auto-reload
npm run build  # Build for production
npm test  # Run tests
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- 🐛 [Report bugs](https://github.com/vinilana/ai-coders-context/issues)
- 💡 [Request features](https://github.com/vinilana/ai-coders-context/issues)
- 📖 [Documentation](https://github.com/vinilana/ai-coders-context/wiki)
- 💬 [Discussions](https://github.com/vinilana/ai-coders-context/discussions)

---

Made with ❤️ by the AI Coders community