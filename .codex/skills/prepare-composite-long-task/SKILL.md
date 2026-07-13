---
name: prepare-composite-long-task
description: Use when directly invoked to prepare, execute, resume, or review a multi-SFC composite long-task campaign from a discussed plan.
---

# Prepare Composite Long Task

中文显示名：多组合长程任务准备、并行执行与续接 Skill

## Boundary

This package-managed Skill is the Campaign V5 agent entrypoint. Explicit invocation authorizes the complete prepare-and-execute loop from one discussed plan through target-branch integration. Campaign V5 owns Scope Fit V4, App Server thread/Goal/Turn orchestration, conservative worktree scheduling, repair and finalization. `/composite-long-task-workflow` remains the one-SFC Contract V3 worker and never owns Campaign scope, scheduling, merge or completion.

Invoke explicitly:

```text
/prepare-composite-long-task
```

Do not use broad automatic routing. Do not import legacy attachments, partial bundles, old tmp workdirs or V1/V2 state. Campaign V4 state is audit-only and must not be automatically executed or silently migrated. Every SFC, including a serial one, uses the same App Server thread, worktree, Contract V3 receipt and integration path.

## Bootstrap

1. Read project Context and relevant code before semantic decisions.
2. Run `ty-context composite-campaign contract --json`; code owns current schemas, enums, actions, hashes and filenames.
3. Determine whether the request creates a Campaign, resumes/reviews one, or reports a semantic/external blocker.
4. Load only the matching one-level references:
   - Source Unit inventory, source coverage, Scope Fit or graph: `references/scope-fit-and-selection.md`
   - ready-frontier Packet authoring/repair: `references/packet-authoring.md`
   - App Server, model routing, worktrees, Goals, receipts, integration, repair, finalization or recovery: `references/campaign-lifecycle.md`

Never copy a competing field inventory into this Skill. Never register Campaign files in `project_context/context.toml`.

## New Campaign

1. Perform preliminary Scope Fit. If the source is not a composite long task, recommend the smaller path without creating a Campaign unless the user explicitly wants the decision preserved.
2. Preserve the discussed plan in an in-repository UTF-8 file and create the Campaign:

```text
ty-context composite-campaign create --id <id> --plan-file <file> [--target-branch <branch>]
```

3. Inventory every delivery-significant Source Unit, author complete source coverage/global constraints and one full maximal-cohesion Scope Fit V4 DAG, then publish with `apply-scope --coverage`. Do not select only one SFC, omit later work or split for parallelism.
4. A genuine unresolved product/scope/architecture choice is `decision_blocked`. Priority ties, file conflicts and execution order are scheduler inputs and never user decisions.

## App Server Run Loop

Start or resume deterministic execution with:

```text
ty-context composite-campaign run --campaign <path> [--controller-model <id> --controller-effort <effort>] [--controller-thread-id <id>]
```

The Host must supply the actual controller model/effort or start the run from a controller that can do so. Unknown profiles remain unchanged and are never guessed. The runner automatically handles `author_packets`, `launch_wave`, `wait_goals`, `repair_integration` and finalization. `advance`, Packet commands and Goal-binding commands remain pure/audit surfaces; do not use them to recreate a manual adapter or second execution mode.

- `author_packets`: one persistent App Server thread per ready SFC; a read-only Turn uses the controller profile and strict Packet output schema. Campaign writes and preflight are serialized.
- `launch_wave`: only preflight-ready Packets receive a Goal. The same SFC thread switches cwd to its Slice worktree and starts an explicit execution-profile `workspaceWrite` Turn. The complete wave starts before waiting.
- `wait_goals`: `needs_work` and interruption continue with explicit-profile Turns in the same thread. A current accepted Contract V3 result is receipt-bound before the Goal completes.
- `repair_integration`: merge, Integration Gate and Campaign Final Gate regressions use a separate execution-profile repair thread that cannot rewrite Scope Fit or Packets.
- `wait_external` or `decision_required`: stop only for the exact reported external or semantic blocker.
- `finished`: report completion only when CLI status is `accepted` and includes the final target commit.

App Server unavailability never falls back to manual or uncertain Goal creation. Use `app-server-check`, `model-routing`, `threads` and `interrupt` for bounded diagnostics/control.

## Goal And Recovery Discipline

- Packet preflight must pass before `thread/goal/set`; authoring has no Goal and cannot modify product code.
- A Goal objective is validated at 4000 characters or fewer before it is sent. Goal Manifest V2 binds thread, authoring/execution profiles, routing, Git, Packet, worktree and launch identity.
- Persist thread/Turn/Goal launch intent before external work. Resume/read known identities after a crash; never create a replacement when launch outcome is ambiguous.
- One App Server reconnect is allowed. Reconcile known threads, Goals and Turns from server state; a second failure becomes `wait_external`.
- Goal execution rereads Context/code, resolves Context Delta, stays inside allowed bindings, commits before final-gate and leaves a clean worktree.
- `record-result` validates an existing current result and dual receipt. It never runs final-gate or upgrades prose/intermediate checks into acceptance.

## Completion Authority

Slice acceptance is not Campaign acceptance. Every merged wave must pass its Integration Gate. After all SFCs integrate, Campaign Final Gate recompiles and reruns every Slice contract, binding, counterfactual, global constraint and source-coverage rule on one shared final snapshot. Target movement invalidates the pre-merge result until synchronization and revalidation succeed.

Never infer completion from status prose, historical receipts, validators, matrices, Skill output, App Server Goal status or Fake Server output. Campaign `accepted` is CLI-derived only after target integration.

## Stop Conditions

Stop with one structured actionable report only when source meaning requires a real product/scope/architecture decision; Packet authoring would invent intent or an oracle; required external credentials/MFA/permission/approval are unavailable; a protected branch has no automatic merge/PR path; contracts are semantically contradictory; App Server remains unavailable after one reconnect; or persisted identities show immutable drift or an ambiguous thread/Turn launch.

Scheduling ties, Git conflicts, target movement, test failures, `needs_work`, interruption and integration regressions are automatic repair/recovery work, not user blockers.

## Outputs

Tracked user-owned Campaign source/orchestration/provenance remains under the configured Campaign root. Mutable Contract V3 runs, raw logs, locks and runtime JSON remain temporary. Report Campaign path/status, current action, graph/wave/SFC/thread identities, repair or blocker when present, and the accepted target commit only after `finished`.
