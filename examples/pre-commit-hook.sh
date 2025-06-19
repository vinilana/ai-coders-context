#!/bin/bash
# Pre-commit hook for AI Coders Context
# Place this file in .git/hooks/pre-commit and make it executable

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

# Check if AI Context is available
if ! command -v npx &> /dev/null; then
    echo "⚠️  npx not found. Skipping documentation update."
    exit 0
fi

# Check for API key
if [ -z "$OPENROUTER_API_KEY" ] && [ -z "$OPENAI_API_KEY" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  No API key found. Set OPENROUTER_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY"
    echo "   Skipping documentation update."
    exit 0
fi

# Update documentation for staged files only
echo "📚 Updating documentation for staged files..."
npx @ai-coders/context update . \
    --staged \
    --output ./docs \
    --model anthropic/claude-3-haiku \
    --verbose || {
    echo "❌ Documentation update failed. Commit aborted."
    exit 1
}

# Check if documentation was updated
if git diff --quiet docs/; then
    echo "✅ Documentation is up to date"
else
    echo "📝 Documentation updated. Adding to commit..."
    git add docs/
    echo "✅ Documentation changes added to commit"
fi

echo "🎉 Pre-commit documentation check complete!"
exit 0