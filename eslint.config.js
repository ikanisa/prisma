import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "**/dist/**",
      "coverage",
      ".next",
      "**/.next/**",
      "apps/web/.next/**",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "error",
      "no-restricted-imports": [
        "error",
        {
          "patterns": [
            {
              group: ["packages/*", "**/packages/*"],
              message: "Use the workspace package alias (e.g. @prisma-glow/…) rather than relative paths into packages.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["services/**/*.{ts,tsx}", "supabase/functions/**/*.{ts,tsx}"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["src/lib/logger.ts", "src/lib/logger.js", "packages/logger/src/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    // Desktop/Tauri related files need console for environment detection and debugging
    files: [
      "src/hooks/useTauri.ts",
      "src/hooks/useFileSystem.ts",
      "src/lib/platform.ts",
      "src/components/desktop/**/*.{ts,tsx}",
    ],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["packages/**/*.{ts,tsx,js,jsx}", "scripts/**/*.{ts,tsx,js,jsx}", "tests/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["apps/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../../packages/*",
                "../packages/*",
                "../../../packages/*",
              ],
              message: "Use the workspace alias (e.g. @prisma-glow/pkg) instead of relative paths into packages.",
            },
          ],
        },
      ],
    },
  }
);
