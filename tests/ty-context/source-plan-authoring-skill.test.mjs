import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { RISK_FACT_NAMES } from "../../packages/ty-context/dist/lib/long-task-risk-types.js";

const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const relativeSkillDirectories = [
  ".codex/ty-context-managed/skills/source-plan-authoring",
  ".codex/skills/source-plan-authoring",
  "packages/ty-context/assets/skills/source-plan-authoring",
];

function assertMixedInputAndControlAuthoring(frontmatter, body) {
  assert.match(frontmatter, /mixed inputs/iu);
  assert.match(frontmatter, /screenshots, diagrams or other attachments/iu);
  assert.match(frontmatter, /control-level UI detail/iu);
  assert.match(body, /Refinement mode/iu);
  assert.match(body, /Synthesis mode/iu);
  assert.match(body, /Hybrid mode/iu);
  assert.match(body, /A short request is sufficient/iu);
  assert.match(
    body,
    /Do not require a fixed questionnaire or a pre-existing outline/iu,
  );
  assert.match(body, /Assign every supplied artifact a stable input ID/iu);
  assert.match(body, /all pages, frames, screens, tables, diagrams/iu);
  assert.match(body, /never silently sample a multi-part artifact/iu);
  assert.match(
    body,
    /classify the interpretation as `exact-target`, `constraint` or `inspiration`/iu,
  );
  assert.match(body, /Treat it as inspiration unless the user or a higher-authority input/iu);
  assert.match(body, /Input Inventory/iu);
  assert.match(body, /^## Preference And Research Gate$/mu);
  assert.match(
    body,
    /Before comparative research or a material product, technical, architecture or provider selection/iu,
  );
  assert.match(
    body,
    /quality or fidelity versus cost.*delivery speed.*privacy or compliance.*vendor lock-in.*operational burden/isu,
  );
  assert.match(
    body,
    /stop before comparative research or selection and ask the user one concise set of targeted questions/iu,
  );
  assert.match(
    body,
    /Do not ask again when the preference is already available/iu,
  );
  assert.match(
    body,
    /Do not interrupt minor, reversible choices.*same defensible recommendation across plausible preferences/isu,
  );
  assert.match(body, /not a mandatory intake questionnaire/iu);
  assert.match(
    body,
    /current authoritative or primary sources.*Input Inventory.*retrieval date/isu,
  );
  assert.match(
    body,
    /Preference clarification determines what outcome to optimize.*does not approve a purchase/isu,
  );
  assert.match(body, /Delegated elaboration/iu);
  assert.match(body, /default plan-authoring delegation/iu);
  assert.match(
    body,
    /High impact alone does not make a plan choice unresolved/iu,
  );
  assert.match(body, /mark it `delegated`/iu);
  assert.match(body, /state `Delegated By`/iu);
  assert.match(body, /Delegation authorizes plan meaning only/iu);
  assert.match(body, /Declare each applicable real-world gate as an `EXT`/iu);
  assert.match(
    body,
    /authoritative inputs conflict.*user explicitly reserves.*material preference remains unknown.*no single defensible recommendation/is,
  );
  assert.match(body, /at control level/iu);
  assert.match(
    body,
    /every user-visible surface and every material interactive control/iu,
  );
  assert.match(
    body,
    /expand it to the detail needed by later `long-task-workflow` Contract authoring/iu,
  );
  assert.match(body, /Ready for Contract authoring: yes\|no/iu);
  assert.match(body, /without requiring the original conversation/iu);
}

function assertDelegatedSourceCompatibility(longTaskSkill, contractAuthoring) {
  assert.match(
    longTaskSkill,
    /record it in real Source with the authoring instruction, preference\/evidence basis and exact added meaning instead of pausing for approval/iu,
  );
  assert.match(
    longTaskSkill,
    /If quality versus cost.*is unknown or ambiguous, stop before that research or selection and ask one concise targeted clarification/isu,
  );
  assert.match(
    contractAuthoring,
    /`delegated` in a Source Plan is provenance, not a Contract disposition or new Claim kind[\s\S]*ask a concise targeted question before research or selection[\s\S]*never place the choice only in Contract YAML/iu,
  );
  assert.match(
    [longTaskSkill, contractAuthoring].join("\n"),
    /Payment, contracting, production deployment(?: or publication|\/publication)[\s\S]*external confirmation/iu,
  );
  assert.match(
    [longTaskSkill, contractAuthoring].join("\n"),
    /conflicting.*user-reserved.*missing-preference.*unsupported|Conflicting authority.*user-reserved choice.*missing material preference.*absence of a defensible recommendation/iu,
  );
}

test("source-plan-authoring is explicit, self-contained and non-authoritative", async () => {
  const [contents, productPlan, longTaskSkill, contractAuthoring] =
    await Promise.all([
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
      readFile(
        path.join(
          repo,
          ".codex/ty-context-managed/skills/long-task-workflow/SKILL.md",
        ),
        "utf8",
      ),
      readFile(
        path.join(
          repo,
          ".codex/ty-context-managed/skills/long-task-workflow/references/contract-authoring.md",
        ),
        "utf8",
      ),
    ]);
  assert.equal(
    contents[1],
    contents[0],
    "generated source-workspace Skill drift",
  );
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
  assert.match(
    frontmatter,
    /description:\s*Use only when the user explicitly asks/iu,
  );
  assert.match(
    frontmatter,
    /初版方案、源方案、方案源稿、Source Plan, initial delivery plan/u,
  );
  assertMixedInputAndControlAuthoring(frontmatter, body);
  assert.match(frontmatter, /Do not trigger for ordinary product discussion/iu);
  assert.doesNotMatch(frontmatter, /产品方案|开发方案|技术方案/u);

  assert.match(
    body,
    /one high-fidelity, self-contained Markdown Source Plan/iu,
  );
  assert.match(body, /direct`, `derived`, `delegated`.*`decision_required`/isu);
  assert.match(body, /Derived From/iu);
  assert.match(
    body,
    /does not change user capability, business rules or product scope/iu,
  );
  assert.match(
    body,
    /stable semantic lowercase-kebab keys and explicit Markdown `id` anchors/iu,
  );
  assert.match(body, /lowercase-kebab/iu);
  assert.match(
    body,
    /<a id="<outcome-key>\.requirement\.<requirement-key>"><\/a>/u,
  );
  assert.match(body, /observable results can be independently judged/iu);
  assert.match(body, /Do not split an Outcome because of/iu);
  assert.match(body, /response or document length/iu);
  assert.match(body, /frontend\/backend or other implementation layers/iu);
  assert.match(
    body,
    /Do not force a non-interface Source Plan to invent controls/iu,
  );
  assert.match(
    body,
    /leaving it open would permit materially different product designs/iu,
  );
  assert.match(
    body,
    /Never introduce a product requirement for the first time inside an `AC`/iu,
  );
  assert.match(body, /Keep `OBL` and `HINT` distinct/iu);

  for (const type of [
    "OUT",
    "REQ",
    "CTRL",
    "OBL",
    "NCOMP",
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
    25,
    "Completeness Check must retain all 25 semantic audits",
  );
  assert.match(
    body,
    /`Surface`.*`Region`.*`Control type`.*`Label\/content`.*`Location`.*`User task`.*`Visibility`.*`Availability`.*`Trigger`.*`Input`.*`Validation`.*`Default`.*`Interaction`.*`Navigation\/result`.*`Loading`.*`Empty`.*`Success`.*`Failure`.*`Recovery`.*`Permission`.*`Feedback`.*`Accessibility`/isu,
  );
  assert.match(body, /one `Given`, one `When` and one `Then`/iu);
  assert.match(body, /`REQ`, `CTRL`, `OBL` and\/or `NCOMP`/u);
  assert.match(body, /`Fact`, `Affected Outcome`, `Basis` and `Consequence`/u);
  assert.match(body, /permission_boundary_change/iu);
  const declaredRiskFacts = body
    .match(
      /complete Runtime Risk Fact set:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/u,
    )?.[1]
    .split(/\r?\n/u)
    .map((item) => item.trim())
    .filter(Boolean);
  assert.deepEqual(declaredRiskFacts, [...RISK_FACT_NAMES]);
  assert.doesNotMatch(body, /`migration`.*(?:Risk Fact|semantic name)/iu);
  assert.doesNotMatch(body, /weak_observability_critical_path/u);
  assert.match(
    body,
    /data migration uses `data_migration`, never `migration`/iu,
  );
  assert.match(body, /one `critical_user_path` and one `weak_observability`/iu);
  assert.match(body, /Preserve `multi_repository_change` in Source/iu);
  assert.match(
    body,
    /create a `DEC` with `decision_required` instead of guessing/iu,
  );
  assert.match(
    body,
    /high impact or multiple options with known criteria alone never create a pause/iu,
  );
  assert.match(
    body,
    /every delegated value cites its evidence, known preference, convention or conservative-default basis/iu,
  );
  assert.match(body, /Do not emit a matrix or machine gate/iu);
  assert.match(body, /Do not generate Delivery Contract YAML/iu);
  assert.match(body, /Do not update `project_context\/\*\*`/u);
  assert.match(body, /Use `context_product_plan` separately/iu);
  assert.match(body, /Use `long-task-workflow` later/iu);
  assert.match(body, /This Skill authors Source, not a Contract Draft/iu);
  assert.match(
    body,
    /does not replace Contract Draft authoring inside `long-task-workflow`/iu,
  );
  assert.match(body, /recommended structure is optional input guidance/iu);
  assert.match(
    body,
    /Do not bind owners, files, runners, verification inputs/iu,
  );
  assert.match(body, /Source Plan Schema or mandatory format validator/iu);
  assert.match(body, /Source Plan CLI, Preflight or Compile step/iu);
  assert.match(
    body,
    /Source Plan Receipt, Coverage Cache, Authority or state file/iu,
  );
  assert.match(
    body,
    /cannot prove that the user has expressed every real requirement/iu,
  );
  assert.doesNotMatch(
    body,
    /Codex|Claude|ChatGPT|Windows|macOS|Linux|PowerShell|Bash|Playwright/iu,
  );
  assert.doesNotMatch(
    body,
    /ty-context long-task (?:init|preflight|compile|verify|final-gate)/iu,
  );
  assert.doesNotMatch(
    body,
    /tests? passed|delivery complete|implementation complete/iu,
  );
  assert.ok(
    skill.split(/\r?\n/u).length < 500,
    "Skill must remain under 500 lines",
  );
  assert.match(productPlan, /更新 `project_context\/\*\*`/u);
  assert.match(productPlan, /长期产品事实/u);
  assertDelegatedSourceCompatibility(longTaskSkill, contractAuthoring);
});
