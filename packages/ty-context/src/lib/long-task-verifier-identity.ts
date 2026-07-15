import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import DELIVERY_SCHEMA from "../schemas/long-task-delivery-v1/long-task-delivery-v1.schema.json" with { type: "json" };
import OUTCOMES_SCHEMA from "../schemas/long-task-delivery-v1/long-task-outcomes-v1.schema.json" with { type: "json" };
import DELIVERY_SET_SCHEMA from "../schemas/long-task-delivery-set-v1/long-task-delivery-set-v1.schema.json" with { type: "json" };
import { checkLongTaskCompletionGate } from "./long-task-hook-preflight.js";
import type { VerifierIdentityV1 } from "./long-task-delivery-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

const REQUIRED_ENTRYPOINTS = [
  "cli.js",
  "commands/long-task.js",
  "commands/delivery-set.js",
  "lib/context-graph-snapshot.js",
  "lib/strict-codec.js",
] as const;

export async function captureVerifierIdentity(
  repositoryRoot: string,
  requireHook: boolean,
): Promise<VerifierIdentityV1> {
  const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
  const packageJson = JSON.parse(
    await readFile(path.join(packageRoot, "package.json"), "utf8"),
  ) as { name: string; version: string };
  const files = await verifierBundleFiles(packageRoot);
  const hook = requireHook
    ? await checkLongTaskCompletionGate(repositoryRoot)
    : null;
  if (hook && hook.status !== "available") {
    throw new Error(`completion_gate_unavailable:${hook.findings.join(",")}`);
  }
  return {
    package_name: "project-tiny-context-harness",
    package_version: packageJson.version,
    package_root: packageRoot,
    bundle_sha256: sha256Hex(canonicalValueJson(files)),
    bundle_files: files,
    schema_sha256: sha256Hex(
      canonicalValueJson({
        delivery: DELIVERY_SCHEMA,
        outcomes: OUTCOMES_SCHEMA,
        delivery_set: DELIVERY_SET_SCHEMA,
      }),
    ),
    hook_sha256: hook?.bundle_sha256 ?? "not-required",
  };
}

async function verifierBundleFiles(
  packageRoot: string,
): Promise<Record<string, string>> {
  const distRoot = path.join(packageRoot, "dist");
  const relativeFiles = new Set<string>(REQUIRED_ENTRYPOINTS);
  for (const file of await readdir(path.join(distRoot, "lib"))) {
    if (/^long-task-.*\.js$/u.test(file)) relativeFiles.add(`lib/${file}`);
  }
  relativeFiles.add(
    "schemas/long-task-delivery-v1/long-task-delivery-v1.schema.json",
  );
  relativeFiles.add(
    "schemas/long-task-delivery-v1/long-task-outcomes-v1.schema.json",
  );
  relativeFiles.add(
    "schemas/long-task-delivery-set-v1/long-task-delivery-set-v1.schema.json",
  );
  const rows = await Promise.all(
    [...relativeFiles]
      .sort()
      .map(
        async (relative) =>
          [
            relative,
            sha256Hex(
              await readFile(path.join(distRoot, ...relative.split("/"))),
            ),
          ] as const,
      ),
  );
  return Object.fromEntries(rows);
}
