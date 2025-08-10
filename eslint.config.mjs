import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(import.meta.url);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // 🚫 STRICT RULES - NO VIOLATIONS ALLOWED
      "@typescript-eslint/no-explicit-any": "error", // No any types - MANDATORY
      "@typescript-eslint/no-unused-vars": "error", // No unused variables - MANDATORY
      "react-hooks/exhaustive-deps": "error", // Proper hook dependencies - MANDATORY
      "prefer-const": "error", // Use const when possible - MANDATORY

      // ⚡ PERFORMANCE RULES
      "react/jsx-no-bind": "error", // No inline functions in JSX
      "react/jsx-key": "error", // Must have key prop in lists
      "react/no-array-index-key": "warn", // Avoid array index as key

      // 🏗️ NEXT.JS RULES
      "@next/next/no-img-element": "warn", // Use Next.js Image component
      "@next/next/no-html-link-for-pages": "error", // Use Next.js Link component

      // 🎨 CODE QUALITY RULES
      "no-console": "warn", // Warn about console statements in production
      "no-debugger": "error", // No debugger statements
      "no-alert": "warn", // Warn about alert statements
      "prefer-template": "error", // Use template literals instead of string concatenation
      "object-shorthand": "error", // Use object shorthand notation
      "prefer-arrow-callback": "error", // Use arrow functions for callbacks

      // 📁 IMPORT ORGANIZATION
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          pathGroups: [
            {
              pattern: "react",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "next/**",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "@/**",
              group: "internal",
              position: "after",
            },
          ],
          pathGroupsExcludedImportTypes: ["react", "next"],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],

      // 🧩 REACT SPECIFIC RULES
      "react/prop-types": "off", // We use TypeScript for prop validation
      "react/react-in-jsx-scope": "off", // Not needed in Next.js
      "react/display-name": "error", // Components must have display names
      "react/no-unescaped-entities": "warn", // Warn about unescaped HTML entities

      // 🎯 CUSTOM PERFORMANCE RULES
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='useEffect'] > ArrayExpression[elements.length=0]",
          message: "Empty dependency array in useEffect may cause issues. Consider if dependencies are missing.",
        },
      ],
    },
  },
];

export default eslintConfig;
