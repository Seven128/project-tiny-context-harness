---
context_role: verification
read_policy: default
---
# Harness Package Verification

## Focused Gates

- `npm run format:check`: TypeScript formatting.
- `npm run typecheck --workspace project-tiny-context-harness`: type safety after schema/state/CLI/profile changes.
- `npm run build --workspace project-tiny-context-harness`: compiled package and CLI.
- `npm run test:delivery-contract --workspace project-tiny-context-harness`: Compact equivalence, strict parser, mandatory Source marker inventory/set/text/disposition continuity, atomic/all-of Claim coverage, shared activation validation, adapter/Observation ownership, counterfactual sensitivity, risk and revision tests. Small-fixture Preflight and Compile targets are each under two seconds.
- `npm run test:long-task-workflow --workspace project-tiny-context-harness`: read-only Preflight state-diff, multi-project canonical Playwright evidence, passed-Check-only proof, enriched Finding/Explain, targeted verify/status/resume/final/Stop/profile/consumer workflow tests. Focused loop target is under five minutes; complete workflow suite under fifteen minutes.
- `node --test --test-concurrency=1 tests/ty-context/long-task-design-context.test.mjs tests/ty-context/source-plan-authoring-skill.test.mjs tests/ty-context/workflow-contract-routing.test.mjs tests/ty-context/long-task-profile-hook.test.mjs`: controlling objective, Draft/Outcome/Source boundary, explicit Source Plan content/parity, profile install/remove and one-Contract/Final-Gate coverage.
- `npm run test:long-task-performance --workspace project-tiny-context-harness`: independent 10k tracked/100 untracked Git matrix with status/resume/compile/Snapshot/Stop budgets.
- Long-task tests explicitly cover first-compile Authority Lock, Preflight non-mutation/no-lock/no-runner behavior and direct-Compile parity; mandatory Source marker inventory/continuity and typed dispositions; Source/Context/Product/Technical/Acceptance/Risk/verifier revision identity; adapter-bound Raw Execution and cross-Check Observation ownership; all-of surfaces, canonical multi-project Playwright, Binding/value-only Counterfactuals, weak sensitivity and passed-only Claim/Population proof; scoped progress plus Verify/Final races, unified lock/CAS clear, corrupt-state force abandon, old V2 manual-required behavior and verifier relocation/content migration.

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
7. no campaign/SFC/Packet/Codex worker/extra worktree/branch/model retry was created.

## Required Coverage

- Schema/preflight: V2 only, V1 retirement, Compact defaults, mandatory marked Source inventory with set/text/kind equality, typed dispositions and retired `out_of_scope`, generated atomic Claims, Source Acceptance non-Result continuity, all-of surfaces, adapter matrix, cross-Raw-Execution Observation ownership and direct Compile parity.
- Risk: standard baseline; security/permission/migration/persistent/public-schema/full-population triggers; explicit strict upgrade; below-floor rejection; trigger-specific strict proof; actual path/boundary escalation.
- Verification: two-Outcome success/failure, targeted non-acceptance, raw-command/per-Check evidence split, multi-project Playwright pass/missing/duplicate/skipped/flaky/unexpected handling, artifacts, structured environment probes, exact Binding-linked Counterfactual value failure, entity Population and passed-Check-only proof.
- Recovery/authority: audit-only status/Receipt/cache, source-recompiled Stop/close, malformed/mismatched active state fail-closed, atomic binding clear, read-only resume and no process/branch/worktree mutation.
- Platform boundary: fake executable observation proves no Codex/AppServer/agent/worktree/branch/merge/push/PR/model retry and Final Gate invokes only declared checks.
- Distribution: enable/disable, safe profile migration, historical-file preservation, no retired runtime in new consumer/tarball, source mappings, English/Chinese/package README alignment, version parity and Windows paths.
- Source Plan authoring: direct/derived/decision-required boundaries, stable semantic keys/anchors, semantic Outcome splitting, OBL/HINT separation, non-authoritative Markdown output, no platform-specific instructions and no Source Plan runtime/validator/authority mechanism.
- Long-Task design consistency: the controlling false-completion objective and two trusted machine-result classes agree across specification and Context; Draft Outcome remains the authoring-time lifecycle of an Outcome rather than a schema/runtime/Worker/scheduler entity; Outcome decomposition covers rolling implementation, targeted verification, failure localization, recovery and stale invalidation without weakening one Contract or one Final Gate; `depends_on` remains acceptance readiness and the Rolling Frontier remains temporary.
- Authoring boundary consistency: optional Source Plan guidance and ordinary prose are both valid Source; meaning-preserving decomposition and evidence-backed repository binding remain distinct from `decision_required`; Contract Draft authoring belongs to `long-task-workflow`; no standalone Contract Draft Skill, Draft Receipt, Authoring State, `draft_outcomes` or `plan_items` mechanism exists.
- Distribution consistency: the `long-task` profile still installs and removes both Skills plus its Hook; managed source, generated source-workspace copy and package asset remain exact; package-managed Source Plan guidance is platform-neutral; the Long-Task decision-rationale Context is registered on-demand.

## Evidence Rules

- Tests/Context validators prove only their named property. They do not prove product completeness.
- Targeted verify is repair evidence only. Acceptance comes only from the currently executing source-recompiled Live Final Gate; no stored result is reusable authority.
- Preflight proves only static authoring readiness and is intentionally non-authoritative; a successful Preflight creates no reusable receipt or completion evidence.
- Store no one-off logs, reports, raw evidence, secrets or release ledgers in Context.
