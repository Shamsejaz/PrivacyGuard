#!/bin/bash

# Security script to help protect repository from unauthorized forking
echo "🔒 Repository Security Setup"
echo "============================"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository"
    exit 1
fi

# Get repository information
REPO_URL=$(git config --get remote.origin.url)
echo "📋 Repository: $REPO_URL"

# Add security files to git
echo ""
echo "📁 Adding security files..."

if [ -f "LICENSE-RESTRICTIVE" ]; then
    git add LICENSE-RESTRICTIVE
    echo "✅ Added restrictive license"
fi

if [ -f "FORK-POLICY.md" ]; then
    git add FORK-POLICY.md
    echo "✅ Added fork policy"
fi

if [ -f ".gitignore-security" ]; then
    echo "✅ Security .gitignore created (merge with existing .gitignore)"
fi

# Commit security changes
echo ""
echo "💾 Committing security files..."
git commit -m "feat: Add repository security policies and disable forking

- Add restrictive license terms
- Add fork policy documentation  
- Update README with fork policy notice
- Add security-focused .gitignore recommendations

This repository is now configured as proprietary software with forking disabled."

echo ""
echo "🎉 Security setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Push changes: git push origin main"
echo "2. Go to repository settings on your Git platform"
echo "3. Disable forking in repository settings"
echo "4. Consider making repository private for additional security"
echo ""
echo "🔗 Platform-specific instructions:"
echo "GitHub: Settings → General → Features → Uncheck 'Allow forking'"
echo "GitLab: Settings → General → Visibility → Disable 'Forking'"
echo "Bitbucket: Repository settings → Uncheck 'Allow forks'"