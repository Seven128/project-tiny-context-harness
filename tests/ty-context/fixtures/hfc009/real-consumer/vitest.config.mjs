import { defineConfig } from "vitest/config";

export default defineConfig({
  root: process.cwd(),
  cacheDir: `${process.env.TY_CONTEXT_TEMP_DIR}/vitest-cache`,
  server: { fs: { allow: [process.cwd()] } },
  test: { fileParallelism: false, pool: "forks" }
});
