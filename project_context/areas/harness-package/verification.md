---
context_role: verification
read_policy: default
---
# Harness Package Verification

## Verification Paths

- `npm run build --workspace project-tiny-context-harness`
  - Run after package TypeScript, CLI, profile, validator, Composite or release changes.
  - Expected signal: the package compiles on the Node 24 support line.
- `npm run typecheck --workspace project-tiny-context-harness`
  - Run with the build after TypeScript contract or state changes.
  - Expected signal: type checking exits without diagnostics.
- `node packages/ty-context/dist/cli.js validate-context`
  - Run after Context graph/schema, role Context, path safety or recoverability changes.
  - Expected signal: formal TOML/schema/path/front-matter/recoverability checks complete and warnings do not become fake product proof.
- `make validate-harness`
  - Composite source-workspace gate for Context recoverability and multi-dimensional touched-source modularity.
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
- `node --test tests/ty-context/composite-campaign-v5-app-server-black-box.test.mjs`
  - Focused real-Git/Fake-App-Server Campaign path for explicit maintainer diagnosis and part of the complete Composite CI suite.
  - Expected signal: Source Context resolution, maximal Scope Fit, Packet/preflight-before-Goal, versioned routing, settled sibling reconciliation, Change Envelope, Slice/Wave/shared-snapshot Campaign gates and owned-worktree target handling complete without real Codex services.
- `npm run test:composite-workflow --workspace project-tiny-context-harness`
  - Complete Composite mechanism profile for PR/main/publish CI and explicit local validation.
  - Expected signal: Source Coverage/Context baseline, referenced/full snapshot, transaction recovery/quarantine, non-invasive Git, App Server lifecycle, impact analysis and final Spec deduplication cases exit without failures.
- `npm test --workspace project-tiny-context-harness`
  - Complete package suite for main/full local validation.
  - Budget: the full default package/Composite path stays within 15 minutes and does not call real Goals or require privileged/cross-platform infrastructure.
- `node tools/quickstart_smoke.mjs` and `npm run preview:pack`
  - Main/release-facing smoke for portable default installation and packaged contents.
  - Expected signal: non-Codex default init omits Codex Hooks/Composite assets; explicit enable installs them; pack preview contains profile assets and no drift.
- `node tools/release_tarball_smoke.mjs --tarball <path>`
  - Publish gate against the exact packed artifact in an empty temporary repository.
  - Expected stages: install tarball, `ty-context init`, `doctor`, `validate-context`, explicit Composite enable and minimal Contract V3 black box.
- `node tools/verify_prepared_release_artifact.mjs --version <version> --tarball <path>`
  - Verifies Release Artifact V2 before smoke/publication.
  - Expected identity: exact tarball SHA-256, current Node version, pinned npm version and current `package-lock.json` SHA-256 all match the preparation record.
- `node packages/ty-context/dist/cli.js package sync-source` twice, then `node packages/ty-context/dist/cli.js package check-source`
  - Run after managed guidance, templates, profile metadata, default Skills, Hooks, workflows or public README sources change.
  - Expected signal: second sync is a no-op and check-source finds no source/package drift.
- `git diff --check`
  - Final whitespace/conflict-marker check.

## CI Ownership

- Submitted branches, pull requests and main run typecheck, the complete default suite, complete Composite suite, source drift, `validate-harness` and Quickstart Smoke.
- Main additionally runs Pack Preview.
- Local default `npm test` excludes Composite self-tests; the complete profile also remains available through its explicit npm command.
- Publish runs the complete default and Composite suites, packs once, records/verifies Release Artifact V2, installs that exact tarball in an empty repository and runs init/doctor/Context/minimal Contract V3 smoke before publishing the same path.
- Consumer Harness CI runs only portable project gates. It never runs this package repository's full Campaign self-tests.
- Real App Server one-SFC smoke remains manual development evidence and is not a CI/publication gate.

## Scope Notes

- Context and Harness validators prove recoverability, safe topology, generated-asset consistency or maintainability signals; they do not prove product behavior.
- Slice Final, Wave Integration and Campaign Final gates remain separate acceptance boundaries.
- Targeted verify is repair evidence only. Final acceptance always comes from full current-snapshot recomputation.
- Every default Composite test names the false-completion, scope-escape, recovery, Git-intrusion or duplicated-execution risk it closes.
- Do not store one-off results, raw logs, artifacts, release ledgers or secrets in Verification Context.
