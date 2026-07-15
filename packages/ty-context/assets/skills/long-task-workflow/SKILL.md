---
name: long-task-workflow
description: Prepare, execute, resume, verify, or close a Single-Goal Delivery Contract, logical Contract Bundle, or Delivery Set in the current platform-native Goal and workspace. Use only when explicitly invoked or an active ty-context long-task authority exists.
---

# Single-Goal Long-Task Workflow

## Purpose And Hard Boundaries

Use the current native Goal and user-selected repository for long delivery without creating a scheduler, model worker, agent runtime or Git topology. Harness owns static authority compilation, rolling machine progress, same-snapshot Final Gate and Stop freshness. Git hosting, CI, deployment and human confirmation remain external.

- Never create or simulate a Goal, Turn, Agent, AppServer/model worker, branch, worktree, merge, push, PR, deployment or automatic Child execution.
- Never activate from duration, file count, token count, parallelism or complexity. Explicit invocation or an active binding is required.
- Do not create Campaign/SFC/Packet/Wave/Source-Unit chains, matrices, verdicts or a second plan.
- Targeted verify and Child Gate are progress only. Only a fresh standalone Final Receipt or Delivery Set Receipt is top-level machine completion authority.
- Never weaken Product, Acceptance, risk, source coverage or a Set boundary to make implementation pass.

## Entry And Boundary Check

1. Read minimum controlling Context and decide `Context Delta: none|required`.
2. If `.codex/ty-context-active-long-task.json` exists, inspect its `mode` and run the matching `long-task resume` or `delivery-set resume` command.
3. Otherwise perform one semantic Contract Boundary Check before authoring. Its result is exactly `single_contract`, `single_contract_bundle`, `delivery_set`, `decision_required` or `capacity_blocked`.
4. Use a Delivery Set only when every candidate has an independently observable result, executable Acceptance, a real release/rollback/owner/risk/product-capability boundary, preserves atomic user loops and participates in an acyclic dependency graph. File count, tokens, layers, parallelism, agents or duration are not separation reasons.
5. Keep one logical Contract Bundle for a large atomic delivery. `delivery-contract.yaml` remains the root authority and may use sorted `outcome_files`; fragments own only Outcome content.

## Source Coverage And Authoring

Preserve original user/external requirements in `source.md` or declared `source_paths`. For L2, Contract Bundle and Delivery Set work, declare direct `source_claims` with exactly one disposition: Contract/Outcome, global constraint, source-backed out of scope, or decision required. A decision-required claim blocks affected execution. For simple L1, conduct the same source-to-Contract Coverage Review even when claims are not enumerated.

Author complete Product outcomes, non-goals/owner boundaries, stable technical/path/binding/recovery constraints, risk facts with evidence, and executable machine Acceptance. Every Check declares its runner, `verification_sources`, `input_paths`, planned `expected_output_paths`, artifacts, assertions, environment, safe effect/retry/idempotency and any population/counterfactual proof. Verification sources must include entrypoints, helpers, fixtures/config and package-script selection and must not overlap implementation paths.

For a Set, author `delivery-set.yaml`, its source coverage, global boundaries/integration checks/external confirmations, and Child entries with observable results, separation reasons, evidence and dependencies. Child task ids/workdirs must match the Set. V1 rejects multi-repository delivery.

## Compile And Authority Revisions

Compile before product implementation:

```text
ty-context long-task compile <workdir>
ty-context delivery-set compile <setdir>
```

The first compile freezes one immutable initial task base. Recompile never replaces it. After implementation, targeted verify or Child Gate starts execution, protected source/Product/Acceptance/risk/Set-boundary changes produce a hash-bound pending revision and do not activate. Obtain an explicit user decision, then run the matching `approve-authority-revision ... --revision <sha>`. Technical path/support/binding or proof-strengthening amendments require `--amendment-reason`, recompute risk and stale affected progress; never disguise authority reduction as a technical amendment.

## Rolling Execution

For a standalone Contract or Bundle, select dependency-ready Outcomes, implement in the current workspace, run focused project tests, then run targeted `verify --outcome/--check`. Progress is stored per Check and scoped to authority, runner/verifier, relevant Context, implementation inputs, binding carriers and dependency interfaces. It never produces accepted.

For a Delivery Set, use `delivery-set status|resume` only to project ready/blocked/passed/stale/remaining Contracts. Compile a downstream Child only after upstream Child Gate receipts are fresh. A Child `final-gate` may produce only `contract_gate_passed`; it does not clear the Set binding or permit Stop. The Harness never starts the next Child.

Runner retry defaults to none. One mechanical retry is allowed only for `transient_once` + `idempotent: true` + `read_only|test_sandbox`. A timeout alone does not prove retry safety. Final Gate never performs deployment, payment, migration execution or irreversible production mutation. Network-policy environment hints are not an OS sandbox.

## Finalization Order

Complete required durable Context updates, product code, verifier review and tests first; then create a clean candidate commit; then run Final Gate:

```text
ty-context long-task final-gate <workdir>
ty-context delivery-set final-gate <setdir>
```

A standalone Final Gate reruns all Contract checks on one snapshot. A Set Final Gate creates one snapshot and reruns every Child check plus Set integration checks; it never reuses historical Child passes. The Receipt binds HEAD, Git tree, workspace, source, Context, Contract/Set and verifier identities. Later content changes or commits stale it; push/PR operations that preserve local commit/tree do not.

Machine acceptance means only that the bound snapshot satisfies declared machine checks. With declared human/deploy confirmations it is `machine_accepted_external_pending`; list them in handoff and never claim CI, deployment or human acceptance. Stop may finish the coding Goal, while the active binding can remain until explicit close.

Use `close` only for a matching fresh top-level Receipt. `close` and draft `abandon` are idempotent; abandon preserves source, Contract/Bundle/Set files and user Git content.

## Handoff

Report implementation, effective risk, source coverage, rolling/Child/Set results, Final Receipt freshness, external confirmations, Context status and blockers. Never claim the Harness created/restored a Goal, discovered undeclared source claims, provided network isolation, or completed Git/CI/deployment/human confirmation.
