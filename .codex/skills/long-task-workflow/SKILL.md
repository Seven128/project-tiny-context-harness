---
name: long-task-workflow
description: Prepare, execute, resume, verify, or close one Canonical Delivery Contract in the current platform-native Goal and current workspace. Use only when the user explicitly invokes /long-task-workflow or the current worktree has an active ty-context long task.
---

# Single-Goal Long-Task Workflow

## Purpose

Use one `delivery-contract.yaml`, the current native Goal and the current user-selected workspace to deliver a long task without creating a second scheduler, agent runtime or Git topology. Harness owns static Contract quality, executable verification, same-snapshot Final Gate and Stop freshness. The platform owns the Goal; Git/CI/deployment/human confirmation remain external.

## Hard Boundaries

- Never create or simulate a Goal, Turn, Agent, Codex/AppServer worker, model retry, branch, worktree, merge, push, PR or deployment.
- Never auto-activate from task duration, file count or complexity. Explicit invocation or an active binding is required.
- Use exactly one authoritative `delivery-contract.yaml`. Optional `source.md` is provenance only.
- Do not create Source Unit tables, Source Coverage, SFCs, Packets, Waves, matrices, verdicts, Local Audits or a second plan.
- Outcome is an acceptance unit, not an execution worker/slice. Keep the rolling implementation Frontier internal to the current Goal.
- Targeted verify never means complete. Only a fresh complete `final-gate` may produce machine acceptance.
- Do not weaken Product Outcome, non-completing results, Acceptance semantics, risk floor or proof to make implementation pass.

## Entry

1. Read `project_context/global.md`, `project_context/architecture.md`, `project_context/context.toml` and minimum graph-relevant Context.
2. Decide one `Context Delta: none|required`; update owning Context before implementation when required.
3. If a binding exists, run `ty-context long-task resume <workdir>` and continue from semantic state.
4. Otherwise choose one workdir in the current repository and run `ty-context long-task init <workdir>`.

## Author The Contract

Translate the user request or external plan into one complete Contract:

- task goal, source paths and relevant registered Context refs;
- declared risk facts and requested level;
- global non-goals, owner boundaries, constraints, forbidden paths/shortcuts and checks;
- every observable Outcome and dependency;
- full Product end state, owner boundary/surfaces, UI control states and non-completing outcomes;
- stable technical obligations, expected/support/forbidden paths, bindings/shortcut/recovery boundaries;
- falsifiable executable Acceptance Checks, proof surface, runner, inputs/artifacts, positive/negative assertions, environment, population and counterfactual controls.

Model-authored identifiers stop at task, Outcome, UI control and Check keys. Do not invent cross-file Requirement/PI/Obligation/Binding/AC/Proof/Spec ids.

## One Coverage Review

Before compile, review once for:

- missing observable product result;
- missing loading/empty/success/failure/feedback control state;
- missing failure path or non-completing result;
- missing owner/technical/path/recovery boundary;
- missing executable proof or UI browser proof;
- undeclared risk fact;
- a real product/architecture decision that needs the user.

Do not write a coverage artifact. If the whole Product + Acceptance Contract exceeds reliable capacity, return `contract_capacity_exceeded`. Suggest multiple top-level Contracts only for genuinely independent acceptance/release/rollback boundaries.

## Compile Before Product Implementation

Run:

```text
ty-context long-task compile <workdir>
```

Resolve every static finding before editing product code. Compile is model-free preflight and may not implement code. If the user requested `standard` below the deterministic strict floor, do not downgrade it.

## Rolling Execution Loop

1. Read the compiled Contract, relevant Context and current code.
2. Select one or more dependency-ready Outcomes as the current internal Frontier.
3. Form only the technical implementation detail needed for that Frontier.
4. Implement in the current workspace and run focused project tests.
5. Run `ty-context long-task verify <workdir> --outcome <key>`.
6. Repair local precise findings in this same Goal. Do not start another Agent/session/attempt runtime.
7. When the Frontier passes, move to the next ready Outcome. An ordinary Git checkpoint commit is allowed only when it is useful and user policy permits it.

If verify/final reports `scope_or_risk_escalation_required`, review the new path/owner/risk, update the same Contract and recompile. Product/Acceptance meaning changes are scope changes and must not be hidden as technical edits.

## Retry Classification

- Static Contract error: fix Contract before product implementation.
- Local test/Check failure: repair in this Goal.
- Transient command/external-service failure: Harness permits one mechanical retry; a second failure is `blocked_external`.
- Product/Acceptance/architecture semantic conflict: pause for user/main-conversation decision.
- Goal/session ended: a new session runs `resume`; it does not reconnect the physical Turn.

## Final Gate And Completion

After all Outcomes are implemented, run:

```text
ty-context long-task final-gate <workdir>
ty-context long-task status <workdir>
```

Final Gate must rerun every global and Outcome Check on one current snapshot. Do not combine historical passes. Fix failures in the same Goal and rerun the complete Gate.

Stop freshness must remain accepted after all final code/Context/Contract/runner changes. External Git/CI/deploy/manual acceptance is then performed by its owning system. Finish with Contract Conformance and Context drift check.

Run `ty-context long-task close <workdir>` only for a fresh accepted task. Use `abandon` only for explicit non-success termination; it preserves `source.md` and `delivery-contract.yaml` and never touches user Git state.

## Handoff

Report implementation, effective risk, Outcome/Check results, Final Gate/Stop freshness, external/manual acceptance still required, Context status and blockers. Never claim the Harness created/restored a Goal, proved undeclared requirements complete, observed platform tokens/model calls or completed Git/CI/deployment/human confirmation.
