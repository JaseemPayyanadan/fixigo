# 🚀 Fixigo Project Coding Rules

## 📋 **Project Overview**
This document defines the mandatory coding standards and best practices for the Fixigo service management application. All developers must follow these rules to maintain code quality, performance, and consistency.

## 🎯 **Core Technology Stack**
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS (preserve existing classes)
- **State Management**: React Context + Custom Hooks
- **Performance**: React.memo, useMemo, useCallback

---

## ⚡ **Performance Rules (MANDATORY)**

### 1. **Component Optimization**
```typescript
// ✅ CORRECT - Use React.memo for expensive components
const ExpensiveComponent = React.memo(function ExpensiveComponent() {
  // Component implementation
});

// ❌ WRONG - Don't export function components directly
export function ExpensiveComponent() {
  // This will re-render unnecessarily
}
```

### 2. **Hook Optimization**
```typescript
// ✅ CORRECT - Memoize expensive calculations
const filteredData = useMemo(() => {
  return data.filter(item => item.role === userRole);
}, [data, userRole]);

// ✅ CORRECT - Memoize event handlers
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);

// ❌ WRONG - Don't recreate functions on every render
const handleClick = () => {
  // This creates a new function every render
};
```

### 3. **Data Fetching & Caching**
```typescript
// ✅ CORRECT - Implement caching with TTL
let dataCache: { data: T; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ✅ CORRECT - Use request cancellation
const abortControllerRef = useRef<AbortController | null>(null);

// ❌ WRONG - Don't fetch data on every mount without caching
useEffect(() => {
  fetchData(); // This runs every time
}, []);
```

---

## 🔒 **TypeScript Rules (MANDATORY)**

### 1. **No `any` Types**
```typescript
// ✅ CORRECT - Use explicit types
interface UserData {
  id: string;
  name: string;
  role: 'admin' | 'user';
}

// ❌ WRONG - Never use any
const user: any = getUser(); // VIOLATION
```

### 2. **Strict Type Definitions**
```typescript
// ✅ CORRECT - Define proper interfaces
interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}

// ✅ CORRECT - Use union types for specific values
type UserRole = 'shop_admin' | 'branch_admin' | 'technician';

// ❌ WRONG - Don't use loose types
const role: string = user.role; // Too loose
```

### 3. **Proper Generic Usage**
```typescript
// ✅ CORRECT - Use generics for reusable components
interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick: (item: T) => void;
}

// ❌ WRONG - Don't use any in generics
interface TableProps<any> { // VIOLATION
  data: any[];
}
```

---

## 🏗️ **Next.js 14 App Router Rules (MANDATORY)**

### 1. **File Structure**
```
src/
├── app/                    # App Router pages
│   ├── (auth)/            # Route groups
│   ├── (dashboard)/       # Route groups
│   └── api/               # API routes
├── components/             # Reusable components
├── hooks/                  # Custom hooks
├── lib/                    # Utilities and configs
├── types/                  # TypeScript definitions
└── contexts/               # React contexts
```

### 2. **Page Components**
```typescript
// ✅ CORRECT - Use proper page structure
export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      {/* Page content */}
    </div>
  );
}

// ❌ WRONG - Don't use old Pages Router patterns
export default function DashboardPage() {
  // Missing proper structure
}
```

### 3. **API Routes**
```typescript
// ✅ CORRECT - Use proper API route structure
export async function GET(request: Request) {
  try {
    // API logic
    return Response.json({ data: result });
  } catch (error) {
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ❌ WRONG - Don't use old API patterns
export default function handler(req, res) {
  // Old Pages Router pattern
}
```

---

## 🎨 **Styling Rules (MANDATORY)**

### 1. **Tailwind CSS Usage**
```typescript
// ✅ CORRECT - Preserve existing Tailwind classes
className="bg-white border border-gray-100 rounded-lg p-4"

// ✅ CORRECT - Use consistent spacing and colors
className="px-4 py-2 text-sm font-medium"

// ❌ WRONG - Don't modify existing Tailwind classes without reason
className="bg-white border border-gray-100 rounded-lg p-4" // Changed from original
```

### 2. **Responsive Design**
```typescript
// ✅ CORRECT - Use responsive prefixes
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"

// ✅ CORRECT - Mobile-first approach
className="hidden md:block" // Hidden on mobile, visible on md+
```

---

## 🧩 **Component Architecture Rules (MANDATORY)**

### 1. **Component Organization**
```typescript
// ✅ CORRECT - Use proper component structure
"use client";
import React, { useState, useMemo, useCallback } from "react";
import { useCustomHook } from "@/hooks/useCustomHook";

interface ComponentProps {
  data: DataType[];
  onAction: (id: string) => void;
}

const Component = React.memo(function Component({ data, onAction }: ComponentProps) {
  // State and hooks
  const [state, setState] = useState<StateType>(initialState);
  
  // Memoized values
  const processedData = useMemo(() => {
    return data.filter(item => item.active);
  }, [data]);
  
  // Memoized handlers
  const handleAction = useCallback((id: string) => {
    onAction(id);
  }, [onAction]);
  
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
});

export { Component };
```

### 2. **Custom Hooks**
```typescript
// ✅ CORRECT - Use proper hook structure
export function useCustomHook() {
  const [state, setState] = useState<StateType>(initialState);
  
  const action = useCallback(() => {
    // Hook logic
  }, [dependencies]);
  
  return { state, action };
}

// ❌ WRONG - Don't use hooks outside components
export function utilityFunction() {
  const [state] = useState(); // VIOLATION - Hook in non-component
}
```

---

## 📁 **File Naming & Organization (MANDATORY)**

### 1. **File Naming Convention**
```
✅ CORRECT:
- ComponentName.tsx          # PascalCase for components
- useHookName.ts            # camelCase for hooks
- utilityName.ts            # camelCase for utilities
- types.ts                  # lowercase for type files
- constants.ts              # lowercase for constant files

❌ WRONG:
- component-name.tsx        # kebab-case
- HookName.ts              # PascalCase for hooks
- UTILITY.ts               # UPPERCASE
```

### 2. **Import Organization**
```typescript
// ✅ CORRECT - Organized imports
// 1. React and Next.js
import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

// 2. Third-party libraries
import { Icon } from "@heroicons/react/24/outline";

// 3. Internal components and hooks
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

// 4. Types and utilities
import { UserType } from "@/types";
import { formatDate } from "@/lib/utils";

// ❌ WRONG - Disorganized imports
import { Button } from "@/components/ui/Button";
import React, { useState } from "react";
import { formatDate } from "@/lib/utils";
```

---

## 🚫 **Forbidden Patterns (MANDATORY)**

### 1. **Never Use These**
```typescript
// ❌ FORBIDDEN - any types
const data: any = getData();

// ❌ FORBIDDEN - Function components without memoization
export function ExpensiveComponent() { }

// ❌ FORBIDDEN - Inline functions in JSX
<button onClick={() => handleClick()}>Click</button>

// ❌ FORBIDDEN - Missing dependencies in hooks
useEffect(() => {
  // Logic
}, []); // Missing dependencies

// ❌ FORBIDDEN - Direct DOM manipulation
document.getElementById('element').style.display = 'none';
```

### 2. **Performance Anti-patterns**
```typescript
// ❌ FORBIDDEN - Creating objects in render
const config = { theme: 'dark', size: 'large' }; // New object every render

// ❌ FORBIDDEN - Missing key props in lists
{items.map(item => <ItemComponent item={item} />)} // Missing key

// ❌ FORBIDDEN - Unnecessary re-renders
const Component = () => <div>Content</div>; // No memoization
```

---

## ✅ **Code Review Checklist (MANDATORY)**

Before submitting any code, ensure:

### **Performance**
- [ ] Component uses `React.memo` if expensive
- [ ] Event handlers use `useCallback`
- [ ] Expensive calculations use `useMemo`
- [ ] Data fetching includes caching
- [ ] Request cancellation implemented

### **TypeScript**
- [ ] No `any` types used
- [ ] Proper interfaces defined
- [ ] Union types for specific values
- [ ] Generics used appropriately
- [ ] Strict mode compliance

### **Next.js 14**
- [ ] App Router structure followed
- [ ] Proper page components
- [ ] API routes use new patterns
- [ ] File organization correct

### **Code Quality**
- [ ] No unused imports/variables
- [ ] Proper error handling
- [ ] Loading states implemented
- [ ] Accessibility considerations
- [ ] Responsive design

---

## 🔧 **Enforcement Tools**

### 1. **ESLint Configuration**
```javascript
// eslint.config.mjs
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error", // No any types
      "@typescript-eslint/no-unused-vars": "error", // No unused variables
      "react-hooks/exhaustive-deps": "error", // Proper hook dependencies
      "prefer-const": "error" // Use const when possible
    }
  }
];
```

### 2. **TypeScript Configuration**
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 3. **Pre-commit Hooks**
```bash
# Run these before committing
npm run lint          # ESLint check
npm run type-check    # TypeScript check
npm run build         # Build verification
```

---

## 📚 **Resources & References**

### **Official Documentation**
- [Next.js 14 App Router](https://nextjs.org/docs/app)
- [React Performance](https://react.dev/learn/render-and-commit)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### **Performance Tools**
- React DevTools Profiler
- Next.js Bundle Analyzer
- Lighthouse Performance Audit

### **Code Examples**
- See `src/components/layout/SideNavBar.tsx` for optimized component
- See `src/hooks/useNavigation.ts` for custom hook pattern
- See `src/contexts/SidebarContext.tsx` for context optimization

---

## ⚠️ **Violation Consequences**

### **Warning Level**
- Minor violations: Code review comments
- Performance issues: Performance review required

### **Error Level**
- TypeScript errors: Build failure
- ESLint errors: Lint failure
- Critical violations: PR rejection

### **Compliance Tracking**
- Regular code audits
- Performance monitoring
- Team training sessions

---

## 📝 **Documentation Updates**

This document is a living guide and will be updated as:
- New Next.js versions are released
- Performance best practices evolve
- Team feedback suggests improvements
- New patterns emerge

**Last Updated**: December 2024  
**Version**: 1.0  
**Maintainer**: Development Team

---

## 🎯 **Commit Message Format**

Use this format for all commits:
```
type(scope): description

- Performance: What performance improvements were made
- TypeScript: What type safety improvements were added
- Next.js: What framework updates were implemented

Example:
feat(sidenav): optimize navigation performance

- Performance: Add React.memo, useMemo, useCallback
- TypeScript: Remove any types, add proper interfaces
- Next.js: Follow App Router best practices
```

**Remember**: Following these rules ensures code quality, performance, and maintainability. When in doubt, refer to this document or consult with the team lead.
