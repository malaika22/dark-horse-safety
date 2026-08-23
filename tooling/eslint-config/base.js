import js from "@eslint/js";
import tseslint from "typescript-eslint";

/** Shared base ESLint flat config for non-Next packages */
export const baseConfig = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["dist/**", "node_modules/**", ".turbo/**"],
  },
);

export default baseConfig;
