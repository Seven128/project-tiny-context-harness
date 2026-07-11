import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  outputDir: process.env.TY_CONTEXT_ARTIFACT_DIR,
  workers: 1,
  use: { trace: "on" },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }]
});
