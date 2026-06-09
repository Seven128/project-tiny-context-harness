import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { checkSource, syncSource } from "../../packages/sdlc-harness/dist/lib/package-source.js";

const fixture = await mkdtemp(path.join(tmpdir(), "sdlc-harness-source-"));

try {
  await mkdir(path.join(fixture, ".agent/pjsdlc_managed/agents"), { recursive: true });
  await mkdir(path.join(fixture, ".agent/pjsdlc_managed/context_templates"), { recursive: true });
  await mkdir(path.join(fixture, ".agent/pjsdlc_managed/skills/context_product_plan"), { recursive: true });
  await mkdir(path.join(fixture, ".agent/pjsdlc_managed/skills/context_uiux_design"), { recursive: true });
  await mkdir(path.join(fixture, ".agent/pjsdlc_managed/skills/context_development_engineer"), { recursive: true });
  await mkdir(path.join(fixture, ".agent/pjsdlc_managed/minimal_tools"), { recursive: true });
  await mkdir(path.join(fixture, ".agent/pjsdlc_managed/make"), { recursive: true });
  await mkdir(path.join(fixture, ".github/workflows"), { recursive: true });
  await mkdir(path.join(fixture, "packages/sdlc-harness"), { recursive: true });

  await writeFile(path.join(fixture, ".agent/pjsdlc_managed/agents/AGENTS_CORE.md"), "# Minimal Context Harness\n", "utf8");
  await writeFile(path.join(fixture, "README.md"), "# User Guide\n\nMinimal Context package guide.\n", "utf8");
  await writeFile(path.join(fixture, ".agent/pjsdlc_managed/context_templates/global.md"), "# Project / Delivery Context\n", "utf8");
  await writeFile(path.join(fixture, ".agent/pjsdlc_managed/context_templates/architecture.md"), "# Architecture Context\n", "utf8");
  await writeFile(path.join(fixture, ".agent/pjsdlc_managed/context_templates/area.md"), "# Area Context\n", "utf8");
  await writeFile(
    path.join(fixture, ".agent/pjsdlc_managed/skills/context_product_plan/SKILL.md"),
    "---\nname: context_product_plan\ndescription: 产品方案 product plan\n---\n\n# Product\n",
    "utf8"
  );
  await writeFile(
    path.join(fixture, ".agent/pjsdlc_managed/skills/context_uiux_design/SKILL.md"),
    "---\nname: context_uiux_design\ndescription: 设计稿 UI/UX\n---\n\n# UIUX\n",
    "utf8"
  );
  await writeFile(
    path.join(fixture, ".agent/pjsdlc_managed/skills/context_development_engineer/SKILL.md"),
    "---\nname: context_development_engineer\ndescription: 开发工程师 development plan\n---\n\n# Development\n",
    "utf8"
  );
  await writeFile(path.join(fixture, ".agent/pjsdlc_managed/minimal_tools/validate_context.py"), "print('ok')\n", "utf8");
  await writeFile(path.join(fixture, ".agent/pjsdlc_managed/make/sdlc-harness.mk"), "validate-context:\n\t@echo ok\n", "utf8");
  await writeFile(path.join(fixture, ".github/workflows/harness.yml"), "name: Harness\n", "utf8");
  await writeFile(
    path.join(fixture, "packages/sdlc-harness/source-mappings.yaml"),
    `source_mappings:
  - source: ".agent/pjsdlc_managed/agents/AGENTS_CORE.md"
    target: "packages/sdlc-harness/assets/agents/AGENTS_CORE.md"
    mode: "copy-file"
  - source: "README.md"
    target: "packages/sdlc-harness/assets/README.md"
    mode: "copy-file"
  - source: ".agent/pjsdlc_managed/context_templates"
    target: "packages/sdlc-harness/assets/context_templates"
    mode: "copy-tree"
  - source: ".agent/pjsdlc_managed/skills"
    target: "packages/sdlc-harness/assets/skills"
    mode: "copy-tree"
  - source: ".agent/pjsdlc_managed/make/sdlc-harness.mk"
    target: "packages/sdlc-harness/assets/make/sdlc-harness.mk"
    mode: "copy-file"
  - source: ".agent/pjsdlc_managed/minimal_tools"
    target: "packages/sdlc-harness/assets/tools"
    mode: "copy-tree"
  - source: ".github/workflows/harness.yml"
    target: "packages/sdlc-harness/assets/github/harness.yml"
    mode: "copy-file"
`,
    "utf8"
  );

  const syncReport = await syncSource(fixture);
  assert.ok(syncReport.changed.length > 0);

  const checkReport = await checkSource(fixture);
  assert.deepEqual(checkReport.drift, []);

  const agentsCore = await readFile(path.join(fixture, "packages/sdlc-harness/assets/agents/AGENTS_CORE.md"), "utf8");
  assert.match(agentsCore, /Minimal Context Harness/);
  const packagedReadme = await readFile(path.join(fixture, "packages/sdlc-harness/assets/README.md"), "utf8");
  assert.match(packagedReadme, /Minimal Context package guide/);
  const packagedGlobal = await readFile(path.join(fixture, "packages/sdlc-harness/assets/context_templates/global.md"), "utf8");
  assert.match(packagedGlobal, /Project \/ Delivery Context/);
  const packagedArchitecture = await readFile(
    path.join(fixture, "packages/sdlc-harness/assets/context_templates/architecture.md"),
    "utf8"
  );
  assert.match(packagedArchitecture, /Architecture Context/);
  const packagedProductSkill = await readFile(
    path.join(fixture, "packages/sdlc-harness/assets/skills/context_product_plan/SKILL.md"),
    "utf8"
  );
  assert.match(packagedProductSkill, /产品方案/);
  const packagedUiuxSkill = await readFile(
    path.join(fixture, "packages/sdlc-harness/assets/skills/context_uiux_design/SKILL.md"),
    "utf8"
  );
  assert.match(packagedUiuxSkill, /UI\/UX/);
  const packagedDevelopmentSkill = await readFile(
    path.join(fixture, "packages/sdlc-harness/assets/skills/context_development_engineer/SKILL.md"),
    "utf8"
  );
  assert.match(packagedDevelopmentSkill, /开发工程师/);
  const packagedTool = await readFile(path.join(fixture, "packages/sdlc-harness/assets/tools/validate_context.py"), "utf8");
  assert.match(packagedTool, /print\('ok'\)/);
} finally {
  await rm(fixture, { recursive: true, force: true });
}
