---
name: long-task-workflow
description: Author, preflight, execute, resume, verify, or close one complete Single-Goal Delivery Contract in the current native Goal and workspace. Use only when explicitly invoked or a valid common-dir active authority binding exists.
---

# Single-Goal Long-Task Workflow

## Boundaries

Use one current native Goal, one repository and one workspace. Never create a scheduler, model worker, agent runtime, App Server, branch, worktree, merge, push, PR, deployment, Campaign/SFC/Packet/Wave chain, matrix, verdict or second Contract plan. Never activate from task size alone.

`long-task-delivery-v2` is the only active Contract schema. Its root authoring file is `delivery-contract.yaml`. One user-selected delivery always uses one complete Contract and one Final Gate. New authoring uses inline Outcomes; existing `outcome_files` remain only a physical compatibility form and create no additional semantic, state or completion authority. `delivery-set` is retired and non-executing.

## Controlling Objective

Prevent false completion inside declared authority. Implementation may drift, fail or require rework, but every declared non-Result requirement and AC must remain traceable and any unsatisfied, unverifiable, insufficiently evidenced or stale item must block completion. Use findings to localize repair through Source Item, Outcome, Claim, Assertion, Check, Proof Surface, Binding and owner boundary.

Only fresh evidence from the complete current final snapshot can create machine acceptance. Otherwise report the task as explicitly unfinished or qualified. `machine_accepted_external_pending` means machine-verifiable authority passed while named external confirmation remains; it is not complete external delivery. Never substitute summary prose, progress, historical tests, Receipts, one command exit code or Agent judgment for the Final Gate.

## Contract Draft And Outcome Decomposition

Before the first successful formal Compile, continuously revise the same non-authoritative `delivery-contract.yaml` as the Contract Draft. It need not be completed in one response; keep reading Source, repository and relevant Context and feed Preflight findings back into that same Draft. Draft authoring, Preflight, Compile, rolling execution, targeted verification and Final Gate are one `long-task-workflow` lifecycle. Do not create a standalone Contract Draft Skill, Draft Receipt, Authoring State, draft schema/CLI/runtime state or second plan.

A Draft Outcome is an Outcome in that pre-Authority-Lock Draft, not a new schema field or runtime entity. Decompose only independently observable, decidable and target-verifiable results whose dependencies and owner boundary can be stated. Use those boundaries to keep a dependency-ready working set, target verification, localize failures, resume findings/next actions and mark stale local results precisely.

`depends_on` means acceptance readiness. The current Goal may form a temporary Rolling Frontier from ready Outcomes and findings, but must not persist a scheduler, Worker queue, mandatory implementation DAG, model route or process tree. Never split for response/YAML/file length, implementation layer, module/file count, Agent capacity, Worker assignment or desired parallelism.

> Outcome decomposes execution and diagnosis, not completion authority.

The first successful formal Compile places the same Outcomes under one Contract Authority. Targeted verify remains repair evidence, and one complete current-snapshot Final Gate remains the only machine acceptance boundary.

## Entry

1. Read the user request or external initial proposal plus minimum controlling Context and decide `Context Delta: none|required`.
2. If a valid active binding exists, run `ty-context long-task resume <workdir>`.
3. Otherwise author one complete Delivery Contract for the whole selected delivery. Do not create a second Contract plan, intermediate Contract-authoring product, matrix or top-level Contract split inside this workflow.
4. A Long Task always has at least one real `source_path` and one `source_claim`, and every declared Source file contains at least one Material Source Item. During Contract authoring, wrap every material requirement in the original Markdown with non-rendering `ty-source-item:start/end` markers without rewriting its text. Background-only references belong in Context or ordinary working references, not Source Authority.
5. Make the marked Source Item keys and `source_claim` keys exactly equal. Preserve the Source text byte-for-meaning: a Source Claim `statement` may differ only by line-ending normalization, surrounding blank-line removal and trailing-space cleanup. A research proposal, ordinary prose plan or optional Source Plan remains valid input after this marker-only enumeration; it does not need to become strict Contract YAML or match the recommended Source Plan structure.
6. When Source already provides stable semantic keys and Markdown anchors, preserve their meaning and reuse them where practical in Source Claim, Requirement, Control, Obligation and Assertion keys and `source_ref` values.

## Contract Authoring

Continue reading the repository, Source and relevant Context and revise the same Draft until it is complete. Initial prose does not need to be Contract-shaped or control-level detailed, and the Contract does not need to be authored in one model response.

Missing recommended Source Plan headings, keys, anchors or type labels never blocks authoring by itself. Return for a real decision when requirements conflict, critical semantics are missing, multiple materially different product designs remain, the user must choose a product rule or no falsifiable acceptance standard can be formed.

Identify Outcomes only when their observable results can be independently judged, target-verified and dependency-ordered. Never split an Outcome or Contract because of model output limits, YAML/file length, frontend/backend layers, module/file count, desired parallelism or Agent capacity.

Classify Contract expansion:

- meaning-preserving structural decomposition may expand one Requirement into applicable control states and multiple falsifiable AC Assertions;
- repository binding may add owners, Context refs, paths, existing bindings, runners and proof only when supported by real repository and Context evidence;
- a new business rule, default, threshold, recovery behavior, permission, platform/data scope or other product semantic is `decision_required` and must not be silently added.

For every Outcome author:

- one complete `observable_result`;
- atomic `requirements` with required proof surfaces;
- controls and every actually applicable location/trigger/input/loading/empty/success/failure/feedback state;
- non-completing outcomes;
- owner Context, surfaces and path boundaries;
- stable technical obligations, expected/support/forbidden paths, bindings, forbidden shortcuts and recovery;
- per-Outcome risk facts;
- executable Checks and named AC Assertions.

Every Check declares a proof surface, resolved runner target and effect, `verification_inputs`, implementation input/output paths when applicable, per-Check artifacts, Assertions with Claim refs, structured environment probes and any entity-population or Counterfactual proof. Verification inputs include entrypoints, helpers, fixtures/config, package scripts and lockfiles and cannot overlap implementation carriers.

Compact V2 may omit only deterministic defaults: empty optional arrays/nulls, `context_snapshot_mode: referenced`, `requested_level: auto`, runner `argv: []`, `cwd: .`, `timeout_ms: 30000`, `retry_policy: none`, `idempotent: false`, and empty output/artifact/assertion/environment lists. Goal, Source/Source Claims, Context, observable results, owners/paths, REQ, applicable CTRL states, OBL, proof surfaces, runner targets/effects, verification inputs, Assertions, risk, forbidden shortcuts and external confirmations remain explicit.

Global non-goals, constraints and forbidden shortcuts are machine-authoritative Claims and require Global Check Assertions using `non_goal.<key>`, `constraint.<key>` or `forbidden_shortcut.<key>`. Non-goals and forbidden shortcuts require negative Assertions. Global forbidden paths remain static changed-path boundaries rather than Assertion Claims. A Source Claim may cite a Global declaration only when that Global Claim is covered.

Map every marked Source item to exactly one canonical target of the same semantic kind and normalized text. A non-decision disposition owns exactly one target, and two Source items may not own the same target. Requirements, independently decided control fields and obligations map respectively to Requirement, Control and Obligation non-Result Claims; acceptance maps to exactly one `<outcome>.<check>.<assertion>` whose criterion exactly matches the Source item and whose non-Result Claim set contains at least one Claim independently backed by a Requirement, Control or Obligation Source item. An explicit overall result uses `outcome_result`; risk facts must name exactly one existing Fact/Affected-Outcome pair; declared non-goals map to covered Global non-goal Claims; external confirmations and genuine decisions use their dedicated dispositions. `out_of_scope` is retired: an old occurrence is an error, and excluding an in-scope requirement requires `decision_required`.

Every Outcome has at least one generated non-Result atomic Claim. Assertions carry readable `criterion` text, and every required proof surface must be covered rather than merely one of them. Claim-bearing assertions use explicit comparison operators; `exists` is allowed only for an `implementation_structure` obligation, while `truthy`/`falsy` never prove Claims.

The evidence adapter is derived from the runner: `playwright_test` is `playwright_json_v1` and may prove `ui_browser`; all other runners are `structured_json_v2` and may prove only non-browser surfaces. Across all Checks sharing one Raw Execution identity, one claim-bearing Observation belongs to one Assertion. A Playwright claim-bearing Assertion has exactly the canonical form `playwright.case.<ac-key>.passed equals true`; title each claim-bearing Test `[ac:<assertion-key>] ...`. One Test Instance may bind at most one declared AC. Undeclared tags such as `[smoke]` are ignored; legacy `[<key>]` is recognized only for a declared AC. Missing, skipped, flaky, unexpected, multi-AC or duplicate-per-project AC instances fail closed, while the same AC across distinct Playwright projects aggregates successfully only when every instance passes. Decoder-only status/skip/executed/aggregate fields cannot prove Claims.

Every Claim-bearing `structured_json_v2` Check must demonstrate same-Check sensitivity for each related Claim through Counterfactuals, except Claims covered by that same Check's Population under normal observability. Under `weak_observability`, Population removes no sensitivity obligation. Counterfactual coverage may be the union of multiple controls, and one control may cover multiple related Claims, but controls on another Check and unrelated Claims or Artifacts do not count. A structured Result assertion additionally needs a same-Check failing Counterfactual rooted in `result` plus at least one related non-Result Requirement, Control, Obligation, non-completing or forbidden-shortcut Claim.

## Authoring Preflight And Compile

Run the read-only Authoring check:

```text
ty-context long-task preflight <workdir>
```

Resolve every `error` and `decision_required` diagnostic and review warnings. Preflight must be `status: ready` before the first formal Compile. Preflight creates no Active Authority, initial base, worktree marker, cache, progress, Receipt or pending revision, runs no project Check and persists no success record.

Only after Preflight is ready run:

```text
ty-context long-task compile <workdir>
ty-context long-task compile <workdir> --revise
```

Preflight and Compile call the same activation-safety validator. Compile rejects the same Source inventory/continuity, criterion, Claim coverage, all-of proof-surface, adapter, Observation ownership, risk, owner/path/binding, runner/input, Counterfactual and weak-sensitivity errors even when Preflight was skipped. Preflight collects every independent diagnostic reliably discoverable from a parseable structure; neither command reads or writes a Preflight Receipt. The first successful formal Compile is Authority Lock and freezes an immutable initial base. Every later revision compares declared source/product/technical/acceptance/risk/context projections against active authority; progress, Receipt/cache deletion or implementation restoration cannot reopen a weakening window. The complete compiled authority snapshot lives in Git common-dir and is bound to the worktree marker by task id, authority revision and compiled identity.

After Authority Lock, Source/Context/Product/Global semantic changes, Product Claim additions/removals/rewrites, verifier-content changes, runner/verification-input replacement, reduced `input_paths`, weakened `expected_output_paths`, other proof weakening, scope expansion and unprovable containment create an exact material-bound pending revision. Pure verifier package root/version relocation auto-revises; content bytes require user approval. Every path-bearing field uses one canonical grammar; internal `.`/`..`, controls, absolute/drive/UNC paths and unsupported syntax fail closed. The executing Agent must never approve its own pending revision.

## Rolling Execution

Implement dependency-ready Outcomes in the current workspace and run targeted `verify --outcome/--check`. Progress is scoped by Outcome authority, resolved runner, verification inputs, relevant Context and implementation inputs. It is repair evidence only and never acceptance authority.

Runner retry defaults to none. One retry is allowed only for `transient_once`, idempotent, read-only/test-sandbox work. Raw Execution identity binds frozen runner identity plus canonical declared Environment Requirements, never actual env values; artifact and Assertion evidence remains per Check. A failed environment probe blocks before runner start. Protected authority/proof files reject symlinks and detectable hardlinks. The Harness does not provide network isolation.

Counterfactual V2 names an Outcome `binding_key`, mutates only a proven subset of that Binding's carriers, never runner/verification inputs, and succeeds only when execution completes with exit zero and every failure is exactly a designated `assertion_value_mismatch`; missing/type-invalid observations, missing/skipped ACs, artifact/population/infrastructure failures and extra Assertion failures invalidate it. Population V2 proves exact eligible = observed + valid exclusions by entity id. Artifact collection remains useful evidence output but never substitutes for the per-Check sensitivity rule above.

Assertions require an explicit Observation. A missing or type-incomparable Observation never proves a Claim; negative proof must use an explicit value such as `equals: false`, and implicit absence operators are unsupported.

Claim and Population proofs are emitted only after the whole Check status is `passed`; a non-zero exit, missing artifact, failed population or any failed Assertion yields no Claim Proof.

Use precise findings to repair the owning Source item, Claim, AC/criterion, Observation and owner paths. Distinguish missing Observation, type mismatch, value mismatch, missing/skipped/duplicate AC cases, missing artifacts, scope escape and missing bindings. Never include actual environment values or secrets in findings.

## Live Final Authority

Complete Context, product code and project tests, then create a clean candidate commit. Run:

```text
ty-context long-task final-gate <workdir>
```

Final Gate captures active task/revision/compiled/worktree identity, recompiles source authority, validates the common-dir snapshot/marker, creates a Git-tree snapshot and reruns every required Check. It rechecks active identity before acceptance; a concurrent revision returns `active_authority_changed_during_final_gate`.

Receipts, status, progress and compiled cache are audit/recovery data only. Targeted verify rechecks active identity before progress writes. Commit, verifier migration, clear and abandon share one active-state lock; Stop/close clear only the accepted identity through CAS. Development-period V2 Active Authority, Progress and Receipts are never migrated; doctor reports `manual_required`, after which the operator upgrades the Contract and forms a new Authority Lock. For invalid/mismatched/unrecoverable state or a stale lock, use only `ty-context long-task abandon <workdir> --force-corrupt-state`; it preserves Contract, Source, Context and Git content.

Machine acceptance means only that declared machine checks passed on the bound snapshot. Report pending external confirmations and never claim Git hosting, CI, deployment, network isolation, payment/migration execution or human product acceptance.

Qualification must remain intact through `final-gate`, `status`, `resume`, `stop-check`, the package-owned Stop Hook and `close`. A fresh `machine_accepted_external_pending` result must keep every declared confirmation visible. A stale Final Receipt makes `final_workflow_status` null even though the active Contract still declares its confirmations. Stop/close may clear the accepted machine Authority through CAS; a Hook `systemMessage` or close `status: closed` reports that machine lifecycle result only and must never be described as completed external delivery. Do not invent external-confirmation tracking state or treat the message, close result or Receipt as confirmation evidence.

## Handoff

Report implementation, effective per-Outcome risk, Claim Coverage, Live Gate result, every pending external confirmation by stable key and owner, Context status and blockers. Preserve `machine_accepted_external_pending` in the final Handoff and state explicitly that `closed` means only machine Authority cleanup. Never treat a Hook `systemMessage`, close result or Receipt as proof that external confirmation completed. State the local threat-model limits honestly: the installed package verifier and Git metadata are trusted, and undeclared requirements cannot be discovered by the Harness.
