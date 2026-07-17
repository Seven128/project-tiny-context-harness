import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
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

test("PROJECT_SPEC defines the controlling objective and trusted results", async () => {
  const spec = await read("PROJECT_SPEC.md");

  for (const heading of [
    "Long-Task Workflow Controlling Objective",
    "Authority Scope And Trusted Results",
    "Contract Draft And Draft Outcome Semantics",
    "Source Plan And Contract Draft Boundary",
    "Integrated Contract Authoring Rationale",
    "Mechanism Admission Rule",
  ]) {
    assert.match(spec, new RegExp(`^## ${heading}$`, "mu"));
  }

  assert.match(spec, /prevent false completion inside declared authority/iu);
  assert.match(
    spec,
    /does not promise that implementation stays on course at every intermediate step/iu,
  );
  assert.match(spec, /does not promise that a model can finish the work/iu);
  assert.match(spec, /complete Contract against the current final snapshot/iu);
  assert.match(spec, /only two result classes are trustworthy/iu);
  assert.match(spec, /unsatisfied, unverifiable, insufficiently evidenced, stale/iu);
  assert.match(
    spec,
    /machine_accepted_external_pending[\s\S]*not full delivery completion[\s\S]*not a vague third state/iu,
  );
  assert.match(spec, /cannot prove that the user never omitted a real requirement/iu);
});

test("Contract Draft, Draft Outcome and Plan Item stay lifecycle concepts", async () => {
  const [spec, skill, sourceCode] = await Promise.all([
    read("PROJECT_SPEC.md"),
    read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
    readSourceTree(),
  ]);

  assert.match(
    spec,
    /Contract Draft[\s\S]*first successful formal Compile[\s\S]*non-authoritative/iu,
  );
  assert.match(spec, /multiple model responses[\s\S]*Preflight diagnostics/iu);
  assert.match(spec, /Draft Outcome[\s\S]*lifecycle qualifier, not a new entity/iu);
  assert.match(spec, /Plan Item[\s\S]*design-level collective term, not V2 schema/iu);
  assert.match(spec, /Outcome Result cannot substitute for a Plan Item or AC/iu);
  assert.doesNotMatch(
    sourceCode,
    /\bdraft_outcomes\b|\bplan_items\b|\bDraftOutcome\b|\bContractDraft\w*\b|\bDraftReceipt\b|\bAuthoringState\b/u,
  );

  assert.match(skill, /^## Controlling Objective$/mu);
  assert.match(skill, /^## Contract Draft And Outcome Decomposition$/mu);
  assert.match(skill, /need not be completed in one response/iu);
  assert.match(skill, /one `long-task-workflow` lifecycle/iu);
});

test("Outcome decomposition improves repair without creating scheduling authority", async () => {
  const [spec, workflow, architecture] = await Promise.all([
    read("PROJECT_SPEC.md"),
    read("project_context/areas/harness-package/contracts/workflow-contract.md"),
    read("project_context/architecture.md"),
  ]);
  const combined = [spec, workflow, architecture].join("\n");

  for (const concept of [
    "requirement coupling",
    "dependency-ready",
    "targeted verification",
    "localize failure",
    "resume ready Outcomes",
    "stale",
  ]) {
    assert.match(combined, new RegExp(concept, "iu"));
  }

  assert.match(combined, /`depends_on` means acceptance readiness/iu);
  assert.match(combined, /Rolling Frontier[\s\S]*temporary/iu);
  assert.match(combined, /not a persisted scheduler|Frontier is not persisted/iu);
  assert.match(combined, /not a runtime type|adds no schema field or runtime type/iu);
  assert.match(
    combined,
    /Outcome decomposes execution and diagnosis, not completion authority/iu,
  );
  assert.match(combined, /one Contract[\s\S]*one Final Gate/iu);
});

test("Source Plan and Contract Draft authoring responsibilities stay separate", async () => {
  const [spec, sourcePlan, longTask, agents, publicReadmes] = await Promise.all([
    read("PROJECT_SPEC.md"),
    read(".codex/ty-context-managed/skills/source-plan-authoring/SKILL.md"),
    read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
    read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
    Promise.all([
      read("README.md"),
      read("README.zh-CN.md"),
      read("packages/ty-context/README.md"),
    ]).then((contents) => contents.join("\n")),
  ]);

  assert.match(sourcePlan, /This Skill authors Source, not a Contract Draft/iu);
  assert.match(
    sourcePlan,
    /does not replace Contract Draft authoring inside `long-task-workflow`/iu,
  );
  assert.match(sourcePlan, /recommended structure is optional input guidance/iu);
  assert.match(spec, /ordinary prose plan, research proposal, external proposal/iu);
  assert.match(spec, /meaning-preserving structural decomposition/iu);
  assert.match(spec, /repository bindings[\s\S]*real repository or Context evidence/iu);
  assert.match(spec, /new business rule[\s\S]*`decision_required`/iu);
  assert.match(longTask, /Do not create a standalone Contract Draft Skill/iu);
  assert.match(agents, /Contract Draft authoring belongs inside `long-task-workflow`/iu);
  assert.match(publicReadmes, /Source Plan is Source, not a Contract Draft/iu);
  assert.doesNotMatch(sourcePlan, /Codex|Claude|ChatGPT|Web\s?GPT|Windows|macOS|Linux/iu);
  assert.doesNotMatch(
    [spec, longTask, agents, publicReadmes].join("\n"),
    /Web\s?GPT|Web GPT-to-Codex/iu,
  );

  for (const root of [
    ".codex/ty-context-managed/skills",
    ".codex/skills",
    "packages/ty-context/assets/skills",
  ]) {
    for (const name of [
      "contract-authoring",
      "draft-authoring",
      "prepare-long-task-draft",
    ]) {
      assert.equal(await missing(path.join(root, name)), true);
    }
  }
});

test("registered rationale owns history, mechanism mapping and trusted limits", async () => {
  const [manifest, rationale, globalContext, verification] = await Promise.all([
    read("project_context/context.toml"),
    read(
      "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
    ),
    read("project_context/global.md"),
    read("project_context/areas/harness-package/verification.md"),
  ]);

  assert.match(
    manifest,
    /decision-rationale\/long-task-workflow\.md[\s\S]*role = "decision-rationale"[\s\S]*read_policy = "on-demand"/u,
  );
  for (const trigger of [
    "long-task objective",
    "false completion",
    "contract draft",
    "draft outcome",
    "rolling frontier",
    "why no authoring skill",
    "Web GPT",
    "Codex authoring",
  ]) {
    assert.match(manifest, new RegExp(`"${trigger}"`, "u"));
  }

  assert.match(rationale, /Web GPT[\s\S]*single-response length/iu);
  assert.match(rationale, /Once work enters Codex/iu);
  for (const mechanism of [
    "Material Source inventory",
    "Atomic non-Result Claim Coverage",
    "Source AC to named Assertion",
    "Shared Preflight/Compile activation-safety kernel",
    "First-Compile Authority Lock and Authority Revision",
    "Executing Agent cannot approve",
    "Targeted verify is repair evidence only",
    "Same-snapshot Final Gate",
    "Stop/close rerun the Live Final Gate",
    "Scope escape and risk escalation",
    "Counterfactual, Population and sensitivity proof",
    "Managed source, generated copy and package asset parity",
  ]) {
    assert.match(rationale, new RegExp(mechanism, "iu"));
  }
  assert.match(rationale, /only two trustworthy outcomes/iu);
  assert.match(globalContext, /Preventing false completion[\s\S]*controlling objective/iu);
  assert.match(verification, /Long-Task design consistency/iu);
});

test("Mechanism Admission Rule is explicit and creates no registry", async () => {
  const [spec, rationale] = await Promise.all([
    read("PROJECT_SPEC.md"),
    read(
      "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
    ),
  ]);
  const section = spec.match(
    /## Mechanism Admission Rule\r?\n([\s\S]*?)\r?\n## 3\. Workflow Levels/u,
  )?.[1];
  assert.ok(section, "Mechanism Admission Rule section must exist");
  assert.equal(section.match(/^\d+\.\s/gmu)?.length, 9);
  assert.match(section, /false-completion or delivery-drift path/iu);
  assert.match(section, /invariant/iu);
  assert.match(section, /fail closed/iu);
  assert.match(section, /second Authority, second plan or scheduling plane/iu);
  assert.match(section, /not a new mechanism matrix, Receipt or runtime Registry/iu);
  assert.match(rationale, /not a matrix file, Receipt or runtime Registry/iu);
});

async function readSourceTree() {
  const root = path.join(repo, "packages/ty-context/src");
  const entries = await readdir(root, { recursive: true });
  const files = entries
    .filter((entry) => /\.(?:ts|json)$/u.test(entry))
    .map((entry) => path.join(root, entry));
  return (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
}
