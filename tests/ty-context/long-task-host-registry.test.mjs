import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import YAML from "yaml";
import { runCompositeCompile, runCompositeVerify, runManagedHookSync, writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";
const managedHost = !!process.env.TY_CONTEXT_MANAGED_HOST_READY;

async function fixture(name) {
  const root = await mkdtemp(path.join(os.tmpdir(), `ltw-host-${name}-`));
  const workdir = await writeHappyV3Contract(root);
  const first = runCompositeCompile(root, workdir);
  assert.equal(first.status, 0, `${first.stdout}\n${first.stderr}`);
  const contract = JSON.parse(await readFile(path.join(workdir, "compiled-contract.json"), "utf8"));
  return { root, workdir, contract_sha256: contract.contract_sha256 };
}

async function active(root) {
  const output = runManagedHookSync(root);
  const context = output?.hookSpecificOutput?.additionalContext;
  if (!context) return null;
  const match = context.match(/^Composite registry ([^;]+); contract ([a-f0-9]{64});/u);
  assert.ok(match, context);
  return { registry_id: match[1], contract_sha256: match[2] };
}

function assertRevisionRejected(result) {
  assert.notEqual(result.status, 0, "a second authority unexpectedly replaced the first seal");
  assert.match(`${result.stdout}\n${result.stderr}`, /active_contract_revision_requires_user_authorization/);
}

test("weaken_sources_then_recompile", { skip: !managedHost }, async () => {
  const { root, workdir, contract_sha256 } = await fixture("weaken");
  const file = path.join(workdir, "product-architecture-source.yaml");
  await writeFile(file, (await readFile(file, "utf8")).replace("Deliver the capability", "Deliver less"));
  assertRevisionRejected(runCompositeCompile(root, workdir));
  assert.equal(JSON.parse(await readFile(path.join(workdir, "compiled-contract.json"), "utf8")).contract_sha256, contract_sha256, "rejected compile rewrote the first workdir mirror");
});

test("replace_oracle_then_recompile", { skip: !managedHost }, async () => {
  const { root, workdir } = await fixture("oracle");
  const file = path.join(root, "tests", "acceptance", "oracle.mjs");
  await writeFile(file, `${await readFile(file, "utf8")}\n// replacement ${Date.now()}\n`);
  assertRevisionRejected(runCompositeCompile(root, workdir));
});

test("compile_second_workdir", { skip: !managedHost }, async () => {
  const { root, workdir } = await fixture("workdir");
  const second = path.join(root, "task-second");
  await cp(workdir, second, { recursive: true });
  assertRevisionRejected(runCompositeCompile(root, second));
});

test("delete_repo_pointer_but_host_registry_exists", { skip: !managedHost }, async () => {
  const { root } = await fixture("delete-pointer");
  const before = await active(root);
  assert.ok(before, "Host registry must retain the active authority");
  const mirror = JSON.parse(await readFile(path.join(root, ".codex", "ty-context-active-long-task.json"), "utf8"));
  assert.equal(mirror.schema_version, "ty-context-host-active-registry-mirror-v1");
  assert.equal(mirror.authoritative, false);
  await Promise.all([
    rm(path.join(root, ".codex", "ty-context-active-long-task.json"), { force: true }),
    rm(path.join(root, ".git", "ty-context-active-long-task.json"), { force: true })
  ]);
  assert.equal((await active(root)).registry_id, before.registry_id);
});

test("rewrite_both_repo_pointers", { skip: !managedHost }, async () => {
  const { root } = await fixture("rewrite-pointer");
  const before = await active(root);
  assert.ok(before, "Host registry must retain the active authority");
  const forged = JSON.stringify({ schema_version: "active-long-task-binding-v3", contract_sha256: "0".repeat(64) });
  await Promise.all([
    writeFile(path.join(root, ".codex", "ty-context-active-long-task.json"), forged),
    writeFile(path.join(root, ".git", "ty-context-active-long-task.json"), forged)
  ]);
  const after = await active(root);
  assert.equal(after.registry_id, before.registry_id);
  assert.equal(after.contract_sha256, before.contract_sha256);
});

test("same_contract_idempotent_compile", { skip: !managedHost }, async () => {
  const { root, workdir } = await fixture("idempotent");
  const before = await active(root);
  assert.ok(before, "Host registry must retain the active authority");
  const second = runCompositeCompile(root, workdir);
  assert.equal(second.status, 0, `${second.stdout}\n${second.stderr}`);
  const after = await active(root);
  assert.equal(after.registry_id, before.registry_id);
  assert.equal(after.contract_sha256, before.contract_sha256);
});

test("deleted or forged workdir contract mirror cannot replace the sealed Host contract", { skip: !managedHost }, async () => {
  const { root, workdir, contract_sha256 } = await fixture("contract-mirror");
  const file = path.join(workdir, "compiled-contract.json");
  await writeFile(file, JSON.stringify({ schema_version: "compiled-long-task-contract-v3", contract_sha256: "0".repeat(64) }));
  let verified = runCompositeVerify(root, workdir); assert.equal(verified.status, 0, verified.stderr); assert.equal(JSON.parse(verified.stdout).contract_sha256, contract_sha256);
  await rm(file, { force: true });
  verified = runCompositeVerify(root, workdir); assert.equal(verified.status, 0, verified.stderr); assert.equal(JSON.parse(verified.stdout).contract_sha256, contract_sha256);
  assert.equal((await active(root)).contract_sha256, contract_sha256);
});

test("failed compile does not strand a reservation", { skip: !managedHost }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-host-failed-reservation-"));
  const workdir = await writeHappyV3Contract(root);
  const file = path.join(workdir, "product-architecture-source.yaml");
  const original = await readFile(file, "utf8");
  const invalid = YAML.parse(original);
  invalid.requirements = [];
  await writeFile(file, YAML.stringify(invalid));
  const failed = runCompositeCompile(root, workdir);
  assert.notEqual(failed.status, 0);
  assert.equal(await active(root), null);
  await writeFile(file, original);
  const recovered = runCompositeCompile(root, workdir);
  assert.equal(recovered.status, 0, `${recovered.stdout}\n${recovered.stderr}`);
  assert.ok(await active(root));
});
