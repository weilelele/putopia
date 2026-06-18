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
]);

export default eslintConfig;
