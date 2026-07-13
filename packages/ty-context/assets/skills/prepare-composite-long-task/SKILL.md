---
name: prepare-composite-long-task
description: Use when directly invoked to prepare, execute, resume, or review a multi-SFC composite long-task campaign from a discussed plan.
---

# Prepare Composite Long Task

中文显示名：多组合长程任务准备、并行执行与续接 Skill

## Boundary

This package-managed Skill is the Campaign Orchestrator V4 agent adapter. Explicit invocation authorizes the complete prepare-and-execute loop from one discussed plan through target-branch integration. It owns centralized semantic authoring, conservative scheduling and orchestration. `/composite-long-task-workflow` remains the one-Slice Contract V3 worker and never owns Campaign graph, scheduling, merge or completion.

Invoke explicitly:

```text
/prepare-composite-long-task
```

Do not use broad automatic routing. Do not import legacy attachments, partial bundles, V1/V2 campaigns or old tmp workdirs. Do not create a second serial execution mode. Every SFC, including a serial one, uses the same worktree/Goal/receipt/integration path.

## Bootstrap

1. Read project Context and relevant code before semantic decisions.
2. Run `ty-context composite-campaign contract --json`; code owns the current schema, enum, filename, ordering, action and hash contract.
3. Determine whether the request creates a Campaign from a discussed plan, resumes/reviews one, supplies Packet authoring, reports worker results, or repairs/finalizes integration.
4. Load only the matching one-level references:
   - source coverage, Scope Fit or graph: `references/scope-fit-and-selection.md`
   - ready-frontier Packet authoring/repair: `references/packet-authoring.md`
   - baseline, worktrees, Goals, receipts, integration, repair, finalization or recovery: `references/campaign-lifecycle.md`

Never copy a competing field inventory into this Skill. Never register campaign files in `project_context/context.toml`.

## New Campaign

1. Perform preliminary Scope Fit. If the source is not a composite long task, recommend the smaller path without creating a Campaign unless the user explicitly wants the decision preserved.
2. Preserve the discussed plan in an in-root UTF-8 file and create the Campaign:

```text
ty-context composite-campaign create --id <id> --plan-file <file> [--target-branch <branch>]
```

3. Author complete source coverage, global constraints and the full stable Scope Fit V3 DAG, then publish it with `apply-scope`. Do not select only one SFC or omit later work.
4. A genuine unresolved product/scope/architecture choice is `decision_blocked`. Priority ties, file conflicts and execution order are scheduler inputs and never user decisions.

## Fixed Advance Loop

Run `advance --json` and follow its machine action until `finished`:

```text
while action != finished:
  perform exactly the returned action
  persist returned identities before external work
  call advance again
```

- `author_packets`: author every returned ready-frontier SFC against current Integration Context/code, publish immutable Packet revisions, then render and preflight all of them. Do not author stale downstream Packets early.
- `launch_wave`: confirm every worktree/objective/launch token is already materialized. Start the complete wave before waiting. Use available native subagents/threads so each concurrent worker can bind its own Goal when the Host permits one unfinished Goal per thread. Bind every successful Goal ID with the matching launch token; never serialize independent work by waiting after the first launch.
- `wait_goals`: collect only the listed Goal results. A worker must commit and become clean before final-gate, stop mutating after accepted, and never merge or change Campaign state. Call `record-result` only after the worker has a current receipt-bound accepted final result.
- `repair_integration`: create or resume the returned repair worktree/Goal from the conflict or regression manifest, then bind its Goal ID with `bind-repair-goal` and the returned launch token. Preserve every affected Packet/requirement/AC and do not weaken either side.
- `wait_external` or `decision_required`: stop only for the exact reported semantic or external blocker.
- `finished`: report completion only when CLI status is `accepted` and includes the final target commit.

## Goal Discipline

- The CLI reserves the whole wave before external Goal creation. Goal launch tokens and bindings are idempotent; retry a known binding and never create a replacement Goal for the same reservation.
- If the Host cannot recover whether a Goal was created before a crash, fail closed with the persisted launch token rather than duplicate work. Resume through the available Host Goal/thread lookup before relaunching.
- Goal execution must reread Context/code, resolve Context Delta, stay inside allowed implementation bindings, commit before final-gate and leave a clean worktree.
- `record-result` validates the existing final result, dual receipt, Goal ID, branch, base/head, commit range and clean state. It never runs final-gate and never upgrades prose or intermediate verification into acceptance.

## Completion Authority

Slice acceptance is not Campaign acceptance. Every merged wave must pass its Integration Gate. After all SFCs integrate, Campaign Final Gate recompiles and reruns every Slice contract, binding, counterfactual, global constraint and source-coverage rule on one shared final snapshot. Target movement invalidates the pre-merge result until synchronization and revalidation succeed.

Never infer completion from status prose, historical Slice receipts, validators, matrices, Skill output or a fake Goal adapter. Campaign `accepted` is CLI-derived only after target integration.

## Stop Conditions

Stop with one structured actionable report only when:

- source meaning requires a real product, scope or architecture decision;
- Packet authoring would invent product intent, ownership, acceptance semantics or a verifier oracle;
- a credential, MFA, permission or external approval is unavailable after attempting the authorized local path;
- a protected branch has no automatic merge/PR path;
- two SFC contracts are semantically contradictory rather than textually conflicted; or
- persisted identities show corruption, immutable drift or an ambiguous unrecoverable Host Goal launch.

Ordinary scheduling ties, Git conflicts, target movement, test failures, `needs_work`, Goal interruption and integration regressions are automatic repair/recovery work, not user blockers.

## Outputs

Tracked user-owned Campaign source/orchestration/provenance remains under the configured Campaign root. Mutable contracts, verifier runs, raw logs, locks and validation workdirs remain under temporary execution storage. Report the Campaign path/status, current action, graph/wave/SFC identities, repair or external blocker when present, and the accepted target commit only after `finished`.
