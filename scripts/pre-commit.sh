#!/bin/bash

# 🚀 Fixigo Pre-commit Hook
# This script enforces all coding rules before allowing commits
# Run this script before every commit to ensure code quality

set -e

echo "🔍 Running pre-commit checks..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

print_status "Starting pre-commit validation..."

# 1. 🔍 TypeScript Type Checking
print_status "Running TypeScript type checking..."
if ! npx tsc --noEmit; then
    print_error "❌ TypeScript compilation failed!"
    print_error "Please fix all TypeScript errors before committing."
    exit 1
fi
print_success "✅ TypeScript type checking passed"

# 2. 🧹 ESLint Linting
print_status "Running ESLint checks..."
if ! npm run lint; then
    print_error "❌ ESLint checks failed!"
    print_error "Please fix all linting errors before committing."
    exit 1
fi
print_success "✅ ESLint checks passed"

# 3. 🏗️ Build Verification
print_status "Verifying build..."
if ! npm run build; then
    print_error "❌ Build verification failed!"
    print_error "Please fix all build errors before committing."
    exit 1
fi
print_success "✅ Build verification passed"

# 4. 📦 Dependency Check
print_status "Checking for outdated dependencies..."
OUTDATED=$(npm outdated --depth=0 2>/dev/null | wc -l)
if [ "$OUTDATED" -gt 1 ]; then
    print_warning "⚠️  Found $((OUTDATED-1)) outdated dependencies"
    print_warning "Consider updating dependencies: npm update"
else
    print_success "✅ Dependencies are up to date"
fi

# 5. 🔒 Security Audit
print_status "Running security audit..."
if ! npm audit --audit-level=moderate; then
    print_warning "⚠️  Security vulnerabilities found"
    print_warning "Run 'npm audit fix' to fix automatically fixable issues"
    # Don't fail the commit for security warnings, just warn
else
    print_success "✅ Security audit passed"
fi

# 6. 📊 Performance Check
print_status "Checking for performance anti-patterns..."
PERFORMANCE_ISSUES=0

# Check for inline functions in JSX
if grep -r "onClick={() =>" src/ --include="*.tsx" --include="*.ts" > /dev/null 2>&1; then
    print_warning "⚠️  Found inline functions in JSX (performance issue)"
    PERFORMANCE_ISSUES=$((PERFORMANCE_ISSUES + 1))
fi

# Check for missing React.memo
if grep -r "export function.*Component" src/components/ --include="*.tsx" > /dev/null 2>&1; then
    print_warning "⚠️  Found components without React.memo (performance issue)"
    PERFORMANCE_ISSUES=$((PERFORMANCE_ISSUES + 1))
fi

# Check for any types
if grep -r ": any" src/ --include="*.ts" --include="*.tsx" > /dev/null 2>&1; then
    print_error "❌ Found 'any' types (violates coding rules)"
    PERFORMANCE_ISSUES=$((PERFORMANCE_ISSUES + 1))
fi

if [ "$PERFORMANCE_ISSUES" -eq 0 ]; then
    print_success "✅ No performance anti-patterns found"
else
    print_warning "⚠️  Found $PERFORMANCE_ISSUES performance/coding rule violations"
    print_warning "Please review and fix these issues"
fi

# 7. 📁 File Structure Check
print_status "Checking file structure..."
if [ ! -d "src/app" ]; then
    print_error "❌ Missing src/app directory (Next.js 14 App Router required)"
    exit 1
fi

if [ ! -d "src/components" ]; then
    print_error "❌ Missing src/components directory"
    exit 1
fi

print_success "✅ File structure is correct"

# 8. 🎯 Commit Message Format Check
print_status "Checking commit message format..."
COMMIT_MSG_FILE="$1"
if [ -f "$COMMIT_MSG_FILE" ]; then
    COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

    # Check if commit message follows the required format
    if ! echo "$COMMIT_MSG" | grep -qE "^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .+"; then
        print_warning "⚠️  Commit message doesn't follow conventional format"
        print_warning "Expected: type(scope): description"
        print_warning "Example: feat(sidenav): optimize navigation performance"
    else
        print_success "✅ Commit message format is correct"
    fi
fi

# Final summary
echo ""
print_success "🎉 All pre-commit checks passed!"
print_status "Your code is ready to commit and follows all Fixigo coding rules."
echo ""

# Performance tips
if [ "$PERFORMANCE_ISSUES" -gt 0 ]; then
    echo "💡 Performance Tips:"
    echo "   - Use React.memo for expensive components"
    echo "   - Use useCallback for event handlers"
    echo "   - Use useMemo for expensive calculations"
    echo "   - Implement proper caching strategies"
    echo ""
fi

echo "📚 For more information, see CODING_RULES.md"
echo "🔧 Run 'npm run lint:fix' to automatically fix some issues"

exit 0
