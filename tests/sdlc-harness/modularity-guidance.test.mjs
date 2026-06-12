import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

test("managed guidance includes Modularity Check workflow contract hints", () => {
  const managedAgents = read(".codex/pjsdlc_managed/agents/AGENTS_CORE.md");
  const packagedAgents = read("packages/sdlc-harness/assets/agents/AGENTS_CORE.md");
  const managedSkill = read(".codex/pjsdlc_managed/skills/context_development_engineer/SKILL.md");
  const packagedSkill = read("packages/sdlc-harness/assets/skills/context_development_engineer/SKILL.md");
  const managedMake = read(".codex/pjsdlc_managed/make/sdlc-harness.mk");
  const packagedMake = read("packages/sdlc-harness/assets/make/sdlc-harness.mk");

  for (const agents of [managedAgents, packagedAgents]) {
    assert.match(agents, /Modularity Check: none\|required\|exception/);
    assert.match(agents, /工程 \/ RFC \/ 实现类 Task Contract/);
  }
  for (const skill of [managedSkill, packagedSkill]) {
    assert.match(skill, /Modularity Check: none\|required\|exception/);
    assert.match(skill, /check-modularity --touched/);
    assert.match(skill, /exception documented/);
    assert.match(skill, /service \/ facade/);
    assert.match(skill, /verification helper/);
  }
  for (const makefile of [managedMake, packagedMake]) {
    assert.match(makefile, /sdlc-check-modularity/);
    assert.match(makefile, /check-modularity --touched/);
  }
});

test("public docs describe Modularity Check as warning-only and outside validate-context", () => {
  for (const doc of [read("README.md"), read("packages/sdlc-harness/README.md")]) {
    assert.match(doc, /Modularity Check: none\|required\|exception/);
    assert.match(doc, /warning-only by default/);
    assert.match(doc, /--fail-on-warning/);
    assert.match(doc, /is not `validate-context`/);
  }
});

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}
