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
  const expectedOutputs = check.expected_output_paths.map((pattern, index) =>
    assertRepositoryPattern(
      repository,
      pattern,
      `${check.key}.expected_output_paths[${index}]`,
    ),
  );
  for (const [index, pattern] of check.input_paths.entries()) {
    const normalized = assertRepositoryPattern(
      repository,
      pattern,
      `${check.key}.input_paths[${index}]`,
    );
    if (
      !baseline.files.some((file) =>
        matchesRepoPattern(file.path, normalized),
      ) &&
      !expectedOutputs.some((output) => patternsMayOverlap(output, normalized))
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
  const verificationSourceHashes = await freezeVerificationSources(
    check,
    repository,
    baseline,
  );
  return {
    ...check,
    internal_id: `${prefix}.${check.key}`,
    outcome_key: outcomeKey,
    runner: await freezeRunner(check, repository, verificationSourceHashes),
    verification_source_hashes: verificationSourceHashes,
  };
}

async function freezeRunner(
  check: DeliveryCheckV1,
  repository: string,
  verificationSourceHashes: Record<string, string>,
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
  const frozenFiles: Record<string, string> = { ...verificationSourceHashes };
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
    for (const name of [
      "package-lock.json",
      "npm-shrinkwrap.json",
      "pnpm-lock.yaml",
      "yarn.lock",
    ]) {
      const lock = path.join(repository, name);
      const bytes = await readFile(lock).catch(() => null);
      if (bytes) frozenFiles[repoRelative(repository, lock)] = sha256Hex(bytes);
    }
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

async function freezeVerificationSources(
  check: DeliveryCheckV1,
  repository: string,
  manifest: WorkspaceManifestV1,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [index, source] of check.verification_sources.entries()) {
    const pattern = assertRepositoryPattern(
      repository,
      source,
      `${check.key}.verification_sources[${index}]`,
    );
    const matches = manifest.files.filter((file) =>
      matchesRepoPattern(file.path, pattern),
    );
    if (!matches.length)
      throw new Error(`verification_source_not_found:${check.key}:${source}`);
    for (const file of matches) result[file.path] = file.sha256;
  }
  return sortRecord(result);
}

function patternsMayOverlap(left: string, right: string): boolean {
  const prefix = (value: string) =>
    value
      .replace(/\\/gu, "/")
      .split(/[?*{[]/u, 1)[0]
      .replace(/\/$/u, "");
  const a = prefix(left);
  const b = prefix(right);
  return Boolean(
    a && b && (a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`)),
  );
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
