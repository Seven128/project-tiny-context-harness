import assert from "node:assert/strict";
import { cp, mkdtemp, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileDependencyPlan } from "../../../../packages/ty-context/dist/lib/long-task-dependency-key.js";
import { prepareDependencyLayer } from "../../../../packages/ty-context/dist/lib/long-task-dependency-layer.js";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const workspace = await mkdtemp(path.join(os.tmpdir(), "workspace-"));
await cp(path.join(fixtureRoot, "layer-unit"), workspace, { recursive: true });

const plan = await compileDependencyPlan(workspace, [{
  command_steps: [{ tool: "package_script", target: "verify", cwd: "." }]
}]);
const managerCache = path.join(os.tmpdir(), "project-tiny-context-harness-host-v3", "dependencies", "manager-cache");
await assert.rejects(() => stat(managerCache), { code: "ENOENT" });
const layer = await prepareDependencyLayer(workspace, plan);
assert.ok(layer);
assert.equal((await stat(managerCache)).isDirectory(), true);
assert.equal(layer.manifest.packages.some((item) => item.name === "lodash-es" && item.version === "4.18.1"), true);
