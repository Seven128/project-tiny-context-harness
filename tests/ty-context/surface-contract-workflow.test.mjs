import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(repoRoot, relativePath), "utf8");
const forbiddenBusinessExamples = new RegExp(
  ["My" + "Hub", "Intel" + "Hub", "Apex" + "Quant", "provider" + "-interface", "i" + "Find"].join("|")
);

const [
  sourceAgents,
  packageAgents,
  rootReadme,
  packageReadme,
  spec,
  globalContext,
  packageContext,
  workflowContract,
  packageManagedSurfaces,
  validators,
  sourceProductSkill,
  sourceUiuxSkill,
  sourceDevelopmentSkill,
  sourceSkill,
  generatedSkill,
  packagedSkill,
  sourceTemplate,
  packagedTemplate
] = await Promise.all([
  read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
  read("packages/ty-context/assets/agents/AGENTS_CORE.md"),
  read("README.md"),
  read("packages/ty-context/README.md"),
  read("PROJECT_SPEC.md"),
  read("project_context/global.md"),
  read("project_context/areas/harness-package.md"),
  read("project_context/areas/harness-package/contracts/workflow-contract.md"),
  read("project_context/areas/harness-package/contracts/package-managed-surfaces.md"),
  read("packages/ty-context/src/lib/validators.ts"),
  read(".codex/ty-context-managed/skills/context_product_plan/SKILL.md"),
  read(".codex/ty-context-managed/skills/context_uiux_design/SKILL.md"),
  read(".codex/ty-context-managed/skills/context_development_engineer/SKILL.md"),
  read(".codex/ty-context-managed/skills/context_surface_contract/SKILL.md"),
  read(".codex/skills/context_surface_contract/SKILL.md"),
  read("packages/ty-context/assets/skills/context_surface_contract/SKILL.md"),
  read(".codex/ty-context-managed/context_templates/product-surface-contract.md"),
  read("packages/ty-context/assets/context_templates/product-surface-contract.md")
]);

for (const content of [sourceAgents, packageAgents]) {
  assert.match(content, /Product Surface work/);
  assert.match(content, /context_surface_contract/);
  assert.match(content, /contract` role/);
  assert.doesNotMatch(content, /surface-contract` role/);
}

for (const content of [sourceSkill, generatedSkill, packagedSkill]) {
  assert.match(content, /description:.*Product Surface Contract.*Surface Contract.*Screen Contract/s);
  assert.match(content, /description:.*产品界面职责治理.*页面职责契约/s);
  assert.match(content, /Do not add a new `context_role`/);
  assert.match(content, /Audit Mode/);
  assert.match(content, /Compile Mode/);
  assert.match(content, /Apply Mode/);
  assert.match(content, /Conformance Mode/);
  assert.match(content, /Allowed writes/);
  assert.match(content, /Forbidden writes/);
  assert.match(content, /role = "contract"/);
  assert.match(content, /repo-local Skill/i);
  assert.doesNotMatch(content, forbiddenBusinessExamples);
  assert.doesNotMatch(
    content,
    /REQUIREMENT_GATHERING|UI_UX_DESIGNING|SPRINTING|ty-context_manager|ty-context_dev_sprint|ty-context_reviewer|ty-context_tester/
  );
}

for (const content of [sourceTemplate, packagedTemplate]) {
  assert.match(content, /Product Surface Contract/);
  assert.match(content, /Surface Platform/);
  assert.match(content, /Primary User Question/);
  assert.match(content, /Main Surface Allows/);
  assert.match(content, /Main Surface Forbids/);
  assert.match(content, /Drilldown Ownership/);
  assert.match(content, /Long Task State Requirement/);
  assert.match(content, /Empty \/ Loading \/ Stale \/ Unavailable/);
  assert.match(content, /Security \/ Redaction/);
  assert.match(content, /Verification/);
  assert.match(content, /role = "contract"/);
  assert.match(content, /read_policy = "on-demand"/);
  assert.doesNotMatch(content, /screenshot observations.*test logs.*implementation summaries.*secret values/s);
}

for (const content of [sourceProductSkill, sourceUiuxSkill, sourceDevelopmentSkill]) {
  assert.match(content, /Product Surface/);
  assert.match(content, /Surface Contract/);
  assert.match(content, /context_surface_contract/);
  assert.match(content, /main allows\/forbids/);
  assert.match(content, /long-task state/i);
}

for (const content of [rootReadme, packageReadme, spec, globalContext]) {
  assert.match(content, /Product Surface Contract/i);
  assert.match(content, /context_surface_contract/);
  assert.match(content, /product-surface-contract\.md/);
  assert.match(content, /contract.*role/i);
  assert.match(content, /no new|not add|must not add/i);
}

assert.match(packageContext, /Product Surface Contract workflow is prompt-level and project-owned/);
assert.match(packageContext, /must not add a surface-specific Context role/);
assert.match(workflowContract, /Product Surface Contract Boundary/);
assert.match(workflowContract, /existing Context roles such as `contract`, `area`, `subdomain`, `verification`, `decision-rationale` and `implementation-index`/);
assert.match(workflowContract, /Do not add surface-specific roles or validator gates/);
assert.match(packageManagedSurfaces, /Product Surface Contract support/);
assert.match(packageManagedSurfaces, /must not generate project-specific product facts, business Product Surface Contract files/);

for (const role of ["surface-contract", "product-surface", "web-contract", "app-contract", "game-surface"]) {
  assert.doesNotMatch(validators, new RegExp(`["']${role}["']\\s*:`));
}
assert.match(validators, /contract: "contract"/);
