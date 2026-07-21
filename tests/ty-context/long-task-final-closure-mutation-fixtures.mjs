import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export function configureMixedEvidenceContract(contract) {
  contract.task.execution_targets.push({
    key: "fixture-browser",
    description: "The browser product runtime.",
    role: "product",
    runtime_family: "browser",
    root_entrypoint: "/",
  });
  const browser = contract.outcomes[0];
  browser.product.requirements[0].required_proof_surfaces = ["ui_browser"];
  browser.technical.obligations[0].required_proof_surfaces = [
    "runtime_behavior",
    "ui_browser",
  ];
  const stageGate = browser.acceptance.checks[0];
  stageGate.positive_assertions[0].claims = [
    "result",
    "obligation.implement-first",
  ];
  browser.acceptance.counterfactual_controls[0].claims = [
    "result",
    "obligation.implement-first",
  ];
  const ui = structuredClone(stageGate);
  ui.key = "ui-check";
  ui.journey_roles = ["success"];
  ui.execution_target = {
    target_ref: "fixture-browser",
    entrypoint: "root",
  };
  ui.proof_surface = "ui_browser";
  ui.runner = {
    type: "playwright_test",
    target: "tests/ui.spec.ts",
    argv: [],
    cwd: ".",
    timeout_ms: 30000,
    effect: "test_sandbox",
    retry_policy: "none",
    idempotent: false,
  };
  ui.verification_inputs = ["tests/ui.spec.ts"];
  ui.artifact_globs = [];
  ui.positive_assertions = [
    {
      key: "ui-acceptance",
      criterion: "The UI acceptance case passes.",
      claims: [
        "result",
        "requirement.observe-first",
        "obligation.implement-first",
      ],
      observation: "playwright.case.ui-acceptance.passed",
      evidence_capabilities: ["interaction_trace", "target_runtime"],
      operator: "equals",
      expected: true,
    },
    {
      key: "ui-recovery",
      criterion: "The UI recovery case passes.",
      claims: ["requirement.observe-first"],
      observation: "playwright.case.ui-recovery.passed",
      evidence_capabilities: ["interaction_trace"],
      operator: "equals",
      expected: true,
    },
  ];
  browser.acceptance.checks.push(ui);

  const structured = contract.outcomes[1];
  structured.acceptance.checks[0].runner.target =
    "tests/constant-oracle.mjs";
  structured.acceptance.checks[0].verification_inputs = [
    "tests/constant-oracle.mjs",
  ];
  structured.acceptance.checks[0].artifact_globs = [];
  structured.acceptance.checks[0].positive_assertions[0].key =
    "structured-acceptance";
  structured.acceptance.checks[0].runner.argv = [
    "second",
    "structured-acceptance",
  ];
  structured.acceptance.checks[0].positive_assertions[0].criterion =
    "The structured outcome is observable and implemented.";
  structured.acceptance.counterfactual_controls = [];

  contract.source_claims[0].statement = "Implement first";
  contract.source_claims[0].disposition.refs = [
    "first.obligation.implement-first",
  ];
  contract.source_claims.push(
    sourceAcceptance(
      "first-ui-acceptance",
      "The UI acceptance case passes.",
      "first.ui-check.ui-acceptance",
    ),
    sourceAcceptance(
      "first-ui-recovery",
      "The UI recovery case passes.",
      "first.ui-check.ui-recovery",
    ),
    {
      key: "second-observable",
      source_ref: "source.md#fixture-source",
      statement: "The second outcome must be observable.",
      disposition: {
        type: "claim",
        refs: ["second.requirement.observe-second"],
      },
    },
    sourceAcceptance(
      "second-structured-acceptance",
      "The structured outcome is observable and implemented.",
      "second.second-check.structured-acceptance",
    ),
  );
}

export async function writeSource(
  root,
  {
    wrongRequirementTarget,
    structuredCriterion =
      "The structured outcome is observable and implemented.",
  },
) {
  const firstStatement = wrongRequirementTarget
    ? "Implement first"
    : "The first outcome must be observable.";
  await writeFile(
    path.join(root, "source.md"),
    `# Fixture source

<!-- ty-source-item:start key=first-observable kind=requirement -->
${firstStatement}
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=first-ui-acceptance kind=acceptance -->
The UI acceptance case passes.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=first-ui-recovery kind=acceptance -->
The UI recovery case passes.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=second-observable kind=requirement -->
The second outcome must be observable.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=second-structured-acceptance kind=acceptance -->
${structuredCriterion}
<!-- ty-source-item:end -->
`,
  );
}

export async function createFakePlaywrightBin() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ty-fake-pw-"));
  const script = path.join(directory, "npx-cli.js");
  await writeFile(
    script,
    `import { readFile } from "node:fs/promises";
const mode = JSON.parse(await readFile("src/ui-mode.json", "utf8"));
const cases = mode === "multiple"
  ? ["[ac:ui-acceptance] [ac:ui-recovery] copied proof"]
  : ["[ac:ui-acceptance] acceptance", "[ac:ui-recovery] recovery"];
const steps = [{title:"[given:fixture-loaded]"},{title:"[action:read-outcome]"}];
const specs = cases.map((title) => ({title, tests:[{projectId:"default",status:"expected",results:[{status:"passed",steps}]}]}));
console.log(JSON.stringify({stats:{expected:cases.length,unexpected:0,skipped:0,flaky:0},suites:[{specs}]}));
`,
  );
  await chmod(script, 0o755);
  return directory;
}

export function withPath(directory) {
  const key = Object.keys(process.env).find(
    (candidate) => candidate.toUpperCase() === "PATH",
  );
  const pathKey = key ?? "PATH";
  return {
    ...process.env,
    npm_execpath: path.join(directory, "npm-cli.js"),
    [pathKey]: `${directory}${path.delimiter}${process.env[pathKey] ?? ""}`,
  };
}

function sourceAcceptance(key, statement, reference) {
  return {
    key,
    source_ref: "source.md#fixture-source",
    statement,
    disposition: { type: "acceptance", refs: [reference] },
  };
}
