import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCampaignV4 } from "../../packages/ty-context/dist/lib/composite-audit-v4/campaign-store.js";
import { writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const cli = path.join(repoRoot, "packages", "ty-context", "dist", "cli.js");

test("V4 audit and V5 active runtime live in isolated source directories", async () => {
  const runtime = await readFile(
    path.join(
      repoRoot,
      "packages/ty-context/src/lib/composite-runtime-v5/campaign-packet-store.ts",
    ),
    "utf8",
  );
  const audit = await readFile(
    path.join(
      repoRoot,
      "packages/ty-context/src/lib/composite-audit-v4/campaign-store.ts",
    ),
    "utf8",
  );
  const command = await readFile(
    path.join(repoRoot, "packages/ty-context/src/commands/composite-campaign.ts"),
    "utf8",
  );
  assert.doesNotMatch(
    runtime,
    /composite-campaign-schema-v4|ScopeFitResultV3|createCampaignV4/,
  );
  assert.doesNotMatch(audit, /composite-runtime-v5|CampaignV5/);
  assert.match(command, /composite-runtime-v5\/campaign-packet-store/);
  assert.doesNotMatch(command, /composite-audit-v4/);
});

test("Campaign contract advertises V5 automation, Scope Fit V4, Source Coverage V2, and V4 audit compatibility", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "campaign-v5-contract-"));
  const contract = run(root, ["composite-campaign", "contract", "--json"]);
  assert.equal(contract.schema_version, "composite-campaign-v5");
  assert.equal(contract.audit_schema, "composite-campaign-v4");
  assert.equal(contract.scope_schema, "scope-fit-result-v4");
  assert.equal(contract.source_coverage_schema, "composite-source-coverage-v2");
  assert.equal(contract.change_envelope_schema, "slice-change-envelope-v1");
  assert.equal(contract.wave_impact_schema, "campaign-wave-impact-v2");
  assert.equal(
    contract.wave_integration_result_schema,
    "wave-integration-result-v2",
  );
  for (const schema of [
    "slice-change-envelope-v1",
    "campaign-wave-impact-v2",
    "wave-integration-result-v2",
  ])
    assert.equal(contract.schemas[schema].schema_version, schema);
  for (const command of [
    "run",
    "app-server-check",
    "model-routing",
    "threads",
    "interrupt",
  ])
    assert.ok(contract.commands.includes(command));
});

test("new Campaigns are V5 and reject legacy Scope Fit without aliases", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "campaign-v5-legacy-reject-"),
  );
  await writeHappyV3Contract(root);
  await writeFile(
    path.join(root, "plan.md"),
    "SRC-001: current Campaign V5 only\n",
  );
  const created = run(root, [
    "composite-campaign",
    "create",
    "--id",
    "v5",
    "--plan-file",
    "plan.md",
    "--json",
  ]);
  assert.equal(created.campaign.schema_version, "composite-campaign-v5");
  const legacyScope = {
    schema_version: "scope-fit-result-v3",
    request_sha256: created.campaign.source_plan_sha256,
    decision: "fit_for_three_inputs",
    campaign_goal: "legacy",
    global_constraints: [],
    slices: [
      {
        slice_id: "SFC-001",
        stable_key: "legacy",
        title: "Legacy",
        objective: "Legacy",
        depends_on: [],
        priority: 1,
        source_refs: ["SRC-001"],
        scope_summary: ["legacy"],
        out_of_scope: [],
        produces_contracts: [],
        consumes_contracts: [],
        conflict_domains: ["legacy"],
        resource_locks: [],
      },
    ],
    decision_required: null,
  };
  const coverage = {
    schema_version: "composite-source-coverage-v1",
    source_plan_sha256: created.campaign.source_plan_sha256,
    items: [
      {
        source_item_id: "SRC-001",
        statement: "legacy",
        disposition: "slice",
        slice_refs: ["SFC-001"],
        global_constraint_refs: [],
        rationale: "legacy",
      },
    ],
    global_constraint_bindings: [],
  };
  await writeFile(path.join(root, "scope.json"), JSON.stringify(legacyScope));
  await writeFile(path.join(root, "coverage.json"), JSON.stringify(coverage));
  const legacy = raw(root, [
    "composite-campaign",
    "apply-scope",
    "--campaign",
    path.relative(root, created.campaign_path),
    "--input",
    "scope.json",
    "--coverage",
    "coverage.json",
    "--json",
  ]);
  assert.notEqual(legacy.status, 0);
  assert.match(legacy.stderr, /requires scope-fit-result-v4/i);
});

test("legacy Campaign V4 state remains inspectable but automatic advance/run is audit-only", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "campaign-v4-audit-"));
  await writeHappyV3Contract(root);
  await writeFile(
    path.join(root, "plan.md"),
    "SRC-001: retained audit history\n",
  );
  const created = await createCampaignV4(root, "legacy-audit", "plan.md");
  const relative = path.relative(root, created.campaign_path);
  const status = run(root, [
    "composite-campaign",
    "status",
    "--campaign",
    relative,
    "--json",
  ]);
  assert.equal(status.campaign.schema_version, "composite-campaign-v4");
  for (const command of ["advance", "run"]) {
    const result = raw(root, [
      "composite-campaign",
      command,
      "--campaign",
      relative,
      "--json",
    ]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /audit.only|composite-campaign-v5/i);
  }
});

test("Campaign CLI rejects removed commands, unknown options, and immutable source drift", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "campaign-v5-cli-"));
  await enableCompositeProfile(root);
  assert.match(
    raw(root, ["composite-campaign", "next", "--campaign", "x"]).stderr,
    /Unknown composite-campaign subcommand/,
  );
  assert.match(
    raw(root, ["composite-campaign", "contract", "--force"]).stderr,
    /Unknown option/,
  );
  await writeHappyV3Contract(root);
  await writeFile(path.join(root, "plan.md"), "SRC-001: immutable\n");
  const created = run(root, [
    "composite-campaign",
    "create",
    "--id",
    "drift",
    "--plan-file",
    "plan.md",
    "--json",
  ]);
  await writeFile(
    path.join(created.campaign_path, "source-plan.md"),
    "changed\n",
  );
  const drift = raw(root, [
    "composite-campaign",
    "status",
    "--campaign",
    path.relative(root, created.campaign_path),
    "--json",
  ]);
  assert.notEqual(drift.status, 0);
  assert.match(drift.stderr, /source-plan\.md hash mismatch/);
});

function run(root, args) {
  const result = raw(root, args);
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  return JSON.parse(result.stdout.trim().split(/\r?\n/u).at(-1));
}
function raw(root, args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
}

async function enableCompositeProfile(root) {
  await mkdir(path.join(root, ".agent"), { recursive: true });
  await writeFile(
    path.join(root, ".agent", "config.yaml"),
    'core:\n  package: project-tiny-context-harness\n  schema_version: "4"\nprofiles:\n  enabled:\n    - core-portable\n    - workflow-default\n    - composite-codex\n',
    "utf8",
  );
}
