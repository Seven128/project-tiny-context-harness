import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("normal-long-task is only a retirement pointer to the single Goal workflow", async () => {
  const skills = await Promise.all(
    [
      ".codex/ty-context-managed/skills/normal-long-task/SKILL.md",
      ".codex/skills/normal-long-task/SKILL.md",
      "packages/ty-context/assets/skills/normal-long-task/SKILL.md",
    ].map(read),
  );
  for (const content of skills) {
    assert.match(content, /name:\s*normal-long-task/);
    assert.match(content, /retired/i);
    assert.match(content, /\/long-task-workflow/);
    assert.match(content, /current platform-native Goal/i);
    assert.doesNotMatch(content, /one complete acceptance checklist/i);
    assert.doesNotMatch(content, /prompt only when requested/i);
    assert.doesNotMatch(content, /Local Audit only when/i);
    assert.doesNotMatch(content, /task-state\.json|final[- ]verdict|plan[- ]matrix/i);
  }
});
