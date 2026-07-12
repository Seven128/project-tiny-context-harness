import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, cp, mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { compileLongTaskContract } from "../../packages/ty-context/dist/lib/long-task-contract-compiler.js";
import { writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";

const exec = promisify(execFile);

async function modules() {
  const [{ LongTaskHostRegistryServiceV1 }, protocol] = await Promise.all([
    import("../../packages/ty-context/dist/lib/long-task-host-service.js"),
    import("../../packages/ty-context/dist/lib/long-task-host-protocol.js")
  ]);
  return { LongTaskHostRegistryServiceV1, protocol };
}

async function serviceFixture(name, options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), `ltw-host-service-${name}-repo-`));
  const stateRoot = await mkdtemp(path.join(os.tmpdir(), `ltw-host-service-${name}-state-`));
  const workdir = await writeHappyV3Contract(root);
  const contract = await compileLongTaskContract(workdir, root);
  const { LongTaskHostRegistryServiceV1 } = await modules();
  return { root, workdir, stateRoot, contract, service: new LongTaskHostRegistryServiceV1({ stateRoot, ...options }) };
}

async function seal(item) {
  const reservation = await item.service.reserveAuthority(item.root, item.workdir);
  return item.service.sealAuthority(reservation, item.contract);
}

test("registry record is signed and freezes every authority identity outside the workspace", async () => {
  const item = await serviceFixture("signed");
  const active = await seal(item);
  assert.equal(active.schema_version, "ty-context-host-active-registry-v1");
  assert.equal(active.state, "sealed");
  assert.match(active.registry_id, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.match(active.record_sha256, /^[a-f0-9]{64}$/);
  assert.ok(active.signature.length > 40);
  assert.deepEqual(active.authority_identities.sources, item.contract.sources);
  assert.deepEqual(active.authority_identities.context, item.contract.context_snapshot);
  assert.deepEqual(active.authority_identities.oracle_bundles, item.contract.oracle_bundles);
  assert.deepEqual(active.authority_identities.verifier, item.contract.verifier_identity);
  assert.deepEqual(active.authority_identities.dependency_plan, item.contract.dependency_plan);
  assert.equal(path.resolve(item.stateRoot).startsWith(`${path.resolve(item.root)}${path.sep}`), false);
  assert.equal((await item.service.getActive(item.root)).registry_id, active.registry_id);
});

test("reservation is identity-idempotent and a conflicting workdir cannot reserve", async () => {
  const item = await serviceFixture("reservation");
  const first = await item.service.reserveAuthority(item.root, item.workdir);
  const second = await item.service.reserveAuthority(item.root, item.workdir);
  assert.equal(second.reservation_id, first.reservation_id);
  const other = path.join(item.root, "other-task");
  await mkdir(other);
  await assert.rejects(() => item.service.reserveAuthority(item.root, other), /active_contract_revision_requires_user_authorization/);
});

test("concurrent service instances produce one create-only reservation and seal", async () => {
  const item = await serviceFixture("concurrent");
  const { LongTaskHostRegistryServiceV1 } = await modules();
  const peer = new LongTaskHostRegistryServiceV1({ stateRoot: item.stateRoot });
  const [first, second] = await Promise.all([
    item.service.reserveAuthority(item.root, item.workdir),
    peer.reserveAuthority(item.root, item.workdir)
  ]);
  assert.equal(second.reservation_id, first.reservation_id);
  const [left, right] = await Promise.all([
    item.service.sealAuthority(first, item.contract),
    peer.sealAuthority(second, item.contract)
  ]);
  assert.equal(right.registry_id, left.registry_id);
  assert.equal(right.signature, left.signature);
});

test("expired reservation is safely replaced before any active seal exists", async () => {
  let now = Date.parse("2026-07-11T00:00:00.000Z");
  const item = await serviceFixture("reservation-expiry", { now: () => now });
  const first = await item.service.reserveAuthority(item.root, item.workdir);
  now += 16 * 60 * 1000;
  const second = await item.service.reserveAuthority(item.root, item.workdir);
  assert.notEqual(second.reservation_id, first.reservation_id);
  assert.equal(await item.service.getActive(item.root), null);
});

test("trusted compiler renewal keeps the same reservation alive past its original expiry", async () => {
  let now = Date.parse("2026-07-11T00:00:00.000Z");
  const item = await serviceFixture("reservation-renewal", { now: () => now });
  const first = await item.service.reserveAuthority(item.root, item.workdir);
  now += 14 * 60 * 1000;
  const renewed = await item.service.renewReservation(first);
  now += 2 * 60 * 1000;
  const afterOriginalExpiry = await item.service.reserveAuthority(item.root, item.workdir);
  assert.equal(afterOriginalExpiry.reservation_id, first.reservation_id);
  assert.equal(afterOriginalExpiry.expires_at, renewed.expires_at);
});

test("repository identity ignores HEAD changes but rejects a copied repository", async () => {
  const item = await serviceFixture("identity");
  const { computeRepositoryIdentity, computeWorkdirIdentity } = await import("../../packages/ty-context/dist/lib/long-task-host-identity.js");
  const before = await computeRepositoryIdentity(item.root);
  const workdirBefore = await computeWorkdirIdentity(item.root, item.workdir);
  await writeFile(path.join(item.root, "src", "head-change.txt"), "change\n");
  await exec("git", ["add", "."], { cwd: item.root });
  await exec("git", ["commit", "-m", "identity head change"], { cwd: item.root });
  assert.equal((await computeRepositoryIdentity(item.root)).hash, before.hash);
  assert.equal((await computeWorkdirIdentity(item.root, item.workdir)).hash, workdirBefore.hash);
  const copied = await mkdtemp(path.join(os.tmpdir(), "ltw-host-identity-copy-"));
  await cp(item.root, copied, { recursive: true });
  assert.notEqual((await computeRepositoryIdentity(copied)).hash, before.hash);
});

test("Host Git calls scope safe.directory to the exact repository without persistent config", async () => {
  const { longTaskGitArgs } = await import("../../packages/ty-context/dist/lib/long-task-git.js");
  const root = path.resolve("fixture repository");
  const expected = process.platform === "win32" ? root.replace(/\\/gu, "/") : root;
  const args = longTaskGitArgs(root, ["rev-parse", "--git-common-dir"]);
  assert.deepEqual(args, ["-c", `safe.directory=${expected}`, "rev-parse", "--git-common-dir"]);
  assert.equal(args.includes("*"), false);
});

test("expired verification lease recovers to the immutable sealed record", async () => {
  let now = Date.parse("2026-07-11T00:00:00.000Z");
  const item = await serviceFixture("lease", { now: () => now });
  const sealed = await seal(item);
  const verifying = await item.service.beginVerification(item.root, "run-001");
  assert.equal(verifying.state, "verifying");
  assert.equal(verifying.verification_lease.run_id, "run-001");
  now += 11 * 60 * 1000;
  await item.service.recover();
  const recovered = await item.service.getActive(item.root);
  assert.equal(recovered.registry_id, sealed.registry_id);
  assert.equal(recovered.state, "sealed");
  assert.equal(recovered.verification_lease, null);
});

test("committed WAL is replayed after a crash before registry promotion", async () => {
  let crashed = false;
  const fault = (point) => {
    if (!crashed && point === "after_journal_commit:seal") {
      crashed = true;
      throw new Error("simulated_host_crash");
    }
  };
  const item = await serviceFixture("wal", { fault });
  const reservation = await item.service.reserveAuthority(item.root, item.workdir);
  await assert.rejects(() => item.service.sealAuthority(reservation, item.contract), /simulated_host_crash/);
  const { LongTaskHostRegistryServiceV1 } = await modules();
  const restarted = new LongTaskHostRegistryServiceV1({ stateRoot: item.stateRoot });
  await restarted.recover();
  assert.equal((await restarted.getActive(item.root)).contract_sha256, item.contract.contract_sha256);
});

test("corrupt signed state fails closed and incomplete staging is quarantined", async () => {
  const item = await serviceFixture("corrupt");
  const active = await seal(item);
  const record = path.join(item.stateRoot, "registry", "active", "records", `${active.registry_id}.json`);
  const value = JSON.parse(await readFile(record, "utf8"));
  value.contract_sha256 = "0".repeat(64);
  await chmod(record, 0o600);
  await writeFile(record, JSON.stringify(value));
  await assert.rejects(() => item.service.getActive(item.root), /host_registry_integrity_failure/);

  const orphan = path.join(item.stateRoot, "staging", "orphan.tmp");
  await mkdir(path.dirname(orphan), { recursive: true });
  await writeFile(orphan, "partial");
  await assert.rejects(() => item.service.recover(), /host_registry_integrity_failure/);
  assert.ok((await readdir(path.join(item.stateRoot, "quarantine"))).some((name) => name.includes("orphan")));
});

test("RPC protocol is strict, bounded, and has no normal reset or replacement method", async () => {
  const { protocol } = await modules();
  const request = protocol.createHostRequest("get_active", "C:/repo", {});
  const frame = protocol.encodeHostFrame(request);
  assert.deepEqual(protocol.decodeHostFrame(frame), request);
  assert.throws(() => protocol.decodeHostFrame(Buffer.concat([frame, Buffer.from("x")])), /host_rpc_frame_invalid/);
  const noncanonical = Buffer.from('{"a": 1}', "utf8");
  const noncanonicalFrame = Buffer.alloc(noncanonical.length + 4);
  noncanonicalFrame.writeUInt32BE(noncanonical.length, 0);
  noncanonical.copy(noncanonicalFrame, 4);
  assert.throws(() => protocol.decodeHostFrame(noncanonicalFrame), /host_rpc_frame_invalid:noncanonical_json/);
  const oversized = Buffer.alloc(4);
  oversized.writeUInt32BE(protocol.LONG_TASK_HOST_MAX_FRAME_BYTES + 1, 0);
  assert.throws(() => protocol.decodeHostFrame(oversized), /host_rpc_frame_invalid:too_large/);
  assert.equal(protocol.NORMAL_HOST_METHODS.includes("reset"), false);
  assert.equal(protocol.NORMAL_HOST_METHODS.includes("replace"), false);
  assert.equal(protocol.NORMAL_HOST_METHODS.includes("cancel-active"), false);
  assert.equal(protocol.NORMAL_HOST_METHODS.includes("force"), false);
});
