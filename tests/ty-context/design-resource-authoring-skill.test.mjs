import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFile(path.join(repository, relative), "utf8");
const skillFiles = ["SKILL.md", "references/resource-selection.md", "references/open-design-provider.md", "references/downstream-handoff.md"];

async function copies(relative) {
  return Promise.all([
    read(
      `.codex/ty-context-managed/skills/design-resource-authoring/${relative}`,
    ),
    read(`.codex/skills/design-resource-authoring/${relative}`),
    read(
      `packages/ty-context/assets/skills/design-resource-authoring/${relative}`,
    ),
  ]);
}

test("design-resource-authoring has one exact managed/generated/package source", async () => {
  for (const relative of skillFiles) {
    const [managed, generated, packaged] = await copies(relative);
    assert.equal(generated, managed, relative);
    assert.equal(packaged, managed, relative);
  }
});

test("Skill triggers are explicit and keep adjacent workflows independent", async () => {
  const skill = (await copies("SKILL.md"))[0];
  const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/u)?.[1] ?? "";
  const keys = frontmatter
    .split("\n")
    .map((line) => line.match(/^([a-z_]+):/u)?.[1])
    .filter(Boolean);
  assert.deepEqual(keys, ["name", "description"]);
  assert.match(frontmatter, /^name: design-resource-authoring$/mu);
  for (const trigger of [
    "generate",
    "use Open Design",
    "design resources needed for an explicitly named development scope",
    "生成设计资源",
    "使用 Open Design",
    "为开发准备设计资源",
    "生成原型图",
    "先看一个控件/页面效果",
  ])
    assert.ok(frontmatter.includes(trigger), trigger);
  assert.match(
    frontmatter,
    /Do not trigger for generic design discussion.*ordinary UI implementation.*durable Design Authority.*Source Plan authoring.*Long-Task execution/isu,
  );
  assert.match(skill, /A raw draft is a valid input[\s\S]*provider projects, runs and generated artifacts task-local[\s\S]*Inventory every supplied input[\s\S]*genuine missing preference materially changes the commission/iu);
  assert.match(
    skill,
    /Never require, invoke, regenerate or edit a Source Plan/iu,
  );
  assert.match(
    skill,
    /Neither Skill invokes the other|does not apply.*invoke/isu,
  );
  assert.match(
    skill,
    /Route durable UI\/UX authority.*`context_uiux_design`/iu,
  );
  assert.match(
    skill,
    /Route ordinary implementation.*default Workflow Contract/iu,
  );
  assert.match(
    skill,
    /explicitly requested output or development scope[\s\S]*every material user-visible UI\/UX decision[\s\S]*without forcing one artifact per control/iu,
  );
  assert.match(
    skill,
    /must not invent or become the sole owner of business, data, permission or algorithmic logic/iu,
  );
});

test("selection contract enforces a smallest sufficient set and hard scope ceiling", async () => {
  const [skill, selection] = await Promise.all([
    copies("SKILL.md").then((items) => items[0]),
    copies("references/resource-selection.md").then((items) => items[0]),
  ]);
  const contract = `${skill}\n${selection}`;
  assert.match(contract, /hard (?:scope )?ceiling/iu);
  assert.match(contract, /one control\/component.*one page.*named pages/isu);
  assert.match(contract, /smallest sufficient/iu);
  for (const disposition of [
    "selected",
    "optional",
    "not-needed",
    "unavailable",
    "decision-required",
  ])
    assert.match(contract, new RegExp(`\\b${disposition}\\b`, "u"));
  for (const intent of [
    "exploration",
    "handoff",
    "selected-source-preparation",
  ])
    assert.match(contract, new RegExp(`\\b${intent}\\b`, "u"));
  assert.match(
    contract,
    /prototype.*never.*(?:automatically|required)|Never make a prototype/isu,
  );
  assert.match(
    contract,
    /Low- and high-fidelity resources.*independent questions/iu,
  );
  assert.match(
    contract,
    /Figma handoff.*operational|Figma.*never.*required/isu,
  );
  assert.match(
    contract,
    /For exploration, stop as soon as the requested decision is supported/iu,
  );
  assert.match(
    contract,
    /implementation handoff stops only when every material in-scope UI\/UX need|For an implementation handoff, stop only when every material in-scope coverage item/iu,
  );
});

test("implementation handoff is development-corresponding and complete through material controls", async () => {
  const [skill, selection, handoff] = await Promise.all([
    copies("SKILL.md").then((items) => items[0]),
    copies("references/resource-selection.md").then((items) => items[0]),
    copies("references/downstream-handoff.md").then((items) => items[0]),
  ]);
  const contract = `${skill}\n${selection}\n${handoff}`;

  assert.match(
    contract,
    /explicit output or development (?:scope|boundary)[\s\S]*hard ceiling/iu,
  );
  assert.match(
    contract,
    /necessary surrounding context[\s\S]*does not (?:place|put).*rest of (?:that page|the page|the product)/iu,
  );
  assert.match(
    selection,
    /resources to commission[\s\S]*material UI\/UX decisions inside the explicit development scope[\s\S]*decisions sufficiently covered by selected existing Source/iu,
  );
  for (const disposition of [
    "existing-covered",
    "new-resource-needed",
    "not-applicable",
    "excluded-by-scope",
    "decision-required",
    "unavailable",
  ])
    assert.match(contract, new RegExp(`\\b${disposition}\\b`, "u"));
  for (const coverage of [
    "Surface/flow",
    "Visual treatment/content",
    "Component/control",
    "State/interaction",
    "Motion",
    "Adaptation/input",
    "Accessibility",
    "Assets",
  ])
    assert.match(selection, new RegExp(coverage, "iu"));
  assert.match(
    selection,
    /layout grid\/constraints.*stacking\/overlay.*scrolling\/overflow/iu,
  );
  assert.match(
    selection,
    /exact copy\/labels.*formatting.*localization/iu,
  );
  assert.match(selection, /dimensions.*hit area/iu);
  assert.match(selection, /focus\/selection behavior/iu);
  assert.match(selection, /sound\/haptic cues/iu);
  assert.match(
    contract,
    /Seeing a control in one default page frame does not cover|static frame covers only the conditions it actually shows/iu,
  );
  assert.match(
    contract,
    /Do not (?:translate control-level completeness into|require) one (?:artifact|separate file) per control/iu,
  );
  assert.match(
    contract,
    /repeated controls.*component family|Map ordinary controls to selected shared component variants/iu,
  );
  assert.match(
    contract,
    /unique or complex controls.*dedicated|dedicated (?:study|resources).*unique or complex/isu,
  );
  assert.match(
    contract,
    /Business, data, permission and algorithmic rules remain owned by product\/technical Source/iu,
  );
  assert.match(
    handoff,
    /stable-key mapping[\s\S]*material surface\/flow\/region\/component\/control condition/iu,
  );
  assert.match(
    handoff,
    /not a required pack, persistent coverage authority or acceptance record/iu,
  );
});

test("Open Design commissioning discovers live capabilities without copying provider logic", async () => {
  const provider = (await copies("references/open-design-provider.md"))[0];
  assert.match(provider, /Structured Open Design MCP/iu);
  assert.match(provider, /Open Design CLI or daemon API/iu);
  assert.match(provider, /Browser\/desktop interaction.*only/isu);
  for (const capability of [
    "agents and models",
    "functional skills",
    "rendering templates",
    "design systems",
    "plugins",
  ])
    assert.match(provider, new RegExp(capability, "iu"));
  assert.match(
    provider,
    /Functional skills and rendering templates are different registries/iu,
  );
  assert.match(provider, /Never vendor a fallback template catalogue/iu);
  assert.match(
    provider,
    /does not recreate the provider's prompts, template logic or catalogue/iu,
  );
  assert.match(provider, /Codex CLI as its configured inner agent/iu);
  assert.match(provider, /Do not hardcode a model/iu);
  assert.match(provider, /Do not silently install an MCP server\/plugin/iu);
  assert.match(provider, /Figma is optional/iu);
  assert.match(provider, /listed plugin.*not proof.*editable Figma export/isu);
});

test("provider failure, artifact identity and review promises remain qualified", async () => {
  const provider = (await copies("references/open-design-provider.md"))[0];
  assert.match(provider, /Provider execution state/iu);
  assert.match(provider, /Artifact readiness/iu);
  assert.match(provider, /Design suitability/iu);
  assert.match(provider, /artifact-ready\/run-unreconciled/u);
  assert.match(provider, /artifact-ready\/provider-failed/u);
  assert.match(
    provider,
    /Support cancellation.*Retry only when.*incomplete\/corrupt.*user requests.*do not replace failures with generated placeholders/isu,
  );
  assert.match(provider, /resolve.*entry explicitly/isu);
  assert.match(provider, /SHA-256 digest or immutable snapshot/iu);
  assert.match(
    provider,
    /preview URL is mutable navigation, not immutable identity/iu,
  );
  assert.match(provider, /Exploration:.*obvious corruption.*show it/isu);
  assert.match(
    provider,
    /Handoff:.*structure.*states\/transitions.*viewport/isu,
  );
  assert.match(
    provider,
    /downstream project verification are separate evidence layers/iu,
  );
});

test("handoff preserves provenance while candidate, selection and authority stay separate", async () => {
  const handoff = (await copies("references/downstream-handoff.md"))[0];
  assert.match(handoff, /Candidate, selection and authority are separate/iu);
  assert.match(
    handoff,
    /may not promote its own candidate to `exact-target`/iu,
  );
  assert.match(
    handoff,
    /No dedicated Markdown\/YAML file or directory is mandatory/iu,
  );
  assert.match(
    handoff,
    /provider version, project\/run.*capability\/template.*agent\/model.*design-system provenance/isu,
  );
  assert.match(handoff, /surface\/control\/state\/target keys/iu);
  assert.match(
    handoff,
    /declared platform, viewport, mode, state, content and interaction coverage/iu,
  );
  assert.match(
    handoff,
    /`source_paths`.*verification inputs.*input paths.*artifact globs/isu,
  );
  assert.match(
    handoff,
    /creates no Contract Draft, outcome, receipt, Check result or Gate/iu,
  );
  assert.match(handoff, /forbidden inferences/iu);
});

test("raw-draft iterations can return one consolidated delta but mutate no owner", async () => {
  const [skill, selection, handoff] = await Promise.all([
    copies("SKILL.md").then((items) => items[0]),
    copies("references/resource-selection.md").then((items) => items[0]),
    copies("references/downstream-handoff.md").then((items) => items[0]),
  ]);
  const contract = `${skill}\n${selection}\n${handoff}`;
  assert.match(contract, /Raw-draft exploration loop/iu);
  assert.match(contract, /accepted-design-decision delta/iu);
  assert.match(contract, /accepted, rejected and unresolved/iu);
  assert.match(contract, /Do not require (?:or emit )?(?:a|an) (?:interim )?delta after every iteration/iu);
  assert.match(contract, /consolidat(?:e|ed).*once.*(?:end|final)/isu);
  assert.match(
    contract,
    /never continuously synchronize|does not.*continuously sync/isu,
  );
  assert.match(
    contract,
    /separately authorized revision|separate plan owner/isu,
  );
  for (const forbiddenMutation of [
    "initial proposal",
    "project_context/**",
    "DESIGN.md",
    "Delivery Contract",
    "production code",
  ])
    assert.ok(contract.includes(forbiddenMutation), forbiddenMutation);
});

test("product, Context and public surfaces expose the same thin-commissioner boundary", async () => {
  const [
    plan,
    spec,
    globalContext,
    architecture,
    packageSurface,
    implementationIndex,
    rootReadme,
    chineseReadme,
    packageReadme,
    profileSource,
    manifest,
  ] = await Promise.all([
    read("docs/design-resource-authoring-source-plan.md"),
    read("PROJECT_SPEC.md"),
    read("project_context/global.md"),
    read("project_context/architecture.md"),
    read(
      "project_context/areas/harness-package/contracts/package-managed-surfaces.md",
    ),
    read("project_context/areas/harness-package/implementation-index.md"),
    read("README.md"),
    read("README.zh-CN.md"),
    read("packages/ty-context/README.md"),
    read("packages/ty-context/src/lib/profiles.ts"),
    read("project_context/context.toml"),
  ]);
  assert.match(plan, /Plan key: `PLAN-DRA-001`/u);
  assert.match(plan, /REQ-DRA-037/u);
  assert.match(plan, /AC-DRA-016/u);
  assert.match(plan, /IN-DRA-USER-002/u);
  assert.match(plan, /REQ-DRA-019/u);
  assert.match(plan, /AC-DRA-021/u);
  assert.match(plan, /optional Source Plan/iu);
  assert.match(
    plan,
    /not Context, a Contract Draft, runtime state, Design Authority/iu,
  );
  assert.doesNotMatch(
    manifest,
    /docs\/design-resource-authoring-source-plan\.md/u,
  );
  for (const content of [
    spec,
    globalContext,
    architecture,
    packageSurface,
    implementationIndex,
    rootReadme,
    packageReadme,
  ]) {
    assert.match(content, /design-resource-authoring/u);
    assert.match(content, /Open Design/u);
  }
  const aligned = [
    spec,
    globalContext,
    architecture,
    packageSurface,
    implementationIndex,
    rootReadme,
    packageReadme,
  ].join("\n");
  assert.match(aligned, /smallest sufficient|smallest task-local|最小充分/iu);
  assert.match(aligned, /ordinary external Source|ordinary Source/iu);
  assert.match(chineseReadme, /^### 可选 Design Resource Authoring$/mu);
  assert.match(chineseReadme, /最小充分资源集/u);
  assert.match(chineseReadme, /互不调用/u);
  assert.match(chineseReadme, /明确输出或开发内容.*硬 scope ceiling/u);
  assert.match(chineseReadme, /不要求逐控件一份稿|逐控件一份稿.*不是全局必选项/u);
  assert.match(profileSource, /"design-resource-authoring"/u);
  assert.match(manifest, /design-resource-authoring/u);
  assert.match(manifest, /生成设计资源/u);
  assert.match(manifest, /为开发准备设计资源/u);
});

test("development-corresponding design purpose is recoverable through owning Context and indexes", async () => {
  const [
    plan,
    spec,
    globalContext,
    architecture,
    area,
    foundation,
    workflow,
    packageSurface,
    rationale,
    implementationIndex,
    verification,
    manifest,
    agents,
    rootReadme,
    chineseReadme,
    packageReadme,
  ] = await Promise.all([
    read("docs/design-resource-authoring-source-plan.md"),
    read("PROJECT_SPEC.md"),
    read("project_context/global.md"),
    read("project_context/architecture.md"),
    read("project_context/areas/harness-package.md"),
    read("project_context/areas/harness-package/foundation/context-model.md"),
    read("project_context/areas/harness-package/contracts/workflow-contract.md"),
    read(
      "project_context/areas/harness-package/contracts/package-managed-surfaces.md",
    ),
    read(
      "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
    ),
    read("project_context/areas/harness-package/implementation-index.md"),
    read("project_context/areas/harness-package/verification.md"),
    read("project_context/context.toml"),
    read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
    read("README.md"),
    read("README.zh-CN.md"),
    read("packages/ty-context/README.md"),
  ]);

  for (const content of [
    plan,
    spec,
    globalContext,
    architecture,
    area,
    foundation,
    workflow,
    packageSurface,
    rationale,
    implementationIndex,
    verification,
    agents,
    rootReadme,
    packageReadme,
  ]) {
    assert.match(content, /design-resource-authoring/u);
    assert.match(
      content,
      /development (?:content|scope)|development-scope|implementation handoff/iu,
    );
  }

  const aligned = [
    plan,
    spec,
    globalContext,
    architecture,
    area,
    foundation,
    workflow,
    packageSurface,
    rationale,
    implementationIndex,
    verification,
    agents,
    rootReadme,
    chineseReadme,
    packageReadme,
  ].join("\n");
  assert.match(aligned, /hard scope ceiling|hard ceiling|硬 scope ceiling/iu);
  assert.match(aligned, /material user-visible UI\/UX|材料性的 UI\/UX/iu);
  assert.match(aligned, /one-file-per-control|one artifact per control|逐控件一份稿/iu);
  assert.match(aligned, /static\/default.*(?:unshown|unseen|自动代表)/iu);
  assert.match(
    aligned,
    /business.*data.*permission.*algorithmic|业务.*数据.*权限.*算法/isu,
  );
  assert.match(
    implementationIndex,
    /resource-selection\.md[\s\S]*downstream-handoff\.md/iu,
  );
  assert.match(
    implementationIndex,
    /design-resource-authoring-skill\.test\.mjs/iu,
  );
  assert.match(
    verification,
    /existing-source subtraction|subtracting sufficient selected Source/iu,
  );
  assert.match(manifest, /development-scope design/iu);
  assert.match(manifest, /control-level design coverage/iu);
  assert.match(manifest, /为开发准备设计资源/u);
  assert.match(manifest, /与开发内容对应的设计资源/u);
  assert.match(manifest, /控件粒度 UI\/UX 信息/u);
  assert.doesNotMatch(manifest, /docs\/design-resource-authoring-source-plan\.md/u);
});
