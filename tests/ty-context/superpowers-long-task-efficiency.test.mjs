import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(repoRoot, relativePath), "utf8");

const [rootReadme, rootZhReadme, packageReadme, spec, workflowContract, sourceSkill, generatedSkill, packagedSkill] =
  await Promise.all([
    read("README.md"),
    read("README.zh-CN.md"),
    read("packages/ty-context/README.md"),
    read("PROJECT_SPEC.md"),
    read("project_context/areas/harness-package/contracts/workflow-contract.md"),
    read(".codex/ty-context-managed/skills/superpowers-long-task/SKILL.md"),
    read(".codex/skills/superpowers-long-task/SKILL.md"),
    read("packages/ty-context/assets/skills/superpowers-long-task/SKILL.md")
  ]);

for (const content of [rootReadme, rootZhReadme, packageReadme, spec, workflowContract]) {
  for (const pattern of [
    /Slice Gate/i,
    /Epoch Gate/i,
    /Final Gate/i,
    /workflow overhead/i,
    /progress ledger/i,
    /artifact budget/i,
    /proof-layer milestone/i,
    /Next 3-5 high-value clusters/i
  ]) {
    assert.match(content, pattern);
  }
}

for (const content of [sourceSkill, generatedSkill, packagedSkill]) {
  for (const pattern of [
    /Slice Gate/i,
    /Epoch Gate/i,
    /Final Gate/i,
    /Do not run (?:the )?full final gate after every slice/i,
    /Progress Accounting/i,
    /AC acceptance completion/i,
    /engineering implementation progress/i,
    /runtime\/proof progress/i,
    /workflow overhead/i,
    /progress-ledger\.md\/json/i,
    /artifact budget/i,
    /not_started/i,
    /implemented_no_proof/i,
    /proof_partial/i,
    /proof_ready/i,
    /complete/i,
    /blocked/i,
    /out_of_scope_NA/i,
    /workflow overhead backpressure/i,
    /Next 3-5 high-value clusters/i,
    /provider\/browser\/runtime\/security epoch/i,
    /<!-- generated:active-counts:start -->/,
    /<!-- generated:active-counts:end -->/
  ]) {
    assert.match(content, pattern);
  }
}
