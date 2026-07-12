import test from "node:test";
import assert from "node:assert/strict";
import { appendFile, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { compileLongTaskContract } from "../../packages/ty-context/dist/lib/long-task-contract-compiler.js";
import { runCompositeCompile, writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";

const pointer = (root, owner) => path.join(root, owner, "ty-context-active-long-task.json");

test("active compile guard is idempotent and fails closed without replacing the active contract", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-active-"));
  const workdir = await writeHappyV3Contract(root);
  const otherWorkdir = path.join(root, "task-two");
  await mkdir(otherWorkdir, { recursive: true });
  for (const file of ["product-architecture-source.yaml", "technical-realization-plan.yaml", "acceptance-checklist.yaml"]) {
    await copyFile(path.join(workdir, file), path.join(otherWorkdir, file));
  }

  await compileLongTaskContract(workdir, root);
  await assert.rejects(readFile(pointer(root, ".codex"), "utf8"), /ENOENT/);
  await assert.rejects(readFile(pointer(root, ".git"), "utf8"), /ENOENT/);

  const first = runCompositeCompile(root, workdir);
  assert.equal(first.status, 0, first.stderr);
  const projectPointer = await readFile(pointer(root, ".codex"), "utf8");
  const gitPointer = await readFile(pointer(root, ".git"), "utf8");
  const compiledBefore = await readFile(path.join(workdir, "compiled-contract.json"), "utf8");
  assert.equal(projectPointer, gitPointer);

  const repeated = runCompositeCompile(root, workdir);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.equal(await readFile(pointer(root, ".codex"), "utf8"), projectPointer);
  assert.equal(await readFile(path.join(workdir, "compiled-contract.json"), "utf8"), compiledBefore);

  const other = runCompositeCompile(root, otherWorkdir);
  assert.notEqual(other.status, 0);
  assert.match(other.stderr, /active_contract_changed/);
  await assert.rejects(readFile(path.join(otherWorkdir, "compiled-contract.json"), "utf8"), /ENOENT/);

  await appendFile(path.join(workdir, "product-architecture-source.yaml"), "# changed contract\n");
  const changed = runCompositeCompile(root, workdir);
  assert.notEqual(changed.status, 0);
  assert.match(changed.stderr, /active_contract_changed/);
  assert.equal(await readFile(path.join(workdir, "compiled-contract.json"), "utf8"), compiledBefore);

  await rm(pointer(root, ".git"));
  const missing = runCompositeCompile(root, workdir);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /active_contract_changed:pointer_missing/);
  assert.equal(await readFile(path.join(workdir, "compiled-contract.json"), "utf8"), compiledBefore);

  await writeFile(pointer(root, ".git"), projectPointer);
  const inconsistent = JSON.parse(projectPointer);
  inconsistent.workdir = otherWorkdir;
  await writeFile(pointer(root, ".git"), JSON.stringify(inconsistent));
  const mismatch = runCompositeCompile(root, workdir);
  assert.notEqual(mismatch.status, 0);
  assert.match(mismatch.stderr, /active_contract_changed:pointer_mismatch/);
  assert.equal(await readFile(path.join(workdir, "compiled-contract.json"), "utf8"), compiledBefore);
});
