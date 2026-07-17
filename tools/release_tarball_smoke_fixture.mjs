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
console.log(JSON.stringify({schema_version:"long-task-check-result-v2",execution_status:"completed",observations:{ready:state.ready}}));
`,
  );
  await writeFile(
    path.join(workdir, "delivery-contract.yaml"),
    `schema_version: long-task-delivery-v2
task:
  id: tarball-smoke
  title: Tarball smoke
  goal: Prove the installed long-task workflow.
  source_paths: [source.md]
  context_refs: [project_context/areas/main.md]
source_claims:
  - key: packaged-verifier
    source_ref: source.md
    statement: Use the packaged verifier.
    disposition:
      type: claim
      refs: [installed.obligation.packaged-verifier]
risk:
  facts: {}
global: {}
outcomes:
  - key: installed
    title: Installed workflow runs
    product:
      observable_result: Installed CLI verifies current behavior.
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
