// vitest.config.ts
import { defineVitestConfig } from "@nuxt/test-utils/config";
import path from "node:path";

export default defineVitestConfig({
  test: {
    environment: "nuxt",
    globals: true,
    include: ["tests/**/*.spec.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./source"),
    },
  },
});