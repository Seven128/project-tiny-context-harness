import { createHash } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createCampaignV6 } from "../../../packages/ty-context/dist/lib/composite-campaign-v6.js";
import { applyCampaignScopeV6 } from "../../../packages/ty-context/dist/lib/composite-runtime-v6/campaign-packet-store.js";
import { runGit } from "../../../packages/ty-context/dist/lib/composite-campaign-git-baseline.js";

export async function createCampaignFixtureV6(options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "campaign-v6-fixture-"));
  const campaignId = options.campaignId ?? "fixture";
  const sliceCount = options.sliceCount ?? 1;
  await git(root, ["init", "-b", "main"]);
  await git(root, ["config", "user.email", "test@example.com"]);
  await git(root, ["config", "user.name", "Test"]);
  await writeContext(root);
  const plan = Array.from(
    { length: sliceCount },
    (_, index) => `SRC-${String(index + 1).padStart(3, "0")}: outcome ${index + 1}`,
  ).join("\n") + "\n";
  await writeFile(path.join(root, "plan.md"), plan, "utf8");
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({
      private: true,
      tyContext: { harnessFolderName: ".codex" },
    }),
    "utf8",
  );
  await git(root, ["add", "."]);
  await git(root, ["commit", "-m", "fixture"]);
  const created = await createCampaignV6(root, campaignId, "plan.md");
  const requestHash = createHash("sha256").update(plan).digest("hex");
  await writeFile(
    path.join(root, "scope.json"),
    JSON.stringify(scopeFixture(requestHash, sliceCount)),
    "utf8",
  );
  await writeFile(
    path.join(root, "coverage.json"),
    JSON.stringify(coverageFixture(requestHash, sliceCount)),
    "utf8",
  );
  await applyCampaignScopeV6(
    root,
    created.campaign_path,
    "scope.json",
    "coverage.json",
  );
  return { root, campaignId, campaignPath: created.campaign_path };
}

export async function git(root, args, options = {}) {
  return runGit(root, ["-c", "commit.gpgSign=false", ...args], {
    timeoutMs: 120_000,
    ...options,
  });
}

async function writeContext(root) {
  const files = {
    "project_context/context.toml":
      '[[areas]]\nid = "main"\nroot = "."\ncontext = "project_context/areas/main.md"\nkind = "app"\ndefault = true\n',
    "project_context/global.md": "# Global Context\n\n- Stable fixture facts.\n",
    "project_context/architecture.md":
      "# Architecture Context\n\n- Deterministic boundaries.\n",
    "project_context/areas/main.md": "# Main Area\n\n- Own the outcome.\n",
    ".codex/config.yaml":
      'core:\n  package: project-tiny-context-harness\n  schema_version: "4"\nprofiles:\n  enabled:\n    - core-portable\n    - workflow-default\n    - composite-codex\nmodularity:\n  limit: 300\n  policy: scoped_waivers\n  waivers: []\nmanaged_files: []\nnever_overwrite: []\n',
  };
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, ...relative.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }
}

function scopeFixture(request_sha256, sliceCount) {
  const source_units = Array.from({ length: sliceCount }, (_, index) => {
    const number = String(index + 1).padStart(3, "0");
    return {
      unit_id: `SRCU-${number}`,
      kind: "ui_control",
      statement: `outcome ${index + 1}`,
      cohesion_key: `outcome-${index + 1}`,
      owner_boundary: "fixture",
      acceptance_outcome: `complete outcome ${index + 1}`,
      source_refs: [`SRC-${number}`],
      details: {
        owner_surface: "fixture",
        route_or_location: "/fixture",
        control: `control-${index + 1}`,
        trigger_or_action: "activate",
        input: "none",
        loading_state: "loading",
        empty_state: "empty",
        success_state: "complete",
        failure_state: "failed",
        state_transition: "ready to complete",
        observable_feedback: "result",
        api_or_data_dependency: "none",
        permission_boundary: "user",
        acceptance_evidence: "assertion",
      },
    };
  });
  return {
    schema_version: "scope-fit-result-v4",
    request_sha256,
    decision:
      sliceCount === 1 ? "fit_for_three_inputs" : "split_required",
    campaign_goal: "fixture outcomes",
    granularity_contract: {
      unit: "control_or_capability_unit",
      slice_policy: "maximal_coherent_authorable_scope",
      parallelism_must_not_force_split: true,
    },
    source_units,
    global_constraints: [],
    slices: source_units.map((unit, index) => {
      const number = String(index + 1).padStart(3, "0");
      return {
        slice_id: `SFC-${number}`,
        stable_key: `outcome-${index + 1}`,
        title: `Outcome ${index + 1}`,
        objective: `Deliver outcome ${index + 1}`,
        depends_on: [],
        priority: index + 1,
        source_refs: [`SRC-${number}`],
        source_unit_refs: [unit.unit_id],
        scope_summary: [unit.statement],
        out_of_scope: [],
        separation_reasons:
          sliceCount === 1 ? [] : ["independent_acceptance_outcome"],
        produces_contracts: [],
        consumes_contracts: [],
        conflict_domains: [`outcome-${index + 1}`],
        resource_locks: [],
      };
    }),
    decision_required: null,
  };
}

function coverageFixture(source_plan_sha256, sliceCount) {
  return {
    schema_version: "composite-source-coverage-v2",
    source_plan_sha256,
    items: Array.from({ length: sliceCount }, (_, index) => {
      const number = String(index + 1).padStart(3, "0");
      return {
        source_item_id: `SRC-${number}`,
        statement: `outcome ${index + 1}`,
        disposition: "slice",
        slice_refs: [`SFC-${number}`],
        global_constraint_refs: [],
        rationale: "owned by the fixture slice",
        context_resolution: {
          status: "existing",
          context_refs: ["project_context/context.toml"],
          task_local_reason: null,
        },
      };
    }),
    global_constraint_bindings: [],
  };
}
