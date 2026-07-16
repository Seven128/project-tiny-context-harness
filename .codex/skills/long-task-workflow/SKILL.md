---
name: long-task-workflow
description: Prepare, execute, resume, verify, or close one Single-Goal Delivery Contract or logical Contract Bundle in the current native Goal and workspace. Use only when explicitly invoked or a valid common-dir active authority binding exists.
---

# Single-Goal Long-Task Workflow

## Boundaries

Use one current native Goal, one repository and one workspace. Never create a scheduler, model worker, agent runtime, App Server, branch, worktree, merge, push, PR, deployment, Campaign/SFC/Packet/Wave chain, matrix, verdict or second plan. Never activate from task size alone.

`long-task-delivery-v2` is the only active Contract schema. Its root authoring file is `delivery-contract.yaml`. One large atomic delivery may use sorted Outcome fragments under one root Contract Bundle. Independent top-level deliveries run separately. `delivery-set` is retired and non-executing.

## Entry

1. Read minimum controlling Context and decide `Context Delta: none|required`.
2. If a valid active binding exists, run `ty-context long-task resume <workdir>`.
3. Otherwise perform one semantic Contract Boundary Check: `single_contract`, `single_contract_bundle`, `separate_top_level_contracts`, `decision_required` or `capacity_blocked`.
4. Preserve original requirements in declared `source_paths`; every `source_claim` must be a generated Claim reference, global constraint, source-backed out-of-scope item, or decision-required blocker.

## Authoring And Compile

Author complete observable Outcomes, control states, non-completing outcomes, owner Context/path boundaries, technical obligations with required proof surfaces, supported file/path-glob/verified bindings, recovery, per-Outcome risk and executable Checks.

Every Check declares a resolved runner, `verification_inputs`, input/output paths, per-Check artifacts, Assertions with Claim refs, structured environment probes and any entity-population or Counterfactual proof. Verification inputs include entrypoints, helpers, fixtures/config, package scripts and lockfiles and cannot overlap implementation carriers.

Global non-goals, constraints and forbidden shortcuts are machine-authoritative Claims and require Global Check Assertions using `non_goal.<key>`, `constraint.<key>` or `forbidden_shortcut.<key>`. Non-goals and forbidden shortcuts require negative Assertions. Global forbidden paths remain static changed-path boundaries rather than Assertion Claims. A Source Claim may cite a Global declaration only when that Global Claim is covered.

Run:

```text
ty-context long-task compile <workdir>
ty-context long-task compile <workdir> --revise
```

Compile rejects uncovered Global and Outcome result/control/non-completing/obligation/forbidden-shortcut Claims and requires Source Claims to bind real declared Source files. The first compile freezes an immutable initial base. The complete compiled authority snapshot lives in Git common-dir and is bound to the worktree marker by task id, authority revision and compiled identity; `.ty-context/compiled-contract.json` is only a replaceable projection. Any later Contract authority, Source content/file-set, Context topology/file-set/content, Product semantic projection or Global semantic projection change requires `--revise`.

After execution begins, Source/Context/Product/Global semantic changes, Product Claim additions/removals/rewrites, runner/verification-input replacement, reduced `input_paths`, weakened `expected_output_paths`, other proof weakening, scope expansion and any unprovable repository-pattern containment create an exact material-bound pending revision for the user. Repository matching, subset and overlap use one restricted pattern language; unsupported glob syntax is rejected, and unknown subset/disjoint relations fail closed. Only mechanical proof additions and proven scope tightening revise automatically; risk downgrade is rejected. The executing Agent must never run `approve-authority-revision` for its own pending revision or otherwise approve it.

## Rolling Execution

Implement dependency-ready Outcomes in the current workspace and run targeted `verify --outcome/--check`. Progress is scoped by Outcome authority, resolved runner, verification inputs, relevant Context and implementation inputs. It is repair evidence only and never acceptance authority.

Runner retry defaults to none. One retry is allowed only for `transient_once`, idempotent, read-only/test-sandbox work. Runners receive a minimal environment whitelist plus only Check-declared env vars. Structured environment requirements may probe executable, env var, file or loopback TCP availability; a failed probe blocks before runner start. Protected authority/proof files reject symlinks and detectable hardlinks. The Harness does not provide network isolation.

Counterfactual V2 may mutate only declared carriers, never runner/verification inputs, and succeeds only when execution completes with exit zero and exactly the designated Assertions fail. Population V2 proves exact eligible = observed + valid exclusions by entity id.

Assertions require an explicit Observation. A missing or type-incomparable Observation never proves a Claim; negative proof must use an explicit value such as `equals: false`, and implicit absence operators are unsupported.

## Live Final Authority

Complete Context, product code and project tests, then create a clean candidate commit. Run:

```text
ty-context long-task final-gate <workdir>
```

Final Gate recompiles source authority, validates the complete Git common-dir authority snapshot against the worktree Git-config marker, creates a Git-tree snapshot with dirty overlay only for targeted verification, and reruns every required Check on one snapshot. Equal raw executions may deduplicate only inside that Gate; artifact and Assertion evidence remains per Check.

Receipts, status, progress and compiled cache are audit/recovery data with `reusable_for_acceptance: false`. Status/resume/verify read active authority from the common-dir snapshot even when the cache is missing or forged. Authority changes use compare-and-swap; legacy V2 active state migrates only from a fully matching cache and otherwise fails closed for manual restore or abandon. Stop and close run the same Live Final Gate rather than trusting prior files. Successful Stop/close atomically clears the active binding. `abandon` is explicit non-success cleanup and never changes user Git content.

Machine acceptance means only that declared machine checks passed on the bound snapshot. Report pending external confirmations and never claim Git hosting, CI, deployment, network isolation, payment/migration execution or human product acceptance.

## Handoff

Report implementation, effective per-Outcome risk, Claim Coverage, Live Gate result, external confirmations, Context status and blockers. State the local threat-model limits honestly: the installed package verifier and Git metadata are trusted, and undeclared requirements cannot be discovered by the Harness.
