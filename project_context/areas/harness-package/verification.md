---
context_role: verification
read_policy: on-demand
---
# Harness Package Verification

## Developer Feedback Tiers

Use the cheapest reliable feedback loop for the current change, then widen before release. These commands optimize development feedback only; they do not replace complete CI/release gates, the project tests declared by a Delivery Contract, or the Long-Task Final Gate.

- `npm run test:affected:list`: inspect the deterministic plan without building or running tests.
- `npm run test:affected`: discover changed paths, build at most once when required, and run mapped focused tests. Known Long-Task hot spots select named regressions; unmapped Long-Task runtime changes fail safe to the Trust Boundary Gate; shared fixtures, package/dependency or unknown changes fail safe to complete suites.
- `npm run test:long-task:focused`: one-build focused Long-Task regression loop for Context evolution, authority/progress, design boundaries and workflow entry points.
- `npm run test:delivery-contract:focused`: one-build focused Contract authoring/compiler/coverage/risk loop.
- `npm run test:affected -- --no-build`: reuse an already current `dist` build. This is valid only when the caller has already built the same source snapshot.
- Package CI runs a lightweight `windows-latest` real-subprocess probe for the affected-test npm launcher; Windows must route npm through `ComSpec` rather than spawning `npm.cmd` directly.

Affected and focused results are non-authoritative developer feedback. Before release or any claim that the package is fully validated, run the complete package, source-parity, smoke, pack and release gates below.

## Suite Purpose And ROI Design Index

Package verification has three executable tiers with distinct purposes:

- affected and focused commands are non-authoritative task-local defect localization;
- `npm run test:long-task:trust` is the bounded Long-Task Trust Boundary Gate for high-impact false-completion and cross-module regressions after the candidate diff is frozen;
- `npm test` is the complete default plus Long-Task release regression for one final candidate.

`affected-test-plan-v2` reports `developer-feedback`, `trust-boundary` or `release-regression` plus its discovery source and reason. Stable discovery sources include `explicit-paths`, `local-worktree`, `local-head-parent`, explicit/environment bases and CI base SHA/ref forms. Explicit paths bypass inference; dirty local discovery uses only the current worktree; clean local discovery uses `HEAD^`; explicit/CI bases are exact and fail closed when missing. An unmapped Long-Task runtime change widens to the Trust Boundary Gate while retaining affected tests not already contained by that gate; shared fixtures, package/dependency boundaries and unknown changes continue to widen to complete suites.

Pull-request Package CI builds once and runs the complete default suite plus the Trust Boundary Gate through package `test:trust:built`. `main` and release preparation retain `npm test`. Trusted Publishing runs that complete gate exactly once in its prepare job, then the protected publish job reuses the same uploaded tarball and runtime attestation without rebuilding, retesting or repacking. Every package-suite runner emits ephemeral `test-suite-timing-v1` diagnostics; timing output is never Context, workflow state or acceptance authority.

The complete suite is not an edit/fix loop. Run it zero times during ordinary repair, once after diff freeze when routing or release requires it, and once more only after an aggregate failure has been classified and repaired as a batch. A third run requires an explicit flaky, infrastructure or late release-mutation reason.

`dry_run: true` is an optional prepare-only diagnostic, not a mandatory rehearsal before a real publish. A real workflow dispatch prepares, tests, packs and smokes once; after the `npm-publish` environment approval, publication verifies the same workflow artifact against the dispatch commit, stable lockfile identity and tarball SHA-256. Node/npm versions are recorded as build provenance but the publisher job need not reproduce them because it never rebuilds. Lockfile identity normalizes CRLF/LF only; semantic or other byte changes still fail closed.

Sub-second status/resume budgets belong only to `test:long-task-performance`. Functional release-regression tests assert behavior without machine-load-sensitive wall-clock thresholds.

The implementation, migration status, measurement rules and stable retrieval keys are indexed in `docs/test-suite-roi-redesign.md` under `TS-PURPOSE`, `TS-BASELINE`, `TS-TIER-DEV`, `TS-TIER-TRUST`, `TS-TIER-RELEASE`, `TS-ROUTING`, `TS-RERUN`, `TS-RELEASE-HANDOFF`, `TS-OPTIMIZE`, `TS-MIGRATION`, `TS-METRICS`, `TS-AC` and `TS-NONGOALS`.

## Focused Gates

- `npm run format:check`: TypeScript formatting.
- `npm run typecheck --workspace project-tiny-context-harness`: type safety after schema/state/CLI/profile changes.
- `npm run build --workspace project-tiny-context-harness`: compiled package and CLI.
- `npm run test:delivery-contract --workspace project-tiny-context-harness`: Compact equivalence, executable init/README/release examples, strict parser, mandatory Source marker inventory/set/text plus Risk metadata and Non-completing target continuity, Outcome and `GLOBAL.<check>.<assertion>` Source-backed Acceptance, Claim-safe operators, non-empty unique all-of surfaces, shared activation validation, Global/Outcome planned Counterfactuals, standard/weak Playwright trust, risk and revision tests. Small-fixture Preflight and Compile targets are each under two seconds.
- `npm run test:long-task-workflow --workspace project-tiny-context-harness`: read-only Preflight state-diff, declared-only single-AC-per-Test multi-project Playwright evidence, passed-Check-only proof, enriched Source/target/Claim Finding/Explain, mutation smoke, targeted verify/status/resume/final/Stop/profile/consumer workflow tests and the first-Compile execution-model checkpoint. Focused loop target is under five minutes; complete workflow suite under fifteen minutes.
- `npm run test:long-task-trust --workspace project-tiny-context-harness`: one-build canonical authority continuity/CAS, forged evidence, Authority Revision, Context freshness, Final Gate/Stop/close mutation, Hook/profile, qualification and controlled black-box boundary gate. Target p95 is under eight minutes; it is regression evidence only.
- `node --test --test-concurrency=1 tests/ty-context/long-task-context-evolution.test.mjs tests/ty-context/long-task-efficiency-design.test.mjs tests/ty-context/long-task-model-choice-checkpoint.test.mjs tests/ty-context/affected-test-selection.test.mjs`: execution-time Context classification/revision, one-time model choice/no persistent routing state, no subagent scheduler boundary and fail-safe affected-test planning.
- `node --test --test-concurrency=1 tests/ty-context/long-task-design-context.test.mjs tests/ty-context/source-plan-authoring-skill.test.mjs tests/ty-context/workflow-contract-routing.test.mjs tests/ty-context/long-task-profile-hook.test.mjs`: controlling objective, Draft/Outcome/Source boundary, bounded Context discovery, explicit Source Plan content/parity, profile install/remove and one-Contract/Final-Gate coverage.
- `node --test --test-concurrency=1 tests/ty-context/visual-delivery-guidance.test.mjs tests/ty-context/affected-test-selection.test.mjs`: visual coverage/source/production-render guidance, Long-Task visual authoring/evidence boundaries, managed/generated/package parity and guidance-aware focused-test selection.
- `tests/ty-context/long-task-qualified-completion.test.mjs`: real temporary-Git coverage for fresh/stale `final_workflow_status`, complete declared confirmations, declared-machine acceptance scope, native-Goal no-effect, stop-check/close CAS clear and fail-closed unsuccessful Gates; the Hook suite separately proves the non-blocking terminal-scope `systemMessage` for both accepted statuses.
- `npm run test:long-task-performance --workspace project-tiny-context-harness`: independent 10k tracked/100 untracked Git matrix with Preflight/compile/status/resume/Snapshot/Final Gate/Stop budgets plus separately timed Global Counterfactual and planned-Binding Final Gate fixtures. Counterfactual sandboxes copy only declared runner/input/carrier/artifact/environment surfaces so added sensitivity does not recopy an unrelated large repository.
- Long-task tests explicitly cover first-compile Authority Lock and one-time execution-model checkpoint, Preflight non-mutation/no-lock/no-runner behavior and direct-Compile parity; mandatory Source marker inventory and canonical target continuity; Source/Controlling-Context/Product/Technical/Acceptance/Risk/verifier revision identity; Supporting Context auto-revision with scoped Progress retention; adapter-bound Raw Execution and cross-Check Observation ownership; Claim-safe operators, non-empty unique all-of surfaces, same-Check structured sensitivity, single-AC-per-Test canonical multi-project Playwright, Binding/value-only Counterfactuals and passed-only Claim/Population proof; scoped progress plus Verify/Final races, unified lock/CAS clear, corrupt-state force abandon, old V2 manual-required behavior and verifier relocation/content migration.

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
2. first Compile emits the one-time execution-model checkpoint and an unchanged later Compile does not repeat it;
3. first Outcome targeted verify passes and second fails;
4. two self-consistent forged Receipts and a recomputed cache cannot accept; Stop executes both Checks and rejects;
5. after implementation repair, both targeted verify and one-snapshot Final Gate pass;
6. source code drift makes Stop reject;
7. restoring/committing code lets Stop or close run the Live Gate and clear binding;
8. a graph-derived Supporting Context edit can revise without user approval and preserve unrelated fresh Progress, while a Controlling Context edit remains approval-bound;
9. no Campaign/SFC/Packet/Codex worker/extra worktree/branch/model retry, automatic model switch, persistent model route/checkpoint state or proactive parallel-subagent scheduler was created.

## Required Coverage

- Default Context discovery: core/default/manifest routing plus one bounded text search over `project_context/**` before `Context Delta`; high-signal task terms supplement rather than replace semantic judgment; no vector/persistent index, cache, registry or search state.
- Schema/preflight: V2 only, V1 retirement, Compact defaults, mandatory marked Source inventory with set equality, exact one-ref mapping, same-kind/text canonical targets and unique Source ownership, typed Control and other dispositions, retired `out_of_scope`, generated atomic Claims, Source-backed non-Result Acceptance continuity, Claim-safe operators, non-empty unique all-of surfaces, adapter matrix, cross-Raw-Execution Observation ownership and direct Compile parity.
- Risk: standard baseline; exact Source marker Fact/Outcome equality and pair uniqueness; security/permission/migration/persistent/public-schema/full-population triggers; explicit strict upgrade; below-floor rejection; trigger-specific strict proof; actual path/boundary escalation; ambiguous pairs block as `decision_required`.
- Verification: two-Outcome success/failure, targeted non-acceptance, raw-command/per-Check evidence split, Counterfactual failure projection into Outcome/Global Progress, declared-only single-AC-per-Test multi-project Playwright handling, exact exit-one Counterfactual accounting, frozen standard Playwright trust and weak-UI sensitivity, existing/planned Binding lifecycle, entity Population and passed-Check-only proof.
- Target-runtime guidance: a Claim that can diverge from a proxy requires a current-execution target Check in the earliest owning Outcome; tracked reports/artifacts cannot be sole runtime proof; declared inputs drive stale Progress and coalesced rolling reruns; Final Gate reruns the live Check; no platform-impact Schema, per-edit rebuild mandate or extra completion state is added.
- Revision evidence guidance: a blocker never silently reclassifies machine scope; protected revision returns to rolling implementation; affected weak-observability/high-risk behavioral Claims review the furthest independently failing boundary and prefer causal capability Counterfactuals when file presence can diverge, without a universal runtime suite or new state.
- Context evolution: re-evaluate `Context Delta` during implementation; core/explicit/verification/deployment/full-snapshot files remain Controlling Context; only graph-derived non-explicit `implementation-index` and `archive` files are Supporting Context; supporting-only `compile --revise` requires no user approval and does not invalidate otherwise fresh targeted Progress; Final Gate binds the complete current Context snapshot.
- Recovery/authority: audit-only status/Receipt/cache, source-recompiled Stop/close, malformed/mismatched active state fail-closed, atomic binding clear, read-only resume and no process/branch/worktree mutation. Revision coverage proves monotonic evidence additions auto-adopt, scope-only candidates run only existing active Check identities with unchanged runner/verifier authority and no pending/approval/authority/cache/Progress/Receipt mutation, protected candidates do not run, compile emits one deterministic hash-bound approval summary with exact material change keys, status/resume project that same pending decision, changed candidates invalidate old approval, adoption reports no delivery completion and returns to rolling execution, derived evidence is invalidated and Final Gate still reruns everything.
- Model choice boundary: only first Authority Lock emits `required: true`; later Compile returns `false`; prior explicit user choice may satisfy; Harness does not automatically switch models, persist acknowledgement/model-route state or repeat the checkpoint.
- Qualified completion: Final Gate/status/resume/stop-check/Stop Hook/close preserve `machine_accepted_external_pending` and every declared confirmation; accepted CLI/Hook output identifies declared machine Authority and no native-Goal effect; stale Receipt projection becomes `null`; failed Gate or CAS never reports success or clears the binding; `closed` is neither native-Goal nor external completion and no completion/confirmation state is created.
- Platform boundary: host and user own model selection; outside the one first-lock checkpoint a healthy Goal is not paused solely for model downgrade; platform-internal delegation is opaque and non-authoritative; fake executable observation proves no Codex/AppServer/agent/worktree/branch/merge/push/PR/model retry or proactive subagent scheduler and Final Gate invokes only declared checks.
- Distribution: enable/disable, safe profile migration, historical-file preservation, no retired runtime in new consumer/tarball, source mappings, English/Chinese/package README alignment, version parity and Windows paths.
- Source Plan authoring: refinement/synthesis/hybrid mixed-input intake, complete artifact coverage, reference-versus-exact interpretation, direct/derived/delegated/decision-required boundaries, preference-before-research handling for materially choice-sensitive product/technical/provider selections, no mandatory questionnaire or repeated question for known preferences, current authoritative external evidence after the preference envelope is clear, default delegation of the resulting defensible recommendation, explicit Source provenance, separation of plan meaning from high-risk external-action authorization, `DEC` only for conflicts/user-reserved/missing-material-preference/no-defensible-recommendation cases, surface/region/control/state/feedback UI coverage, stable semantic keys/anchors, independent decided CTRL fields, NCOMP, exact Runtime Risk Fact names, one Given/When/Then AC linked to REQ/CTRL/OBL/NCOMP, semantic Outcome splitting, OBL/HINT separation, Contract-authoring readiness, non-authoritative Markdown output and no Source Plan runtime/validator/authority mechanism.
- Release proof: the local built CLI executes the reusable tarball fixture through Preflight/Compile/Final Gate; full packed-tarball smoke uses the same marked Source/Binding/Counterfactual contract and is required before publish. Regex tests cover command ordering only.
- Publication continuity: the workflow prepare job runs the complete suite and exact-tarball smoke before upload; the protected publish job accepts only that same-run, same-commit, hash-matching artifact and performs no second build, test, pack or smoke.
- Long-Task design consistency: the controlling false-completion objective and two trusted machine-result classes agree across specification and Context; efficiency remains subordinate to that objective; the model-choice checkpoint uses locked acceptance to reduce execution cost without becoming proof/state/routing; Outcome decomposition covers rolling implementation, targeted verification, failure localization, recovery and stale invalidation without weakening one Contract or one Final Gate.
- Authoring boundary consistency: optional Source Plan guidance and ordinary prose are both valid Source; material decision criteria are elicited before choice-sensitive research or selection, then a defensible recommended choice is recorded in real Source before Contract mapping; high-risk external effects remain external confirmations, and conflicting/user-reserved/missing-preference/unsupported semantics remain distinct `decision_required` items; meaning-preserving decomposition and evidence-backed repository binding remain separate; Contract Draft authoring belongs to `long-task-workflow`; no standalone Contract Draft Skill, Draft Receipt, Authoring State, questionnaire state, `draft_outcomes` or `plan_items` mechanism exists.
- Distribution consistency: the `long-task` profile still installs and removes both Skills plus its Hook; managed source, generated source-workspace copy and package asset remain exact; package-managed Source Plan guidance is platform-neutral; the Long-Task decision-rationale Context is registered on-demand.
- Visual delivery guidance: `context_uiux_design` and `context_development_engineer` agree on task-local risk-proportional coverage, one authored token source/generation direction, production-component/real-route verification and honest reporting of checked combinations; Long-Task references reuse existing Requirement/Control/Assertion, `ui_browser`, verification-input and external-confirmation mechanisms without adding Schema, lifecycle, risk or acceptance authority.

## Evidence Rules

- Tests/Context validators prove only their named property. They do not prove product completeness.
- Affected/focused developer loops are selection aids only and do not replace complete CI/release gates.
- Targeted verify is repair evidence only. Acceptance comes only from the currently executing source-recompiled Live Final Gate; no stored result is reusable authority.
- `progress_passing` may be reported only as targeted repair evidence, `progress_stale` is not a current pass, and `final_workflow_status: null` remains unfinished; tests protect this wording without adding a machine state.
- Preflight proves only static authoring readiness and is intentionally non-authoritative; a successful Preflight creates no reusable receipt or completion evidence.
- Store no one-off logs, reports, raw evidence, secrets or release ledgers in Context.
