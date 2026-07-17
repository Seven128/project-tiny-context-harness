import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFile(path.join(repo, relative), "utf8");
const missing = (relative) =>
  stat(path.join(repo, relative)).then(
    () => false,
    () => true,
  );

test("PROJECT_SPEC fixes the controlling objective and trusted result boundary", async () => {
  const spec = await read("PROJECT_SPEC.md");

  assert.match(spec, /^## Long-Task Workflow Controlling Objective$/mu);
  assert.match(spec, /systematically prevent any declared item that is not actually satisfied/iu);
  assert.match(spec, /Implementation drift and acceptance drift are different/iu);
  assert.match(spec, /final current snapshot/iu);
  assert.match(spec, /summary, progress record, historical test, Receipt, single command exit code or Agent judgment/iu);
  assert.match(spec, /Machine authority has only two trustworthy result classes/iu);
  assert.match(spec, /machine_accepted_external_pending.*never means the complete external delivery is finished/isu);
  assert.match(spec, /cannot prove that the user never omitted a real requirement/iu);

  assert.match(spec, /Plan Item.*design-level collective term.*never a `plan_items` schema field/isu);
  for (const meaning of [
    "atomic Requirement",
    "applicable Control",
    "Non-completing Outcome",
    "Technical Obligation",
    "Global Non-goal, Constraint or Forbidden Shortcut Claim",
    "stable named Acceptance Assertion",
  ]) {
    assert.match(spec, new RegExp(meaning, "iu"));
  }
});

test("Contract Draft and Draft Outcome semantics preserve one completion authority", async () => {
  const [spec, workflow, skill] = await Promise.all([
    read("PROJECT_SPEC.md"),
    read("project_context/areas/harness-package/contracts/workflow-contract.md"),
    read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
  ]);
  const combined = `${spec}\n${workflow}\n${skill}`;

  assert.match(spec, /^## Contract Draft And Draft Outcome Semantics$/mu);
  assert.match(spec, /Before the first successful formal Compile.*Contract Draft/isu);
  assert.match(spec, /mutable, non-authoritative/iu);
  assert.match(spec, /need not fit in one model response/iu);
  assert.match(spec, /Draft Outcome.*authoring-time lifecycle qualifier/isu);
  assert.match(spec, /not a `draft_outcomes` field, `DraftOutcome` runtime type/iu);

  for (const purpose of [
    "requirement coupling",
    "targeted verify",
    "localize failure",
    "resume recovers",
    "precisely stale",
    "rolling implementation and verification order",
  ]) {
    assert.match(spec, new RegExp(purpose, "iu"));
  }

  assert.match(combined, /depends_on.*acceptance readiness/isu);
  assert.match(combined, /Rolling Frontier.*never persisted/isu);
  assert.match(combined, /not a schema\/runtime type, Worker, queue, scheduler item or completion boundary/iu);
  assert.match(combined, /Outcome decomposes execution and diagnosis, not completion authority/iu);
  assert.match(combined, /same Contract.*one Final Gate|one Contract.*one Final Gate/isu);
  assert.match(combined, /targeted.*never accept/isu);
});

test("Source Plan and integrated Contract authoring stay distinct and platform-neutral", async () => {
  const [spec, rationale, sourcePlan, longTask, publicReadme, chineseReadme, packageReadme] =
    await Promise.all([
      read("PROJECT_SPEC.md"),
      read("project_context/areas/harness-package/decision-rationale/long-task-workflow.md"),
      read(".codex/ty-context-managed/skills/source-plan-authoring/SKILL.md"),
      read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
      read("README.md"),
      read("README.zh-CN.md"),
      read("packages/ty-context/README.md"),
    ]);

  assert.match(spec, /^## Source Plan And Contract Draft Boundary$/mu);
  assert.match(spec, /^## Integrated Contract Authoring Rationale$/mu);
  assert.match(spec, /Source Plan.*not a Contract Draft, Delivery Contract, project Context, repository binding, workflow Authority, implementation plan or completion proof/isu);
  assert.match(spec, /authoring fast path, not an input protocol/iu);
  assert.match(spec, /meaning-preserving structural decomposition/iu);
  assert.match(spec, /repository binding supported by real repository or Context evidence/iu);
  assert.match(spec, /new business rule.*`decision_required`/isu);
  assert.match(spec, /Contract Draft authoring belongs inside `long-task-workflow`/iu);
  assert.match(spec, /there is no separate `contract-authoring`, `draft-authoring` or `prepare-long-task-draft` Skill/iu);

  assert.match(sourcePlan, /This Skill authors Source, not a Contract Draft/iu);
  assert.match(sourcePlan, /does not replace Contract Draft authoring inside `long-task-workflow`/iu);
  assert.match(sourcePlan, /recommended structure is optional input guidance/iu);

  assert.match(rationale, /Web GPT.*single-response output length.*Codex/isu);
  for (const platformNeutralSurface of [spec, sourcePlan, longTask, publicReadme, chineseReadme, packageReadme]) {
    assert.doesNotMatch(platformNeutralSurface, /Web\s*GPT|WebGPT/iu);
  }
});

test("registered rationale records mechanism admission and false-completion mappings", async () => {
  const [contextGraph, rationale, workflow] = await Promise.all([
    read("project_context/context.toml"),
    read("project_context/areas/harness-package/decision-rationale/long-task-workflow.md"),
    read("project_context/areas/harness-package/contracts/workflow-contract.md"),
  ]);

  assert.match(
    contextGraph,
    /path = "project_context\/areas\/harness-package\/decision-rationale\/long-task-workflow\.md"[\s\S]*role = "decision-rationale"[\s\S]*read_policy = "on-demand"/u,
  );
  for (const trigger of [
    "long-task objective",
    "false completion",
    "delivery drift",
    "contract draft",
    "draft outcome",
    "outcome decomposition",
    "rolling frontier",
    "why no authoring skill",
    "source plan boundary",
    "workflow mechanism cost",
    "Web GPT",
    "Codex authoring",
  ]) {
    assert.match(contextGraph, new RegExp(`"${trigger}"`, "u"));
  }

  assert.match(rationale, /^## Mechanism Admission And Cost Boundary$/mu);
  assert.match(workflow, /distinct false-completion\/delivery-drift path/iu);
  for (const mechanism of [
    "Material Source inventory",
    "Atomic non-Result Claim Coverage",
    "Source AC to named Assertion continuity",
    "Shared Preflight/Compile activation-safety kernel",
    "First-Compile Authority Lock and Authority Revision",
    "No executing-Agent approval of a weakening revision",
    "Targeted verify as repair evidence only",
    "Same-snapshot Final Gate",
    "Stop/close rerunning the Live Final Gate",
    "Scope escape and risk escalation",
    "Counterfactual, Population and sensitivity proof",
    "Managed source/generated copy/package asset parity",
  ]) {
    assert.match(rationale, new RegExp(mechanism, "iu"));
  }
});

test("design terms do not create schema fields, runtime types or authoring Skills", async () => {
  const schemas = (
    await Promise.all([
      read("packages/ty-context/src/schemas/long-task-delivery-v2/long-task-delivery-v2.schema.json"),
      read("packages/ty-context/src/schemas/long-task-delivery-v2/long-task-outcomes-v2.schema.json"),
    ])
  ).join("\n");

  assert.doesNotMatch(schemas, /draft_outcomes|plan_items|DraftOutcome/iu);
  for (const forbiddenSkill of [
    ".codex/ty-context-managed/skills/contract-authoring",
    ".codex/ty-context-managed/skills/draft-authoring",
    ".codex/ty-context-managed/skills/prepare-long-task-draft",
    ".codex/skills/contract-authoring",
    "packages/ty-context/assets/skills/contract-authoring",
  ]) {
    assert.equal(await missing(forbiddenSkill), true, `${forbiddenSkill} must not exist`);
  }
});
