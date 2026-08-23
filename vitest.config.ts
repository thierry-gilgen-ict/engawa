import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/**/*.test.ts",
      "packages/**/*.test.tsx",
      "examples/**/*.test.ts",
      "tests/**/*.test.ts",
    ],
    environment: "jsdom",
  },
});
