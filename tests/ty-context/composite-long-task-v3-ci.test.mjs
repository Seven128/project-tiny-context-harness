import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("Package CI blocks on Windows, Linux, macOS, one candidate artifact, and all 60 runtime cases", async () => {
  const source = await readFile(path.join(root, ".github", "workflows", "package.yml"), "utf8");
  const workflow = YAML.parse(source);
  const jobs = workflow.jobs;
  assert.deepEqual(
    jobs.package.strategy.matrix.include.map((row) => `${row.platform}-${row.arch}`).sort(),
    ["linux-x64", "macos-arm64", "macos-x64", "windows-x64"]
  );
  assert.match(source, /cargo test --release --locked/u);
  assert.match(source, /x86_64-pc-windows-gnullvm/u);
  assert.match(source, /rustup target add x86_64-pc-windows-gnullvm/u);
  assert.match(source, /llvm-mingw-20260616-ucrt-x86_64\.zip/u);
  assert.match(source, /b9b68a4d276e16fa25802aaba458e4638f64b3884c290aaccdc2d87083b6ca35/u);
  assert.match(source, /CARGO_TARGET_X86_64_PC_WINDOWS_GNULLVM_LINKER/u);
  assert.match(source, /Test complete package with the privileged Linux Host/u);
  assert.match(source, /docker run --rm --privileged/u);
  assert.equal(source.match(/docker run --rm --privileged/gu)?.length, 2);
  assert.equal(source.match(/--env GITHUB_WORKSPACE/gu)?.length, 2);
  assert.match(source, /ubuntu:24\.04@sha256:4fbb8e6a8395de5a7550b33509421a2bafbc0aab6c06ba2cef9ebffbc7092d90/u);
  assert.match(source, /NODE_ROOT\/lib\/node_modules\/npm\/bin\/npm-cli\.js/u);
  assert.match(source, /target\/\$env:HOST_BUILD_TARGET\/release/u);
  assert.match(source, /x86_64-apple-darwin/u);
  assert.match(source, /aarch64-apple-darwin/u);
  assert.match(source, /macos-15-intel/u);
  assert.match(source, /unsigned-host-binaries-\$\{\{ matrix\.platform \}\}-\$\{\{ matrix\.arch \}\}/u);
  assert.match(source, /TY_CONTEXT_HOST_ADMIN_BIN/u);
  assert.match(source, /TY_CONTEXT_HOST_INSTALLER_UI_BIN/u);
  assert.match(source, /SHA256SUMS/u);
  const packageSteps = jobs.package.steps.map((step) => step.name).filter(Boolean);
  assert.ok(packageSteps.indexOf("Stage unsigned Host release binaries with hashes") < packageSteps.indexOf("Test Rust Host Helper"));
  assert.match(source, /immutable-ci-candidate/u);
  assert.match(source, /npm pack --silent --ignore-scripts/u);
  assert.equal(jobs["composite-black-box"].needs, "candidate");
  assert.match(source, /run_composite_v3_black_box\.mjs/u);
  assert.match(source, /--candidate-tarball "\$CANDIDATE_TARBALL"/u);
  assert.match(source, /--host-release/u);
  assert.doesNotMatch(source, /TY_CONTEXT_HOST_RELEASE_ROOT_PRIVATE_KEY|HOST_RELEASE_ROOT_PRIVATE_KEY/u);
  assert.match(source, /candidate\.sha256/u);
  assert.doesNotMatch(source, /verify_composite_long_task_equivalence|composite-long-task-v2-regression/u);
});

test("npm publication consumes only the byte-identical externally audited artifact", async () => {
  const source = await readFile(path.join(root, ".github", "workflows", "npm-publish.yml"), "utf8");
  YAML.parse(source);
  assert.match(source, /candidate_commit/u);
  assert.match(source, /candidate_url/u);
  assert.match(source, /candidate_sha256/u);
  assert.match(source, /external-long-task-audit/u);
  assert.match(source, /ty-context-external-audit/u);
  assert.match(source, /verify_prepared_release_artifact\.mjs/u);
  assert.match(source, /npm publish "\.artifacts\/releases\/prepared\/\$filename"/u);
  assert.doesNotMatch(source, /npm pack/u);
  assert.doesNotMatch(source, /Rebuild and verify immutable prepared artifact/u);
});
