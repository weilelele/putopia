import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";
import designTokens from "./eslint-rules/min-font-size.mjs";
import platformRules from "./eslint-rules/no-raw-platform-check.mjs";

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
    // Generated/vendored output that isn't in git (so it's absent in CI) — keep
    // local lint in sync with CI by ignoring it here too.
    ".netlify/**",
    "ios/**",
    "android/**",
  ]),
  {
    // React Compiler correctness rules (eslint-plugin-react-hooks v6),
    // enforced as errors. The existing intentional exceptions — data fetch-on-
    // mount, prop->state sync, animation resets, the latest-ref pattern, and
    // imperative typewriter/animation code — carry inline
    // `eslint-disable-next-line <rule> -- <reason>` comments at their call
    // sites. New violations should be fixed, not disabled without a reason.
    //
    // eslint-plugin-react-hooks v7 no longer leaks its plugin namespace from
    // the eslint-config-next preset, so it must be registered in the same
    // config object that references its rules.
    plugins: { "react-hooks": reactHooks },
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
  {
    // Cross-platform discipline. The same site runs as web / iOS-native
    // (Capacitor) / Android-PWA; all runtime detection must go through
    // @/lib/platform so feature code branches on capabilities, not platform
    // names. This blocks the raw detection patterns from leaking into UI code
    // (the platform module itself lives in src/lib, outside this scope).
    // See docs/cross-platform.md.
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    plugins: { platform: platformRules },
    rules: {
      "platform/no-raw-platform-check": "error",
    },
  },
]);

export default eslintConfig;
