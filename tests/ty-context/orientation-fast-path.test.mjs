import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const read = (relative) => readFile(path.join(root, relative), "utf8");

test("orientation Context exposes the current three-capability authority model", async () => {
  const [global, architecture, manifest, area, model, workflow] =
    await Promise.all([
      read("project_context/global.md"),
      read("project_context/architecture.md"),
      read("project_context/context.toml"),
      read("project_context/areas/harness-package.md"),
      read("project_context/areas/harness-package/foundation/context-model.md"),
      read(
        "project_context/areas/harness-package/contracts/workflow-contract.md",
      ),
    ]);

  assert.match(global, /Minimal Context.*Workflow Contract.*Composite Long-Task/s);
  assert.match(global, /Context Delta: none\|required/);
  assert.match(global, /Campaign V5.*Scope Fit V4/s);
  assert.match(architecture, /Contract V3/);
  assert.match(architecture, /Change Envelopes/);
  assert.match(architecture, /one shared snapshot/);

  assert.match(manifest, /id = "harness-package"/);
  assert.match(manifest, /role = "foundation"/);
  assert.match(manifest, /role = "contract"/);
  assert.match(manifest, /role = "decision-rationale"/);
  assert.match(manifest, /role = "implementation-index"/);
  assert.match(manifest, /role = "verification"/);
  assert.match(area, /Role Context Map/);

  assert.match(model, /`project_context\/\*\*` is authoritative/);
  assert.match(model, /Code is current implementation evidence/);
  assert.match(model, /Workflow Contract is prompt-level order of thought/);
  assert.match(model, /Source-to-Context judgment.*not a Markdown table/s);
  assert.match(model, /Context-to-Implementation alignment.*not a Markdown table/s);

  assert.match(workflow, /agent\/platform's internal planning/);
  assert.match(workflow, /no required `plan\.md`/);
  assert.match(workflow, /Existing `plan\.md` files.*ordinary user files/);
  assert.match(workflow, /Do not auto-trigger long-task workflows/);
  assert.match(workflow, /\/normal-long-task/);
  assert.match(workflow, /\/prepare-composite-long-task/);
  assert.match(workflow, /\/composite-long-task-workflow/);
  assert.match(workflow, /Contract Conformance/);
  assert.doesNotMatch(workflow, /Plan Validator Boundary/);
});

test("managed guidance and package assets share current routing", async () => {
  const [managed, packaged, workspace] = await Promise.all([
    read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
    read("packages/ty-context/assets/agents/AGENTS_CORE.md"),
    read("AGENTS.md"),
  ]);
  assert.equal(packaged, managed);
  for (const guidance of [managed, workspace]) {
    assert.match(guidance, /Default Workflow Contract/);
    assert.match(guidance, /agent\/platform's internal plan/);
    assert.match(guidance, /never requires `plan\.md`/);
    assert.match(guidance, /Context Delta: none\|required/);
    assert.match(guidance, /Contract Conformance/);
    assert.match(guidance, /Campaign V5.*Scope Fit V4/s);
    assert.match(guidance, /composite-codex/);
    assert.doesNotMatch(guidance, /Scope Fit V3|Campaign V4/);
  }
});

test("role Skills preserve Context-first semantics without fixed workflow artifacts", async () => {
  const paths = [
    "context_product_plan",
    "context_uiux_design",
    "context_development_engineer",
  ];
  for (const name of paths) {
    const [managed, packaged] = await Promise.all([
      read(`.codex/ty-context-managed/skills/${name}/SKILL.md`),
      read(`packages/ty-context/assets/skills/${name}/SKILL.md`),
    ]);
    assert.equal(packaged, managed, `${name} package drift`);
    assert.match(managed, /Context Delta: none\|required/);
    assert.match(managed, /Agent 内部计划/);
    assert.match(managed, /Contract Conformance/);
    assert.match(managed, /不要求或验证固定 `plan\.md`/);
    assert.match(managed, /外部来源.*内部分类/s);
    assert.match(managed, /small code task/);
    assert.doesNotMatch(managed, /new_context_required|under_scoped/);
  }

  const engineering = await read(
    ".codex/ty-context-managed/skills/context_development_engineer/SKILL.md",
  );
  assert.match(engineering, /Architecture Context Hit/);
  assert.match(engineering, /Decision Rationale Hit: existing\|required\|none/);
  assert.match(engineering, /Modularity Check: none\|required\|exception/);
  assert.match(engineering, /压成一行不能规避/);
  assert.match(
    engineering,
    /owner.*introduced_at.*reason.*tracking_issue.*expiry_condition/s,
  );
});

test("Product Surface Contract uses existing roles and internal Conformance", async () => {
  const [skill, template] = await Promise.all([
    read(".codex/ty-context-managed/skills/context_surface_contract/SKILL.md"),
    read(
      ".codex/ty-context-managed/context_templates/product-surface-contract.md",
    ),
  ]);
  assert.match(skill, /Audit Mode/);
  assert.match(skill, /Compile Mode/);
  assert.match(skill, /Apply Mode/);
  assert.match(skill, /Conformance Mode/);
  assert.match(skill, /Do not add a new `context_role`/);
  assert.match(skill, /Internal source classification/);
  assert.match(skill, /Do not create a fixed `plan\.md`/);
  assert.match(template, /Primary User Question/);
  assert.match(template, /Main Surface Allows/);
  assert.match(template, /Drilldown Ownership/);
  assert.match(template, /role = "contract"/);
});

test("public documentation is English-complete for profiles and current workflow", async () => {
  for (const document of [
    await read("README.md"),
    await read("packages/ty-context/README.md"),
  ]) {
    assert.match(document, /Why It Exists/);
    assert.match(document, /Minimal Context.*Workflow Contract.*Composite Long-Task/s);
    assert.match(document, /platform's internal plan/);
    assert.match(document, /core-portable/);
    assert.match(document, /workflow-default/);
    assert.match(document, /enable composite-codex/);
    assert.match(document, /Contract V3/);
    assert.match(document, /Campaign V5/);
    assert.match(document, /Scope Fit V4/);
    assert.match(document, /validate-plan-contract` no longer exists/);
    assert.match(document, /check-modularity/);
    assert.match(document, /owner.*introduced_at.*tracking_issue.*expiry_condition/s);
  }
});
