import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
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
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-restricted-imports": [
        "error",
        {
          "patterns": [
            {
              group: ["@prisma-glow/*/*"],
              message: "Import from the package entry point instead of deep paths.",
            },
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
    files: ["apps/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@prisma-glow/*/*",
                "../../packages/*",
                "../packages/*",
                "../../../packages/*",
              ],
              message: "Import from the package entry point (e.g. @prisma-glow/pkg) instead of deep paths.",
            },
          ],
        },
      ],
    },
  }
);
