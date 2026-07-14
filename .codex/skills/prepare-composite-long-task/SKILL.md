---
name: prepare-composite-long-task
description: Use when directly invoked to prepare, execute, resume, or review a multi-SFC composite long-task campaign from a discussed plan.
---

# Prepare Composite Long Task

中文显示名：多组合长程任务准备、并行执行与续接 Skill

## Boundary

This package-managed Skill is the Campaign V5 agent entrypoint. Explicit invocation authorizes the complete prepare-and-execute loop from one discussed plan through target-branch integration. It inherits Workflow Contract Context Priority, the one Context Delta, durable Context updates and final Context drift check; it replaces ordinary planning, implementation mapping, execution state and completion. It never creates or consumes `plan.md`, a second Task Contract, Markdown binding tables, a matrix, verdict or ordinary Local Audit. `/composite-long-task-workflow` remains the one-SFC Contract V3 worker.

Invoke explicitly:

```text
/prepare-composite-long-task
```

Do not use broad automatic routing. Do not import legacy attachments, partial bundles, old tmp workdirs or superseded state. Prior Campaign state is audit-only and must not be automatically executed or silently migrated. Every SFC, including a serial one, uses the same App Server thread, worktree, Contract V3 receipt and integration path.

## Bootstrap

1. Align global durable Context before Scope Fit: ownership, surface responsibility, architecture/API/schema/state/recovery semantics, cross-module dependencies and global verification constraints.
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

3. Inventory every delivery-significant Source Unit, author complete Source Coverage V2/global constraints and one full maximal-cohesion Scope Fit V4 DAG, then publish with `apply-scope --coverage`. Every non-terminal source item must carry `context_resolution`: `existing`/`updated` with registered `context_refs`, or `task_local` with a reason; terminal dispositions use `null`, and Packet Requirement Context fields must match. Do not select only one SFC, omit later work or split for parallelism.
4. A genuine unresolved product/scope/architecture choice is `decision_blocked`. Priority ties, file conflicts and execution order are scheduler inputs and never user decisions.

## App Server Run Loop

Start or resume deterministic execution with:

```text
ty-context composite-campaign run --campaign <path> [--controller-model <id> --controller-effort <effort>] [--controller-thread-id <id>]
```

The Host must supply the actual controller model/effort or start the run from a controller that can do so. Unknown profiles remain unchanged and are never guessed. Routing is evaluated by the versioned installed policy; Campaign freezes policy id/hash, catalog hash and decision. The runner automatically handles `author_packets`, `launch_wave`, `wait_goals`, `repair_integration` and finalization. Do not recreate a manual adapter or second execution mode.

- `author_packets`: one persistent App Server thread per ready SFC; a read-only Turn uses the controller profile and strict Packet output schema. Campaign writes and preflight are serialized.
- `launch_wave`: only preflight-ready Packets receive a Goal. The same SFC thread switches cwd to its Slice worktree and starts an explicit execution-profile `workspaceWrite` Turn. The complete wave starts before waiting.
- `wait_goals`: sibling Turns are observed to settled terminal states before the Host decides or exits. `needs_work` and interruption continue with explicit-profile Turns in the same thread. A current accepted Contract V3 result is receipt-bound before the Goal completes.
- `repair_integration`: merge, Integration Gate and Campaign Final Gate regressions use a separate execution-profile repair thread that cannot rewrite Scope Fit or Packets.
- `wait_external` or `decision_required`: stop only for the exact reported external or semantic blocker.
- `finished`: report completion only when CLI status is `accepted` and includes the final target commit.

App Server unavailability never falls back to manual or uncertain Goal creation. Use `app-server-check`, `model-routing`, `threads` and `interrupt` for bounded diagnostics/control.

## Goal And Recovery Discipline

- Packet preflight must pass before `thread/goal/set`; authoring has no Goal and cannot modify product code.
- Validate Goal objectives at 4000 characters or fewer. Goal Manifest V3 binds thread, profiles, routing, Git, Packet, worktree, launch and hashed Change Envelope identities; V2 is audit-only.
- Persist thread/Turn/Goal launch intent before external work. Resume/read known identities after a crash; never create a replacement when launch outcome is ambiguous.
- One App Server reconnect is allowed. Reconcile known threads, Goals and Turns from server state; a second failure becomes `wait_external`.
- Campaign freezes Context graph/baseline hashes. Before Goal start, unchanged baselines read only the SFC's referenced Context; relevant Scope/owner/architecture/acceptance changes reauthor the Packet. Compile freezes referenced Context by default or full Context explicitly.
- Goal execution stays inside its Change Envelope. Each Obligation has a file/path-glob carrier; non-file contract keys never widen scope. Every `base..head` path must be an allowed carrier/support path; Context and Campaign state stay hard-forbidden. Repair gets only affected-envelope unions plus explicit conflicts. Commit cleanly before full final-gate and Envelope-bound Receipt V2.
- `record-result` validates an existing current result and dual receipt. It never runs final-gate or upgrades prose/intermediate checks into acceptance.

## Completion Authority

`verify` is optional and non-accepting. Slice Final runs every frozen Spec. Wave Impact V2 selects qualified Specs from actual merge diff and frozen path/contract/Context evidence; global-constraint Specs always run and uncertainty selects all. Campaign Final Gate runs all Slices on one shared snapshot and deduplicates only exact execution identities. Target movement invalidates the result until synchronization and revalidation.

Never infer completion from status prose, historical receipts, validators, matrices, Skill output, App Server Goal status or Fake Server output. Campaign `accepted` is CLI-derived only after target integration.

## Stop Conditions

Stop with one structured actionable report only when source meaning requires a real product/scope/architecture decision; Packet authoring would invent intent or an oracle; required external credentials/MFA/permission/approval are unavailable; a protected branch has no automatic merge/PR path; contracts are semantically contradictory; App Server remains unavailable after one reconnect; or persisted identities show immutable drift or an ambiguous thread/Turn launch.

Scheduling ties, Git conflicts, target movement, test failures, `needs_work`, interruption, stale locks, recoverable transaction intents and integration regressions are automatic repair/recovery work, not user blockers.

## Outputs

Tracked user-owned Campaign source/orchestration/provenance remains under the configured Campaign root. Multi-file writes use lease locks, transaction intents, atomic replacement, before/after-hash events and orphan quarantine. Dirty input uses a temporary-index hidden checkpoint; Slice/integration/repair/target worktrees never stage, commit, checkout or rebase the user's primary worktree, and `preserve_primary_worktree` defaults true. Mutable runs/raw logs remain temporary. Report Campaign path/status, current action, graph/wave/SFC/thread identities, repair or blocker, and accepted target commit only after `finished`.
