import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runInit } from "../../packages/sdlc-harness/dist/lib/init.js";
import { runUpgrade } from "../../packages/sdlc-harness/dist/lib/upgrade.js";

const root = await mkdtemp(path.join(tmpdir(), "sdlc-harness-upgrade-minimal-"));

try {
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ sdlcHarness: { harnessFolderName: ".harness" } }, null, 2),
    "utf8"
  );
  await runInit(root, { adopt: true, force: false });

  await mkdir(path.join(root, ".work_products/01_product"), { recursive: true });
  await mkdir(path.join(root, ".harness/state"), { recursive: true });
  await writeFile(path.join(root, ".work_products/01_product/prd.md"), "# Legacy PRD\n", "utf8");
  await writeFile(path.join(root, ".harness/state/lifecycle.yaml"), 'current_phase: "SPRINTING"\n', "utf8");
  await writeFile(
    path.join(root, ".harness/config.yaml"),
    `core:
  package: "agent-project-sdlc"
  schema_version: "1"
managed_files:
  - path: "AGENTS.md"
    strategy: "merge-block"
  - path: ".harness/skills"
    strategy: "managed"
  - path: ".harness/pjsdlc_managed/templates"
    strategy: "managed"
never_overwrite:
  - ".work_products/**"
  - ".harness/state/**"
`,
    "utf8"
  );

  const report = await runUpgrade(root);
  assert.ok(report.some((line) => line.startsWith("migrations changed=")));
  assert.ok(report.some((line) => line.startsWith("sync changed=")));
  assert.ok(!report.some((line) => line.includes("migrate-context")));

  await stat(path.join(root, "project_context/global.md"));
  await stat(path.join(root, "project_context/architecture.md"));
  await stat(path.join(root, ".work_products/01_product/prd.md"));
  await stat(path.join(root, ".harness/state/lifecycle.yaml"));

  const config = await readFile(path.join(root, ".harness/config.yaml"), "utf8");
  assert.match(config, /schema_version: "3"/);
  assert.match(config, /\.harness\/pjsdlc_managed\/context_templates/);
  assert.match(config, /\.harness\/skills/);
  assert.match(config, /project_context\/\*\*/);
  assert.match(config, /DESIGN\.md/);
  assert.doesNotMatch(config, /\.harness\/pjsdlc_managed\/templates/);

  const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");
  assert.match(agents, /Minimal Context Harness/);
  const makefile = await readFile(path.join(root, "Makefile"), "utf8");
  assert.match(makefile, /-include \.harness\/pjsdlc_managed\/make\/sdlc-harness\.mk/);
  await stat(path.join(root, ".harness/skills/context_product_plan/SKILL.md"));
  await stat(path.join(root, ".harness/skills/context_uiux_design/SKILL.md"));
  await stat(path.join(root, ".harness/pjsdlc_managed/context_templates/global.md"));
} finally {
  await rm(root, { recursive: true, force: true });
}
