import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const relativeSkillDirectories = [
  ".codex/ty-context-managed/skills/source-plan-authoring",
  ".codex/skills/source-plan-authoring",
  "packages/ty-context/assets/skills/source-plan-authoring",
];

test("source-plan-authoring is explicit, self-contained and non-authoritative", async () => {
  const [contents, productPlan] = await Promise.all([
    Promise.all(
      relativeSkillDirectories.map((directory) =>
        readFile(path.join(repo, directory, "SKILL.md"), "utf8"),
      ),
    ),
    readFile(
      path.join(
        repo,
        ".codex/ty-context-managed/skills/context_product_plan/SKILL.md",
      ),
      "utf8",
    ),
  ]);
  assert.equal(contents[1], contents[0], "generated source-workspace Skill drift");
  assert.equal(contents[2], contents[0], "package asset Skill drift");

  for (const directory of relativeSkillDirectories) {
    assert.deepEqual(await readdir(path.join(repo, directory)), ["SKILL.md"]);
  }

  const skill = contents[0];
  const match = skill.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/u);
  assert.ok(match, "Skill frontmatter must be present");
  const [, frontmatter, body] = match;
  const metadata = YAML.parse(frontmatter);

  assert.deepEqual(Object.keys(metadata).sort(), ["description", "name"]);
  assert.equal(metadata.name, "source-plan-authoring");
  assert.match(frontmatter, /^name:\s*source-plan-authoring$/mu);
  assert.match(frontmatter, /description:\s*Use only when the user explicitly asks/iu);
  assert.match(
    frontmatter,
    /初版方案、源方案、方案源稿、Source Plan, initial delivery plan/u,
  );
  assert.match(frontmatter, /Do not trigger for ordinary product discussion/iu);
  assert.doesNotMatch(frontmatter, /产品方案|开发方案|技术方案/u);

  assert.match(body, /one high-fidelity, self-contained Markdown Source Plan/iu);
  assert.match(body, /direct`, `derived`.*`decision_required`/isu);
  assert.match(body, /Derived From/iu);
  assert.match(body, /does not change user capability, business rules or product scope/iu);
  assert.match(
    body,
    /stable semantic lowercase-kebab keys and explicit Markdown `id` anchors/iu,
  );
  assert.match(body, /lowercase-kebab/iu);
  assert.match(body, /<a id="<outcome-key>\.requirement\.<requirement-key>"><\/a>/u);
  assert.match(body, /observable results can be independently judged/iu);
  assert.match(body, /Do not split an Outcome because of/iu);
  assert.match(body, /response or document length/iu);
  assert.match(body, /frontend\/backend or other implementation layers/iu);
  assert.match(body, /Do not force every Source Plan to define every control/iu);
  assert.match(body, /leaving it open would permit materially different product designs/iu);
  assert.match(body, /Never introduce a product requirement for the first time inside an `AC`/iu);
  assert.match(body, /Keep `OBL` and `HINT` distinct/iu);

  for (const type of [
    "OUT",
    "REQ",
    "CTRL",
    "OBL",
    "AC",
    "NG",
    "FS",
    "RISK",
    "EXT",
    "DEC",
    "HINT",
  ]) {
    assert.match(body, new RegExp(`\\| \`${type}\` \\|`, "u"));
  }

  const completeness = body.match(
    /## Completeness Check\r?\n([\s\S]*?)\r?\n## Non-Goals/u,
  )?.[1];
  assert.ok(completeness, "Completeness Check section must exist");
  assert.equal(
    completeness.match(/^\d+\.\s/gmu)?.length,
    13,
    "Completeness Check must retain all 13 semantic audits",
  );
  assert.match(body, /Do not emit a matrix or machine gate/iu);
  assert.match(body, /Do not generate Delivery Contract YAML/iu);
  assert.match(body, /Do not update `project_context\/\*\*`/u);
  assert.match(body, /Use `context_product_plan` separately/iu);
  assert.match(body, /Use `long-task-workflow` later/iu);
  assert.match(body, /This Skill authors Source, not a Contract Draft/iu);
  assert.match(body, /does not replace Contract Draft authoring inside `long-task-workflow`/iu);
  assert.match(body, /recommended structure is optional input guidance, not a required protocol/iu);
  assert.match(body, /Do not bind owners, files, runners, verification inputs/iu);
  assert.match(body, /Source Plan Schema or mandatory format validator/iu);
  assert.match(body, /Source Plan CLI, Preflight or Compile step/iu);
  assert.match(body, /Source Plan Receipt, Coverage Cache, Authority or state file/iu);
  assert.match(body, /cannot prove that the user has expressed every real requirement/iu);
  assert.doesNotMatch(
    body,
    /Codex|Claude|ChatGPT|Windows|macOS|Linux|PowerShell|Bash|Playwright/iu,
  );
  assert.doesNotMatch(
    body,
    /ty-context long-task (?:init|preflight|compile|verify|final-gate)/iu,
  );
  assert.doesNotMatch(body, /tests? passed|delivery complete|implementation complete/iu);
  assert.ok(skill.split(/\r?\n/u).length < 500, "Skill must remain under 500 lines");
  assert.match(productPlan, /更新 `project_context\/\*\*`/u);
  assert.match(productPlan, /长期产品事实/u);
});
