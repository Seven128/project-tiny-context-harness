import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=(file)=>readFile(path.join(root,file),"utf8");
test("composite V2 Skill is explicit-only and contains no legacy execution protocol",async()=>{ const paths=[".codex/ty-context-managed/skills/composite-long-task-workflow/SKILL.md",".codex/skills/composite-long-task-workflow/SKILL.md","packages/ty-context/assets/skills/composite-long-task-workflow/SKILL.md"]; const contents=await Promise.all(paths.map(read)); for(const content of contents){ assert.match(content,/Use only when explicitly invoked through \/composite-long-task-workflow/); assert.match(content,/Product Requirement → atomic PI obligation → AC → executable frozen verification spec/); assert.match(content,/final-gate/); assert.match(content,/needs_work.*never a legal final reply/s); assert.match(content,/host_completion_gate_unavailable/); assert.doesNotMatch(content,/superpowers|task-state\.json|events\.ndjson|derived\/\*\*|workflow-protocol\.md|execution-binding\.md|slice-gate|epoch-gate/i); } const policy=await read(".codex/ty-context-managed/skills/composite-long-task-workflow/agents/openai.yaml"); assert.match(policy,/allow_implicit_invocation:\s*false/); });
test("obsolete protocol and binding assets are absent",async()=>{ for(const file of ["packages/ty-context/assets/skills/composite-long-task-workflow/references/composite-long-task-workflow-protocol.md","packages/ty-context/assets/skills/composite-long-task-workflow/assets/execution-binding.template.md"]) await assert.rejects(read(file),/ENOENT/); });
