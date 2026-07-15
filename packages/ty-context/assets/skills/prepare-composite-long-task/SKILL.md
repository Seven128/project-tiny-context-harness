---
name: prepare-composite-long-task
description: Use when directly invoked to prepare, execute, resume, or review a multi-SFC long-task workflow campaign from a discussed plan.
---

# Prepare Long-Task Workflow

中文显示名：长程任务工作流准备、并行执行与续接 Skill

## Boundary

This package-managed Skill is the Campaign V6 agent entrypoint. Explicit invocation authorizes the complete prepare-and-execute loop from one discussed plan through target-branch integration. It inherits Workflow Contract Context Priority, the one Context Delta, durable Context updates and final Context drift check; it replaces ordinary planning, implementation mapping, execution state and completion. It never creates or consumes `plan.md`, a second Task Contract, Markdown binding tables, a matrix, verdict or ordinary Local Audit. `/composite-long-task-workflow` remains the one-SFC Contract V3 worker.

Invoke explicitly:

```text
/prepare-composite-long-task
```

Do not use broad automatic routing. Do not import legacy attachments, partial bundles, old tmp workdirs or superseded state. Accepted Campaign V5 state is audit-only; unfinished V5 state must be recreated as V6 and is never migrated or executed. Every SFC, including a serial one, uses the same Packet-to-Contract V3 authority path, detached worktree, Receipt V3 and Integration path.

## Bootstrap

1. Align global durable Context before Scope Fit: ownership, surface responsibility, architecture/API/schema/state/recovery semantics, cross-module dependencies and global verification constraints.
2. Run `ty-context composite-campaign contract --json`; code owns current schemas, enums, actions, hashes and filenames.
3. Determine whether the request creates a Campaign, resumes/reviews one, or reports a semantic/external blocker.
4. Load only the matching one-level references:
   - Source Unit inventory, source coverage, Scope Fit or graph: `references/scope-fit-and-selection.md`
   - ready-frontier Packet authoring/repair: `references/packet-authoring.md`
   - Codex Exec routing, worktrees, receipts, integration, repair, finalization or recovery: `references/campaign-lifecycle.md`

Never copy a competing field inventory into this Skill. Never register Campaign files in `project_context/context.toml`.

## New Campaign

1. Perform preliminary Scope Fit. If the source does not need the long-task workflow, recommend the smaller path without creating a Campaign unless the user explicitly wants the decision preserved.
2. Preserve the discussed plan in an in-repository UTF-8 file and create the Campaign:

```text
ty-context composite-campaign create --id <id> --plan-file <file> [--target-branch <branch>]
```

3. Inventory every delivery-significant Source Unit, author complete Source Coverage V2/global constraints and one full maximal-cohesion Scope Fit V4 DAG, then publish with `apply-scope --coverage`. Every non-terminal source item must carry `context_resolution`: `existing`/`updated` with registered `context_refs`, or `task_local` with a reason; terminal dispositions use `null`, and Packet Requirement Context fields must match. Do not select only one SFC, omit later work or split for parallelism.
4. A genuine unresolved product/scope/architecture choice is `decision_blocked`. Priority ties, file conflicts and execution order are scheduler inputs and never user decisions.

## Foreground Codex Exec Run Loop

Start or resume deterministic execution with:

```text
ty-context composite-campaign run --campaign <path> [--controller-model <id> --controller-effort <effort>]
```

One foreground scheduler owns the complete run and directly waits for every bounded ephemeral `codex exec` child. It never daemonizes, starts AppServer, creates persistent Threads/Goals/Turns or leaves workers running after exit. The Host supplies the actual controller profile when known; unknown or unsupported profiles pass through unchanged. Routing is frozen from the installed policy. Model aliases are canonicalized before family matching, and both the configured accepted-effort set and `minimum_effort` rank apply. Exact `gpt-5.6-sol` (including configured alias `gpt-5.6`) `xhigh`, `max` and `ultra` execution routes to `gpt-5.6-sol / medium`; high-and-below, non-Sol, unknown and invalid-policy cases pass through. If the routed target is explicitly unavailable, the scheduler permits one recorded controller-profile passthrough retry.

- `author_packets`: bounded read-only authoring workers use the controller profile and strict Packet output schema. Each retry is a new ephemeral process; Campaign writes, `apply-packet` and preflight remain scheduler-owned and serialized.
- `launch_wave`: only executable `packet_ready`, `needs_work`, `needs_attention` or `interrupted` Slices receive fixed detached SFC worktrees. An accepted or merged Slice resumes Integration/Gate work and is never rescheduled. The scheduler starts the complete conflict-free wave, up to four workers, before waiting. Execution workers use the routed profile and `workspace-write`.
- `verify_slices`: after every worker exits, the scheduler independently checks Git identity, clean state, Change Envelope, current Contract V3 final result and Receipt V3. Exit code or text never establishes acceptance. `needs_work` reuses its committed `head_commit` for at most three bounded repair attempts after the initial attempt; accepted, merged and integration-verified state is monotonic.
- `repair_integration`: merge conflicts and Integration/Campaign Final Gate regressions use one serial, reusable detached repair worktree and the routed profile. Repair cannot rewrite Scope Fit or Packets.
- `wait_external`, `decision_required` or attempt exhaustion: stop only for the exact persisted external, semantic or bounded-convergence blocker.
- `finished`: report completion only when CLI status is `accepted` and includes the final target commit.

Use `exec-check`, `model-routing`, `status`, `workers`, `interrupt`, `cleanup` and explicit `abandon` for bounded diagnostics/control. `cleanup` cannot destroy an active non-accepted Campaign; `abandon` requires no live scheduler or identity-matched Worker and removes only this Campaign's package-owned local resources while preserving source, Packet, Receipt and event audit. `run --dry-run` reports the ready wave, fixed worktrees, routed profiles, redacted argv and budget without invoking Codex or creating Git resources.

## Packet, Execution, And Recovery Discipline

- Packet preflight must pass before an execution worktree or worker is started. Authoring is read-only and cannot modify product code.
- The immutable authority handoff is Source Unit -> Packet -> three Contract V3 inputs -> Change Envelope -> detached worktree -> current final result -> Receipt. Conversation continuity is never required for correctness.
- Campaign freezes Context graph/baseline hashes. Before execution starts, unchanged baselines read only the SFC's referenced Context; relevant Scope/owner/architecture/acceptance changes reauthor the Packet. Compile freezes referenced Context by default or full Context explicitly.
- Execution stays inside its Change Envelope. Every `base..head` path must be an allowed carrier/support path; Context and Campaign state are hard-forbidden. Repair receives only affected-envelope unions. Workers commit cleanly before the scheduler runs the full final gate and binds Receipt V3.
- Persist worktree and worker spawn/exit intent around external effects. One canonical expected-worktree derivation governs bootstrap, reconcile, Wave, repair, status, cleanup, abandon, dry-run and accepted cleanup. Budget inspection is pure; only explicit reconcile/cleanup/abandon removes worktrees. Recovery restores a missing SFC worktree from its committed head, treats persisted Integration HEAD as authority, rolls back only identifiable unpersisted mechanical effects and fails closed on unrelated drift.
- Every live Worker observation binds PID plus process-start identity. Missing, reused or mismatched identity is never safe external termination authority. Recovery resumes a durable stage with a new bounded worker attempt; it never reconstructs a physical session.

## Resource And Interrupt Discipline

One active Campaign owns at most one Integration worktree, four current-wave detached SFC worktrees and one detached repair worktree. It creates only `tyctx/campaign/<id>/integration`; SFC and repair branches do not exist. Fixed paths under `tmp/ty-context/composite-worktrees/<campaign-id>/` are reused across attempts. Accepted SFC worktrees are removed immediately after durable integration; accepted cleanup is idempotent and cannot revoke acceptance.

SIGINT, SIGTERM or `interrupt` checks the persisted request before and after every attempt and before Wave, Integration, Gate and finalization dispatch. It gracefully terminates only PID/start-identity-matched process trees, force-terminates their still-matching known descendants after a bounded wait, records interrupted state and retains bounded worktrees for durable-stage recovery. An old live Worker without an identity returns a blocker and is not killed. Never kill global Codex, Node or shell processes.

An `abandoned` Campaign is terminal and cannot run, schedule, connect Codex or recreate worktrees. Repeated `abandon` or `cleanup` only continues idempotent local cleanup; it never deletes user worktrees/branches or remote refs.

## Completion Authority

`verify` is optional and non-accepting. Slice Final runs every frozen Spec. Wave Impact V2 selects qualified Specs from actual merge diff and frozen path/contract/Context evidence; global-constraint Specs always run and uncertainty selects all. Campaign Final Gate runs all Slices on one shared snapshot and deduplicates only exact execution identities. Target movement invalidates the result until synchronization and revalidation.

Never infer completion from status prose, historical receipts, validators, matrices, Skill output, worker exit code or worker text. Campaign `accepted` is CLI-derived only from current Contract V3 Gate results, Receipt authority, Integration/Campaign Final Gates and target integration.

## Stop Conditions

Stop with one structured actionable report only when source meaning requires a real product/scope/architecture decision; Packet authoring would invent intent or an oracle; required external credentials/MFA/permission/approval are unavailable; a protected branch has no automatic merge/PR path; contracts are semantically contradictory; bounded authoring/execution/repair attempts cannot converge; frozen Git/authority drift cannot be safely reconciled; or the user interrupts.

Scheduling ties, ordinary Git conflicts, target movement, test failures, `needs_work`, stale locks, interrupted workers and Integration regressions remain automatic bounded repair/recovery work, not user decisions.

## Outputs

Tracked user-owned Campaign source/orchestration/provenance remains under the configured Campaign root. One simple live-process lock, atomic writes, append-only events and durable external-effect intents protect scheduler state; there is no controller lease or heartbeat. Dirty input uses a temporary-index hidden checkpoint; managed worktrees never stage, commit, checkout or rebase the user's primary worktree, and `preserve_primary_worktree` defaults true. Bounded raw logs remain temporary; one lightweight summary per `run_generation` exposes worker wait, Packet, Wave, Integration, Gate, repair, finalization, worktree and attempt timing/count observations without becoming acceptance authority. Report Campaign path/status, current action, graph/wave/SFC/worker identities, repair or blocker, and accepted target commit only after `finished`.
