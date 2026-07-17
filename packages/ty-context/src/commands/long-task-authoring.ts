import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { preflightDeliveryContract } from "../lib/long-task-authoring-preflight.js";

export async function initializeLongTask(workdir: string): Promise<void> {
  await mkdir(workdir, { recursive: true });
  try {
    await writeFile(path.join(workdir, "delivery-contract.yaml"), template(), {
      flag: "wx",
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
}

export async function preflightLongTask(workdir: string): Promise<void> {
  const result = await preflightDeliveryContract(workdir, process.cwd());
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "ready") process.exitCode = 1;
}

export function compactLongTaskTemplate(): string {
  return template();
}

function template(): string {
  return `schema_version: long-task-delivery-v2
task:
  id: replace-me
  title: Replace me
  goal: Describe the complete observable delivery goal.
  source_paths: [plans/replace-me.md]
  context_refs: [project_context/areas/replace-me.md]
source_claims:
  - key: replace-requirement
    source_ref: plans/replace-me.md#replace-requirement
    statement: Preserve one atomic source requirement.
    disposition:
      type: claim
      refs: [replace-outcome.requirement.replace-requirement]
risk:
  facts: {}
global: {}
outcomes:
  - key: replace-outcome
    title: Replace outcome
    product:
      observable_result: Describe what a user or system can observe.
      owner:
        label: replace-owner
        context_refs: [project_context/areas/replace-me.md]
        path_globs: ["src/**", "tests/**"]
      requirements:
        - key: replace-requirement
          statement: Preserve one atomic source requirement.
          required_proof_surfaces: [runtime_behavior]
    technical:
      expected_change_paths: ["src/**"]
      bindings:
        - key: replace-carrier
          kind: file
          target: src/replace-me.ts
          carrier_paths: [src/replace-me.ts]
          existence: planned
    acceptance:
      checks:
        - key: replace-check
          proof_surface: runtime_behavior
          runner:
            type: node_oracle
            target: tests/replace-oracle.mjs
            effect: read_only
          verification_inputs: ["tests/replace-oracle.mjs"]
          input_paths: [src/replace-me.ts]
          expected_output_paths: [src/replace-me.ts]
          positive_assertions:
            - key: replace-success
              criterion: The declared outcome and requirement are observable.
              claims: [result, requirement.replace-requirement]
              observation: result
              operator: equals
              expected: true
      counterfactual_controls:
        - key: remove-replace-carrier
          binding_key: replace-carrier
          claims: [result, requirement.replace-requirement]
          check_key: replace-check
          mutation:
            type: remove_paths
            paths: [src/replace-me.ts]
          expected_assertion_failures: [replace-success]
`;
}
