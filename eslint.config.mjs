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
      // 🚫 ESSENTIAL RULES - NO VIOLATIONS ALLOWED
      "@typescript-eslint/no-explicit-any": "error", // No any types - MANDATORY
      "@typescript-eslint/no-unused-vars": "error", // No unused variables - MANDATORY
      "react-hooks/exhaustive-deps": "error", // Proper hook dependencies - MANDATORY

      // 🏗️ NEXT.JS ESSENTIAL RULES
      "@next/next/no-html-link-for-pages": "error", // Use Next.js Link component

      // 🎨 CORE CODE QUALITY
      "no-debugger": "error", // No debugger statements
      "prefer-const": "error", // Use const when possible
    },
  },
];

export default eslintConfig;
