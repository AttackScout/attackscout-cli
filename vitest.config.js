import { defineConfig } from "vitest/config";

// Tests hors ligne : faux serveur AttackScout sur 127.0.0.1 (test/serveur.js).
// Couverture exigée à 100 % sur src/.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.js"],
    restoreMocks: true,
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
      reporter: ["text", "json-summary"],
      thresholds: { lines: 100, statements: 100, functions: 100, branches: 100 },
    },
  },
});
