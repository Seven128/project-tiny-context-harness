import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

test("architecture and rationale checks stay inside internal planning guidance", () => {
  const sources = [
    read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
    read("packages/ty-context/assets/agents/AGENTS_CORE.md"),
    read(".codex/ty-context-managed/skills/context_development_engineer/SKILL.md"),
    read("packages/ty-context/assets/skills/context_development_engineer/SKILL.md")
  ];

  for (const content of sources) {
    assert.match(content, /Architecture Context Hit/);
    assert.match(content, /Decision Rationale Hit: existing\|required\|none|Decision Rationale Hit: <existing \| required \| none>/);
    assert.match(content, /Context Delta: none\|required/);
    assert.match(content, /Modularity Check: none\|required\|exception/);
    assert.doesNotMatch(content, /Architecture Delta/);
    assert.doesNotMatch(content, /Rationale Delta/);
  }

  const developmentSkill = sources[2];
  assert.match(developmentSkill, /durable architecture boundary/);
  assert.match(developmentSkill, /API \/ Schema \/ data contract/);
  assert.match(developmentSkill, /state \/ runtime semantics/);
  assert.match(developmentSkill, /dependency direction/);
  assert.match(developmentSkill, /verification \/ deployment semantics/);
  assert.match(developmentSkill, /durable rationale \/ tradeoff/);
  assert.match(developmentSkill, /普通 bug fix.*package\/release.*测试修复.*spike/s);
  assert.match(developmentSkill, /压成一行不能规避/);
  assert.match(developmentSkill, /lifecycle-complete waiver/);
  assert.match(developmentSkill, /不要创建 `plan\.md`、Task Contract 文件或 Markdown 映射表/);
});

test("templates keep rationale durable, optional and evidence-free", () => {
  const templatePairs = [
    [".codex/ty-context-managed/context_templates/global.md", "packages/ty-context/assets/context_templates/global.md"],
    [".codex/ty-context-managed/context_templates/architecture.md", "packages/ty-context/assets/context_templates/architecture.md"],
    [".codex/ty-context-managed/context_templates/area.md", "packages/ty-context/assets/context_templates/area.md"],
    [
      ".codex/ty-context-managed/context_templates/product-surface-contract.md",
      "packages/ty-context/assets/context_templates/product-surface-contract.md"
    ]
  ];

  for (const [managedPath, packagedPath] of templatePairs) {
    for (const content of [read(managedPath), read(packagedPath)]) {
      assert.match(content, /Design Rationale|rationale/);
      assert.match(content, /durable|stable/);
      assert.match(content, /rejected alternative|rejected alternatives/);
      assert.match(content, /tradeoff|tradeoffs/);
      assert.match(content, /Do not invent rationale|Do not update this Context for:/);
      assert.match(content, /implementation summaries|implementation summary|Local implementation summaries/);
      assert.match(content, /command output|Test logs|test result claims/);
    }
  }
});

test("public docs and spec frame architecture support as Minimal Context, not a process chain", () => {
  const docs = [read("README.md"), read("packages/ty-context/README.md"), read("packages/ty-context/assets/README.md")];

  for (const content of docs) {
    assert.match(content, /Technical architecture support is a Minimal Context capability/);
    assert.match(content, /Architecture Context Hit/);
    assert.match(content, /Decision Rationale Hit: existing\|required\|none/);
    assert.match(content, /No Task Contract.*fixed `plan\.md`/s);
    assert.match(content, /does not prove product quality|still does not prove product quality|不证明产品质量/);
    assert.match(content, /Do not invent rationale/);
    assert.match(content, /smallest durable Context surface/);
    assert.doesNotMatch(content, /Architecture Delta|Rationale Delta/);
  }

  const spec = read("PROJECT_SPEC.md");
  assert.match(spec, /Architecture Context Hit.*internal high-risk routing question/s);
  assert.match(spec, /Decision Rationale Hit.*internal `existing\|required\|none` coverage question/s);
  assert.match(spec, /not a durable fact, role, validator or artifact/);
  assert.match(spec, /never creates a rationale delta or required file/);
  assert.match(spec, /Context Delta.*only durable-fact decision point/s);
});

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}
