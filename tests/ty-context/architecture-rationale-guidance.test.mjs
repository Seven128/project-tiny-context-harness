import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

test("architecture deliberation is visible while routing questions stay internal", () => {
  const sources = [
    read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
    read("packages/ty-context/assets/agents/AGENTS_CORE.md"),
    read(".codex/ty-context-managed/skills/context_development_engineer/SKILL.md"),
    read("packages/ty-context/assets/skills/context_development_engineer/SKILL.md")
  ];

  for (const content of sources) {
    assert.match(content, /Architecture Deliberation/);
    assert.match(content, /Architecture Conformance/);
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
  assert.match(
    developmentSkill,
    /每个实现需求都执行一次[\s\S]*small code task[\s\S]*保持现有架构[\s\S]*不能用“无需架构考虑”跳过/,
  );
  assert.match(developmentSkill, /不输出私有思维链/);
  assert.match(developmentSkill, /新增或加重技术债默认阻塞交付/);
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
    ],
    [
      ".codex/ty-context-managed/context_templates/screen-contract.md",
      "packages/ty-context/assets/context_templates/screen-contract.md"
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

test("public docs and spec frame one shared architecture obligation without a process chain", () => {
  const docs = [read("README.md"), read("packages/ty-context/README.md"), read("packages/ty-context/assets/README.md")];

  for (const content of docs) {
    assert.match(content, /Technical architecture support is a shared Workflow obligation/);
    assert.match(content, /Every implementation delivery visibly completes `Architecture Deliberation`/);
    assert.match(content, /Architecture Conformance/);
    assert.match(content, /Final Gate be the sole closure owner|sole Long-Task Architecture Conformance carrier/);
    assert.match(content, /Architecture Context Hit/);
    assert.match(content, /Decision Rationale Hit: existing\|required\|none/);
    assert.match(content, /no Task Contract.*fixed `plan\.md`/si);
    assert.match(
      content,
      /does not expose private chain-of-thought, guarantee the best design or anticipate every unknowable future request/,
    );
    assert.match(content, /Store stable reasons, rejected alternatives or tradeoffs/);
    assert.match(content, /smallest durable Context surface/);
    assert.match(
      content,
      /(?:does not become|rather than becoming) a language-generic architecture analyzer or (?:add an|adding) architecture artifact\/state/,
    );
    assert.doesNotMatch(content, /Architecture Delta|Rationale Delta/);
  }

  const spec = read("PROJECT_SPEC.md");
  assert.match(spec, /Every implementation delivery has one shared architecture-quality obligation/);
  assert.match(spec, /Architecture Context Hit.*internal routing question/s);
  assert.match(spec, /Decision Rationale Hit: existing\|required\|none.*internal routing question/s);
  assert.match(spec, /not durable facts, roles, validators or artifacts/);
  assert.match(spec, /never creates a rationale delta or required file/);
  assert.match(spec, /Context Delta.*only durable-fact decision point/s);
  assert.match(spec, /two workflow entries are execution carriers, not nested quality workflows/);
  assert.match(spec, /No architecture plan, matrix, ADR, new Contract field, second Authority, Gate, scheduler, persistent state/);
});

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}
