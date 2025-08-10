# 🚀 Fixigo Coding Rules - Quick Start Guide

## 📋 **What This Is**

This project enforces strict coding standards to ensure:

- ⚡ **High Performance** - React.memo, useMemo, useCallback
- 🔒 **Type Safety** - No `any` types, strict TypeScript
- 🏗️ **Modern Architecture** - Next.js 14 App Router patterns
- 🎨 **Code Quality** - Consistent formatting and organization

## 🚀 **Getting Started**

### 1. **Install Dependencies**

```bash
npm install
```

### 2. **Run Validation**

```bash
# Check everything
npm run validate

# Just TypeScript
npm run type-check

# Just linting
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

### 3. **Before Committing**

```bash
# Run pre-commit validation
npm run pre-commit

# Or use the Git hook (automatic)
git commit -m "feat: your message"
```

## ⚠️ **Critical Rules (Never Violate)**

### **Performance Rules**

- ✅ Use `React.memo` for expensive components
- ✅ Use `useCallback` for event handlers
- ✅ Use `useMemo` for expensive calculations
- ❌ Never inline functions in JSX
- ❌ Never create objects in render

### **TypeScript Rules**

- ✅ Define explicit interfaces
- ✅ Use union types for specific values
- ❌ Never use `any` type
- ❌ Never use loose types like `string` for specific values

### **Next.js Rules**

- ✅ Follow App Router structure
- ✅ Use proper page components
- ✅ Use new API route patterns

## 🔧 **Tools & Automation**

### **ESLint Configuration**

- Strict rules enforced automatically
- Performance anti-patterns detected
- Import organization enforced
- No `any` types allowed

### **Pre-commit Hook**

- Automatically runs on every commit
- Blocks commits with violations
- Provides helpful error messages
- Suggests fixes

### **VS Code Integration**

- Auto-fix on save
- Real-time error highlighting
- Import organization
- Formatting enforcement

## 📁 **File Structure Requirements**

```
src/
├── app/                    # ✅ App Router pages
│   ├── (auth)/            # ✅ Route groups
│   ├── (dashboard)/       # ✅ Route groups
│   └── api/               # ✅ API routes
├── components/             # ✅ Reusable components
├── hooks/                  # ✅ Custom hooks
├── lib/                    # ✅ Utilities
├── types/                  # ✅ TypeScript definitions
└── contexts/               # ✅ React contexts
```

## 🎯 **Component Template**

```typescript
"use client";
import React, { useState, useMemo, useCallback } from "react";

interface ComponentProps {
  data: DataType[];
  onAction: (id: string) => void;
}

const Component = React.memo(function Component({ data, onAction }: ComponentProps) {
  // State
  const [state, setState] = useState<StateType>(initialState);

  // Memoized values
  const processedData = useMemo(() => {
    return data.filter((item) => item.active);
  }, [data]);

  // Memoized handlers
  const handleAction = useCallback(
    (id: string) => {
      onAction(id);
    },
    [onAction]
  );

  return <div>{/* Component JSX */}</div>;
});

export { Component };
```

## 🚫 **Common Violations & Fixes**

### **Performance Issues**

```typescript
// ❌ WRONG - Inline function
<button onClick={() => handleClick()}>Click</button>;

// ✅ CORRECT - Memoized handler
const handleClick = useCallback(() => {
  // Logic
}, [dependencies]);

<button onClick={handleClick}>Click</button>;
```

### **Type Safety Issues**

```typescript
// ❌ WRONG - any type
const user: any = getUser();

// ✅ CORRECT - Explicit interface
interface User {
  id: string;
  name: string;
  role: "admin" | "user";
}
const user: User = getUser();
```

### **Component Issues**

```typescript
// ❌ WRONG - No memoization
export function ExpensiveComponent() {}

// ✅ CORRECT - With memoization
const ExpensiveComponent = React.memo(function ExpensiveComponent() {});
```

## 📊 **Monitoring & Compliance**

### **Performance Metrics**

- Component render times
- Navigation response times
- Bundle size analysis
- Lighthouse scores

### **Code Quality Metrics**

- TypeScript strict mode compliance
- ESLint rule violations
- Test coverage
- Build success rate

## 🆘 **Getting Help**

### **When You're Stuck**

1. Check `CODING_RULES.md` for detailed rules
2. Run `npm run validate` to see all issues
3. Use `npm run lint:fix` to auto-fix some problems
4. Check the examples in `src/components/layout/SideNavBar.tsx`

### **Common Commands**

```bash
# See all issues
npm run validate

# Fix linting automatically
npm run lint:fix

# Check types only
npm run type-check

# Run pre-commit manually
npm run pre-commit
```

## 🎉 **Success Indicators**

You're following the rules correctly when:

- ✅ `npm run validate` passes
- ✅ `npm run build` succeeds
- ✅ No ESLint errors
- ✅ No TypeScript errors
- ✅ Components use React.memo
- ✅ No `any` types found
- ✅ Proper file structure

## 📚 **Learn More**

- **Full Rules**: See `CODING_RULES.md`
- **Examples**: Check optimized components in `src/components/`
- **Performance**: See `src/components/PerformanceMonitor.tsx`
- **Hooks**: See `src/hooks/useNavigation.ts`

---

**Remember**: These rules ensure your code is fast, safe, and maintainable. When in doubt, run `npm run validate` to check compliance!
