export default {
  root: process.cwd(),
  cacheDir: `${process.env.TY_CONTEXT_TEMP_DIR}/vitest-cache`,
  server: { watch: null, fs: { allow: [process.cwd()] } },
  test: { fileParallelism: false, pool: "threads" }
};
