import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { checkSource, syncSource } from "../../packages/ty-context/dist/lib/package-source.js";

const fixture = await mkdtemp(path.join(tmpdir(), "ty-context-source-"));

try {
  await mkdir(path.join(fixture, ".agent/ty-context-managed/agents"), { recursive: true });
  await mkdir(path.join(fixture, ".agent/ty-context-managed/context_templates"), { recursive: true });
  await mkdir(path.join(fixture, ".agent/ty-context-managed/skills/context_product_plan"), { recursive: true });
  await mkdir(path.join(fixture, ".agent/ty-context-managed/skills/context_uiux_design"), { recursive: true });
  await mkdir(path.join(fixture, ".agent/ty-context-managed/skills/context_development_engineer"), { recursive: true });
  await mkdir(path.join(fixture, ".agent/ty-context-managed/skills/context_surface_contract"), { recursive: true });
  await mkdir(path.join(fixture, ".agent/ty-context-managed/skills/normal-long-task"), { recursive: true });
  await mkdir(path.join(fixture, ".agent/ty-context-managed/skills/prepare-composite-long-task/references"), { recursive: true });
  await mkdir(path.join(fixture, ".agent/ty-context-managed/skills/composite-long-task-workflow/references"), { recursive: true });
  await mkdir(path.join(fixture, ".agent/ty-context-managed/skills/composite-long-task-workflow/assets"), { recursive: true });
  await mkdir(path.join(fixture, ".agent/ty-context-managed/minimal_tools"), { recursive: true });
  await mkdir(path.join(fixture, ".agent/ty-context-managed/make"), { recursive: true });
  await mkdir(path.join(fixture, ".github/workflows"), { recursive: true });
  await mkdir(path.join(fixture, "packages/ty-context"), { recursive: true });

  await writeFile(path.join(fixture, ".agent/ty-context-managed/agents/AGENTS_CORE.md"), "# Minimal Context Harness\n", "utf8");
  await writeFile(path.join(fixture, "README.md"), "# User Guide\n\nMinimal Context package guide.\n", "utf8");
  await writeFile(path.join(fixture, ".agent/ty-context-managed/context_templates/global.md"), "# Project / Delivery Context\n", "utf8");
  await writeFile(path.join(fixture, ".agent/ty-context-managed/context_templates/architecture.md"), "# Architecture Context\n", "utf8");
  await writeFile(path.join(fixture, ".agent/ty-context-managed/context_templates/area.md"), "# Area Context\n", "utf8");
  await writeFile(
    path.join(fixture, ".agent/ty-context-managed/context_templates/product-surface-contract.md"),
    "# Product Surface Contract\n\nread_policy = \"on-demand\"\n",
    "utf8"
  );
  await writeFile(
    path.join(fixture, ".agent/ty-context-managed/skills/context_product_plan/SKILL.md"),
    "---\nname: context_product_plan\ndescription: 产品方案 product plan\n---\n\n# Product\n",
    "utf8"
  );
  await writeFile(
    path.join(fixture, ".agent/ty-context-managed/skills/context_uiux_design/SKILL.md"),
    "---\nname: context_uiux_design\ndescription: 设计稿 UI/UX\n---\n\n# UIUX\n",
    "utf8"
  );
  await writeFile(
    path.join(fixture, ".agent/ty-context-managed/skills/context_development_engineer/SKILL.md"),
    "---\nname: context_development_engineer\ndescription: 开发工程师 development plan\n---\n\n# Development\n",
    "utf8"
  );
  await writeFile(
    path.join(fixture, ".agent/ty-context-managed/skills/context_surface_contract/SKILL.md"),
    "---\nname: context_surface_contract\ndescription: Product Surface Contract 页面职责契约\n---\n\n# Surface\n",
    "utf8"
  );
  await writeFile(
    path.join(fixture, ".agent/ty-context-managed/skills/normal-long-task/SKILL.md"),
    "---\nname: normal-long-task\ndescription: Use when directly invoked for ordinary long-running task acceptance planning.\n---\n\n# Normal Long Task\n",
    "utf8"
  );
  await writeFile(
    path.join(fixture, ".agent/ty-context-managed/skills/composite-long-task-workflow/SKILL.md"),
    "---\nname: composite-long-task-workflow\ndescription: Use only when explicitly invoked through /composite-long-task-workflow.\n---\n\n# Composite Long-Task Workflow\n",
    "utf8"
  );
  await writeFile(
    path.join(fixture, ".agent/ty-context-managed/skills/prepare-composite-long-task/SKILL.md"),
    "---\nname: prepare-composite-long-task\ndescription: Use when directly invoked to prepare a composite campaign.\n---\n\n# Prepare Composite Long Task\n",
    "utf8"
  );
  await writeFile(
    path.join(fixture, ".agent/ty-context-managed/skills/prepare-composite-long-task/references/campaign-lifecycle.md"),
    "# Campaign Lifecycle\n",
    "utf8"
  );
  await writeFile(
    path.join(
      fixture,
      ".agent/ty-context-managed/skills/composite-long-task-workflow/references/composite-long-task-workflow-protocol.md"
    ),
    "# Composite Long-Task Workflow Protocol\n",
    "utf8"
  );
  await writeFile(
    path.join(fixture, ".agent/ty-context-managed/skills/composite-long-task-workflow/assets/goal-objective.template.md"),
    "# Goal Objective Template\n",
    "utf8"
  );
  await writeFile(
    path.join(fixture, ".agent/ty-context-managed/skills/composite-long-task-workflow/assets/execution-binding.template.md"),
    "# Execution Binding Template\n",
    "utf8"
  );
  await writeFile(path.join(fixture, ".agent/ty-context-managed/minimal_tools/validate_context.py"), "print('ok')\n", "utf8");
  await writeFile(path.join(fixture, ".agent/ty-context-managed/make/ty-context.mk"), "validate-context:\n\t@echo ok\n", "utf8");
  await writeFile(path.join(fixture, ".github/workflows/harness.yml"), "name: Harness\n", "utf8");
  await writeFile(
    path.join(fixture, "packages/ty-context/source-mappings.yaml"),
    `source_mappings:
  - source: ".agent/ty-context-managed/agents/AGENTS_CORE.md"
    target: "packages/ty-context/assets/agents/AGENTS_CORE.md"
    mode: "copy-file"
  - source: "README.md"
    target: "packages/ty-context/assets/README.md"
    mode: "copy-file"
  - source: ".agent/ty-context-managed/context_templates"
    target: "packages/ty-context/assets/context_templates"
    mode: "copy-tree"
  - source: ".agent/ty-context-managed/skills"
    target: "packages/ty-context/assets/skills"
    mode: "copy-tree"
  - source: ".agent/ty-context-managed/make/ty-context.mk"
    target: "packages/ty-context/assets/make/ty-context.mk"
    mode: "copy-file"
  - source: ".agent/ty-context-managed/minimal_tools"
    target: "packages/ty-context/assets/tools"
    mode: "copy-tree"
  - source: ".github/workflows/harness.yml"
    target: "packages/ty-context/assets/github/harness.yml"
    mode: "copy-file"
`,
    "utf8"
  );

  const syncReport = await syncSource(fixture);
  assert.ok(syncReport.changed.length > 0);
  const secondSyncReport = await syncSource(fixture);
  assert.deepEqual(secondSyncReport.changed, []);

  const checkReport = await checkSource(fixture);
  assert.deepEqual(checkReport.drift, []);

  const agentsCore = await readFile(path.join(fixture, "packages/ty-context/assets/agents/AGENTS_CORE.md"), "utf8");
  assert.match(agentsCore, /Minimal Context Harness/);
  const packagedReadme = await readFile(path.join(fixture, "packages/ty-context/assets/README.md"), "utf8");
  assert.match(packagedReadme, /Minimal Context package guide/);
  const packagedGlobal = await readFile(path.join(fixture, "packages/ty-context/assets/context_templates/global.md"), "utf8");
  assert.match(packagedGlobal, /Project \/ Delivery Context/);
  const packagedArchitecture = await readFile(
    path.join(fixture, "packages/ty-context/assets/context_templates/architecture.md"),
    "utf8"
  );
  assert.match(packagedArchitecture, /Architecture Context/);
  const packagedSurfaceTemplate = await readFile(
    path.join(fixture, "packages/ty-context/assets/context_templates/product-surface-contract.md"),
    "utf8"
  );
  assert.match(packagedSurfaceTemplate, /Product Surface Contract/);
  const packagedProductSkill = await readFile(
    path.join(fixture, "packages/ty-context/assets/skills/context_product_plan/SKILL.md"),
    "utf8"
  );
  assert.match(packagedProductSkill, /产品方案/);
  const packagedUiuxSkill = await readFile(
    path.join(fixture, "packages/ty-context/assets/skills/context_uiux_design/SKILL.md"),
    "utf8"
  );
  assert.match(packagedUiuxSkill, /UI\/UX/);
  const packagedDevelopmentSkill = await readFile(
    path.join(fixture, "packages/ty-context/assets/skills/context_development_engineer/SKILL.md"),
    "utf8"
  );
  assert.match(packagedDevelopmentSkill, /开发工程师/);
  const packagedSurfaceSkill = await readFile(
    path.join(fixture, "packages/ty-context/assets/skills/context_surface_contract/SKILL.md"),
    "utf8"
  );
  assert.match(packagedSurfaceSkill, /Product Surface Contract/);
  const packagedNormalLongTaskSkill = await readFile(
    path.join(fixture, "packages/ty-context/assets/skills/normal-long-task/SKILL.md"),
    "utf8"
  );
  assert.match(packagedNormalLongTaskSkill, /name: normal-long-task/);
  const packagedPrepareSkill = await readFile(
    path.join(fixture, "packages/ty-context/assets/skills/prepare-composite-long-task/SKILL.md"),
    "utf8"
  );
  assert.match(packagedPrepareSkill, /name: prepare-composite-long-task/);
  const packagedCompositeLongTaskSkill = await readFile(
    path.join(fixture, "packages/ty-context/assets/skills/composite-long-task-workflow/SKILL.md"),
    "utf8"
  );
  assert.match(packagedCompositeLongTaskSkill, /name: composite-long-task-workflow/);
  const packagedCompositeProtocol = await readFile(
    path.join(
      fixture,
      "packages/ty-context/assets/skills/composite-long-task-workflow/references/composite-long-task-workflow-protocol.md"
    ),
    "utf8"
  );
  assert.match(packagedCompositeProtocol, /Composite Long-Task Workflow Protocol/);
  const packagedCompositeGoalTemplate = await readFile(
    path.join(fixture, "packages/ty-context/assets/skills/composite-long-task-workflow/assets/goal-objective.template.md"),
    "utf8"
  );
  assert.match(packagedCompositeGoalTemplate, /Goal Objective Template/);
  const packagedTool = await readFile(path.join(fixture, "packages/ty-context/assets/tools/validate_context.py"), "utf8");
  assert.match(packagedTool, /print\('ok'\)/);

  await mkdir(path.join(fixture, "packages/ty-context/assets/skills/stale"), { recursive: true });
  await writeFile(path.join(fixture, "packages/ty-context/assets/skills/stale/SKILL.md"), "# stale\n", "utf8");
  const staleCheckReport = await checkSource(fixture);
  assert.ok(staleCheckReport.drift.some((item) => item.includes("stale")));
  const staleSyncReport = await syncSource(fixture);
  assert.ok(staleSyncReport.changed.some((item) => item.includes("stale")));
  const cleanAfterStaleRemoval = await syncSource(fixture);
  assert.deepEqual(cleanAfterStaleRemoval.changed, []);
} finally {
  await rm(fixture, { recursive: true, force: true });
}
