import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  access,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { compactLongTaskTemplate } from "../../packages/ty-context/dist/commands/long-task-authoring.js";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import {
  activeAuthorityLockPath,
  activeRecordPath,
  runtimePath,
} from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  createDeliveryFixture,
  runCli,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

const exec = promisify(execFile);

test("Authoring Preflight is ready, under two seconds and completely read-only", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const marker = path.join(fixture.root, "preflight-runner-started");
    await writeFile(
      path.join(fixture.root, "tests", "oracle.mjs"),
      `require("node:fs").writeFileSync(${JSON.stringify(marker)}, "ran");\n`,
    );
    const before = await stateSnapshot(fixture);
    const started = performance.now();
    const result = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.ok(performance.now() - started < 2000);
    assert.equal(result.status, "ready");
    assert.equal(result.would_create_authority_lock, true);
    assert.equal(result.source_coverage.resolved, 1);
    assert.equal(result.claim_coverage.uncovered_claims.length, 0);
    assert.deepEqual(await stateSnapshot(fixture), before);
    assert.equal(await exists(marker), false);

    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    assert.equal(await exists(await activeRecordPath(fixture.root)), true);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Authoring Preflight aggregates independent diagnostics", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const check = outcome.acceptance.checks[0];
    delete check.positive_assertions[0].criterion;
    check.positive_assertions[0].claims = [
      "result",
      "obligation.implement-first",
    ];
    check.runner.target = "tests/missing-oracle.mjs";
    outcome.product.owner.context_refs = [
      "project_context/areas/missing.md",
    ];
    outcome.product.requirements.push(
      structuredClone(outcome.product.requirements[0]),
    );
    outcome.technical.bindings.push(
      structuredClone(outcome.technical.bindings[0]),
    );
    fixture.contract.source_claims[0].source_ref =
      "source.md#missing-anchor";
    await writeContract(fixture.workdir, fixture.contract);

    const before = await stateSnapshot(fixture);
    const result = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(result.status, "not_ready");
    const codes = new Set(result.diagnostics.map((item) => item.code));
    for (const code of [
      "owner_context_ref_unknown",
      "requirement_key_duplicate",
      "binding_key_duplicate",
      "product_claim_uncovered",
      "assertion_criterion_required",
      "source_claim_anchor_not_found",
      "node_oracle_path_not_found",
    ])
      assert.ok(codes.has(code), `missing diagnostic ${code}`);
    assert.deepEqual(await stateSnapshot(fixture), before);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Authoring Preflight previews an active revision without pending state", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    fixture.contract.outcomes[0].product.requirements[0].statement =
      "A revised atomic requirement.";
    await writeContract(fixture.workdir, fixture.contract);
    const before = await stateSnapshot(fixture);
    const result = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(result.status, "ready");
    assert.equal(result.would_create_authority_lock, false);
    assert.equal(result.revision_preview.active, true);
    assert.equal(result.revision_preview.contract_changed, true);
    assert.ok(
      result.revision_preview.declared_authority_sections_changed.includes(
        "product",
      ),
    );
    assert.equal(
      await exists(
        runtimePath(fixture.workdir, "authority-revision-pending.json"),
      ),
      false,
    );
    assert.deepEqual(await stateSnapshot(fixture), before);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Authoring Preflight Revision Preview reports declared Acceptance changes", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    fixture.contract.outcomes[0].acceptance.checks[0].positive_assertions[0].criterion =
      "A revised declared Acceptance criterion.";
    await writeContract(fixture.workdir, fixture.contract);
    const result = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(result.status, "ready");
    assert.ok(
      result.revision_preview.declared_authority_sections_changed.includes(
        "acceptance",
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Authoring Preflight Revision Preview reports Source and Context materials separately", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const sourceStatement = "The revised first outcome remains observable.";
    await writeFile(
      path.join(fixture.root, "source.md"),
      `# Fixture source

<!-- ty-source-item:start key=first-observable kind=requirement -->
${sourceStatement}
<!-- ty-source-item:end -->
`,
    );
    fixture.contract.source_claims[0].statement = sourceStatement;
    await writeContract(fixture.workdir, fixture.contract);
    let result = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(result.status, "ready");
    assert.ok(
      result.revision_preview.declared_authority_sections_changed.includes(
        "source",
      ),
    );

    await writeFile(
      path.join(fixture.root, "project_context", "areas", "main.md"),
      "# Main\n\nRevised durable Context.\n",
    );
    result = await preflightDeliveryContract(fixture.workdir, fixture.root);
    assert.equal(result.status, "ready");
    assert.ok(
      result.revision_preview.declared_authority_sections_changed.includes(
        "context",
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("init template is inline Compact V2 and at least 35 percent shorter", () => {
  const template = compactLongTaskTemplate();
  const parsed = parseDeliveryContractText(template);
  assert.equal(parsed.outcomes.length, 1);
  assert.equal(template.includes("outcome_files"), false);
  assert.ok(lineCount(template) <= Math.floor(89 * 0.65));
});

async function stateSnapshot(fixture) {
  const active = await activeRecordPath(fixture.root);
  const lock = await activeAuthorityLockPath(fixture.root);
  return {
    head: await git(fixture.root, ["rev-parse", "HEAD"]),
    index: await git(fixture.root, ["write-tree"]),
    status: await git(fixture.root, ["status", "--short", "--untracked-files=all"]),
    config: await git(fixture.root, ["config", "--local", "--list"]),
    active: await optionalFile(active),
    lock: await optionalFile(lock),
    runtime: await treeSnapshot(runtimePath(fixture.workdir)),
  };
}

async function treeSnapshot(root) {
  if (!(await exists(root))) return {};
  const result = {};
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile())
        result[path.relative(root, target).replace(/\\/gu, "/")] =
          await readFile(target, "utf8");
    }
  }
  await visit(root);
  return result;
}

async function optionalFile(file) {
  return exists(file).then((present) =>
    present ? readFile(file, "utf8") : null,
  );
}

async function exists(file) {
  return access(file)
    .then(() => true)
    .catch(() => false);
}

async function git(cwd, args) {
  return (await exec("git", args, { cwd, windowsHide: true })).stdout.trim();
}

function lineCount(value) {
  return value.trimEnd().split(/\r?\n/u).length;
}
