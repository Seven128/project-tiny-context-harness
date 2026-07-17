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

test("Long-Task efficiency remains subordinate to false-completion prevention", async () => {
  const [globalContext, rationale, verification] = await Promise.all([
    read("project_context/global.md"),
    read(
      "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
    ),
    read("project_context/areas/harness-package/verification.md"),
  ]);
  const combined = [globalContext, rationale, verification].join("\n");
  assert.match(combined, /prevent(?:ing)? false completion/iu);
  assert.match(combined, /lowest practical[\s\S]*cost/iu);
  assert.match(combined, /independent drift-prevention benefit/iu);
  assert.match(combined, /marginal protection/iu);
  assert.match(combined, /fail safe/iu);
});

test("healthy Goals do not gain a cost-only model-switch checkpoint", async () => {
  const [globalContext, rationale, skill] = await Promise.all([
    read("project_context/global.md"),
    read(
      "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
    ),
    read(".codex/skills/long-task-workflow/SKILL.md"),
  ]);
  const combined = [globalContext, rationale, skill].join("\n");
  assert.match(combined, /host and user own model selection/iu);
  assert.match(
    combined,
    /Do not pause a healthy Goal solely to change or downgrade the model/iu,
  );
  assert.match(combined, /targeted repair plus the Final Gate/iu);
  assert.doesNotMatch(combined, /model-switch worker|model routing state/iu);
});

test("parallel subagent delegation stays opaque and non-authoritative", async () => {
  const [globalContext, rationale, skill] = await Promise.all([
    read("project_context/global.md"),
    read(
      "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
    ),
    read(".codex/skills/long-task-workflow/SKILL.md"),
  ]);
  const combined = [globalContext, rationale, skill].join("\n");
  assert.match(combined, /Never proactively spawn[\s\S]*parallel subagents/iu);
  assert.match(combined, /opaque[\s\S]*non-authoritative/iu);
  assert.match(
    combined,
    /unified current workspace snapshot|unified workspace snapshot/iu,
  );
});

test("execution-time Context evolution preserves the authority boundary", async () => {
  const [globalContext, contextModel, rationale, skill, verification] =
    await Promise.all([
      read("project_context/global.md"),
      read(
        "project_context/areas/harness-package/foundation/context-model.md",
      ),
      read(
        "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
      ),
      read(".codex/skills/long-task-workflow/SKILL.md"),
      read("project_context/areas/harness-package/verification.md"),
    ]);
  const combined = [
    globalContext,
    contextModel,
    rationale,
    skill,
    verification,
  ].join("\n");
  assert.match(combined, /re-evaluate `Context Delta`/iu);
  assert.match(combined, /Controlling Context/iu);
  assert.match(combined, /Supporting Context/iu);
  assert.doesNotMatch(
    combined,
    /verification\/deployment\/implementation-index\/archive files as supporting/iu,
  );
  for (const role of ["implementation-index", "archive"])
    assert.match(combined, new RegExp(role, "iu"));
  assert.match(
    combined,
    /verification and deployment Context remain controlling/iu,
  );
  assert.match(combined, /auto-revise[\s\S]*compile --revise/iu);
  assert.match(combined, /does not invalidate[\s\S]*targeted Progress/iu);
  assert.match(
    combined,
    /complete current Context snapshot|complete Context snapshot/iu,
  );
  assert.match(
    combined,
    /Full snapshot mode treats every Context file as controlling/iu,
  );
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

test("affected developer loops are documented as non-authoritative", async () => {
  const verification = await read(
    "project_context/areas/harness-package/verification.md",
  );
  for (const command of [
    "test:affected:list",
    "test:affected",
    "test:long-task:focused",
    "test:delivery-contract:focused",
  ])
    assert.ok(verification.includes(command), command);
  assert.match(verification, /do not replace complete CI\/release gates/iu);
  assert.match(verification, /fails? safe/iu);
});
