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
    // React Compiler correctness rules (eslint-plugin-react-hooks v6). These
    // flag behaviour-sensitive patterns that are pervasive in this codebase —
    // most notably the standard "fetch on mount" effect (setState after an
    // await inside useEffect(() => { load() }, [])). Rewriting them safely
    // needs test coverage we don't have yet, so they are tracked as warnings
    // rather than gate-blocking errors. Promote back to "error" once the
    // patterns are refactored under test.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
    },
  },
]);

export default eslintConfig;
