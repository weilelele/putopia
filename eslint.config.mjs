import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import designTokens from "./eslint-rules/min-font-size.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // React Compiler correctness rules (eslint-plugin-react-hooks v6),
    // enforced as errors. The existing intentional exceptions — data fetch-on-
    // mount, prop->state sync, animation resets, the latest-ref pattern, and
    // imperative typewriter/animation code — carry inline
    // `eslint-disable-next-line <rule> -- <reason>` comments at their call
    // sites. New violations should be fixed, not disabled without a reason.
    rules: {
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/purity": "error",
      "react-hooks/immutability": "error",
      "react-hooks/refs": "error",
    },
  },
  {
    // Design-system type-scale floor. --fs-caption (12px) is the smallest
    // permitted size; inline fontSize literals below it are flagged. Tracked
    // as a warning for now because the codebase predates enforcement and has
    // a backlog of sub-floor sizes — promote to "error" once those are
    // reconciled (bump to 12px / a --fs-* token, or design sign-off).
    plugins: { "design-tokens": designTokens },
    rules: {
      "design-tokens/min-font-size": "warn",
    },
  },
]);

export default eslintConfig;
