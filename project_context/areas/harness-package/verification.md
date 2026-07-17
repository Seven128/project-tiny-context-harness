---
context_role: verification
read_policy: default
---
# Harness Package Verification

## Developer Feedback Tiers

Use the cheapest reliable feedback loop for the current change, then widen before release. These commands optimize development feedback only; they do not replace complete CI/release gates, the project tests declared by a Delivery Contract, or the Long-Task Final Gate.

- `npm run test:affected:list`: inspect the deterministic plan without building or running tests.
- `npm run test:affected`: discover changed paths, build at most once when required, and run mapped focused tests. Known Long-Task hot spots select named regressions; unmapped Long-Task runtime changes fail safe to the complete Long-Task suite; shared package/dependency or unknown changes fail safe to the full suite.
- `npm run test:long-task:focused`: one-build focused Long-Task regression loop for Context evolution, authority/progress, design boundaries and workflow entry points.
- `npm run test:delivery-contract:focused`: one-build focused Contract authoring/compiler/coverage/risk loop.
- `npm run test:affected -- --no-build`: reuse an already current `dist` build. This is valid only when the caller has already built the same source snapshot.

Affected and focused results are non-authoritative developer feedback. Before release or any claim that the package is fully validated, run the complete package, source-parity, smoke, pack and release gates below.

## Focused Gates

- `npm run format:check`: TypeScript formatting.
- `npm run typecheck --workspace project-tiny-context-harness`: type safety after schema/state/CLI/profile changes.
- `npm run build --workspace project-tiny-context-harness`: compiled package and CLI.
- `npm run test:delivery-contract --workspace project-tiny-context-harness`: Compact equivalence, executable init/README/release examples, strict parser, mandatory Source marker inventory/set/text plus Risk metadata and Non-completing target continuity, Outcome and `GLOBAL.<check>.<assertion>` Source-backed Acceptance, Claim-safe operators, non-empty unique all-of surfaces, shared activation validation, Global/Outcome planned Counterfactuals, standard/weak Playwright trust, risk and revision tests. Small-fixture Preflight and Compile targets are each under two seconds.
- `npm run test:long-task-workflow --workspace project-tiny-context-harness`: read-only Preflight state-diff, declared-only single-AC-per-Test multi-project Playwright evidence, passed-Check-only proof, enriched Source/target/Claim Finding/Explain, mutation smoke, targeted verify/status/resume/final/Stop/profile/consumer workflow tests. Focused loop target is under five minutes; complete workflow suite under fifteen minutes.
- `node --test --test-concurrency=1 tests/ty-context/long-task-context-evolution.test.mjs tests/ty-context/long-task-efficiency-design.test.mjs tests/ty-context/affected-test-selection.test.mjs`: execution-time Context classification/revision, no model-switch/subagent scheduler boundary and fail-safe affected-test planning.
- `node --test --test-concurrency=1 tests/ty-context/long-task-design-context.test.mjs tests/ty-context/source-plan-authoring-skill.test.mjs tests/ty-context/workflow-contract-routing.test.mjs tests/ty-context/long-task-profile-hook.test.mjs`: controlling objective, Draft/Outcome/Source boundary, explicit Source Plan content/parity, profile install/remove and one-Contract/Final-Gate coverage.
- `tests/ty-context/long-task-qualified-completion.test.mjs`: real temporary-Git coverage for fresh/stale `final_workflow_status`, complete declared confirmations, stop-check/close CAS clear, ordinary machine acceptance and fail-closed unsuccessful Gates; the Hook suite separately proves non-blocking `systemMessage` propagation.
- `npm run test:long-task-performance --workspace project-tiny-context-harness`: independent 10k tracked/100 untracked Git matrix with Preflight/compile/status/resume/Snapshot/Final Gate/Stop budgets plus separately timed Global Counterfactual and planned-Binding Final Gate fixtures. Counterfactual sandboxes copy only declared runner/input/carrier/artifact/environment surfaces so added sensitivity does not recopy an unrelated large repository.
- Long-task tests explicitly cover first-compile Authority Lock, Preflight non-mutation/no-lock/no-runner behavior and direct-Compile parity; mandatory Source marker inventory and canonical target continuity; Source/Controlling-Context/Product/Technical/Acceptance/Risk/verifier revision identity; Supporting Context auto-revision with scoped Progress retention; adapter-bound Raw Execution and cross-Check Observation ownership; Claim-safe operators, non-empty unique all-of surfaces, same-Check structured sensitivity, single-AC-per-Test canonical multi-project Playwright, Binding/value-only Counterfactuals and passed-only Claim/Population proof; scoped progress plus Verify/Final races, unified lock/CAS clear, corrupt-state force abandon, old V2 manual-required behavior and verifier relocation/content migration.

## Full Gates

- `npm test`: complete default plus Long-Task Workflow package suite; no real Codex, AppServer, external service, VM, browser matrix or worktree farm.
- `npm run smoke:quickstart`: clean temporary consumer init/enable/sync/upgrade behavior.
- `npm run preview:pack`: clean pack preview and content assertions.
- `npm run launch:check`: offline launch-surface consistency.
- `node packages/ty-context/dist/cli.js package sync-source` twice, then `package check-source`: idempotent managed-source/package parity.
- `make validate-harness`: Context recoverability plus touched-source modularity.
- `git diff --check`: whitespace/conflict-marker gate.

## Controlled Real CLI Smoke

A real temporary Git repository must prove:

1. initialize and compile one two-Outcome Delivery Contract;
2. first Outcome targeted verify passes and second fails;
3. two self-consistent forged Receipts and a recomputed cache cannot accept; Stop executes both Checks and rejects;
4. after implementation repair, both targeted verify and one-snapshot Final Gate pass;
5. source code drift makes Stop reject;
6. restoring/committing code lets Stop or close run the Live Gate and clear binding;
7. a graph-derived Supporting Context edit can revise without user approval and preserve unrelated fresh Progress, while a Controlling Context edit remains approval-bound;
8. no campaign/SFC/Packet/Codex worker/extra worktree/branch/model retry, model-switch checkpoint or proactive parallel-subagent scheduler was created.

## Required Coverage

- Schema/preflight: V2 only, V1 retirement, Compact defaults, mandatory marked Source inventory with set equality, exact one-ref mapping, same-kind/text canonical targets and unique Source ownership, typed Control and other dispositions, retired `out_of_scope`, generated atomic Claims, Source-backed non-Result Acceptance continuity, Claim-safe operators, non-empty unique all-of surfaces, adapter matrix, cross-Raw-Execution Observation ownership and direct Compile parity.
- Risk: standard baseline; exact Source marker Fact/Outcome equality and pair uniqueness; security/permission/migration/persistent/public-schema/full-population triggers; explicit strict upgrade; below-floor rejection; trigger-specific strict proof; actual path/boundary escalation; ambiguous pairs block as `decision_required`.
- Verification: two-Outcome success/failure, targeted non-acceptance, raw-command/per-Check evidence split, Counterfactual failure projection into Outcome/Global Progress, declared-only single-AC-per-Test multi-project Playwright pass/missing/duplicate/skipped/flaky/unexpected/timeout/interruption handling, exact exit-one Counterfactual accounting, frozen standard Playwright trust and weak-UI constant/sensitive controls, review-only artifact hashes, same-Check Outcome/Global structured sensitivity, existing/planned Binding lifecycle, entity Population and passed-Check-only proof.
- Context evolution: re-evaluate `Context Delta` during implementation; core/explicit/verification/deployment/full-snapshot files remain Controlling Context; only graph-derived non-explicit `implementation-index` and `archive` files are Supporting Context; supporting-only `compile --revise` requires no user approval and does not invalidate otherwise fresh targeted Progress; Final Gate binds the complete current Context snapshot.
- Recovery/authority: audit-only status/Receipt/cache, source-recompiled Stop/close, malformed/mismatched active state fail-closed, atomic binding clear, read-only resume and no process/branch/worktree mutation.
- Qualified completion: Final Gate/status/resume/stop-check/Stop Hook/close preserve `machine_accepted_external_pending` and every declared confirmation; stale Receipt projection becomes `null`; ordinary machine acceptance has no warning; failed Gate or CAS never reports success or clears the binding; `closed` is not external completion and no confirmation state is created.
- Platform boundary: host and user own model selection; a healthy Goal is not paused solely for a model downgrade; platform-internal delegation is opaque and non-authoritative; fake executable observation proves no Codex/AppServer/agent/worktree/branch/merge/push/PR/model retry or proactive subagent scheduler and Final Gate invokes only declared checks.
- Distribution: enable/disable, safe profile migration, historical-file preservation, no retired runtime in new consumer/tarball, source mappings, English/Chinese/package README alignment, version parity and Windows paths.
- Source Plan authoring: direct/derived/decision-required boundaries, stable semantic keys/anchors, nine independent decided CTRL fields, NCOMP, exact equality with all ten Runtime Risk Fact names including split critical/weak facts and retained multi-repository fact, exact Affected Outcome/Basis/Consequence, one Given/When/Then AC linked to REQ/CTRL/OBL/NCOMP, semantic Outcome splitting, OBL/HINT separation, non-authoritative Markdown output, no Material Source markers, no platform-specific instructions and no Source Plan runtime/validator/authority mechanism.
- Release proof: the local built CLI executes the reusable tarball fixture through Preflight/Compile/Final Gate; full packed-tarball smoke uses the same marked Source/Binding/Counterfactual contract and is required before both Trusted Publish and emergency fallback. Regex tests cover command ordering only.
- Long-Task design consistency: the controlling false-completion objective and two trusted machine-result classes agree across specification and Context; efficiency remains subordinate to that objective; Draft Outcome remains the authoring-time lifecycle of an Outcome rather than a schema/runtime/Worker/scheduler entity; Outcome decomposition covers rolling implementation, targeted verification, failure localization, recovery and stale invalidation without weakening one Contract or one Final Gate; `depends_on` remains acceptance readiness and the Rolling Frontier remains temporary.
- Authoring boundary consistency: optional Source Plan guidance and ordinary prose are both valid Source; meaning-preserving decomposition and evidence-backed repository binding remain distinct from `decision_required`; Contract Draft authoring belongs to `long-task-workflow`; no standalone Contract Draft Skill, Draft Receipt, Authoring State, `draft_outcomes` or `plan_items` mechanism exists.
- Distribution consistency: the `long-task` profile still installs and removes both Skills plus its Hook; managed source, generated source-workspace copy and package asset remain exact; package-managed Source Plan guidance is platform-neutral; the Long-Task decision-rationale Context is registered on-demand.

## Evidence Rules

- Tests/Context validators prove only their named property. They do not prove product completeness.
- Affected/focused developer loops are selection aids only and do not replace complete CI/release gates.
- Targeted verify is repair evidence only. Acceptance comes only from the currently executing source-recompiled Live Final Gate; no stored result is reusable authority.
- Preflight proves only static authoring readiness and is intentionally non-authoritative; a successful Preflight creates no reusable receipt or completion evidence.
- Store no one-off logs, reports, raw evidence, secrets or release ledgers in Context.
