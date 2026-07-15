import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { deliveryCompileFreshness } from "../../packages/ty-context/dist/lib/long-task-freshness.js";
import { readCompiledDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  createDeliveryFixture,
  pathExists,
  readState,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("status distinguishes unverified, passing, failing, blocked and stale while resume is read-only", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    const firstCompile = await runCli(fixture.root, [
      "long-task", "compile", fixture.workdir,
    ]);
    const secondCompile = await runCli(fixture.root, [
      "long-task", "compile", fixture.workdir,
    ]);
    assert.equal(secondCompile.compiled_identity, firstCompile.compiled_identity);

    const unverified = await runCli(fixture.root, [
      "long-task", "status", fixture.workdir,
    ]);
    assert.equal(unverified.outcomes.first, "unverified");
    const beforeResume = await treeDigest(fixture.root);
    const started = performance.now();
    const resumed = await runCli(fixture.root, [
      "long-task", "resume", fixture.workdir,
    ]);
    assert.ok(performance.now() - started < 1_000);
    assert.equal(resumed.task.id, "fixture-task");
    assert.equal(resumed.ready_outcomes[0], "first");
    assert.equal(await treeDigest(fixture.root), beforeResume);

    await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);
    const passing = await runCli(fixture.root, [
      "long-task", "status", fixture.workdir,
    ]);
    assert.equal(passing.outcomes.first, "progress_passing");

    await writeFile(
      path.join(fixture.root, "src/state.json"),
      `${JSON.stringify({ first: false, second: false })}\n`,
    );
    const stale = await runCli(fixture.root, [
      "long-task", "status", fixture.workdir,
    ]);
    assert.equal(stale.outcomes.first, "progress_stale");
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCliFailure(fixture.root, ["long-task", "verify", fixture.workdir]);
    const failing = await runCli(fixture.root, [
      "long-task", "status", fixture.workdir,
    ]);
    assert.equal(failing.outcomes.first, "progress_failing");

    await writeFile(
      path.join(fixture.root, "tests/oracle.mjs"),
      'console.log(JSON.stringify({schema_version:"long-task-check-result-v1",blocked_external:"fixture unavailable"}));\n',
    );
    await assert.rejects(
      () => runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
      /authority_change_requires_user_decision/,
    );
    const pending = JSON.parse(
      await readFile(
        path.join(fixture.workdir, ".ty-context/authority-revision-pending.json"),
        "utf8",
      ),
    );
    await runCli(fixture.root, [
      "long-task", "approve-authority-revision", fixture.workdir,
      "--revision", pending.revision_identity,
    ]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCliFailure(fixture.root, ["long-task", "verify", fixture.workdir]);
    const blocked = await runCli(fixture.root, [
      "long-task", "status", fixture.workdir,
    ]);
    assert.equal(blocked.outcomes.first, "blocked_external");
    await assert.rejects(
      () => runCli(fixture.root, ["long-task", "close", fixture.workdir]),
      /close_requires_fresh_accepted/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("source, Oracle and complete verifier bundle identities invalidate old authority", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await writeFile(path.join(fixture.root, "source.md"), "source v1\n");
    fixture.contract.task.source_paths = ["source.md"];
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const compiled = await readCompiledDeliveryContract(fixture.workdir);
    assert.ok(Object.keys(compiled.verifier_identity.bundle_files).length > 5);
    const tampered = structuredClone(compiled);
    tampered.verifier_identity.bundle_sha256 = "0".repeat(64);
    assert.ok(
      (await deliveryCompileFreshness(tampered)).includes(
        "verifier_changed_after_compile:bundle",
      ),
    );

    await runCli(fixture.root, ["long-task", "final-gate", fixture.workdir]);
    await writeFile(path.join(fixture.root, "source.md"), "source v2\n");
    let stale = await runCli(fixture.root, [
      "long-task", "status", fixture.workdir,
    ]);
    assert.ok(stale.findings.some((item) => item.code.startsWith("source_changed_after_compile")));
    await writeFile(path.join(fixture.root, "source.md"), "source v1\n");
    await writeFile(path.join(fixture.root, "tests/oracle.mjs"), "// changed oracle\n");
    stale = await runCli(fixture.root, ["long-task", "status", fixture.workdir]);
    assert.ok(stale.findings.some((item) => item.code.startsWith("runner_changed_after_compile")));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("identical execution identity is deduplicated only inside one Final Gate snapshot", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await writeFile(path.join(fixture.root, "tests/run-count.txt"), "0\n");
    await writeFile(
      path.join(fixture.root, "tests/oracle.mjs"),
      `import { readFile, writeFile } from "node:fs/promises";
const countFile = new URL("./run-count.txt", import.meta.url);
const count = Number((await readFile(countFile, "utf8")).trim()) + 1;
await writeFile(countFile, String(count));
console.log(JSON.stringify({schema_version:"long-task-check-result-v1",observations:{result:true,invocation_count:count}}));
`,
    );
    const original = fixture.contract.outcomes[0].acceptance.checks[0];
    original.positive_assertions.push({
      observation: "invocation_count",
      operator: "equals",
      expected: 1,
    });
    fixture.contract.outcomes[0].acceptance.checks.push({
      ...structuredClone(original),
      key: "same-execution-check",
    });
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const accepted = await runCli(fixture.root, [
      "long-task", "final-gate", fixture.workdir,
    ]);
    assert.equal(accepted.workflow_status, "machine_accepted");
    assert.equal(accepted.check_results.length, 2);
    assert.equal(
      new Set(accepted.check_results.map((item) => item.execution_identity)).size,
      1,
    );
    assert.deepEqual(
      accepted.check_results.map((item) => item.observations.invocation_count),
      [1, 1],
    );
    assert.equal((await readFile(path.join(fixture.root, "tests/run-count.txt"), "utf8")).trim(), "0");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("close requires a fresh accepted receipt and preserves authored Contract and receipt", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await assert.rejects(
      () => runCli(fixture.root, ["long-task", "close", fixture.workdir]),
      /close_requires_fresh_accepted/,
    );
    const receipt = await runCli(fixture.root, [
      "long-task", "final-gate", fixture.workdir,
    ]);
    assert.equal(receipt.contract_sha256.length, 64);
    assert.equal(receipt.snapshot_sha256.length, 64);
    assert.equal(receipt.verifier_identity.bundle_sha256.length, 64);
    await runCli(fixture.root, ["long-task", "close", fixture.workdir]);
    assert.equal(
      await pathExists(path.join(fixture.workdir, "delivery-contract.yaml")),
      true,
    );
    assert.equal(
      await pathExists(path.join(fixture.workdir, ".ty-context/final-receipt.json")),
      true,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function treeDigest(root) {
  const hash = createHash("sha256");
  async function visit(directory, relative = "") {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === ".git") continue;
      const next = relative ? `${relative}/${entry.name}` : entry.name;
      const absolute = path.join(directory, entry.name);
      hash.update(next);
      if (entry.isDirectory()) await visit(absolute, next);
      else hash.update(await readFile(absolute));
    }
  }
  await visit(root);
  return hash.digest("hex");
}
