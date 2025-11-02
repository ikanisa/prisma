#!/bin/bash
# Setup git hooks for secret scanning
# Run this script once after cloning the repository: ./scripts/setup-git-hooks.sh

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"

echo "🔧 Setting up git hooks for Prisma Glow..."

# Create pre-commit hook
cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash
# Pre-commit hook to prevent committing secrets using gitleaks

set -e

# Check if gitleaks is installed
if ! command -v gitleaks &> /dev/null; then
    echo "⚠️  gitleaks is not installed. Installing via Docker..."
    
    # Run gitleaks via Docker as fallback
    if command -v docker &> /dev/null; then
        docker run --rm -v "$(pwd):/repo" zricethezav/gitleaks:latest detect \
            --source="/repo" \
            --config="/repo/.gitleaks.toml" \
            --verbose \
            --no-git
        exit_code=$?
    else
        echo "❌ Neither gitleaks nor Docker is available."
        echo "   Install gitleaks: https://github.com/gitleaks/gitleaks#installing"
        echo "   Or install Docker: https://docs.docker.com/get-docker/"
        echo ""
        echo "   To skip this check (NOT RECOMMENDED): git commit --no-verify"
        exit 1
    fi
else
    # Run gitleaks on staged changes
    gitleaks protect --staged --config=.gitleaks.toml --verbose
    exit_code=$?
fi

if [ $exit_code -ne 0 ]; then
    echo ""
    echo "❌ Gitleaks found potential secrets in your staged changes!"
    echo "   Review the output above and remove any sensitive data."
    echo "   To skip this check (NOT RECOMMENDED): git commit --no-verify"
    echo ""
    exit 1
fi

echo "✅ No secrets detected in staged changes"
exit 0
EOF

chmod +x "$HOOKS_DIR/pre-commit"

echo "✅ Pre-commit hook installed at $HOOKS_DIR/pre-commit"
echo ""
echo "📋 Next steps:"
echo "   1. Install gitleaks (recommended):"
echo "      - macOS: brew install gitleaks"
echo "      - Linux: https://github.com/gitleaks/gitleaks#installing"
echo "      - Windows: scoop install gitleaks"
echo ""
echo "   2. Test the hook:"
echo "      git add <file> && git commit -m 'test'"
echo ""
echo "   3. The hook will automatically scan for secrets before each commit"
echo ""
echo "✨ Setup complete!"
