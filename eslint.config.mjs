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
      "@typescript-eslint/no-explicit-any": "warn", // Warn about any types
      "@typescript-eslint/no-unused-vars": "warn", // Warn about unused variables
      "react-hooks/exhaustive-deps": "warn", // Warn about hook dependencies

      // 🏗️ NEXT.JS ESSENTIAL RULES
      "@next/next/no-html-link-for-pages": "error", // Use Next.js Link component

      // 🎨 CORE CODE QUALITY
      "no-debugger": "error", // No debugger statements
      "prefer-const": "warn", // Warn about const usage
    },
  },
];

export default eslintConfig;
