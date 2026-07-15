# Campaign V6 Codex Exec, Git, Integration, And Recovery Lifecycle

## Engine And Routing

`composite-campaign run` is one foreground scheduler using execution engine `codex-exec-v1`. `exec-check` verifies the Codex executable/version, required `codex exec` flags, Git repository and CLI-managed authentication path without running a model, exposing credentials or starting AppServer.

Every authoring, execution or repair attempt is a direct, bounded, ephemeral child process started with an argv array, `shell: false`, prompt through stdin, bounded JSONL/stdout/stderr, explicit cwd/profile/sandbox, no subagents and no approval prompts. Authoring is read-only and uses the controller profile. Execution and repair use the routed profile. The YAML policy routes exact `gpt-5.6-sol / xhigh|max|ultra` to `gpt-5.6-sol / medium`; high-and-below, non-Sol, unknown and invalid-policy cases pass through. An explicitly unavailable routed target permits one persisted controller-profile passthrough retry; other launch errors do not guess.

## Baseline, Worktrees, And Wave Launch

Before execution, Git baseline logic validates identity/unfinished operations, protects against obvious raw credentials, checkpoints allowed dirty state, freezes `base_commit`, creates the sole `tyctx/campaign/<id>/integration` branch and materializes the fixed Integration worktree.

Managed paths are fixed beneath `tmp/ty-context/composite-worktrees/<campaign-id>/`: `integration`, `sfc/<sfc-id>` and `repair`. Each SFC uses one detached worktree at the Wave's shared Integration base and creates no branch. One active Campaign is hard-limited to one Integration worktree, at most four current-wave SFC worktrees and one reusable repair worktree. The scheduler reconciles only package-owned orphans before failing closed on budget exhaustion.

After Packet preflight, the scheduler materializes every selected SFC worktree and persists spawn intent before starting the complete conflict-free Wave. Unknown conflict is serial. It awaits all children before integration or exit. Each execution worker receives the frozen Packet/Contract/Envelope paths and hashes, worktree/base/profile identities, forbidden paths and the complete compile/implement/check/commit/final-gate loop. It cannot change Scope Fit, Packet, Context, Campaign state or Integration.

After a worker exits, the scheduler independently validates worktree path, base/head, a clean committed result, changed paths, Change Envelope, current Contract V3 final result and Receipt V3. PID, exit code, JSONL and final text are observations only. `needs_work` reuses the same SFC worktree and starts a fresh ephemeral attempt containing machine findings; the default bound is one initial plus three repair attempts per run generation.

## Merge, Repair, And Final Authority

Accepted detached SFC commits merge by SHA into Integration in stable SFC order after Packet/Contract/Envelope/Receipt integrity checks. Once the merge result and Integration Gate state are durable, the SFC worktree is immediately removed and Git worktrees are pruned.

Merge conflict, Integration Gate regression and Campaign Final Gate regression share one serial detached repair worktree. No repair branch is created. Before each repair, no SFC worker may be active; the scheduler resets the fixed repair path to current Integration head, writes the repair manifest, limits writes to affected Envelope unions and starts one routed `workspace-write` worker. It validates an unchanged repair base and clean commit, merges by SHA, then removes or resets the worktree. Repair attempts are bounded and never create a Campaign, SFC, Scope Fit or Packet.

After merges, Wave Impact V2 selects Specs from diff/evidence, includes global constraints and falls back to all. Once every SFC is `integration_verified`, Campaign Final Gate recomputes all bindings, Specs, counterfactuals and coverage on one snapshot. Target finalization retains exact commit/tree convergence, full revalidation for different trees, non-force delivery and matching open-PR rules. Only current Gate and Receipt authority can commit Campaign `accepted`; worker exit and prose cannot. Accepted state, Final Result, Target Finalization Receipt and event commit atomically before cleanup. Accepted reruns audit frozen authority and finish without workers, gates or worktree recreation; cleanup failure is pending and never revokes acceptance.

## Foreground Interrupt And Durable-Stage Recovery

The scheduler uses a simple `campaign-lock-v1` containing PID, process-start identity, operation id and start time. A live matching owner rejects another run; a missing or mismatched process makes the lock stale. There is no lease, heartbeat, controller host or distributed takeover.

SIGINT, SIGTERM or `interrupt` stops new dispatch, gracefully terminates known children, waits a bounded interval and force-terminates only the known child PID tree. The scheduler observes every child as settled, persists interrupted SFC state and exits nonzero; no worker may remain after the foreground CLI returns.

On restart, reconcile lock ownership, worker observations, fixed worktrees, Git heads, current final results and Receipts. A recorded running worker without a live matching child becomes interrupted. An already accepted Slice proceeds to receipt binding/integration; otherwise a new bounded ephemeral attempt starts in the same worktree. Recovery resumes a durable stage and never reconstructs or simulates a physical Thread, Goal, Turn or AppServer lifecycle.

Campaign V5 is audit-only. Accepted V5 campaigns remain readable; unfinished V5 execution fails exactly with `campaign_v5_execution_retired_recreate_required` and is never migrated into V6.

Use `exec-check`, `model-routing`, `workers`, `interrupt` and `cleanup` for diagnostics/control. `run --dry-run` invokes no Codex or Git mutation and reports the ready Wave, fixed worktrees, profiles, redacted exec argv and managed-worktree budget.
