import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Build output of the isolated local test server (see next.config.ts).
    ".next-test/**",
    ".next-release-check/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Standalone self-hosted translation service — its own package/deps.
    "translation-service/**",
  ]),
]);

export default eslintConfig;
