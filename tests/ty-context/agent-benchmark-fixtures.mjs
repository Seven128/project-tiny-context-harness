import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { captureAgentBenchmarkToolHash } from "../../examples/delivery-benchmark/runner/agent-benchmark-provenance.mjs";

export const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const baseline = "2ad71874a3e23a2221088ebb58238df64278b5c9";
export const candidate = "1111111111111111111111111111111111111111";

export const readRepoFile = (relative) =>
  readFile(path.join(repoRoot, relative), "utf8");

export function controlOptions(outDir) {
  return {
    trackId: "context-routing",
    role: "control",
    variantId: "current-main",
    scenario: "support-triage-board",
    runIndex: 1,
    model: "gpt-fixed",
    reasoning: "xhigh",
    outDir,
    force: true,
  };
}

export function benchmarkDependencies(assets, commit) {
  return {
    assets,
    readGitState: async () => ({ commit, dirty: false }),
    captureOperatorAssets: async () => {
      const hashes = { "operator-fixture": digest("operator") };
      return { hashes, sha256: digest(JSON.stringify(hashes)) };
    },
    captureHarnessCliHash: async () => ({
      path: "packages/ty-context/dist/cli.js",
      sha256: digest(`cli:${commit}`),
    }),
    validateSelectedAssets: async () => ({ errors: [], warnings: [] }),
    captureOperatorTool: () => captureAgentBenchmarkToolHash(),
    prepareRunDirectory: async ({ outDir }) => {
      const prompt = "Identical measured prompt.\n";
      await mkdir(path.join(outDir, ".benchmark"), { recursive: true });
      await writeFile(
        path.join(outDir, ".benchmark", "prompt.md"),
        prompt,
        "utf8",
      );
      await writeFile(
        path.join(outDir, ".benchmark", "prompts.ndjson"),
        `${JSON.stringify({
          stage: "INITIAL_DELIVERY",
          prompt_kind: "protocol_initial",
          prompt_sha256: digest(prompt),
        })}\n`,
        "utf8",
      );
      await writeFile(path.join(outDir, "package.json"), "{}\n", "utf8");
      await initializeRunGit(outDir);
      return { outDir };
    },
    readPreparedRepositoryState: async (runDir) => ({
      commit: git(runDir, ["rev-parse", "HEAD"]),
      tree: git(runDir, ["rev-parse", "HEAD^{tree}"]),
    }),
    now: () => new Date("2026-07-19T00:00:00.000Z"),
  };
}

export async function completeRun(runDir, sessionId) {
  const benchmarkDir = path.join(runDir, ".benchmark");
  const [template, metadata] = await Promise.all([
    readFile(path.join(benchmarkDir, "agent-session-template.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(path.join(benchmarkDir, "agent-run.json"), "utf8").then(JSON.parse),
  ]);
  template.stage_prompt_timing_confirmed = true;
  for (const stage of metadata.expected_stages.filter(
    (candidate) => candidate !== "INITIAL_DELIVERY",
  ))
    await appendFile(
      path.join(benchmarkDir, "prompts.ndjson"),
      `${JSON.stringify({
        stage,
        prompt_kind: "protocol_stage",
        prompt_sha256: digest(`prompt:${stage}`),
      })}\n`,
      "utf8",
    );
  template.stage_sessions.forEach((stage, index) => {
    stage.session_id = `${sessionId}-${index + 1}`;
    stage.fresh_session_confirmed = true;
    stage.started_at = `2026-07-19T00:${String(index * 10).padStart(2, "0")}:00.000Z`;
    stage.ended_at = `2026-07-19T00:${String(index * 10 + 5).padStart(2, "0")}:00.000Z`;
    stage.status = "completed";
  });
  await writeFile(
    path.join(benchmarkDir, "agent-session.json"),
    `${JSON.stringify(template, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(benchmarkDir, "quality-probe.json"),
    `${JSON.stringify({
      scenario_id: "support-triage-board",
      decision: "PASS",
      passed: 1,
      total: 1,
      checks: [{ id: "probe", passed: true }],
    })}\n`,
    "utf8",
  );
  await writeFile(
    path.join(benchmarkDir, "observer-state.json"),
    `${JSON.stringify({ active: false, duration_ms: 300000 })}\n`,
    "utf8",
  );
  const observations = metadata.expected_stages.flatMap((stage, index) => [
    { event: "observer_start", stage, at: `start-${index}` },
    { event: "observer_stop", stage, duration_ms: 300000, at: `stop-${index}` },
  ]);
  await writeFile(
    path.join(benchmarkDir, "observations.ndjson"),
    `${observations.map((item) => JSON.stringify(item)).join("\n")}\n`,
    "utf8",
  );
  if (metadata.expected_stages.includes("RECOVERY"))
    await writeFile(
      path.join(benchmarkDir, "recovery-score.json"),
      `${JSON.stringify({ decision: "PASS", passed: 1, total: 1 })}\n`,
      "utf8",
    );
}

export async function fileExists(file) {
  try {
    await readFile(file);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

export function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", windowsHide: true })
    .trim();
}

async function initializeRunGit(root) {
  await writeFile(
    path.join(root, ".gitignore"),
    ".benchmark/\n",
    "utf8",
  );
  git(root, ["init"]);
  git(root, ["checkout", "-B", "main"]);
  git(root, ["config", "user.name", "Agent Benchmark Test"]);
  git(root, ["config", "user.email", "agent-benchmark@example.invalid"]);
  git(root, ["init", "--bare", path.join(root, ".benchmark", "remote.git")]);
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "prepared benchmark fixture"]);
  git(root, ["remote", "add", "origin", path.join(root, ".benchmark", "remote.git")]);
  git(root, ["push", "-u", "origin", "main"]);
}

export async function withRunRoot(action) {
  const root = await mkdtemp(path.join(os.tmpdir(), "agent-benchmark-"));
  try {
    await action(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
