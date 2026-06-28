import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourceSkill = await readFile(path.join(repoRoot, ".codex/ty-context-managed/skills/superpowers-long-task/SKILL.md"), "utf8");

for (const pattern of [
  /task-state\.json/,
  /events\.ndjson/,
  /derived\/local-audit\.md/,
  /derived\/plan-conformance-matrix\.md/,
  /derived\/final-acceptance-verdict\.md/,
  /derived\/progress-ledger\.md/,
  /derived\/evidence-index\.md/,
  /derived\/context-alignment\.md/,
  /derived\/final-summary\.md/,
  /slice-delta\.json/,
  /progress_value/,
  /ty-context superpowers init/,
  /ty-context superpowers compile/,
  /ty-context superpowers apply-slice-delta/,
  /ty-context superpowers derive/,
  /ty-context superpowers slice-gate/,
  /ty-context superpowers epoch-gate/,
  /ty-context superpowers final-gate/,
  /ty-context superpowers next-slices/,
  /ty-context validate-superpowers-state/,
  /Do not manually edit derived/i,
  /must not hand-set `product_goal_complete`|product_goal_complete.*computed/i,
  /evidence\[\]|task-state\.evidence/i,
  /proves[\s\S]*does_not_prove/,
  /fresh reviewable evidence/i
]) {
  assert.match(sourceSkill, pattern);
}

assert.doesNotMatch(sourceSkill, /optional rolling evidence manifest/i);
assert.doesNotMatch(sourceSkill, /manifest is not a fourth input/i);
