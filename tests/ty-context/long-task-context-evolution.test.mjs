import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { normalizeContextAuthoritySnapshot } from "../../packages/ty-context/dist/lib/long-task-context-authority.js";
import {
  createDeliveryFixture,
  pathExists,
  runCli,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

const SUPPORTING_CONTEXT = "project_context/areas/main/implementation-index.md";

async function addTransitiveContext(
  fixture,
  {
    relative = SUPPORTING_CONTEXT,
    role = "implementation-index",
    content = "# Implementation index\n\nInitial navigation.\n",
  } = {},
) {
  const manifestFile = path.join(
    fixture.root,
    "project_context",
    "context.toml",
  );
  const contextFile = path.join(fixture.root, ...relative.split("/"));
  await mkdir(path.dirname(contextFile), { recursive: true });
  await writeFile(contextFile, content);
  const manifest = await readFile(manifestFile, "utf8");
  await writeFile(
    manifestFile,
    `${manifest}
[[context]]
path = "project_context/areas/main.md"
role = "area"
read_policy = "default"
default_children = ["${relative}"]

[[context]]
path = "${relative}"
role = "${role}"
read_policy = "on-demand"
`,
  );
  return { contextFile, manifestFile };
}

test("legacy Context snapshots fail closed with every file controlling", () => {
  const normalized = normalizeContextAuthoritySnapshot({
    mode: "referenced",
    topology_sha256: "topology",
    files: ["project_context/global.md", SUPPORTING_CONTEXT],
    sha256: {
      "project_context/global.md": "global",
      [SUPPORTING_CONTEXT]: "support",
    },
  });
  assert.deepEqual(normalized.controlling_files, [
    SUPPORTING_CONTEXT,
    "project_context/global.md",
  ]);
  assert.deepEqual(normalized.supporting_files, []);
});

test("supporting Context revises without approval and preserves scoped Progress", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const { contextFile: supportFile } = await addTransitiveContext(fixture);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);

    const compiledFile = path.join(
      fixture.workdir,
      ".ty-context",
      "compiled-contract.json",
    );
    let compiled = JSON.parse(await readFile(compiledFile, "utf8"));
    assert.deepEqual(compiled.context_snapshot.supporting_files, [
      SUPPORTING_CONTEXT,
    ]);
    assert.ok(
      compiled.context_snapshot.controlling_files.includes(
        "project_context/areas/main.md",
      ),
    );

    await runCli(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "first",
    ]);
    let status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.outcomes.first, "progress_passing");

    await runCli(fixture.root, ["long-task", "final-gate", fixture.workdir]);
    const finalReceiptFile = path.join(
      fixture.workdir,
      ".ty-context",
      "final-receipt.json",
    );
    assert.equal(await pathExists(finalReceiptFile), true);

    await writeFile(
      supportFile,
      "# Implementation index\n\nUpdated navigation discovered during execution.\n",
    );
    await assert.rejects(
      () => runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
      /authority_revision_requires_revise_flag/u,
    );
    const revised = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(revised.progress_preserved, true);
    assert.equal(revised.authority_revision, 2);
    assert.equal(await pathExists(finalReceiptFile), false);

    status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.outcomes.first, "progress_passing");
    compiled = JSON.parse(await readFile(compiledFile, "utf8"));
    assert.equal(
      compiled.context_snapshot.sha256[SUPPORTING_CONTEXT],
      compiled.authority_materials.context_snapshot.sha256[SUPPORTING_CONTEXT],
    );

    const controllingFile = path.join(
      fixture.root,
      "project_context",
      "areas",
      "main.md",
    );
    await writeFile(
      controllingFile,
      "# Main\n\nChanged owning boundary discovered during execution.\n",
    );
    await assert.rejects(
      () =>
        runCli(fixture.root, [
          "long-task",
          "compile",
          fixture.workdir,
          "--revise",
        ]),
      /authority_change_requires_user_decision/u,
    );
    const pending = JSON.parse(
      await readFile(
        path.join(
          fixture.workdir,
          ".ty-context",
          "authority-revision-pending.json",
        ),
        "utf8",
      ),
    );
    assert.ok(
      pending.revision_diff.context_files_changed.includes(
        "project_context/areas/main.md",
      ),
    );
    assert.ok(
      pending.revision_diff.reduction_reasons.includes(
        "context_authority_changed",
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("full Context snapshots classify every selected file as controlling", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addTransitiveContext(fixture);
    fixture.contract.task.context_snapshot_mode = "full";
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const compiled = JSON.parse(
      await readFile(
        path.join(fixture.workdir, ".ty-context", "compiled-contract.json"),
        "utf8",
      ),
    );
    assert.deepEqual(compiled.context_snapshot.supporting_files, []);
    assert.ok(
      compiled.context_snapshot.controlling_files.includes(SUPPORTING_CONTEXT),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("explicitly referenced supporting roles remain controlling", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addTransitiveContext(fixture);
    fixture.contract.task.context_refs.push(SUPPORTING_CONTEXT);
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const compiled = JSON.parse(
      await readFile(
        path.join(fixture.workdir, ".ty-context", "compiled-contract.json"),
        "utf8",
      ),
    );
    assert.ok(
      compiled.context_snapshot.controlling_files.includes(SUPPORTING_CONTEXT),
    );
    assert.ok(
      !compiled.context_snapshot.supporting_files.includes(SUPPORTING_CONTEXT),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("verification Context remains controlling in referenced mode", async () => {
  const fixture = await createDeliveryFixture();
  const verificationContext = "project_context/areas/main/verification.md";
  try {
    await addTransitiveContext(fixture, {
      relative: verificationContext,
      role: "verification",
      content: "# Verification\n\nCurrent executable checks.\n",
    });
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const compiled = JSON.parse(
      await readFile(
        path.join(fixture.workdir, ".ty-context", "compiled-contract.json"),
        "utf8",
      ),
    );
    assert.ok(
      compiled.context_snapshot.controlling_files.includes(verificationContext),
    );
    assert.ok(
      !compiled.context_snapshot.supporting_files.includes(verificationContext),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
