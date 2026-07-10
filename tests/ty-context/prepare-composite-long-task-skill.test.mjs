import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = path.join(root, ".codex/ty-context-managed/skills/prepare-composite-long-task");
const read = (name) => readFile(path.join(source, name), "utf8");

test("prepare Skill is concise, explicit, and delegates strict shape to the CLI contract", async () => {
  const skill = await read("SKILL.md");
  const description = skill.match(/^description:\s*(.*)$/m)?.[1];
  assert.match(skill, /^name: prepare-composite-long-task$/m);
  assert.equal(description, "Use when directly invoked to prepare or resume a composite long-task campaign from a raw requirement.");
  assert.ok(description.length <= 120);
  assert.match(skill, /\/prepare-composite-long-task/);
  assert.match(skill, /composite-campaign contract --json/);
  assert.match(skill, /current SFC only/i);
  assert.match(skill, /Do not hand-write the three Markdown inputs/i);
  assert.match(skill, /handoff.*does not create a Goal/is);
  assert.match(skill, /explicit.*start/is);
  assert.match(skill, /same Goal ID.*idempotent/is);
  assert.match(skill, /record-result.*current final gate/is);
  assert.match(skill, /no legacy importer/i);
  assert.match(skill, /no aggregate campaign completion/i);
  assert.match(skill, /references\/scope-fit-and-selection\.md/);
  assert.match(skill, /references\/packet-authoring\.md/);
  assert.match(skill, /references\/campaign-lifecycle\.md/);
  assert.ok(skill.split(/\r?\n/).length <= 180, "Skill should remain a routing workflow, not a copied prompt corpus");
});

test("semantic references cover split decisions, repair stops, review, start, and continuation", async () => {
  const [scope, authoring, lifecycle] = await Promise.all([
    read("references/scope-fit-and-selection.md"),
    read("references/packet-authoring.md"),
    read("references/campaign-lifecycle.md")
  ]);
  assert.match(scope, /fit_for_three_inputs/);
  assert.match(scope, /split_required/);
  assert.match(scope, /blocked_for_decision/);
  assert.match(scope, /not_long_task/);
  assert.match(scope, /stable.*SFC-###/is);
  assert.match(scope, /multiple.*candidate.*ask/is);
  assert.match(scope, /schema_version.*scope-fit-result-v1/is);
  assert.match(scope, /explicit user answer.*decision ID.*rationale/is);
  assert.match(authoring, /CompositeAuthoringPacketV1/);
  assert.match(authoring, /non-completing/i);
  assert.match(authoring, /preflight/i);
  assert.match(authoring, /repair.*packet.*new revision/is);
  assert.match(authoring, /do not weaken.*acceptance/is);
  assert.match(authoring, /schema_version.*composite-authoring-packet-v1/is);
  assert.match(lifecycle, /resume|review/i);
  assert.match(lifecycle, /handoff_ready/);
  assert.match(lifecycle, /create_goal/);
  assert.match(lifecycle, /start --campaign/);
  assert.match(lifecycle, /record-result/);
  assert.match(lifecycle, /next --campaign/);
  assert.match(lifecycle, /refresh.*Context.*code/is);
  assert.match(lifecycle, /`next` is read-only.*recommended.*not yet selected/is);
  assert.match(lifecycle, /apply-scope[\s\S]*second `next` reports.*selected/is);
  assert.match(lifecycle, /never author directly from `recommended` or `decision_required`/is);
  assert.match(lifecycle, /final gate.*record-result.*update_goal/is);
  assert.match(lifecycle, /already bound.*skip `create_goal`/is);
});

test("the managed Skill uses only one reference level and no copied attachment corpus", async () => {
  const entries = await readdir(source, { withFileTypes: true });
  assert.deepEqual(entries.map((entry) => entry.name).sort(), ["SKILL.md", "references"]);
  const references = await readdir(path.join(source, "references"), { withFileTypes: true });
  assert.deepEqual(references.map((entry) => entry.name).sort(), [
    "campaign-lifecycle.md",
    "packet-authoring.md",
    "scope-fit-and-selection.md"
  ]);
  assert.ok(references.every((entry) => entry.isFile()));
  const totalWords = (await Promise.all([read("SKILL.md"), ...references.map((entry) => read(`references/${entry.name}`))]))
    .join("\n")
    .split(/\s+/)
    .filter(Boolean).length;
  assert.ok(totalWords <= 2600, `expected concise semantic guidance, got ${totalWords} words`);
});

test("canonical, packaged, and workspace Skill trees stay synchronized", async () => {
  for (const relative of [
    "SKILL.md",
    "references/scope-fit-and-selection.md",
    "references/packet-authoring.md",
    "references/campaign-lifecycle.md"
  ]) {
    const canonical = await read(relative);
    const packaged = await readFile(path.join(root, "packages/ty-context/assets/skills/prepare-composite-long-task", relative), "utf8");
    const generated = await readFile(path.join(root, ".codex/skills/prepare-composite-long-task", relative), "utf8");
    assert.equal(packaged, canonical, `packaged drift: ${relative}`);
    assert.equal(generated, canonical, `workspace drift: ${relative}`);
  }
});

test("public documentation is English-complete and preserves the strict downstream route", async () => {
  for (const relative of ["README.md", "packages/ty-context/README.md"]) {
    const content = await readFile(path.join(root, relative), "utf8");
    assert.match(content, /## Composite Campaign Preparation/);
    assert.match(content, /\/prepare-composite-long-task/);
    assert.match(content, /composite-campaign/);
    assert.match(content, /handoff never creates a Goal/i);
    assert.match(content, /no legacy importer or aggregate campaign-completion state/i);
    assert.match(content, /complete three-input bundles continue directly through `\/composite-long-task-workflow`/i);
  }
  const chinese = await readFile(path.join(root, "README.zh-CN.md"), "utf8");
  assert.match(chinese, /\/prepare-composite-long-task/);
  assert.match(chinese, /composite-campaign/);
  assert.match(chinese, /\/composite-long-task-workflow/);
});
