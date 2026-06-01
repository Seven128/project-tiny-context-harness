import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const read = (relativePath) => readFile(path.join(repoRoot, relativePath), "utf8");

const [
  agents,
  managerSkill,
  devSkill,
  readme,
  packageReadme,
  spec,
  packageAgents,
  packageManagerSkill,
  packageDevSkill,
  packageGuide
] = await Promise.all([
  read("AGENTS.md"),
  read(".codex/skills/pjsdlc_manager/SKILL.md"),
  read(".codex/skills/pjsdlc_dev_sprint/SKILL.md"),
  read("README.md"),
  read("packages/sdlc-harness/README.md"),
  read("PROJECT_SPEC.md"),
  read("packages/sdlc-harness/assets/agents/AGENTS_CORE.md"),
  read("packages/sdlc-harness/assets/skills/pjsdlc_manager/SKILL.md"),
  read("packages/sdlc-harness/assets/skills/pjsdlc_dev_sprint/SKILL.md"),
  read("packages/sdlc-harness/assets/docs/README.md")
]);

for (const content of [agents, readme, packageReadme, spec, packageAgents, packageGuide]) {
  assert.match(content, /orientation fast path/i);
}

assert.match(agents, /不要在开场运行 `make validate-\*`/);
assert.match(agents, /“跑测试 \/ 验证一下”.*对应 gate/s);
assert.match(agents, /`\/status`.*不自动运行阶段 gate/s);
assert.match(agents, /`\/next`.*不自动等价 `\/advance`/s);

assert.match(managerSkill, /`\/status`、`\/next`.*orientation fast path/s);
assert.match(managerSkill, /`\/advance` 仍必须运行 `make validate-current`/);
assert.match(managerSkill, /用户自然语言要求跑测试或验证时，运行当前 task 或当前阶段的对应 gate/);

assert.match(devSkill, /开始编码前，先走 orientation fast path/);
assert.match(devSkill, /尚未修改、尚未准备完成 task 时，不先运行 full gate/);
assert.match(devSkill, /必须在完成当前 task 前运行当前 task 的 `required_gates`/);

assert.match(packageManagerSkill, /`\/status`、`\/next`.*orientation fast path/s);
assert.match(packageDevSkill, /开始编码前，先走 orientation fast path/);
