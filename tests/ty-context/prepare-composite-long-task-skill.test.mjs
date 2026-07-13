import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = path.join(root, ".codex/ty-context-managed/skills/prepare-composite-long-task");
const read = (name) => readFile(path.join(source, name), "utf8");

test("prepare Skill is concise, explicit, and routes the complete Campaign V4 loop", async () => {
  const skill = await read("SKILL.md");
  const description = skill.match(/^description:\s*(.*)$/m)?.[1];
  assert.match(skill, /^name: prepare-composite-long-task$/m);
  assert.equal(description, "Use when directly invoked to prepare, execute, resume, or review a multi-SFC composite long-task campaign from a discussed plan.");
  assert.ok(description.length <= 140);
  assert.match(skill, /\/prepare-composite-long-task/);
  assert.match(skill, /composite-campaign contract --json/);
  assert.match(skill, /complete prepare-and-execute loop/i);
  assert.match(skill, /source coverage.*full stable Scope Fit V3 DAG/is);
  assert.match(skill, /author every returned ready-frontier SFC/is);
  assert.match(skill, /Start the complete wave before waiting/i);
  assert.match(skill, /bind-repair-goal/);
  assert.match(skill, /record-result.*never runs final-gate/is);
  assert.match(skill, /Campaign Final Gate.*one shared final snapshot/is);
  assert.match(skill, /Target movement invalidates.*revalidation/is);
  assert.match(skill, /Do not import legacy attachments/i);
  assert.match(skill, /references\/scope-fit-and-selection\.md/);
  assert.match(skill, /references\/packet-authoring\.md/);
  assert.match(skill, /references\/campaign-lifecycle\.md/);
  assert.ok(skill.split(/\r?\n/).length <= 180, "Skill should remain a routing workflow, not a copied prompt corpus");
});

test("semantic references cover complete graph, positive-evidence waves, repair, and finalization", async () => {
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
  assert.match(scope, /Stable `SFC-###` IDs.*never renumbered/is);
  assert.match(scope, /global constraint.*applicable SFCs/is);
  assert.match(scope, /largest conflict-free set.*up to.*cap/is);
  assert.match(scope, /Unknown conflict defaults to serial/i);
  assert.match(authoring, /CompositeAuthoringPacketV3/);
  assert.match(authoring, /preflight/i);
  assert.match(authoring, /repair invalid authoring through a new Packet revision/is);
  assert.match(authoring, /never hand-edit rendered YAML or weaken an oracle/i);
  assert.match(authoring, /current Integration Branch Context\/code/i);
  assert.match(lifecycle, /resume|review/i);
  assert.match(lifecycle, /Launch all returned workers before waiting/i);
  assert.match(lifecycle, /bind-goal/);
  assert.match(lifecycle, /bind-repair-goal/);
  assert.match(lifecycle, /record-result/);
  assert.match(lifecycle, /Integration Gate/);
  assert.match(lifecycle, /Campaign Final Gate/);
  assert.match(lifecycle, /moved target.*reruns/is);
  assert.match(lifecycle, /never force push/i);
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
    assert.match(content, /## Composite Campaign Orchestrator V4/);
    assert.match(content, /\/prepare-composite-long-task/);
    assert.match(content, /composite-campaign/);
    assert.match(content, /worktree/i);
    assert.match(content, /Integration (?:Branch|Gate)/i);
    assert.match(content, /Campaign Final Gate/i);
    assert.match(content, /no importer, alias or silent migration|There is no importer, alias or silent migration/i);
    assert.match(content, /\/composite-long-task-workflow/);
  }
  const chinese = await readFile(path.join(root, "README.zh-CN.md"), "utf8");
  assert.match(chinese, /\/prepare-composite-long-task/);
  assert.match(chinese, /composite-campaign/);
  assert.match(chinese, /\/composite-long-task-workflow/);
});
