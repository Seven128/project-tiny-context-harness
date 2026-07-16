import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type {
  CompiledCheckV2,
  DeliveryCheckV2,
  FrozenRunnerV2,
  WorkspaceManifestV2,
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
  check: DeliveryCheckV2,
  outcomeKey: string | null,
  repository: string,
  baseline: WorkspaceManifestV2,
): Promise<CompiledCheckV2> {
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
  const cwd = resolveInsideRepository(
    repository,
    check.runner.cwd,
    `${check.key}.cwd`,
  );
  if (!(await stat(cwd).catch(() => null))?.isDirectory())
    throw new Error(`runner_cwd_not_found:${check.key}:${check.runner.cwd}`);
  const target = await resolvedRunnerTarget(check, repository, cwd);
  const verificationInputHashes = await freezeVerificationInputs(
    check,
    repository,
    baseline,
    cwd,
    target,
  );
  return {
    ...check,
    internal_id: `${prefix}.${check.key}`,
    outcome_key: outcomeKey,
    runner: await freezeRunner(
      check,
      repository,
      cwd,
      target,
      verificationInputHashes,
    ),
    verification_input_hashes: verificationInputHashes,
  };
}

async function resolvedRunnerTarget(
  check: DeliveryCheckV2,
  repository: string,
  cwd: string,
): Promise<string> {
  if (check.runner.type === "package_script") {
    const packageFile = await nearestFile(cwd, repository, "package.json");
    if (!packageFile)
      throw new Error(
        `package_json_not_found:${check.key}:${check.runner.cwd}`,
      );
    return packageFile;
  }
  const target = resolveInsideRepository(
    cwd,
    check.runner.target,
    `${check.key}.target`,
  );
  if (!(await stat(target).catch(() => null))?.isFile())
    throw new Error(
      `${check.runner.type}_path_not_found:${check.key}:${check.runner.target}`,
    );
  repoRelative(repository, target);
  return target;
}

async function freezeRunner(
  check: DeliveryCheckV2,
  repository: string,
  cwd: string,
  target: string,
  verificationInputHashes: Record<string, string>,
): Promise<FrozenRunnerV2> {
  const runner = check.runner;
  if (runner.argv.some((value) => value.includes("\0")))
    throw new Error(`runner_argument_invalid:${check.key}`);
  const resolvedCwd = repoRelative(repository, cwd);
  const resolvedTarget = repoRelative(repository, target);
  const frozenFiles = { ...verificationInputHashes };
  let executable: string;
  let prefix: string[];
  let packageScript: string | null = null;
  if (runner.type === "package_script") {
    const packageJson = JSON.parse(await readFile(target, "utf8")) as {
      scripts?: Record<string, unknown>;
    };
    const script = packageJson.scripts?.[runner.target];
    if (typeof script !== "string" || !script.trim())
      throw new Error(`package_script_not_found:${check.key}:${runner.target}`);
    packageScript = script;
    executable = process.execPath;
    prefix = [await npmCliPath(), "run", runner.target, "--"];
  } else {
    const relativeFromCwd = path.relative(cwd, target).replace(/\\/gu, "/");
    if (runner.type === "node_oracle") {
      executable = process.execPath;
      prefix = [relativeFromCwd];
    } else if (runner.type === "playwright_test") {
      executable = process.platform === "win32" ? "npx.cmd" : "npx";
      prefix = [
        "--no-install",
        "playwright",
        "test",
        relativeFromCwd,
        "--reporter=json",
      ];
    } else {
      executable = resolvedTarget;
      prefix = [];
    }
  }
  const definition = sha256Hex(
    canonicalValueJson({
      runner,
      resolved_cwd: resolvedCwd,
      resolved_target: resolvedTarget,
      package_script: packageScript,
    }),
  );
  return {
    ...runner,
    executable,
    executable_argv_prefix: prefix,
    resolved_cwd: resolvedCwd,
    resolved_target: resolvedTarget,
    definition_sha256: definition,
    frozen_files: sortRecord(frozenFiles),
    package_script: packageScript,
    execution_identity: sha256Hex(
      canonicalValueJson({
        runner,
        executable,
        prefix,
        resolved_cwd: resolvedCwd,
        resolved_target: resolvedTarget,
        package_script: packageScript,
        frozen_files: frozenFiles,
      }),
    ),
  };
}

async function freezeVerificationInputs(
  check: DeliveryCheckV2,
  repository: string,
  manifest: WorkspaceManifestV2,
  cwd: string,
  target: string,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [index, source] of check.verification_inputs.entries()) {
    const pattern = assertRepositoryPattern(
      repository,
      source,
      `${check.key}.verification_inputs[${index}]`,
    );
    const matches = manifest.files.filter((file) =>
      matchesRepoPattern(file.path, pattern),
    );
    if (!matches.length)
      throw new Error(`verification_input_not_found:${check.key}:${source}`);
    for (const file of matches)
      result[file.path] = sha256Hex(
        await readFile(path.join(repository, ...file.path.split("/"))),
      );
  }
  const automatic = new Set<string>([repoRelative(repository, target)]);
  const packageFile = await nearestFile(cwd, repository, "package.json");
  if (packageFile) automatic.add(repoRelative(repository, packageFile));
  for (const name of [
    "package-lock.json",
    "npm-shrinkwrap.json",
    "pnpm-lock.yaml",
    "yarn.lock",
  ]) {
    const file = await nearestFile(cwd, repository, name);
    if (file) automatic.add(repoRelative(repository, file));
  }
  if (check.runner.type === "playwright_test")
    for (const name of [
      "playwright.config.ts",
      "playwright.config.js",
      "playwright.config.mjs",
      "playwright.config.cjs",
    ]) {
      const file = await nearestFile(cwd, repository, name);
      if (file) automatic.add(repoRelative(repository, file));
    }
  for (const relative of automatic) {
    const file = manifest.files.find(
      (candidate) => candidate.path === relative,
    );
    if (!file)
      throw new Error(`verification_input_not_found:${check.key}:${relative}`);
    result[relative] = sha256Hex(
      await readFile(path.join(repository, ...relative.split("/"))),
    );
  }
  return sortRecord(result);
}

async function nearestFile(
  start: string,
  repository: string,
  name: string,
): Promise<string | null> {
  let current = path.resolve(start);
  const root = path.resolve(repository);
  for (;;) {
    const candidate = path.join(current, name);
    if ((await stat(candidate).catch(() => null))?.isFile()) return candidate;
    if (current === root) return null;
    const parent = path.dirname(current);
    if (parent === current || !parent.startsWith(root)) return null;
    current = parent;
  }
}

function patternsMayOverlap(left: string, right: string): boolean {
  const prefix = (value: string): string =>
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
  for (const candidate of candidates)
    if ((await stat(candidate).catch(() => null))?.isFile()) return candidate;
  throw new Error("npm_cli_not_found_for_package_script_runner");
}

function sortRecord<T>(value: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
  );
}
