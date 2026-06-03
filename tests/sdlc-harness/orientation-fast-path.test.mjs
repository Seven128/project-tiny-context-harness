import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(repoRoot, relativePath), "utf8");

const [sourceAgents, rootReadme, packageReadme, spec, packageAgents, packageGuide, sourceMappings] = await Promise.all([
  read(".codex/pjsdlc_managed/agents/AGENTS_CORE.md"),
  read("README.md"),
  read("packages/sdlc-harness/README.md"),
  read("PROJECT_SPEC.md"),
  read("packages/sdlc-harness/assets/agents/AGENTS_CORE.md"),
  read("packages/sdlc-harness/assets/docs/README.md"),
  read("packages/sdlc-harness/source-mappings.yaml")
]);

for (const content of [sourceAgents, rootReadme, packageReadme, spec, packageAgents, packageGuide]) {
  assert.match(content, /Minimal Context Harness/);
  assert.match(content, /project_context\/global\.md/);
}

for (const content of [sourceAgents, rootReadme, packageReadme, packageAgents, packageGuide]) {
  assert.match(content, /Harness (?:maintains context quality|只维护上下文质量)/i);
  assert.match(
    content,
    /(?:does not replace product tests|project tests.*(?:own|remain responsible for) product quality|不替项目证明产品质量|不替代产品测试)/i
  );
}

for (const content of [rootReadme, packageReadme, spec, packageGuide]) {
  assert.match(content, /migrate-context --dry-run/);
  assert.match(content, /sync.*(?:does not.*semantic|never.*generates|refreshes managed assets only|refreshes managed assets)/i);
  assert.match(content, /upgrade.*migrate-context/s);
}

assert.match(spec, /Historical Iteration: Stage-Based SDLC Harness/);
assert.match(spec, /Benchmark Findings And Convergence Reason/);
assert.match(spec, /full document chains and frequent workflow gates add real time and token friction/i);

assert.match(sourceMappings, /context_templates/);
assert.match(sourceMappings, /minimal_tools/);
assert.doesNotMatch(sourceMappings, /\.codex\/skills/);
assert.doesNotMatch(sourceMappings, /assets\/skills/);

assert.doesNotMatch(packageReadme, /Project initialization.*workflow skills/s);
assert.doesNotMatch(packageReadme, /fresh lifecycle starts at/);
