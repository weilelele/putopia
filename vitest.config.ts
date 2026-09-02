import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Smoke-test runner. Pure logic only (node env, no DOM/DB/network) — these run
// in CI alongside tsc + build and must not touch the shared production services.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'mobile/**/*.test.ts', 'eslint-rules/**/*.test.ts'],
  },
})
