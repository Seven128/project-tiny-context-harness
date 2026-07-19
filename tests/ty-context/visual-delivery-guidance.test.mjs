import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const read = (relativePath) => readFile(path.join(repo, relativePath), "utf8");

const skillCopies = (name) =>
  Promise.all([
    read(`.codex/ty-context-managed/skills/${name}/SKILL.md`),
    read(`.codex/skills/${name}/SKILL.md`),
    read(`packages/ty-context/assets/skills/${name}/SKILL.md`),
  ]);

const referenceCopies = (name) =>
  Promise.all([
    read(
      `.codex/ty-context-managed/skills/long-task-workflow/references/${name}`,
    ),
    read(`.codex/skills/long-task-workflow/references/${name}`),
    read(
      `packages/ty-context/assets/skills/long-task-workflow/references/${name}`,
    ),
  ]);

test("visual design and implementation guidance reaches every managed copy", async () => {
  const [uiuxCopies, developmentCopies] = await Promise.all([
    skillCopies("context_uiux_design"),
    skillCopies("context_development_engineer"),
  ]);

  for (const copies of [uiuxCopies, developmentCopies]) {
    assert.equal(copies[1], copies[0]);
    assert.equal(copies[2], copies[0]);
  }

  const uiux = uiuxCopies[0];
  assert.match(uiux, /^## Visual Delivery Coverage \/ 视觉交付覆盖$/mu);
  assert.match(uiux, /task-local \*\*Visual Coverage Set\*\*/u);
  assert.match(
    uiux,
    /surface\/route\/component[\s\S]*viewport[\s\S]*theme or product mode[\s\S]*interaction\/state[\s\S]*content stress[\s\S]*accessibility\/motion/iu,
  );
  assert.match(
    uiux,
    /not a required file, matrix, Context role, workflow artifact/iu,
  );
  assert.match(
    uiux,
    /one authored exact-value token source and one generation direction/iu,
  );
  assert.match(uiux, /production components or real product routes/iu);
  assert.match(uiux, /never claim an unchecked combination/iu);

  const development = developmentCopies[0];
  assert.match(
    development,
    /^## Visual Delivery Implementation \/ 视觉交付实现$/mu,
  );
  assert.match(
    development,
    /production token source, its generation direction/iu,
  );
  assert.match(development, /production components and real product routes/iu);
  assert.match(
    development,
    /undeclared raw color, spacing, typography or motion values/iu,
  );
  assert.match(development, /report only the combinations actually checked/iu);
  assert.match(development, /Do not introduce a second visual plan/iu);
});

test("Long-Task visual guidance reuses existing authoring and evidence mechanisms", async () => {
  const [authoringCopies, evidenceCopies] = await Promise.all([
    referenceCopies("contract-authoring.md"),
    referenceCopies("evidence-design.md"),
  ]);

  for (const copies of [authoringCopies, evidenceCopies]) {
    assert.equal(copies[1], copies[0]);
    assert.equal(copies[2], copies[0]);
  }

  const authoring = authoringCopies[0];
  assert.match(authoring, /^## Visual Delivery Authoring$/mu);
  assert.match(authoring, /existing Contract semantics/iu);
  assert.match(
    authoring,
    /atomic Requirement, applicable Control field or named AC Assertion/iu,
  );
  assert.match(authoring, /an omitted combination remains unproven/iu);
  assert.match(authoring, /explicit external confirmation/iu);
  assert.match(
    authoring,
    /adds no visual Schema, Claim kind, risk level, lifecycle state/iu,
  );

  const evidence = evidenceCopies[0];
  assert.match(evidence, /^## Visual UI Evidence$/mu);
  assert.match(
    evidence,
    /each independently falsifiable AC[\s\S]*\[ac:<assertion-key>\]/iu,
  );
  assert.match(evidence, /baseline[\s\S]*included in `verification_inputs`/iu);
  assert.match(
    evidence,
    /Generated screenshots, diffs and reports are Artifacts/iu,
  );
  assert.match(
    evidence,
    /after Authority Lock is verifier-material revision/iu,
  );
  assert.match(evidence, /subjective visual quality and approval external/iu);
});

test("visual guidance remains outside the default workflow and core Long-Task mechanism", async () => {
  const [
    spec,
    managedSurface,
    verification,
    workflow,
    rootReadme,
    chineseReadme,
    packageReadme,
  ] = await Promise.all([
    read("PROJECT_SPEC.md"),
    read(
      "project_context/areas/harness-package/contracts/package-managed-surfaces.md",
    ),
    read("project_context/areas/harness-package/verification.md"),
    read(
      "project_context/areas/harness-package/contracts/workflow-contract.md",
    ),
    read("README.md"),
    read("README.zh-CN.md"),
    read("packages/ty-context/README.md"),
  ]);

  for (const content of [spec, managedSurface]) {
    assert.match(content, /Visual Coverage Set/iu);
    assert.match(content, /no visual Schema/iu);
    assert.match(content, /no[^\n]*lifecycle state/iu);
  }
  assert.match(
    spec,
    /authoring\/evidence specialization, not a new mechanism/iu,
  );
  assert.match(spec, /cannot infer completeness beyond declared coverage/iu);
  assert.match(verification, /Visual delivery guidance/iu);
  assert.doesNotMatch(workflow, /Visual Coverage Set/u);

  for (const content of [rootReadme, packageReadme]) {
    assert.match(content, /^### Visual Delivery Guidance$/mu);
    assert.match(
      content,
      /does not change the default Workflow Contract|No visual Schema/iu,
    );
  }
  assert.match(chineseReadme, /^### 视觉交付指导$/mu);
  assert.match(chineseReadme, /不修改默认 Workflow Contract/u);
});
