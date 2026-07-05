import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderCompositeLongTaskGoal } from "../../packages/ty-context/dist/lib/composite-long-task-renderer.js";
import { initializeSuperpowersTask } from "../../packages/ty-context/dist/lib/superpowers-task-state.js";
import { compileSuperpowersTask } from "../../packages/ty-context/dist/lib/superpowers-task-compile.js";
import { createPlanProject, writeSuperpowersSources } from "./plan-validator-fixtures.mjs";

test("render-goal freezes the package protocol into a hash-verifiable workdir snapshot", async () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const packageManifest = JSON.parse(
    await readFile(path.join(repoRoot, "packages/ty-context/package.json"), "utf8")
  );
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await initializeSuperpowersTask(workdir, { taskId: "CLT-PROTOCOL", planSlug: "demo" });
    await compileSuperpowersTask(workdir);

    const result = await renderCompositeLongTaskGoal(workdir);
    const snapshot = await readFile(path.join(workdir, "workflow-protocol.md"), "utf8");
    const [header, body] = snapshot.split("\n---\n");

    assert.match(header, /protocol_name: composite-long-task-workflow/);
    assert.match(header, new RegExp(`protocol_version: ${escapeRegex(packageManifest.version)}`));
    assert.match(header, /protocol_sha256: [a-f0-9]{64}/);
    assert.match(header, /generated_at: \d{4}-\d{2}-\d{2}T/);
    assert.match(
      header,
      /source_asset: packages\/ty-context\/assets\/skills\/composite-long-task-workflow\/references\/composite-long-task-workflow-protocol\.md/
    );
    assert.match(body, /# Composite Long-Task Workflow Protocol/);
    assert.match(body, /## Expected Runtime Effect \/ 预期实现效果/);
    for (const runtimeHeading of [
      "## Workflow Identity",
      "## Authority Model",
      "## Execution Order",
      "## Slice Protocol",
      "## Evidence Protocol",
      "## Derived Views",
      "## Gates",
      "## Completion State Machine",
      "## Blocker Protocol",
      "## Hallucination Guard"
    ]) {
      assert.match(body, new RegExp(escapeRegex(runtimeHeading)));
    }
    for (const section of [
      "## 1. Materials Entering Agent Context",
      "## 2. Phase One: Workflow Contract First",
      "## 3. Phase Two: Three Inputs Lock Task Authority",
      "## 4. Phase Three: Compile The State Kernel",
      "## 5. Phase Four: Superpowers Enters Implementation",
      "## 6. Phase Five: What An Implementation Slice Is",
      "## 7. Phase Six: Slice Delta Updates State",
      "## 8. Phase Seven: Local Audit And Derived Views",
      "## 9. Phase Eight: Slice Gate And Epoch Gate",
      "## 10. Phase Nine: Plan Conformance Gate",
      "## 11. Phase Ten: Acceptance Evidence Gate",
      "## 12. Phase Eleven: Delivery Scope And Full Population Stay Separate",
      "## 13. Phase Twelve: Fixed Final Gate Order",
      "## 14. Completion Semantics",
      "## 15. Blocker Strategy",
      "## 16. Final Expected Effect",
      "## 17. Forbidden Wrong Fusion / 不允许的错误融合"
    ]) {
      assert.match(body, new RegExp(escapeRegex(section)));
    }
    assert.match(body, /Do not register workflow-protocol\.md in project_context\/context\.toml/);
    assert.match(body, /Do not let derived\/\*\* rewrite Product \/ Plan \/ Checklist/);
    assert.match(body, /assertion_result\.schema_version=assertion-result-v1/);
    assert.match(body, /assertion_result\.status=passed/);
    assert.match(body, /passed `negative_evidence_scan`/);
    assert.match(body, /Matrix and verdict views may summarize `assertion_status`/);
    assert.match(body, /Invalid evidence for UI\/browser AC completion includes screenshot-only proof/);
    assert.match(body, /AC Evidence Assertion Gate and Negative Evidence Scan Gate/);
    assert.match(body, /final card, matrix, verdict or validator pass does not mean a machine-verifiable AC has assertion-backed evidence/);
    assert.match(body, /Do not call update_goal complete before final-gate passes/);
    assert.doesNotMatch(body, /## 18\. Authoring Placement \/ 建议写入位置/);
    assert.doesNotMatch(body, /Authoring Placement/);
    assert.doesNotMatch(body, /建议写入位置/);
    assert.doesNotMatch(body, /README\.md/);
    assert.doesNotMatch(body, /README\.zh-CN\.md/);
    assert.doesNotMatch(body, /project_context\/areas\/harness-package\/implementation-index\.md/);
    assert.doesNotMatch(body, /tests\/ty-context/);
    assert.doesNotMatch(body, /why the workflow is not packed into a 4000-character Goal/);

    const headerHash = header.match(/protocol_sha256: (?<hash>[a-f0-9]{64})/)?.groups?.hash;
    const computed = createHash("sha256").update(body.trimEnd() + "\n").digest("hex");
    assert.equal(headerHash, computed);
    assert.equal(result.protocolSha256, computed);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
