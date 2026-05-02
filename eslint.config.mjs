// @ts-check
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
export default defineConfig(
  js.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  {
    rules: {
      // Force explicit return types
      "@typescript-eslint/explicit-function-return-type": "error",
      // Force explicit parameter types
      "@typescript-eslint/explicit-module-boundary-types": "error",
      // Optional but very strict (can be annoying early on)
      "@typescript-eslint/no-inferrable-types": "error",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-member-accessibility": "error",
      "@typescript-eslint/no-extraneous-class": "off",
      "@typescript-eslint/prefer-literal-enum-member": "off",
      "@typescript-eslint/no-dynamic-delete": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);