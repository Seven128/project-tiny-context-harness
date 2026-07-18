import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const read = (relative) => readFile(path.join(repository, relative), "utf8");

test("Context authority projection excludes retrieval-only friction without weakening final proof", async () => {
  const [architecture, contextModel, rationale, efficiency, lifecycle] =
    await Promise.all([
      read("project_context/architecture.md"),
      read("project_context/areas/harness-package/foundation/context-model.md"),
      read(
        "project_context/areas/harness-package/decision-rationale/minimal-context.md",
      ),
      read("docs/long-task-workflow-efficiency.md"),
      read(
        ".codex/ty-context-managed/skills/long-task-workflow/references/authority-lifecycle.md",
      ),
    ]);
  const combined = [
    architecture,
    contextModel,
    rationale,
    efficiency,
    lifecycle,
  ].join("\n");

  for (const expected of [
    "triggers",
    "read_when",
    "read_policy",
    "selected delivery-authority structure",
    "selected area",
    "selected role",
    "scoped Progress",
    "Live Final Gate",
  ])
    assert.match(combined, new RegExp(expected, "iu"), expected);
  assert.match(
    combined,
    /retrieval-only[\s\S]*do not revise|retrieval-only[\s\S]*does not revise/iu,
  );
  assert.match(
    combined,
    /changed Git tree[\s\S]*Live Final Gate|final Git tree[\s\S]*Live Final Gate/iu,
  );
  assert.doesNotMatch(
    combined,
    /retrieval registry|retrieval cache|retrieval state file/iu,
  );
});

test("Preflight repair ordering remains advisory and creates no authority", async () => {
  const [architecture, efficiency, ...references] = await Promise.all([
    read("project_context/architecture.md"),
    read("docs/long-task-workflow-efficiency.md"),
    read(
      ".codex/skills/long-task-workflow/references/authority-lifecycle.md",
    ),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/authority-lifecycle.md",
    ),
    read(
      "packages/ty-context/assets/skills/long-task-workflow/references/authority-lifecycle.md",
    ),
  ]);
  const combined = [architecture, efficiency, ...references].join("\n");

  for (const expected of [
    "diagnostic_id",
    "repair_group",
    "repair_priority",
    "blocked_by",
    "structural duplicate",
    "same Claim",
  ])
    assert.match(combined, new RegExp(expected, "iu"), expected);
  assert.match(combined, /no (?:diagnostic|finding) is hidden/iu);
  assert.match(combined, /no repair state|creates no repair state/iu);
  assert.equal(references[1], references[0]);
  assert.equal(references[2], references[0]);
});

test("affected developer loops remain non-authoritative", async () => {
  const verification = await read(
    "project_context/areas/harness-package/verification.md",
  );
  for (const command of [
    "test:affected:list",
    "test:affected",
    "test:long-task:focused",
    "test:delivery-contract:focused",
    "do not replace complete CI/release gates",
    "fail safe",
  ])
    assert.ok(verification.includes(command), command);
});
