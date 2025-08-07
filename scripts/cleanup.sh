#!/bin/bash

# Project Cleanup Script
# This script helps clean up build artifacts, temporary files, and other clutter

echo "🧹 Starting project cleanup..."

# Remove build artifacts
echo "📦 Removing build artifacts..."
rm -rf .next/
rm -rf dist/
rm -rf build/
rm -f tsconfig.tsbuildinfo
rm -f .eslintcache

# Remove temporary files
echo "🗑️  Removing temporary files..."
find . -name "*.tmp" -delete
find . -name "*.temp" -delete
find . -name "*.log" -not -path "./node_modules/*" -delete

# Remove test files (if they exist in root)
echo "🧪 Removing test files from root..."
rm -f test-*.js
rm -f test-*.ts
rm -f test-*.tsx

# Remove sensitive files
echo "🔒 Removing sensitive files..."
rm -f cookies.txt
rm -f *.cookies

# Remove database debug files
echo "🗄️  Removing database debug files..."
rm -f pglite-debug.log
rm -f *.db
rm -f *.sqlite

# Clean npm cache (optional)
read -p "Do you want to clean npm cache? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 Cleaning npm cache..."
    npm cache clean --force
fi

# Run linting with auto-fix
echo "🔧 Running ESLint auto-fix..."
npx eslint . --ext .ts,.tsx,.js,.jsx --fix

# Check for unused dependencies
echo "📋 Checking for unused dependencies..."
npx depcheck 2>/dev/null || echo "depcheck not available"

echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary of actions:"
echo "- Removed build artifacts (.next/, dist/, build/)"
echo "- Removed temporary files (*.tmp, *.temp, *.log)"
echo "- Removed test files from root directory"
echo "- Removed sensitive files (cookies.txt)"
echo "- Removed database debug files"
echo "- Ran ESLint auto-fix"
echo "- Checked for unused dependencies"
echo ""
echo "💡 Tip: Run 'npm run lint' to check for remaining linting issues"
echo "💡 Tip: Run 'npm run build' to test the build process"
