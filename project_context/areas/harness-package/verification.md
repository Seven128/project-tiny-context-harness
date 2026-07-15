---
context_role: verification
read_policy: default
---
# Harness Package Verification

## Verification Paths

- `npm run build --workspace project-tiny-context-harness`
  - Run after package TypeScript, CLI, profile, validator, Long-Task Workflow or release changes.
  - Expected signal: the package compiles on the Node 24 support line.
- `npm run typecheck --workspace project-tiny-context-harness`
  - Run with the build after TypeScript contract or state changes.
  - Expected signal: type checking exits without diagnostics.
- `node packages/ty-context/dist/cli.js validate-context`
  - Run after Context graph/schema, role Context, path safety or recoverability changes.
  - Expected signal: formal TOML/schema/path/front-matter/recoverability checks complete and warnings do not become fake product proof.
- `make validate-harness`
  - Combined source-workspace gate for Context recoverability and multi-dimensional touched-source modularity.
  - Expected signal: both gates exit successfully; every waiver is lifecycle-complete.
- `node --test tests/ty-context/default-workflow-contract.test.mjs tests/ty-context/orientation-fast-path.test.mjs`
  - Run after routing, AGENTS, Context Delta, internal planning, existing-`plan.md` authority or default artifact behavior changes.
  - Expected signal: default work requires no plan file/artifacts, explicit Skills alone activate long-task state, and Context-first behavior remains prompt-level.
- `node --test tests/ty-context/normal-long-task-skill.test.mjs`
  - Run after ordinary long-task behavior changes.
  - Expected signal: output is source, one full checklist and optional prompt; Local Audit is opt-in; no matrix, verdict, second plan or separate test-requirements file is generated.
- `node --test tests/ty-context/composite-long-task-lightweight-black-box.test.mjs`
  - Focused Contract V3 black box using temporary real projects and built CLI/Hook.
  - Expected signal: compile/free implementation/optional targeted repair/full final-gate/Stop freshness semantics hold; targeted verify never emits acceptance and full final gate cannot omit an in-scope AC.
- `node --test --test-concurrency=1 tests/ty-context/codex-exec-client-v1.smoke.test.mjs tests/ty-context/composite-campaign-worktree-budget-v6.smoke.test.mjs tests/ty-context/composite-campaign-worktree-reconcile-v6.smoke.test.mjs tests/ty-context/composite-campaign-integration-head-v6.test.mjs tests/ty-context/composite-campaign-interrupt-v6.test.mjs tests/ty-context/composite-campaign-abandon-v6.smoke.test.mjs tests/ty-context/composite-campaign-exec-routing-v6.test.mjs tests/ty-context/composite-campaign-cli-v6-dry-run.test.mjs tests/ty-context/prepare-composite-long-task-skill.test.mjs`
  - Focused Campaign V6 infrastructure path using an ordinary fake child executable and temporary real Git repositories; it never starts AppServer or a real Codex Campaign.
  - Expected signal: pure worktree inspection/budget enforcement, explicit orphan reconcile, committed-head recovery, persisted Integration-head authority, monotonic Wave recovery, interrupt/process-identity-safe tree termination, explicit abandon preservation/isolation, xhigh/max/ultra routing with alias/minimum-effort enforcement, and non-mutating CLI dry-run all pass.
- `npm run test:long-task-workflow --workspace project-tiny-context-harness`
  - Complete Long-Task Workflow mechanism profile. It runs only when explicitly invoked locally or by package PR/main/publish GitHub CI.
  - Expected signal: Source Coverage/Context baseline, referenced/full snapshot, durable-stage recovery, non-invasive Git, bounded Exec lifecycle, impact analysis and final Spec deduplication cases exit without failures.
- `npm test --workspace project-tiny-context-harness`
  - Complete package suite for main/full local validation.
  - Budget: the full default package/Long-Task Workflow path stays within 15 minutes and does not call real Codex Campaign workers or require privileged/cross-platform infrastructure.
- `node tools/quickstart_smoke.mjs` and `npm run preview:pack`
  - Main/release-facing smoke for portable default installation and packaged contents.
  - Expected signal: non-Codex default init omits Codex Hooks/Long-Task Workflow assets; explicit enable installs them; pack preview contains profile assets and no drift.
- `node tools/release_tarball_smoke.mjs --tarball <path>`
  - Publish gate against the exact packed artifact in an empty temporary repository.
  - Expected stages: install tarball, `ty-context init`, `doctor`, `validate-context`, explicit Long-Task Workflow enable and minimal Contract V3 black box.
- `node tools/verify_prepared_release_artifact.mjs --version <version> --tarball <path>`
  - Verifies Release Artifact V2 before smoke/publication.
  - Expected identity: exact tarball SHA-256, current Node version, pinned npm version and current `package-lock.json` SHA-256 all match the preparation record.
- `node packages/ty-context/dist/cli.js package sync-source` twice, then `node packages/ty-context/dist/cli.js package check-source`
  - Run after managed guidance, templates, profile metadata, default Skills, Hooks, workflows or public README sources change.
  - Expected signal: second sync is a no-op and check-source finds no source/package drift.
- `git diff --check`
  - Final whitespace/conflict-marker check.

## CI Ownership

- Submitted branches, pull requests and main run typecheck, the complete default suite, complete Long-Task Workflow suite, source drift, `validate-harness` and Quickstart Smoke.
- Package CI builds the package before any main-job command invokes `packages/ty-context/dist/cli.js`; a clean Linux checkout must not rely on locally generated `dist` output.
- Main additionally runs Pack Preview.
- Direct `npm test` and the dedicated workflow npm command run Long-Task Workflow self-tests. Release preparation, local fallback publication, Hooks and consumer Harness gates use default-only paths; local fallback tarball smoke uses `--portable-only`.
- Trusted Publish CI runs the complete default and Long-Task Workflow suites, packs once, records/verifies Release Artifact V2, installs that exact tarball in an empty repository and runs init/doctor/Context/minimal Contract V3 smoke before publishing the same path. The single-artifact parser accepts npm 11's array result and npm 12's workspace-keyed result but rejects zero or multiple packed artifacts. Dry runs may create only an ephemeral V2 identity for the just-packed bytes; a real publish still requires the matching committed versioned V2 authority.
- Consumer Harness CI runs only portable project gates. It never runs this package repository's full Campaign self-tests.
- Real Codex Campaign execution remains explicit manual development evidence and is not a CI/publication gate.

## Scope Notes

- Context and Harness validators prove recoverability, safe topology, generated-asset consistency or maintainability signals; they do not prove product behavior.
- Slice Final, Wave Integration and Campaign Final gates remain separate acceptance boundaries.
- Targeted verify is repair evidence only. Final acceptance always comes from full current-snapshot recomputation.
- Exact verified commit/tree identity may reuse the already-current Campaign Final Result during Target convergence; any different Target tree requires a complete Target Snapshot Gate. Immediately before the accepted transaction, the authoritative Target commit and tree must still match the Receipt; a stale Receipt returns to Target Finalization and cannot write accepted artifacts. Only `target_snapshot_revalidated` authority references its verified revalidation result; exact and fast-forward bases never reference diagnostic revalidation. Accepted authority is then frozen transactionally before optional cleanup and is not revoked by later Target movement.
- Every Long-Task Workflow test names the false-completion, scope-escape, recovery, Git-intrusion or duplicated-execution risk it closes.
- Do not store one-off results, raw logs, artifacts, release ledgers or secrets in Verification Context.
