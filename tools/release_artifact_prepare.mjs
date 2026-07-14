import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { RELEASE_ARTIFACT_SCHEMA_V2, readReleaseEnvironmentIdentity } from "./release_artifact_identity.mjs";
import { parsePackJson } from "./release_publish_helpers.mjs";

export async function prepareImmutableTarball({ root, version, packageName, workspaceName, run }) {
  const relativeDir = path.join(".artifacts", "releases", "prepared");
  const absoluteDir = path.join(root, relativeDir);
  await rm(absoluteDir, { recursive: true, force: true });
  await mkdir(absoluteDir, { recursive: true });

  let filename = `project-tiny-context-harness-${version}.tgz`;
  let sha256 = "0".repeat(64);
  const result = await run(
    "npm",
    ["pack", "--json", "--workspace", workspaceName, "--pack-destination", relativeDir],
    { capture: true }
  );
  if (!process.env.TY_CONTEXT_RELEASE_COMMAND_LOG) {
    const packed = parsePackJson(result.stdout);
    filename = packed.filename;
    sha256 = createHash("sha256")
      .update(await readFile(path.join(absoluteDir, filename)))
      .digest("hex");
  }

  const environment = await readReleaseEnvironmentIdentity(root);
  const attestation = {
    schema_version: RELEASE_ARTIFACT_SCHEMA_V2,
    package_name: packageName,
    version,
    filename,
    sha256,
    ...environment
  };
  const file = path.join(root, "docs", "launch", `release-artifact-${version}.json`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(attestation, null, 2)}\n`);
  console.log(`prepared immutable tarball ${filename} sha256=${sha256}`);
  return attestation;
}
