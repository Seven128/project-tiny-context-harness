import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function writeReleaseTarballLongTaskFixture(root) {
  const workdir = path.join(root, ".long-task");
  await mkdir(path.join(root, "src"), { recursive: true });
  await mkdir(path.join(root, "tests"), { recursive: true });
  await mkdir(workdir, { recursive: true });
  await writeFile(path.join(root, "src/state.json"), '{"ready":true}\n');
  await writeFile(
    path.join(root, "source.md"),
    `# Tarball smoke source

<!-- ty-source-item:start key=packaged-verifier kind=technical_obligation -->
Use the packaged verifier.
<!-- ty-source-item:end -->
`,
  );
  await writeFile(
    path.join(root, "tests/oracle.mjs"),
    `import { readFile } from "node:fs/promises";
let state = { ready: false };
try { state = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8")); } catch {}
console.log(JSON.stringify({schema_version:"long-task-check-result-v3",execution_status:"completed",observations:{ready:state.ready},evidence_records:[{assertion_key:"installed-ready",capability:"state_delta",before_sha256:"0".repeat(64),after_sha256:"1".repeat(64),changed_fields:["ready"]},{assertion_key:"installed-ready",capability:"target_runtime",target_ref:"installed-runtime",root_entrypoint:"tests/oracle.mjs",session_id:"tarball-session",cold_start:true}]}));
`,
  );
  await writeFile(
    path.join(workdir, "delivery-contract.yaml"),
    `schema_version: long-task-delivery-v2
task:
  id: tarball-smoke
  title: Tarball smoke
  goal: Prove the installed long-task workflow.
  target_profile:
    key: installed-target
    description: The installed workflow is usable through its declared runtime.
    required_state: target_profile_usable
    required_target_refs: [installed-runtime]
  execution_targets:
    - key: installed-runtime
      description: Installed fixture runtime
      role: product
      runtime_family: process
      root_entrypoint: tests/oracle.mjs
  source_paths: [source.md]
  context_refs: [project_context/areas/main.md]
source_claims:
  - key: packaged-verifier
    source_ref: source.md
    statement: Use the packaged verifier.
    disposition:
      type: claim
      refs: [installed.obligation.packaged-verifier]
stages:
  - key: delivery
    title: Delivery
    depends_on: []
    gate_outcome: installed
risk:
  facts: {}
global: {}
outcomes:
  - key: installed
    title: Installed workflow runs
    stage: delivery
    product:
      observable_result: Installed CLI verifies current behavior.
      success_path_required: true
      degradation_path_required: false
      owner:
        label: fixture
        context_refs: [project_context/areas/main.md]
        path_globs: [src/**]
    technical:
      obligations:
        - key: packaged-verifier
          statement: Use the packaged verifier.
          required_proof_surfaces: [runtime_behavior]
      expected_change_paths: [src/**]
      bindings:
        - key: state
          kind: file
          target: src/state.json
          carrier_paths: [src/state.json]
          existence: existing
    acceptance:
      checks:
        - key: installed-check
          journey_roles: [success, stage_gate]
          execution_target: {target_ref: installed-runtime, entrypoint: root}
          scenario:
            given: [{key: state-ready, statement: The fixture state exists.}]
            when: [{key: inspect-installed, statement: Inspect it with the installed verifier.}]
          proof_surface: runtime_behavior
          runner:
            type: node_oracle
            target: tests/oracle.mjs
            effect: read_only
          verification_inputs: [tests/oracle.mjs]
          input_paths: [src/state.json]
          positive_assertions:
            - key: installed-ready
              criterion: The installed packaged verifier reports the fixture ready.
              claims: [result, obligation.packaged-verifier]
              observation: ready
              evidence_capabilities: [state_delta, target_runtime]
              operator: equals
              expected: true
      counterfactual_controls:
        - key: remove-state
          binding_key: state
          claims: [result, obligation.packaged-verifier]
          check_key: installed-check
          mutation:
            type: remove_paths
            paths: [src/state.json]
          expected_assertion_failures: [installed-ready]
`,
  );
  return workdir;
}
