import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const read = (file) => readFile(path.join(root, file), "utf8");

test("normal_long_task_default_outputs_source_and_checklist_only", async () => {
  const skills = await Promise.all(
    [
      ".codex/ty-context-managed/skills/normal-long-task/SKILL.md",
      ".codex/skills/normal-long-task/SKILL.md",
      "packages/ty-context/assets/skills/normal-long-task/SKILL.md",
    ].map(read),
  );
  for (const content of skills) {
    assert.match(content, /name:\s*normal-long-task/);
    assert.match(content, /explicitly invoked/i);
    assert.match(content, /source copy/i);
    assert.match(content, /one complete acceptance checklist/i);
    assert.match(content, /prompt only when requested/i);
    assert.match(content, /Local Audit only when.*explicitly requests/is);
    assert.match(content, /Do not execute the source or generated prompt/i);
    assert.match(content, /Do not create.*Matrix.*Verdict.*second-plan/is);
    assert.doesNotMatch(
      content,
      /task-state\.json|validate-superpowers-state|superpowers:/i,
    );
  }
});

test("normal_long_task_has_no_matrix_or_final_verdict", async () => {
  const skill = await read(
    ".codex/ty-context-managed/skills/normal-long-task/SKILL.md",
  );
  assert.doesNotMatch(skill, /write.*Plan Conformance Matrix/is);
  assert.doesNotMatch(skill, /write.*Final Acceptance Verdict/is);
  assert.doesNotMatch(skill, /workflow-contract plan\.md/i);
});

test("public design surfaces keep Contract V3 as strict Slice completion authority", async () => {
  const surfaces = await Promise.all(
    [
      "README.md",
      "README.zh-CN.md",
      "packages/ty-context/README.md",
      "PROJECT_SPEC.md",
      "project_context/areas/harness-package/contracts/workflow-contract.md",
    ].map(read),
  );
  for (const content of surfaces) {
    assert.match(content, /composite-long-task-workflow/i);
    assert.match(content, /Contract V3|three-input|三份 .*YAML/i);
    assert.match(content, /final[- ]gate|Final Gate/i);
  }
  assert.match(surfaces.join("\n"), /needs_work/);
  assert.match(surfaces.join("\n"), /accepted/);
  for (const content of surfaces.slice(0, 3)) {
    assert.doesNotMatch(
      content,
      /Superpowers-backed (?:composite|execution)|task-state\.json is the only|validate-superpowers-state/i,
    );
  }
});
