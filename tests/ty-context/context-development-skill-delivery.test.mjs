import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(repoRoot, relativePath), "utf8");

const [sourceDevelopmentSkill, generatedDevelopmentSkill, packagedDevelopmentSkill] = await Promise.all([
  read(".codex/ty-context-managed/skills/context_development_engineer/SKILL.md"),
  read(".codex/skills/context_development_engineer/SKILL.md"),
  read("packages/ty-context/assets/skills/context_development_engineer/SKILL.md")
]);

for (const content of [sourceDevelopmentSkill, generatedDevelopmentSkill, packagedDevelopmentSkill]) {
  assert.match(content, /capability-first delivery boundary|delivery \/ acceptance scope/i);
  assert.match(content, /system_capability_build/);
  assert.match(content, /representative_sample_validation/);
  assert.match(content, /full_population_operation/);
  assert.match(content, /scope_conflict_requires_decision/);
  assert.match(content, /sample provider \/ interface \/ page/i);
}
