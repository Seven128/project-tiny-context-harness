import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runInit } from "../../packages/ty-context/dist/lib/init.js";
import { runUpgrade } from "../../packages/ty-context/dist/lib/upgrade.js";

test("Product Surface Contract assets install without business contract files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ty-context-surface-contract-"));
  try {
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ tyContext: { harnessFolderName: ".harness" } }, null, 2),
      "utf8"
    );

    await runInit(root, { adopt: true, force: false });
    await stat(path.join(root, ".harness/skills/context_surface_contract/SKILL.md"));
    await stat(path.join(root, ".harness/ty-context-managed/context_templates/product-surface-contract.md"));
    await assert.rejects(stat(path.join(root, "project_context/areas/product-surface-contracts.md")));

    await rm(path.join(root, ".harness/skills/context_surface_contract"), { recursive: true, force: true });
    await rm(path.join(root, ".harness/ty-context-managed/context_templates/product-surface-contract.md"), { force: true });
    const report = await runUpgrade(root);
    assert.ok(report.some((line) => line.startsWith("sync changed=")));
    await stat(path.join(root, ".harness/skills/context_surface_contract/SKILL.md"));
    await stat(path.join(root, ".harness/ty-context-managed/context_templates/product-surface-contract.md"));
    await assert.rejects(stat(path.join(root, "project_context/areas/product-surface-contracts.md")));

    const manifest = await readFile(path.join(root, "project_context/context.toml"), "utf8");
    assert.doesNotMatch(manifest, /surface-contract|product-surface|web-contract|app-contract|game-surface/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
