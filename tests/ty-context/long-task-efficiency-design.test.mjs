import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const read = (relative) => readFile(path.join(repository, relative), "utf8");

test("Long-Task efficiency preserves the false-completion boundary", async () => {
  const [
    specification,
    globalContext,
    rationale,
    contextModel,
    skill,
    verification,
  ] = await Promise.all([
    read("PROJECT_SPEC.md"),
    read("project_context/global.md"),
    read(
      "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
    ),
    read("project_context/areas/harness-package/foundation/context-model.md"),
    read(".codex/skills/long-task-workflow/SKILL.md"),
    read("project_context/areas/harness-package/verification.md"),
  ]);
  const combined = [
    specification,
    globalContext,
    rationale,
    contextModel,
    skill,
    verification,
  ].join("\n");

  for (const expected of [
    "false completion",
    "lowest practical",
    "marginal protection",
    "host and user own model selection",
    "Do not pause a healthy Goal solely to change or downgrade the model",
    "targeted repair plus the Final Gate",
    "parallel subagents",
    "opaque and non-authoritative",
    "unified current workspace snapshot",
    "Controlling Context",
    "Supporting Context",
    "implementation-index",
    "archive",
    "Verification and deployment Context remain controlling",
    "compile --revise",
    "targeted Progress",
    "complete current Context snapshot",
    "Full snapshot mode treats every Context file as controlling",
    "affected or focused result is reusable completion evidence",
  ])
    assert.ok(combined.includes(expected), expected);
});

test("managed Long-Task Skill copies remain exact", async () => {
  const paths = [
    ".codex/skills/long-task-workflow/SKILL.md",
    ".codex/ty-context-managed/skills/long-task-workflow/SKILL.md",
    "packages/ty-context/assets/skills/long-task-workflow/SKILL.md",
  ];
  const [first, ...rest] = await Promise.all(paths.map(read));
  for (const content of rest) assert.equal(content, first);
});

test("Long-Task guidance uses one-level progressive references without new authority", async () => {
  const sourceRoot = ".codex/ty-context-managed/skills/long-task-workflow";
  const generatedRoot = ".codex/skills/long-task-workflow";
  const packagedRoot = "packages/ty-context/assets/skills/long-task-workflow";
  const references = [
    "references/contract-authoring.md",
    "references/evidence-design.md",
    "references/authority-lifecycle.md",
  ];
  const main = await read(`${sourceRoot}/SKILL.md`);

  for (const reference of references) {
    assert.ok(main.includes(reference), reference);
    const [source, generated, packaged] = await Promise.all([
      read(`${sourceRoot}/${reference}`),
      read(`${generatedRoot}/${reference}`),
      read(`${packagedRoot}/${reference}`),
    ]);
    assert.equal(generated, source);
    assert.equal(packaged, source);
  }

  const contractAuthoring = await read(
    `${sourceRoot}/references/contract-authoring.md`,
  );
  const evidenceDesign = await read(
    `${sourceRoot}/references/evidence-design.md`,
  );
  const authorityLifecycle = await read(
    `${sourceRoot}/references/authority-lifecycle.md`,
  );
  assert.match(contractAuthoring, /Architecture Closure/);
  assert.match(contractAuthoring, /existing Contract fields/);
  assert.match(
    contractAuthoring,
    /project-owned executable architecture check/,
  );
  assert.match(evidenceDesign, /playwright\.case\.<ac-key>\.passed/);
  assert.match(authorityLifecycle, /Preflight is read-only/);
  assert.match(main, /guidance, not new artifacts or authority/);
  assert.doesNotMatch(main, /playwright\.case\.<ac-key>\.passed/);
});

test("affected developer loops remain non-authoritative", async () => {
  const verification = await read(
    "project_context/areas/harness-package/verification.md",
  );
  for (const command of [
    "test:affected:list",
    "test:affected",
    "test:long-task:focused",
    "test:delivery-contract:focused",
    "do not replace complete CI/release gates",
    "fail safe",
  ])
    assert.ok(verification.includes(command), command);
});
