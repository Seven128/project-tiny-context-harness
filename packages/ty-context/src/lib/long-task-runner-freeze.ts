import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type {
  CompiledCheckV1,
  DeliveryCheckV1,
  FrozenRunnerV1,
  WorkspaceManifestV1,
} from "./long-task-delivery-types.js";
import {
  assertRepositoryPattern,
  matchesRepoPattern,
} from "./long-task-paths.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";
import {
  repoRelative,
  resolveInsideRepository,
} from "./long-task-workspace.js";

export async function freezeDeliveryCheck(
  check: DeliveryCheckV1,
  outcomeKey: string | null,
  repository: string,
  baseline: WorkspaceManifestV1,
): Promise<CompiledCheckV1> {
  const prefix = outcomeKey ? `CHECK.${outcomeKey}` : "CHECK.GLOBAL";
  for (const [index, pattern] of check.input_paths.entries()) {
    const normalized = assertRepositoryPattern(
      repository,
      pattern,
      `${check.key}.input_paths[${index}]`,
    );
    if (
      !baseline.files.some((file) => matchesRepoPattern(file.path, normalized))
    )
      throw new Error(`input_path_not_found:${check.key}:${pattern}`);
  }
  check.artifact_globs.forEach((pattern, index) =>
    assertRepositoryPattern(
      repository,
      pattern,
      `${check.key}.artifact_globs[${index}]`,
    ),
  );
  return {
    ...check,
    internal_id: `${prefix}.${check.key}`,
    outcome_key: outcomeKey,
    runner: await freezeRunner(check, repository),
  };
}

async function freezeRunner(
  check: DeliveryCheckV1,
  repository: string,
): Promise<FrozenRunnerV1> {
  const runner = check.runner;
  if (runner.argv.some((value) => value.includes("\0")))
    throw new Error(`runner_argument_invalid:${check.key}`);
  const cwd = resolveInsideRepository(
    repository,
    runner.cwd,
    `${check.key}.cwd`,
  );
  if (!(await stat(cwd)).isDirectory())
    throw new Error(`runner_cwd_not_found:${check.key}:${runner.cwd}`);
  const frozenFiles: Record<string, string> = {};
  let executable: string;
  let prefix: string[];
  let commandDefinition: unknown = runner;
  if (runner.type === "package_script") {
    const packageFile = path.join(cwd, "package.json");
    const packageBytes = await readFile(packageFile);
    const packageJson = JSON.parse(packageBytes.toString("utf8")) as {
      scripts?: Record<string, unknown>;
    };
    const script = packageJson.scripts?.[runner.target];
    if (typeof script !== "string" || !script.trim())
      throw new Error(`package_script_not_found:${check.key}:${runner.target}`);
    frozenFiles[repoRelative(repository, packageFile)] =
      sha256Hex(packageBytes);
    executable = process.execPath;
    prefix = [await npmCliPath(), "run", runner.target, "--"];
    commandDefinition = { runner, script };
  } else {
    const target = resolveInsideRepository(
      repository,
      runner.target,
      `${check.key}.target`,
    );
    const info = await stat(target).catch(() => null);
    if (!info?.isFile())
      throw new Error(
        `${runner.type}_path_not_found:${check.key}:${runner.target}`,
      );
    frozenFiles[repoRelative(repository, target)] = sha256Hex(
      await readFile(target),
    );
    if (runner.type === "node_oracle") {
      executable = process.execPath;
      prefix = [runner.target];
    } else if (runner.type === "playwright_test") {
      executable = process.platform === "win32" ? "npx.cmd" : "npx";
      prefix = [
        "--no-install",
        "playwright",
        "test",
        runner.target,
        "--reporter=json",
      ];
    } else {
      executable = runner.target;
      prefix = [];
    }
  }
  const definition = sha256Hex(canonicalValueJson(commandDefinition));
  return {
    ...runner,
    executable,
    executable_argv_prefix: prefix,
    definition_sha256: definition,
    frozen_files: sortRecord(frozenFiles),
    execution_identity: sha256Hex(
      canonicalValueJson({
        runner,
        executable,
        prefix,
        definition,
        frozenFiles,
      }),
    ),
  };
}

async function npmCliPath(): Promise<string> {
  const candidates = [
    process.env.npm_execpath,
    path.join(
      path.dirname(process.execPath),
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    ),
  ].filter((candidate): candidate is string => Boolean(candidate));
  for (const candidate of candidates) {
    if ((await stat(candidate).catch(() => null))?.isFile()) return candidate;
  }
  throw new Error("npm_cli_not_found_for_package_script_runner");
}

function sortRecord<T>(value: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
  );
}
