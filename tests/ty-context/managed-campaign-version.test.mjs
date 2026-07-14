import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkSource } from "../../packages/ty-context/dist/lib/package-source.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFile(path.join(root, relative), "utf8");
const active = [
  "AGENTS.md",
  ".codex/skills/prepare-composite-long-task/SKILL.md",
  ".codex/skills/composite-long-task-workflow/SKILL.md",
  ".codex/ty-context-managed/agents/AGENTS_CORE.md",
  ".codex/ty-context-managed/skills/prepare-composite-long-task/SKILL.md",
  ".codex/ty-context-managed/skills/composite-long-task-workflow/SKILL.md",
  "packages/ty-context/assets/agents/AGENTS_CORE.md",
  "packages/ty-context/assets/skills/prepare-composite-long-task/SKILL.md",
  "packages/ty-context/assets/skills/composite-long-task-workflow/SKILL.md"
];

test("managed_assets_use_current_campaign_version", async () => {
  const content = (await Promise.all(active.map(read))).join("\n");
  assert.match(content, /Campaign V5/);
  assert.match(content, /Scope Fit V4/);
  assert.match(content, /Contract V3/);
});

test("agents_route_matches_skill_version", async () => {
  const agents = await read(active[0]);
  const prepare = await read(active[1]);
  assert.match(agents, /Campaign V5.*Scope Fit V4/s);
  assert.match(prepare, /Campaign V5.*Scope Fit V4/s);
});

test("package_assets_match_source_assets", async () => {
  assert.deepEqual((await checkSource(root)).drift, []);
});

test("no_stale_v3_v4_campaign_terms_in_active_guidance", async () => {
  const content = (await Promise.all(active.map(read))).join("\n");
  assert.doesNotMatch(content, /Scope Fit V3|Campaign V4/);
});
