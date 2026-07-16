---
name: long-task-workflow
description: Author, preflight, execute, resume, verify, or close one complete Single-Goal Delivery Contract in the current native Goal and workspace. Use only when explicitly invoked or a valid common-dir active authority binding exists.
---

# Single-Goal Long-Task Workflow

## Boundaries

Use one current native Goal, one repository and one workspace. Never create a scheduler, model worker, agent runtime, App Server, branch, worktree, merge, push, PR, deployment, Campaign/SFC/Packet/Wave chain, matrix, verdict or second plan. Never activate from task size alone.

`long-task-delivery-v2` is the only active Contract schema. Its root authoring file is `delivery-contract.yaml`. One user-selected delivery always uses one complete Contract and one Final Gate. New authoring uses inline Outcomes; existing `outcome_files` remain only a physical compatibility form and create no additional semantic, state or completion authority. `delivery-set` is retired and non-executing.

## Entry

1. Read the user request or external initial proposal plus minimum controlling Context and decide `Context Delta: none|required`.
2. If a valid active binding exists, run `ty-context long-task resume <workdir>`.
3. Otherwise author one complete Delivery Contract for the whole selected delivery. Do not create a second plan, Authoring Skill product, matrix or top-level Contract split.
4. Preserve original requirements in declared `source_paths` and enumerate every material Source item in `source_claims`. A WebGPT-style research or product proposal remains ordinary Source input and does not need to arrive as strict Contract YAML.

## Contract Authoring

Continue reading the repository, Source and relevant Context and revise the same Draft until it is complete. Initial prose does not need to be Contract-shaped or control-level detailed, and the Contract does not need to be authored in one model response.

Identify Outcomes only when their observable results can be independently judged, target-verified and dependency-ordered. Never split an Outcome or Contract because of model output limits, YAML/file length, frontend/backend layers, module/file count, desired parallelism or Agent capacity.

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

Map every Source item to one or more real Product/Technical Claims, named Acceptance Assertions, Global Claims, external confirmations, source-backed out-of-scope dispositions or decision-required blockers. A specific Source item must not map only to `<outcome>.result`. Acceptance references use `<outcome>.<check>.<assertion>`. Declared `file#anchor` values must exist, and non-empty `source_paths` require non-empty `source_claims`.

Assertions carry readable `criterion` text. Within one Check, one Observation path belongs to exactly one Assertion; combine related Claims in that Assertion instead of duplicating a broad boolean. Fine-grained Requirements and controls use AC-level observations. Playwright AC tests use stable `[ac-key]` identifiers and `playwright.case.<ac-key>.passed`/`.skipped`; `playwright.passed` may cover only a broad Outcome result.

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

Compile rejects uncovered Global and Outcome result/Requirement/control-field/non-completing/obligation/forbidden-shortcut Claims and invalid Source/Acceptance/external-confirmation mappings. The first successful formal Compile is Authority Lock and freezes an immutable initial base. Compile neither auto-runs Preflight nor reads/writes a Preflight Receipt. Every later revision compares against active authority; progress, Receipt/cache deletion or implementation restoration cannot reopen a weakening window. The complete compiled authority snapshot lives in Git common-dir and is bound to the worktree marker by task id, authority revision and compiled identity.

After Authority Lock, Source/Context/Product/Global semantic changes, Product Claim additions/removals/rewrites, verifier-content changes, runner/verification-input replacement, reduced `input_paths`, weakened `expected_output_paths`, other proof weakening, scope expansion and unprovable containment create an exact material-bound pending revision. Pure verifier package root/version relocation auto-revises; content bytes require user approval. Every path-bearing field uses one canonical grammar; internal `.`/`..`, controls, absolute/drive/UNC paths and unsupported syntax fail closed. The executing Agent must never approve its own pending revision.

## Rolling Execution

Implement dependency-ready Outcomes in the current workspace and run targeted `verify --outcome/--check`. Progress is scoped by Outcome authority, resolved runner, verification inputs, relevant Context and implementation inputs. It is repair evidence only and never acceptance authority.

Runner retry defaults to none. One retry is allowed only for `transient_once`, idempotent, read-only/test-sandbox work. Raw Execution identity binds frozen runner identity plus canonical declared Environment Requirements, never actual env values; artifact and Assertion evidence remains per Check. A failed environment probe blocks before runner start. Protected authority/proof files reject symlinks and detectable hardlinks. The Harness does not provide network isolation.

Counterfactual V2 may mutate only declared carriers, never runner/verification inputs, and succeeds only when execution completes with exit zero and exactly the designated Assertions fail. Population V2 proves exact eligible = observed + valid exclusions by entity id.

Assertions require an explicit Observation. A missing or type-incomparable Observation never proves a Claim; negative proof must use an explicit value such as `equals: false`, and implicit absence operators are unsupported.

Use precise findings to repair the owning Source item, Claim, AC/criterion, Observation and owner paths. Distinguish missing Observation, type mismatch, value mismatch, missing/skipped/duplicate AC cases, missing artifacts, scope escape and missing bindings. Never include actual environment values or secrets in findings.

## Live Final Authority

Complete Context, product code and project tests, then create a clean candidate commit. Run:

```text
ty-context long-task final-gate <workdir>
```

Final Gate captures active task/revision/compiled/worktree identity, recompiles source authority, validates the common-dir snapshot/marker, creates a Git-tree snapshot and reruns every required Check. It rechecks active identity before acceptance; a concurrent revision returns `active_authority_changed_during_final_gate`.

Receipts, status, progress and compiled cache are audit/recovery data only. Targeted verify rechecks active identity before progress writes. Commit, migration, clear and abandon share one active-state lock; Stop/close clear only the accepted identity through CAS. Legacy V2 migrates only from a matching cache. For invalid/mismatched/unrecoverable state or a stale lock, use only `ty-context long-task abandon <workdir> --force-corrupt-state`; it preserves Contract, Source, Context and Git content.

Machine acceptance means only that declared machine checks passed on the bound snapshot. Report pending external confirmations and never claim Git hosting, CI, deployment, network isolation, payment/migration execution or human product acceptance.

## Handoff

Report implementation, effective per-Outcome risk, Claim Coverage, Live Gate result, external confirmations, Context status and blockers. State the local threat-model limits honestly: the installed package verifier and Git metadata are trusted, and undeclared requirements cannot be discovered by the Harness.
